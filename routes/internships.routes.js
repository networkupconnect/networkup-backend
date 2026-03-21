import express from "express";
import Internship from "../models/Internships.js";

const router = express.Router();

/* ── In-memory flag to avoid re-fetching within the same 6hr window ─────────
   MongoDB is the persistent cache — this just prevents hammering the API
   on every request within the same server session.
────────────────────────────────────────────────────────────────────────────── */
let lastApiFetch = 0;
const FETCH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

/* ── Normalise raw API job into our schema ────────────────────────────────── */
function normalise(j) {
  return {
    externalId:  String(j.id || j._id || j.job_id || `${j.title}-${j.company}`),
    title:       j.title        || j.job_title        || "",
    company:     j.company      || j.employer_name    || j.organization || "",
    location:    j.location     || j.job_location     || j.city         || "",
    type:        j.type         || j.employment_type  || j.job_type     || "",
    url:         j.url          || j.job_url          || j.apply_url    || j.link || "",
    description: (j.description || j.job_description  || "").slice(0, 1000),
    logo:        j.company_logo || j.logo             || "",
    remote:      !!(j.remote    || j.is_remote        || String(j.location || "").toLowerCase().includes("remote")),
    source:      j.source       || "",
    postedAt:    j.date_posted  || j.posted_at        || j.createdAt    || null,
    fetchedAt:   new Date(),
  };
}

/* ── Try to fetch fresh listings from RapidAPI and upsert into MongoDB ───── */
async function syncFromAPI() {
  const response = await fetch("https://internships-api.p.rapidapi.com/active-jb-7d", {
    method: "GET",
    headers: {
      "x-rapidapi-key":  process.env.RAPIDAPI_KEY,
      "x-rapidapi-host": "internships-api.p.rapidapi.com",
      "Content-Type":    "application/json",
    },
  });

  if (response.status === 429) {
    throw new Error("RATE_LIMITED");
  }

  if (!response.ok) {
    throw new Error(`API_ERROR_${response.status}`);
  }

  const raw = await response.json();
  const list = Array.isArray(raw) ? raw : (raw.data || raw.jobs || []);

  if (!list.length) return 0;

  // Upsert each listing by externalId — update if exists, insert if new
  const ops = list.map(j => {
    const doc = normalise(j);
    return {
      updateOne: {
        filter: { externalId: doc.externalId },
        update: { $set: doc },
        upsert: true,
      },
    };
  });

  await Internship.bulkWrite(ops, { ordered: false });
  lastApiFetch = Date.now();
  return list.length;
}

/* ── GET /api/internships ────────────────────────────────────────────────────
   1. If within 6hr window → skip API call, serve straight from MongoDB
   2. Otherwise → try to sync from API, then serve from MongoDB
   3. On rate limit / API error → still serve from MongoDB (stale is fine)
────────────────────────────────────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  const { search = "", type = "", refresh = "" } = req.query;
  const now = Date.now();

  let synced = false;
  let rateLimited = false;
  let apiError = null;

  const shouldFetch = refresh === "1" || now - lastApiFetch > FETCH_INTERVAL;

  if (shouldFetch) {
    try {
      const count = await syncFromAPI();
      synced = true;
      console.log(`Internships synced: ${count} listings saved to MongoDB`);
    } catch (err) {
      if (err.message === "RATE_LIMITED") {
        rateLimited = true;
        console.warn("Internships: RapidAPI rate limited — serving from MongoDB");
      } else {
        apiError = err.message;
        console.error("Internships API error:", err.message);
      }
    }
  }

  // Always serve from MongoDB — even if API failed we have stored data
  try {
    const query = {};

    if (search?.trim()) {
      query.$or = [
        { title:    { $regex: search, $options: "i" } },
        { company:  { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    if (type?.trim() && type !== "All") {
      if (type.toLowerCase() === "remote") {
        query.remote = true;
      } else {
        query.type = { $regex: type, $options: "i" };
      }
    }

    const listings = await Internship.find(query)
      .sort({ fetchedAt: -1, postedAt: -1 })
      .limit(200)
      .lean();

    return res.json({
      data:        listings,
      total:       listings.length,
      synced,
      rateLimited,
      apiError,
      fetchedAt:   lastApiFetch || null,
    });

  } catch (dbErr) {
    console.error("Internships DB error:", dbErr.message);
    return res.status(500).json({ message: "Failed to load internships" });
  }
});

export default router;