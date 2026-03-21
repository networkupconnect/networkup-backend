import express from "express";
import mongoose from "mongoose";
import { annauth as protect } from "../middleware/auth.js";
import { AttendanceSubject, AttendanceRecord, ClassInfo, PersonalRange } from "../models/Attendance.js";

const router = express.Router();

/* ─── Year-aware group key ──────────────────────────────────────────────────────
   Year 1  → group by section  (sections share subjects in 1st year)
   Year 2+ → group by branch   (branch-specific subjects from 2nd year onward)
   The "section" field in AttendanceSubject stores whichever is relevant.
──────────────────────────────────────────────────────────────────────────────── */
function isFirstYear(user) {
  const yr = String(user.year || "").toLowerCase().trim();
  return /^(1|1st|first|i)\b/.test(yr);
}

function getGroup(user) {
  const section = isFirstYear(user)
    ? (user.section || "default")
    : (user.branch  || user.section || "default");
  return {
    course:  user.course || "default",
    year:    user.year   || "default",
    section,
  };
}

/* ─── Expected classes for a subject within a date range ────────────────────── */
function calcSubjectClasses(subject, startDate, endDate, holidays) {
  if (!startDate || !subject?.days?.length) return 0;
  const holidaySet = new Set((holidays || []).map((h) => new Date(h).toDateString()));
  const DAY_MAP    = { Monday:1, Tuesday:2, Wednesday:3, Thursday:4, Friday:5, Saturday:6 };
  const subDayNums = new Set(subject.days.map((d) => DAY_MAP[d]).filter(Boolean));
  const perDay     = subject.totalClassesPerDay || 1;
  const end        = endDate ? new Date(endDate) : new Date();
  let count = 0;
  for (let d = new Date(startDate); d <= end; d.setDate(d.getDate() + 1)) {
    if (!subDayNums.has(d.getDay())) continue;
    if (holidaySet.has(d.toDateString())) continue;
    count += perDay;
  }
  return count;
}



/* ─── Shared aggregate helper ───────────────────────────────────────────────── */
async function getSubjectAgg(userId, subjectId) {
  const [agg] = await AttendanceRecord.aggregate([
    {
      $match: {
        userId:    new mongoose.Types.ObjectId(userId),
        subjectId: new mongoose.Types.ObjectId(subjectId),
      },
    },
    {
      $group: {
        _id:      null,
        present:  { $sum: { $cond: [{ $eq: ["$status", "present"]  }, 1, 0] } },
        absent:   { $sum: { $cond: [{ $eq: ["$status", "absent"]   }, 1, 0] } },
        massBunk: { $sum: { $cond: [{ $eq: ["$status", "massBunk"] }, 1, 0] } },
      },
    },
  ]);
  return {
    subjectId: String(subjectId),
    present:   agg?.present  || 0,
    absent:    agg?.absent   || 0,
    massBunk:  agg?.massBunk || 0,
  };
}

/* ══════════════════════════════════════════════════════════════════════════════
   SUBJECTS
══════════════════════════════════════════════════════════════════════════════ */

router.get("/subjects", protect, async (req, res) => {
  try {
    const { day } = req.query;
    const group   = getGroup(req.user);
    const query   = { ...group };
    if (day) query.days = day;

    const [subjects, classInfo] = await Promise.all([
      AttendanceSubject.find(query).sort({ name: 1 }),
      ClassInfo.findOne(group),
    ]);

    const enriched = subjects.map((s) => ({
      ...s.toObject(),
      totalExpectedClasses: calcSubjectClasses(s, classInfo?.startDate, null, classInfo?.holidays),
    }));

    res.json(enriched);
  } catch (err) {
    console.error("GET SUBJECTS:", err.message);
    res.status(500).json({ message: "Failed to load subjects", detail: err.message });
  }
});

