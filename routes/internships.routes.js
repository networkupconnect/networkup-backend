import express from "express";
import Internship from "../models/Internships.js";

const router = express.Router();

let lastApiFetch = 0;
const FETCH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

/* ── Type prettifier ────────────────────────────────────────────────────────── */
const TYPE_MAP = {
  FULL_TIME:"Full-time", FULLTIME:"Full-time",
  PART_TIME:"Part-time", PARTTIME:"Part-time",
  INTERN:"Internship", INTERNSHIP:"Internship",
  CONTRACT:"Contract", CONTRACTOR:"Contract",
  TEMPORARY:"Temporary",
};
function prettifyType(raw) {
  if (!raw) return "";
  const arr = Array.isArray(raw) ? raw : [raw];
  const str = arr.join(", ");
  return TYPE_MAP[str.toUpperCase().replace(/[- ]/g,"")] || str;
}

/* ══════════════════════════════════════════════════════════════════════════════
   SOURCE 1 — RapidAPI Internships
══════════════════════════════════════════════════════════════════════════════ */
function normaliseRapid(j) {
  let location = "";
  if (j.locations_raw?.length) {
    const addr = j.locations_raw[0]?.address || {};
    location = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(", ");
  }
  location = location || j.location || "";

  const type     = prettifyType(j.employment_type || j.type || "");
  const isRemote = !!(j.remote || j.is_remote || location.toLowerCase().includes("remote"));

  return {
    externalId:  `rapid_${j.id || `${j.title}-${j.organization}`}`,
    title:       j.title || "",
    company:     j.organization || j.company || "",
    location,
    type,
    url:         j.url || j.apply_url || "",
    description: (j.description || "").replace(/<[^>]+>/g, "").slice(0, 800),
    logo:        j.linkedin_org_logo_url || j.logo || "",
    remote:      isRemote,
    source:      "LinkedIn",
    postedAt:    j.date_posted || null,
    fetchedAt:   new Date(),
  };
}

async function syncRapidAPI() {
  if (!process.env.RAPIDAPI_KEY) return 0;

  const res = await fetch("https://internships-api.p.rapidapi.com/active-jb-7d?country=IN", {
    headers: {
      "x-rapidapi-key":  process.env.RAPIDAPI_KEY,
      "x-rapidapi-host": "internships-api.p.rapidapi.com",
      "Content-Type":    "application/json",
    },
  });

  if (res.status === 429) { console.warn("RapidAPI: rate limited"); return 0; }
  if (!res.ok) { console.warn(`RapidAPI: ${res.status}`); return 0; }

  const raw  = await res.json();
  const list = Array.isArray(raw) ? raw : (raw.data || raw.jobs || []);
  if (!list.length) return 0;

  await upsertMany(list.map(normaliseRapid));
  return list.length;
}

/* ══════════════════════════════════════════════════════════════════════════════
   SOURCE 2 — SerpAPI Google Jobs (India-focused)
   Searches multiple queries to get more coverage:
     "internship India", "software intern India", "engineering intern India"
══════════════════════════════════════════════════════════════════════════════ */
function normaliseSerp(j) {
  const loc = j.location || j.detected_extensions?.location || "";
  const isRemote = !!(loc.toLowerCase().includes("remote") || j.detected_extensions?.work_from_home);

  // Google Jobs apply link — prefer direct link over Google's redirect
  const url = j.apply_options?.[0]?.link || j.related_links?.[0]?.link || j.job_link || "";

  return {
    externalId:  `serp_${j.job_id || `${j.title}-${j.company_name}`}`,
    title:       j.title        || "",
    company:     j.company_name || "",
    location:    loc,
    type:        j.detected_extensions?.schedule_type || "",
    url,
    description: (j.description || "").replace(/<[^>]+>/g, "").slice(0, 800),
    logo:        j.thumbnail    || "",
    remote:      isRemote,
    source:      "Google Jobs",
    postedAt:    j.detected_extensions?.posted_at
                   ? new Date(j.detected_extensions.posted_at)
                   : null,
    fetchedAt:   new Date(),
  };
}

