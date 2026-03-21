import express from "express";
import Internship from "../models/Internships.js";

const router = express.Router();

let lastApiFetch = 0;
const FETCH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

/* ── Shared upsert ──────────────────────────────────────────────────────────── */
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

/* ── Safe fetch helper ──────────────────────────────────────────────────────── */
async function safeFetch(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

/* ══════════════════════════════════════════════════════════════════════════════
   SOURCE 1 — SerpAPI Google Jobs (India, 100 free/month)
══════════════════════════════════════════════════════════════════════════════ */
function normaliseSerp(j) {
  const loc      = j.location || "";
  const isRemote = !!(loc.toLowerCase().includes("remote") || j.detected_extensions?.work_from_home);
  const url      = j.apply_options?.[0]?.link || j.job_link || "";

  return {
    externalId:  `serp_${j.job_id || `${j.title}-${j.company_name}`}`,
    title:       j.title        || "",
    company:     j.company_name || "",
    location:    loc,
    type:        j.detected_extensions?.schedule_type || "Internship",
    url,
    description: (j.description || "").replace(/<[^>]+>/g, "").slice(0, 800),
    logo:        j.thumbnail || "",
    remote:      isRemote,
    source:      "Google Jobs",
    postedAt:    j.detected_extensions?.posted_at ? new Date(j.detected_extensions.posted_at) : null,
    fetchedAt:   new Date(),
  };
}

async function syncSerpAPI() {
  if (!process.env.SERP_API_KEY) return 0;

  // Limit to 2 queries to conserve the 100/month free quota
  const queries = [
    "internship India 2025",
    "software engineering internship Bangalore Hyderabad Pune Delhi",
  ];

  let total = 0;
  for (const q of queries) {
    try {
      const params = new URLSearchParams({ engine:"google_jobs", q, hl:"en", gl:"in", api_key:process.env.SERP_API_KEY });
      const { ok, data } = await safeFetch(`https://serpapi.com/search.json?${params}`);
      if (!ok || data.error) { console.warn(`SerpAPI "${q}":`, data.error || "failed"); continue; }
      const jobs = data.jobs_results || [];
      console.log(`SerpAPI "${q}": ${jobs.length} jobs`);
      await upsertMany(jobs.map(normaliseSerp));
      total += jobs.length;
      await new Promise(r => setTimeout(r, 400));
    } catch (err) { console.warn(`SerpAPI "${q}" error:`, err.message); }
  }
  return total;
}

/* ══════════════════════════════════════════════════════════════════════════════
   SOURCE 2 — Himalayas API (Free, no key, India filter)
   https://himalayas.app/jobs/api/search?q=internship&country=in
══════════════════════════════════════════════════════════════════════════════ */
function normaliseHimalayas(j) {
  const loc      = j.location || j.locationRestrictions?.join(", ") || "Remote";
  const isRemote = !!(j.remote || loc.toLowerCase().includes("remote"));

  return {
    externalId:  `him_${j.id || j.slug || `${j.title}-${j.companyName}`}`,
    title:       j.title       || "",
    company:     j.companyName || j.company?.name || "",
    location:    loc,
    type:        j.jobType     || "Internship",
    url:         j.applicationLink || j.url || `https://himalayas.app/jobs/${j.slug || ""}`,
    description: (j.description || j.descriptionHtml || "").replace(/<[^>]+>/g, "").slice(0, 800),
    logo:        j.companyLogo || j.company?.logo || "",
    remote:      isRemote,
    source:      "Himalayas",
    postedAt:    j.publishedAt ? new Date(j.publishedAt) : null,
    fetchedAt:   new Date(),
  };
}

async function syncHimalayas() {
  try {
    const queries = ["developer", "software", "data", "marketing", "design"];
    let total = 0;
    for (const q of queries) {
      const { ok, data } = await safeFetch(
        `https://himalayas.app/jobs/api/search?country=in&employmentType=Intern&query=${encodeURIComponent(q)}&limit=50`
      );
      if (!ok) { console.warn("Himalayas: failed for", q); continue; }
      const jobs = data.jobs || data.data || [];
      console.log(`Himalayas "${q}": ${jobs.length} jobs`);
      await upsertMany(jobs.map(normaliseHimalayas));
      total += jobs.length;
      await new Promise(r => setTimeout(r, 300));
    }
    return total;
  } catch (err) { console.warn("Himalayas error:", err.message); return 0; }
}

/* ══════════════════════════════════════════════════════════════════════════════
   SOURCE 3 — Remotive (Free, no key, remote tech/dev jobs)
   https://remotive.com/api/remote-jobs?category=software-dev
══════════════════════════════════════════════════════════════════════════════ */
function normaliseRemotive(j) {
  const isRemote = true; // Remotive is all-remote

  return {
    externalId:  `rem_${j.id || `${j.title}-${j.company_name}`}`,
    title:       j.title        || "",
    company:     j.company_name || "",
    location:    j.candidate_required_location || "Worldwide / Remote",
    type:        j.job_type     || "Full-time",
    url:         j.url          || "",
    description: (j.description || "").replace(/<[^>]+>/g, "").slice(0, 800),
    logo:        j.company_logo || "",
    remote:      isRemote,
    source:      "Remotive",
    postedAt:    j.publication_date ? new Date(j.publication_date) : null,
    fetchedAt:   new Date(),
  };
}

async function syncRemotive() {
  try {
    const categories = ["software-dev", "data", "devops-sysadmin", "design", "product"];
    let total = 0;
    for (const cat of categories) {
      const { ok, data } = await safeFetch(
        `https://remotive.com/api/remote-jobs?category=${cat}&search=intern&limit=50`
      );
      if (!ok) { console.warn("Remotive: failed for", cat); continue; }
      const jobs = data.jobs || [];
      const filtered = jobs.filter(j => {
        const loc = (j.candidate_required_location || "").toLowerCase();
        return !loc || loc.includes("worldwide") || loc.includes("india") ||
               loc.includes("asia") || loc.includes("apac") || loc.includes("anywhere");
      });
      console.log(`Remotive "${cat}": ${filtered.length}/${jobs.length} eligible`);
      await upsertMany(filtered.map(normaliseRemotive));
      total += filtered.length;
      await new Promise(r => setTimeout(r, 300));
    }
    return total;
  } catch (err) { console.warn("Remotive error:", err.message); return 0; }
}

/* ══════════════════════════════════════════════════════════════════════════════
   SOURCE 4 — RemoteOK (Free, no key, remote tech jobs)
   https://remoteok.com/api
══════════════════════════════════════════════════════════════════════════════ */
function normaliseRemoteOK(j) {
  return {
    externalId:  `rok_${j.id || j.slug || `${j.position}-${j.company}`}`,
    title:       j.position    || j.title || "",
    company:     j.company     || "",
    location:    j.location    || "Remote / Worldwide",
    type:        "Remote",
    url:         j.url         || `https://remoteok.com/remote-jobs/${j.slug || ""}`,
    description: (j.description || "").replace(/<[^>]+>/g, "").slice(0, 800),
    logo:        j.logo        || "",
    remote:      true,
    source:      "RemoteOK",
    postedAt:    j.date ? new Date(j.date) : null,
    fetchedAt:   new Date(),
  };
}

async function syncRemoteOK() {
  try {
    const { ok, data } = await safeFetch("https://remoteok.com/api?tag=internship", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; InternshipsBot/1.0)" },
    });
    if (!ok) { console.warn("RemoteOK: failed"); return 0; }
    const jobs = Array.isArray(data) ? data.filter(j => j.id && j.position) : [];
    console.log(`RemoteOK: ${jobs.length} internship-tagged jobs`);
    await upsertMany(jobs.map(normaliseRemoteOK));
    return jobs.length;
  } catch (err) { console.warn("RemoteOK error:", err.message); return 0; }
}

