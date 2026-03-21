import express from "express";
import Internship from "../models/Internships.js";

const router = express.Router();

let lastApiFetch = 0;
const FETCH_INTERVAL = 6 * 60 * 60 * 1000;

/* ── Normalise raw API job → our schema ─────────────────────────────────────
   Actual field names from internships-api.p.rapidapi.com/active-jb-7d:
   id, title, organization, organization_url, date_posted, date_created,
   locations_raw[{address:{addressLocality, addressRegion, addressCountry}}],
   employment_type, url (apply link), description, linkedin_org_logo_url
────────────────────────────────────────────────────────────────────────────── */
function normalise(j) {
  // Extract location from locations_raw array
  let location = "";
  if (j.locations_raw?.length) {
    const addr = j.locations_raw[0]?.address || {};
    const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
    location = parts.join(", ");
  }
  location = location || j.location || j.job_location || "";

  // employment_type can be an array ["FULL_TIME"] or a string
  const empTypeRaw = Array.isArray(j.employment_type)
    ? j.employment_type.join(", ")
    : (j.employment_type || j.type || j.job_type || "");

  // Prettify type: "FULL_TIME" → "Full-time", "INTERN" → "Internship"
  const typeMap = { FULL_TIME:"Full-time", PART_TIME:"Part-time", INTERN:"Internship", INTERNSHIP:"Internship", CONTRACT:"Contract", TEMPORARY:"Temporary" };
  const type = typeMap[empTypeRaw.toUpperCase()] || empTypeRaw;

  // Remote detection
  const isRemote = !!(
    j.remote ||
    j.is_remote ||
    location.toLowerCase().includes("remote") ||
    empTypeRaw.toLowerCase().includes("remote")
  );

  return {
    externalId:  String(j.id || j._id || `${j.title}-${j.organization}`),
    title:       j.title             || "",
    company:     j.organization      || j.company || j.employer_name || "",
    location,
    type,
    url:         j.url               || j.apply_url || j.job_url || j.link || "",
    description: (j.description      || j.job_description || "").replace(/<[^>]+>/g, "").slice(0, 800),
    logo:        j.linkedin_org_logo_url || j.company_logo || j.logo || "",
    remote:      isRemote,
    source:      j.source            || "LinkedIn",
    postedAt:    j.date_posted       || j.posted_at || null,
    fetchedAt:   new Date(),
  };
}

/* ── Sync from RapidAPI → upsert into MongoDB ──────────────────────────────── */
async function syncFromAPI() {
  const response = await fetch("https://internships-api.p.rapidapi.com/active-jb-7d?country=IN", {
    method: "GET",
    headers: {
      "x-rapidapi-key":  process.env.RAPIDAPI_KEY,
      "x-rapidapi-host": "internships-api.p.rapidapi.com",
      "Content-Type":    "application/json",
    },
  });

  if (response.status === 429) throw new Error("RATE_LIMITED");
  if (!response.ok)            throw new Error(`API_ERROR_${response.status}`);

  const raw  = await response.json();
  const list = Array.isArray(raw) ? raw : (raw.data || raw.jobs || []);

  if (!list.length) return 0;

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

/* ── GET /api/internships ──────────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  const { search = "", type = "", refresh = "" } = req.query;
  const now = Date.now();

  let synced = false, rateLimited = false, apiError = null;
  const shouldFetch = refresh === "1" || now - lastApiFetch > FETCH_INTERVAL;

  if (shouldFetch) {
    try {
      const count = await syncFromAPI();
      synced = true;
      console.log(`Internships synced: ${count} saved to MongoDB`);
    } catch (err) {
      if (err.message === "RATE_LIMITED") {
        rateLimited = true;
        console.warn("Internships: rate limited — serving from MongoDB");
      } else {
        apiError = err.message;
        console.error("Internships API error:", err.message);
      }
    }
  }

  try {
    const query = {
      // Only show India-based listings
      $or: [
        { location: { $regex: "india|IN$|mumbai|delhi|bangalore|bengaluru|hyderabad|pune|chennai|kolkata|noida|gurgaon|gurugram|ahmedabad|jaipur|remote", $options: "i" } },
        { location: "" },  // include listings with no location set
      ],
    };

    if (search?.trim()) {
      query.$or = [
        { title:   { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { location:{ $regex: search, $options: "i" } },
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
      .sort({ postedAt: -1, fetchedAt: -1 })
      .limit(200)
      .lean();

    return res.json({
      data:       listings,
      total:      listings.length,
      synced,
      rateLimited,
      apiError,
      fetchedAt:  lastApiFetch || null,
    });

  } catch (dbErr) {
    console.error("Internships DB error:", dbErr.message);
    return res.status(500).json({ message: "Failed to load internships" });
  }
});

export default router;