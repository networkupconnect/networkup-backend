import mongoose from "mongoose";



// ─── AttendanceSubject ────────────────────────────────────────────────────────
const attendanceSubjectSchema = new mongoose.Schema(
  {
    name:               { type: String, required: true },
    totalClassesPerDay: { type: Number, default: 1 },
    days: [{ type: String, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] }],
    course:    { type: String, default: "default" },
    year:      { type: String, default: "default" },
    section:   { type: String, default: "default" }, // section (yr1) or branch (yr2+) stored here
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

if (mongoose.modelNames().includes("AttendanceSubject")) mongoose.deleteModel("AttendanceSubject");
export const AttendanceSubject = mongoose.model("AttendanceSubject", attendanceSubjectSchema);


// ─── AttendanceRecord ─────────────────────────────────────────────────────────
const attendanceRecordSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceSubject", required: true },
    status:    { type: String, enum: ["present", "absent", "massBunk"], required: true },
    date:      { type: Date, default: Date.now },
    // dailyMark = true  → marked via calendar UI (date-specific, locked)
    // dailyMark = false → set via advance/bulk entry
    dailyMark: { type: Boolean, default: false },
    // backfillThrough: set only on backfill records. Represents the end date
    // of the period this record covers — used for range-aware queries.
    backfillThrough: { type: Date, default: null },
  },
  { timestamps: true }
);

attendanceRecordSchema.index({ userId: 1, subjectId: 1 });
attendanceRecordSchema.index({ userId: 1, subjectId: 1, date: 1, dailyMark: 1 });

if (mongoose.modelNames().includes("AttendanceRecord")) mongoose.deleteModel("AttendanceRecord");
export const AttendanceRecord = mongoose.model("AttendanceRecord", attendanceRecordSchema);


// ─── ClassInfo ────────────────────────────────────────────────────────────────
const classInfoSchema = new mongoose.Schema(
  {
    course:       { type: String, default: "default" },
    year:         { type: String, default: "default" },
    section:      { type: String, default: "default" },
    startDate:    { type: Date },
    holidays:     [{ type: String }],   // array of YYYY-MM-DD strings
    targetPct:    { type: Number, default: 75 },
    totalClasses: { type: Number, default: 0 },
    updatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

classInfoSchema.index({ course: 1, year: 1, section: 1 }, { unique: true });

if (mongoose.modelNames().includes("ClassInfo")) mongoose.deleteModel("ClassInfo");
export const ClassInfo = mongoose.model("ClassInfo", classInfoSchema);


// ─── PersonalRange ────────────────────────────────────────────────────────────
// Each student can create their own named date ranges (e.g. "Term 1", "Mid-sem").
// These are personal — not shared across students.
const personalRangeSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name:      { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate:   { type: Date },  // null/undefined = up to today
  },
  { timestamps: true }
);

personalRangeSchema.index({ userId: 1, startDate: 1 });

if (mongoose.modelNames().includes("PersonalRange")) mongoose.deleteModel("PersonalRange");
export const PersonalRange = mongoose.model("PersonalRange", personalRangeSchema);