router.post("/subjects", protect, async (req, res) => {
  try {
    const { name, totalClassesPerDay = 1, days = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    if (!days.length)  return res.status(400).json({ message: "Select at least one day" });

    const group   = getGroup(req.user);
    const subject = await AttendanceSubject.create({
      name: name.trim(),
      totalClassesPerDay: Number(totalClassesPerDay) || 1,
      days,
      ...group,
      createdBy: req.user._id,
    });

    const classInfo = await ClassInfo.findOne(group);
    res.status(201).json({
      ...subject.toObject(),
      totalExpectedClasses: calcSubjectClasses(subject, classInfo?.startDate, null, classInfo?.holidays),
    });
  } catch (err) {
    console.error("POST SUBJECT:", err.message);
    res.status(500).json({ message: "Failed to add subject", detail: err.message });
  }
});

router.put("/subjects/:id", protect, async (req, res) => {
  try {
    const { name, totalClassesPerDay, days } = req.body;
    const update = {};
    if (name)               update.name = name.trim();
    if (totalClassesPerDay) update.totalClassesPerDay = Number(totalClassesPerDay);
    if (days?.length)       update.days = days;

    const subject = await AttendanceSubject.findByIdAndUpdate(
      req.params.id, { $set: update }, { new: true }
    );
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const classInfo = await ClassInfo.findOne(getGroup(req.user));
    res.json({ ...subject.toObject(), totalExpectedClasses: calcSubjectClasses(subject, classInfo?.startDate, null, classInfo?.holidays) });
  } catch (err) {
    console.error("PUT SUBJECT:", err.message);
    res.status(500).json({ message: "Failed to update subject", detail: err.message });
  }
});

router.delete("/subjects/:id", protect, async (req, res) => {
  try {
    const subject = await AttendanceSubject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    await Promise.all([
      AttendanceSubject.findByIdAndDelete(req.params.id),
      AttendanceRecord.deleteMany({ subjectId: req.params.id }),
    ]);

    res.json({ message: "Subject deleted" });
  } catch (err) {
    console.error("DELETE SUBJECT:", err.message);
    res.status(500).json({ message: "Failed to delete subject", detail: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   PERSONAL RECORDS
══════════════════════════════════════════════════════════════════════════════ */

router.get("/my", protect, async (req, res) => {
  try {
    // Only count dailyMark=true records (calendar marks + backfill).
    // Advance/bulk (dailyMark=false) entries are legacy; backfill now uses real dates.
    const records = await AttendanceRecord.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user._id), dailyMark: true } },
      {
        $group: {
          _id:      "$subjectId",
          present:  { $sum: { $cond: [{ $eq: ["$status", "present"]  }, 1, 0] } },
          absent:   { $sum: { $cond: [{ $eq: ["$status", "absent"]   }, 1, 0] } },
          massBunk: { $sum: { $cond: [{ $eq: ["$status", "massBunk"] }, 1, 0] } },
        },
      },
    ]);
    res.json(records.map((r) => ({
      subjectId: String(r._id),
      present:   r.present,
      absent:    r.absent,
      massBunk:  r.massBunk,
    })));
  } catch (err) {
    console.error("GET MY:", err.message);
    res.status(500).json({ message: "Failed to load attendance", detail: err.message });
  }
});

/* ─── GET /api/attendance/day?date=YYYY-MM-DD ──────────────────────────────── */
router.get("/day", protect, async (req, res) => {
  try {
    const { date } = req.query;
    const dayStart = date ? new Date(date) : new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const agg = await AttendanceRecord.aggregate([
      {
        $match: {
          userId:    new mongoose.Types.ObjectId(req.user._id),
          date:      { $gte: dayStart, $lte: dayEnd },
          dailyMark: true,
        },
      },
      { $group: { _id: "$subjectId", status: { $first: "$status" } } },
    ]);

    const map = {};
    agg.forEach((r) => { map[String(r._id)] = r.status; });
    res.json(map);
  } catch (err) {
    console.error("GET DAY:", err.message);
    res.status(500).json({ message: "Failed to load day attendance", detail: err.message });
  }
});

/* ─── GET /api/attendance/range-stats?startDate=X&endDate=Y ────────────────────
   Returns per-subject P/A/B counts for dailyMark=true records whose date
   falls within [startDate, endDate].  Backfill now creates dailyMark=true
   records with real dates, so no special backfillThrough logic needed.
   NOTE: Must be defined before /:subjectId routes.
──────────────────────────────────────────────────────────────────────────────── */
router.get("/range-stats", protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate) return res.status(400).json({ message: "startDate is required" });

    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end   = endDate ? new Date(endDate) : new Date(); end.setHours(23, 59, 59, 999);

    const records = await AttendanceRecord.aggregate([
      {
        $match: {
          userId:    new mongoose.Types.ObjectId(req.user._id),
          dailyMark: true,
          date:      { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id:      "$subjectId",
          present:  { $sum: { $cond: [{ $eq: ["$status", "present"]  }, 1, 0] } },
          absent:   { $sum: { $cond: [{ $eq: ["$status", "absent"]   }, 1, 0] } },
          massBunk: { $sum: { $cond: [{ $eq: ["$status", "massBunk"] }, 1, 0] } },
        },
      },
    ]);

    res.json(records.map((r) => ({
      subjectId: String(r._id),
      present:   r.present,
      absent:    r.absent,
      massBunk:  r.massBunk,
    })));
  } catch (err) {
    console.error("RANGE-STATS:", err.message);
    res.status(500).json({ message: "Failed to load range stats", detail: err.message });
  }
});