/* ══════════════════════════════════════════════════════════════════════════════
   SOURCE 5 — Jobicy (Free, no key, India/APAC filter)
   https://jobicy.com/api/v2/remote-jobs?geo=india
══════════════════════════════════════════════════════════════════════════════ */
function normaliseJobicy(j) {
  const loc      = j.jobGeo || j.jobLevel || "Remote";
  const isRemote = !!(j.jobType?.toLowerCase().includes("remote") || true);

  return {
    externalId:  `job_${j.id || `${j.jobTitle}-${j.companyName}`}`,
    title:       j.jobTitle    || "",
    company:     j.companyName || "",
    location:    loc,
    type:        j.jobType     || "Remote",
    url:         j.url         || "",
    description: (j.jobDescription || "").replace(/<[^>]+>/g, "").slice(0, 800),
    logo:        j.companyLogo || "",
    remote:      isRemote,
    source:      "Jobicy",
    postedAt:    j.pubDate ? new Date(j.pubDate) : null,
    fetchedAt:   new Date(),
  };
}

async function syncJobicy() {
  try {
    const endpoints = [
      "https://jobicy.com/api/v2/remote-jobs?geo=india&industry=dev&count=50",
      "https://jobicy.com/api/v2/remote-jobs?geo=apac&industry=dev&count=50",
      "https://jobicy.com/api/v2/remote-jobs?geo=india&industry=design&count=50",
      "https://jobicy.com/api/v2/remote-jobs?geo=apac&industry=marketing&count=50",
    ];
    let total = 0;
    for (const url of endpoints) {
      const { ok, data } = await safeFetch(url);
      if (!ok) { console.warn("Jobicy: failed for", url); continue; }
      const jobs = data.jobs || [];
      console.log(`Jobicy (${url.split("geo=")[1]?.split("&")[0]}): ${jobs.length} jobs`);
      await upsertMany(jobs.map(normaliseJobicy));
      total += jobs.length;
      await new Promise(r => setTimeout(r, 300));
    }
    return total;
  } catch (err) { console.warn("Jobicy error:", err.message); return 0; }
}