async function syncSerpAPI() {
  if (!process.env.SERP_API_KEY) return 0;

  const queries = [
    "internship in India 2025",
    "software engineering internship Bangalore Hyderabad Pune",
    "tech internship Delhi Mumbai Chennai India",
    "MBA internship India",
    "data science internship India",
    "marketing internship India",
  ];

  let total = 0;

  for (const q of queries) {
    try {
      const params = new URLSearchParams({
        engine:  "google_jobs",
        q,
        hl:      "en",
        gl:      "in",
        api_key: process.env.SERP_API_KEY,
      });

      const res  = await fetch(`https://serpapi.com/search?${params}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        console.warn(`SerpAPI "${q}": ${data.error || res.status}`);
        continue;
      }

      const jobs = data.jobs_results || [];
      console.log(`SerpAPI "${q}": ${jobs.length} jobs`);
      if (!jobs.length) continue;

      await upsertMany(jobs.map(normaliseSerp));
      total += jobs.length;

      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.warn(`SerpAPI query "${q}" failed:`, err.message);
    }
  }

  return total;
}

/* ══════════════════════════════════════════════════════════════════════════════
   SHARED — Upsert helper + sync orchestrator
══════════════════════════════════════════════════════════════════════════════ */
async function upsertMany(docs) {
  if (!docs.length) return;
  const ops = docs.map(doc => ({
    updateOne: {
      filter: { externalId: doc.externalId },
      update: { $set: doc },
      upsert: true,
    },
  }));
  await Internship.bulkWrite(ops, { ordered: false });
}

async function syncAll() {
  // Only use SerpAPI (gl=in) — RapidAPI returns global results regardless of country param
  const serpCount = await syncSerpAPI();
  console.log(`Internships synced — SerpAPI: ${serpCount}`);

  // Delete old RapidAPI (LinkedIn source) records — they are global, not India
  await Internship.deleteMany({ source: { $in: ["LinkedIn", "linkedin"] } });
  console.log("Cleaned up global LinkedIn listings from MongoDB");

  lastApiFetch = Date.now();
  return serpCount;
}

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/internships
══════════════════════════════════════════════════════════════════════════════ */
router.get("/", async (req, res) => {
  const { search = "", type = "", refresh = "" } = req.query;
  const now = Date.now();

  let synced = false, apiError = null;
  const shouldFetch = refresh === "1" || now - lastApiFetch > FETCH_INTERVAL;

  if (shouldFetch) {
    try {
      await syncAll();
      synced = true;
    } catch (err) {
      apiError = err.message;
      console.error("Internships syncAll error:", err.message);
    }
  }

  try {
    // Show India listings only — SerpAPI (gl=in) + India city names from RapidAPI
    const query = {
      $or: [
        { source: "Google Jobs" },
        { location: { $regex: "india|mumbai|delhi|bangalore|bengaluru|hyderabad|pune|chennai|kolkata|noida|gurgaon|gurugram|ahmedabad|jaipur|surat|kochi|remote", $options: "i" } },
      ],
    };

    if (search?.trim()) {
      query.$and = [{
        $or: [
          { title:    { $regex: search, $options: "i" } },
          { company:  { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } },
        ],
      }];
    }

    if (type?.trim() && type !== "All") {
      if (type.toLowerCase() === "remote") {
        query.remote = true;
      } else {
        query.type = { $regex: type, $options: "i" };
      }
    }

    const listings = await Internship.find(query)
      .sort({ fetchedAt: -1 })
      .limit(300)
      .lean();

    console.log("DB total records:", await Internship.countDocuments({}));
    console.log("DB query matches:", listings.length);

    return res.json({
      data:      listings,
      total:     listings.length,
      synced,
      apiError,
      fetchedAt: lastApiFetch || null,
    });

  } catch (dbErr) {
    console.error("Internships DB error:", dbErr.message);
    return res.status(500).json({ message: "Failed to load internships" });
  }
});

export default router;