/* ─── POST /api/attendance/backfill ────────────────────────────────────────────
   Seed past attendance as real per-day dailyMark=true records so they appear
   in the weekly calendar view and are correctly filtered by personal ranges.

   Body: { pct: number, throughDate: "YYYY-MM-DD" }

   For every subject in the student's group:
     1. Enumerate every actual class day (subject schedule ∩ non-holiday) from
        classInfo.startDate → throughDate
     2. Decide how many of those days = present (round(days × pct/100) ± ~8pp
        random variation per subject so splits look natural)
     3. Shuffle the day list, mark the first presentCount days as present,
        the rest as absent.  Multiple classes/day → one record per slot.
     4. DELETE all existing dailyMark=true records for this user+subject in
        [startDate, throughDate] (overwrite cleanly)
     5. INSERT the new present/absent records with their real calendar dates.

   This means:
   - Calendar week chips show those days as already marked.
   - Range stats work via simple date filter on dailyMark=true records.
   - Days AFTER throughDate are untouched (blank = unmarked = not counted).
──────────────────────────────────────────────────────────────────────────────── */
router.post("/backfill", protect, async (req, res) => {
  try {
    const { pct: rawPct, throughDate } = req.body;
    if (!throughDate || rawPct == null)
      return res.status(400).json({ message: "pct and throughDate are required" });

    const pctNum   = Math.max(0, Math.min(100, Number(rawPct)));
    const through  = new Date(throughDate); through.setHours(23, 59, 59, 999);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    if (through > todayEnd)
      return res.status(400).json({ message: "throughDate cannot be in the future" });

    const [subjects, classInfo] = await Promise.all([
      AttendanceSubject.find(getGroup(req.user)),
      ClassInfo.findOne(getGroup(req.user)),
    ]);
    if (!classInfo?.startDate)
      return res.status(400).json({ message: "Set college start date first" });

    const DAY_MAP    = { Monday:1, Tuesday:2, Wednesday:3, Thursday:4, Friday:5, Saturday:6 };
    const holidaySet = new Set((classInfo.holidays || []).map((h) => new Date(h).toDateString()));

    const start = new Date(classInfo.startDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(through);

    // ── Strategy: guarantee exact overall % ──────────────────────────────────
    // Per-subject variation was causing the aggregate to drift (e.g. 77% → 72%).
    // Fix: collect ALL individual class-day slots across every subject,
    // compute exactly how many total slots must be "present" to hit pctNum%,
    // then shuffle all slots together and mark the first N as present.
    // Each subject independently gets a natural-looking random split that
    // collectively sums to exactly the requested percentage.

    // Step 1 — build per-subject class-day lists
    const subjectSlots = []; // [{ subject, date }]
    for (const subject of subjects) {
      const subDayNums = new Set(subject.days.map((d) => DAY_MAP[d]).filter(Boolean));
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const copy = new Date(d);
        if (!subDayNums.has(copy.getDay())) continue;
        if (holidaySet.has(copy.toDateString())) continue;
        // Each perDay slot is a separate entry so multi-class days are handled
        const perDay = subject.totalClassesPerDay || 1;
        for (let i = 0; i < perDay; i++) {
          subjectSlots.push({ subject, date: new Date(copy) });
        }
      }
    }

    // Step 2 — decide exact total present count across all slots
    const totalSlots   = subjectSlots.length;
    const totalPresent = Math.min(totalSlots, Math.round((pctNum / 100) * totalSlots));

    // Step 3 — shuffle all slots, mark first totalPresent as "present", rest "absent"
    const shuffled = [...subjectSlots].sort(() => Math.random() - 0.5);
    const presentSlots = new Set(shuffled.slice(0, totalPresent).map((_, i) => i));
    // Re-map: slot index → status
    const slotStatuses = shuffled.map((_, i) => presentSlots.has(i) ? "present" : "absent");

    // Step 4 — build a per-subject map of { dateStr → status }
    // (If a subject has multiple slots on one day, last one wins — consistent enough)
    const subjectDateStatus = new Map(); // subjectId_dateStr → status
    shuffled.forEach((slot, i) => {
      const key = `${slot.subject._id}_${slot.date.toDateString()}`;
      // "present" wins over "absent" if multiple slots on same day
      const existing = subjectDateStatus.get(key);
      if (!existing || slotStatuses[i] === "present") {
        subjectDateStatus.set(key, slotStatuses[i]);
      }
    });

    // Step 5 — write to DB per subject
    const aggs = [];
    for (const subject of subjects) {
      const subDayNums = new Set(subject.days.map((d) => DAY_MAP[d]).filter(Boolean));
      const perDay     = subject.totalClassesPerDay || 1;

      // Collect dates for this subject within range
      const classDates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const copy = new Date(d);
        if (!subDayNums.has(copy.getDay())) continue;
        if (holidaySet.has(copy.toDateString())) continue;
        classDates.push(new Date(copy));
      }

      // Delete existing records for this subject in range (daily) + all non-daily
      await AttendanceRecord.deleteMany({
        userId: req.user._id, subjectId: subject._id,
        dailyMark: true, date: { $gte: start, $lte: end },
      });
      await AttendanceRecord.deleteMany({
        userId: req.user._id, subjectId: subject._id,
        dailyMark: { $ne: true },
      });

      if (classDates.length === 0) {
        aggs.push(await getSubjectAgg(req.user._id, subject._id));
        continue;
      }

      // Insert one dailyMark=true record per slot per day
      const docs = [];
      for (const date of classDates) {
        const key    = `${subject._id}_${date.toDateString()}`;
        const status = subjectDateStatus.get(key) || "absent";
        for (let i = 0; i < perDay; i++) {
          docs.push({ userId: req.user._id, subjectId: subject._id, status, date, dailyMark: true });
        }
      }
      if (docs.length) await AttendanceRecord.insertMany(docs);
      aggs.push(await getSubjectAgg(req.user._id, subject._id));
    }

    res.json({ subjects: aggs, throughDate, pct: pctNum });
  } catch (err) {
    console.error("BACKFILL:", err.message);
    res.status(500).json({ message: "Failed to backfill", detail: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   PERSONAL DATE RANGES
   NOTE: Must be defined before /:subjectId routes.
══════════════════════════════════════════════════════════════════════════════ */

router.get("/ranges", protect, async (req, res) => {
  try {
    const ranges = await PersonalRange.find({ userId: req.user._id }).sort({ startDate: 1 });
    res.json(ranges);
  } catch (err) {
    console.error("GET RANGES:", err.message);
    res.status(500).json({ message: "Failed to load ranges" });
  }
});

router.post("/ranges", protect, async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    if (!name?.trim() || !startDate)
      return res.status(400).json({ message: "Name and startDate are required" });

    const range = await PersonalRange.create({
      userId:    req.user._id,
      name:      name.trim(),
      startDate: new Date(startDate),
      endDate:   endDate ? new Date(endDate) : undefined,
    });
    res.status(201).json(range);
  } catch (err) {
    console.error("POST RANGE:", err.message);
    res.status(500).json({ message: "Failed to create range" });
  }
});

router.delete("/ranges/:id", protect, async (req, res) => {
  try {
    await PersonalRange.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: "Range deleted" });
  } catch (err) {
    console.error("DELETE RANGE:", err.message);
    res.status(500).json({ message: "Failed to delete range" });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   MARK ATTENDANCE  /:subjectId/mark
══════════════════════════════════════════════════════════════════════════════ */
router.post("/:subjectId/mark", protect, async (req, res) => {
  try {
    const { status, date } = req.body;
    const uid = req.user._id;
    const sid = req.params.subjectId;

    if (status !== "unmark" && !["present", "absent", "massBunk"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const markDate = date ? new Date(date) : new Date();
    markDate.setHours(0, 0, 0, 0);
    const markDateEnd = new Date(markDate);
    markDateEnd.setHours(23, 59, 59, 999);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (markDate > todayStart)
      return res.status(400).json({ message: "Cannot mark attendance for future dates" });

    await AttendanceRecord.deleteMany({
      userId:    uid,
      subjectId: sid,
      dailyMark: true,
      date:      { $gte: markDate, $lte: markDateEnd },
    });

    if (status === "unmark") return res.json(await getSubjectAgg(uid, sid));

    const subject = await AttendanceSubject.findById(sid);
    const perDay  = subject?.totalClassesPerDay || 1;

    const docs = Array.from({ length: perDay }, () => ({
      userId: uid, subjectId: sid, status, date: markDate, dailyMark: true,
    }));
    await AttendanceRecord.insertMany(docs);

    res.json(await getSubjectAgg(uid, sid));
  } catch (err) {
    console.error("MARK:", err.message);
    res.status(500).json({ message: "Failed to mark", detail: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   ADVANCE INFO  /:subjectId/advance-info
══════════════════════════════════════════════════════════════════════════════ */
router.get("/:subjectId/advance-info", protect, async (req, res) => {
  try {
    const uid = req.user._id;
    const sid = req.params.subjectId;

    const lockedMinimum = await AttendanceRecord.countDocuments({
      userId:    uid,
      subjectId: sid,
      status:    "present",
      dailyMark: true,
    });

    const [subject, classInfo] = await Promise.all([
      AttendanceSubject.findById(sid),
      ClassInfo.findOne(getGroup(req.user)),
    ]);

    if (!classInfo?.startDate || !subject?.days?.length)
      return res.json({ lockedMinimum, unmarkedDates: [], unmarkedCount: 0, canUseAdvance: true });

    const DAY_MAP    = { Monday:1, Tuesday:2, Wednesday:3, Thursday:4, Friday:5, Saturday:6 };
    const subDayNums = new Set(subject.days.map((d) => DAY_MAP[d]).filter(Boolean));
    const holidaySet = new Set((classInfo.holidays || []).map((h) => new Date(h).toDateString()));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const expectedDates = [];
    for (let d = new Date(classInfo.startDate); d < todayStart; d.setDate(d.getDate() + 1)) {
      const copy = new Date(d);
      if (!subDayNums.has(copy.getDay())) continue;
      if (holidaySet.has(copy.toDateString())) continue;
      expectedDates.push(copy.toISOString().slice(0, 10));
    }

    const markedAgg = await AttendanceRecord.aggregate([
      {
        $match: {
          userId:    new mongoose.Types.ObjectId(uid),
          subjectId: new mongoose.Types.ObjectId(sid),
          dailyMark: true,
        },
      },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } } },
    ]);
    const markedSet = new Set(markedAgg.map((r) => r._id));

    const allUnmarked   = expectedDates.filter((d) => !markedSet.has(d)).reverse();
    const unmarkedCount = allUnmarked.length;

    res.json({
      lockedMinimum,
      unmarkedDates: allUnmarked.slice(0, 30),
      unmarkedCount,
      canUseAdvance: unmarkedCount === 0,
    });
  } catch (err) {
    console.error("ADVANCE-INFO:", err.message);
    res.status(500).json({ message: "Failed to load advance info", detail: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   ADVANCE ENTRY  /:subjectId/advance
══════════════════════════════════════════════════════════════════════════════ */
router.post("/:subjectId/advance", protect, async (req, res) => {
  try {
    const { present } = req.body;
    const uid = req.user._id;
    const sid = req.params.subjectId;

    const [subject, classInfo] = await Promise.all([
      AttendanceSubject.findById(sid),
      ClassInfo.findOne(getGroup(req.user)),
    ]);
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const expectedFromClassInfo = calcSubjectClasses(subject, classInfo?.startDate, null, classInfo?.holidays);
    const current      = await getSubjectAgg(uid, sid);
    // massBunk = class was cancelled; it must NOT count toward the attendance denominator
    const currentTotal = current.present + current.absent;
    const authorativeTotal = expectedFromClassInfo > 0 ? expectedFromClassInfo : currentTotal;

    const dailyAgg = await AttendanceRecord.aggregate([
      {
        $match: {
          userId:    new mongoose.Types.ObjectId(uid),
          subjectId: new mongoose.Types.ObjectId(sid),
          dailyMark: true,
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const dc = {};
    dailyAgg.forEach((r) => { dc[r._id] = r.count; });
    const lockedPresent  = dc.present || 0;
    const lockedAbsent   = dc.absent  || 0;
    // lockedMassBunk exists in storage but is excluded from the denominator
    const lockedMassBunk = dc.massBunk || 0;
    const lockedTotal    = lockedPresent + lockedAbsent; // massBunk excluded

    const newPresent = Math.max(
      lockedPresent,
      Math.min(parseInt(present) ?? lockedPresent, authorativeTotal)
    );
    if (isNaN(newPresent)) return res.status(400).json({ message: "Invalid present count" });

    await AttendanceRecord.deleteMany({ userId: uid, subjectId: sid, dailyMark: { $ne: true } });

    const remainingSlots = Math.max(0, authorativeTotal - lockedTotal);
    const extraPresent   = Math.max(0, Math.min(newPresent - lockedPresent, remainingSlots));
    const extraAbsent    = Math.max(0, remainingSlots - extraPresent);

    const docs = [
      ...Array.from({ length: extraPresent }, () => ({ userId: uid, subjectId: sid, status: "present", date: new Date(), dailyMark: false })),
      ...Array.from({ length: extraAbsent  }, () => ({ userId: uid, subjectId: sid, status: "absent",  date: new Date(), dailyMark: false })),
    ];
    if (docs.length) await AttendanceRecord.insertMany(docs);

    res.json(await getSubjectAgg(uid, sid));
  } catch (err) {
    console.error("ADVANCE:", err.message);
    res.status(500).json({ message: "Failed to update", detail: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   CLASS INFO
══════════════════════════════════════════════════════════════════════════════ */

router.get("/classinfo", protect, async (req, res) => {
  try {
    const info = await ClassInfo.findOne(getGroup(req.user));
    res.json(info || null);
  } catch (err) {
    console.error("GET CLASSINFO:", err.message);
    res.status(500).json({ message: "Failed to load class info", detail: err.message });
  }
});

router.post("/classinfo", protect, async (req, res) => {
  try {
    const { startDate, holidays = [], targetPct = 75 } = req.body;
    const group = getGroup(req.user);

    let totalClasses = 0;
    if (startDate) {
      const holidaySet = new Set(holidays.map((h) => new Date(h).toDateString()));
      for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0) continue;
        if (holidaySet.has(d.toDateString())) continue;
        totalClasses++;
      }
    }

    const info = await ClassInfo.findOneAndUpdate(
      group,
      { $set: { startDate, holidays, targetPct: Number(targetPct), totalClasses, updatedBy: req.user._id } },
      { new: true, upsert: true }
    );
    res.json(info);
  } catch (err) {
    console.error("POST CLASSINFO:", err.message);
    res.status(500).json({ message: "Failed to save class info", detail: err.message });
  }
});

export default router;