/* ══════════════════════════════════════════════════════════════════════════════
   SYNC ALL SOURCES
══════════════════════════════════════════════════════════════════════════════ */
async function syncAll() {
  // Delete old global LinkedIn/RapidAPI records
  await Internship.deleteMany({ source: { $in: ["LinkedIn", "linkedin"] } });

  // Run all free sources in parallel, SerpAPI sequentially (rate limit)
  const [himCount, remCount, rokCount, jobCount] = await Promise.all([
    syncHimalayas(),
    syncRemotive(),
    syncRemoteOK(),
    syncJobicy(),
  ]);

  // SerpAPI last (sequential queries internally)
  const serpCount = await syncSerpAPI();

  const total = himCount + remCount + rokCount + jobCount + serpCount;
  console.log(`Internships synced — Himalayas:${himCount} Remotive:${remCount} RemoteOK:${rokCount} Jobicy:${jobCount} SerpAPI:${serpCount} | Total:${total}`);

  lastApiFetch = Date.now();
  return total;
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
    try { await syncAll(); synced = true; }
    catch (err) { apiError = err.message; console.error("syncAll error:", err.message); }
  }

  try {
    // Serve all sources except old LinkedIn/global ones
    const query = {
      source: { $nin: ["LinkedIn", "linkedin"] },
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
      .sort({ postedAt: -1, fetchedAt: -1 })
      .limit(300)
      .lean();

    console.log(`Serving ${listings.length} internships`);

    return res.json({
      data:      listings,
      total:     listings.length,
      synced,
      apiError,
      fetchedAt: lastApiFetch || null,
    });

  } catch (dbErr) {
    console.error("DB error:", dbErr.message);
    return res.status(500).json({ message: "Failed to load internships" });
  }
});

export default router;