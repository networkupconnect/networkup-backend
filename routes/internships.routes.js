import express from "express";

const router = express.Router();

/* ── Simple in-memory cache (6 hours) ───────────────────────────────────────
   Avoids hammering the RapidAPI quota on every page load.
   Resets on server restart — fine for this use case.
────────────────────────────────────────────────────────────────────────────── */
let cache = { data: null, fetchedAt: 0 };
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in ms

/* ── GET /api/jobs ───────────────────────────────────────────────────────────
   Query params:
     ?search=  — filter by title / company (client-side after fetch)
     ?type=    — "internship" | "full-time" | "part-time" | "contract" | ""
     ?refresh= — set to "1" to force a fresh fetch (bypass cache)
────────────────────────────────────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const { search = "", type = "", refresh = "" } = req.query;
    const now = Date.now();

    // Serve from cache unless stale or forced refresh
    if (!refresh && cache.data && now - cache.fetchedAt < CACHE_TTL) {
      const filtered = applyFilters(cache.data, search, type);
      return res.json({ data: filtered, cached: true, fetchedAt: cache.fetchedAt });
    }

    // Fetch fresh data from RapidAPI
    const response = await fetch("https://internships-api.p.rapidapi.com/active-jb-7d", {
      method: "GET",
      headers: {
        "x-rapidapi-key":  process.env.RAPIDAPI_KEY,
        "x-rapidapi-host": "internships-api.p.rapidapi.com",
        "Content-Type":    "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`RapidAPI responded with ${response.status}`);
    }

    const raw = await response.json();

    // Normalise — the API returns an array directly or { data: [...] }
    const list = Array.isArray(raw) ? raw : (raw.data || raw.jobs || []);

    cache = { data: list, fetchedAt: now };

    const filtered = applyFilters(list, search, type);
    res.json({ data: filtered, cached: false, fetchedAt: now });

  } catch (err) {
    console.error("GET /api/jobs:", err.message);

    // Return stale cache rather than an error if we have one
    if (cache.data) {
      const { search = "", type = "" } = req.query;
      return res.json({ data: applyFilters(cache.data, search, type), cached: true, stale: true, fetchedAt: cache.fetchedAt });
    }

    res.status(500).json({ message: "Failed to fetch internships", detail: err.message });
  }
});

/* ── Filter helper ─────────────────────────────────────────────────────────── */
function applyFilters(list, search, type) {
  let out = list;

  if (search?.trim()) {
    const q = search.toLowerCase();
    out = out.filter(j =>
      j.title?.toLowerCase().includes(q) ||
      j.company?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q)
    );
  }

  if (type?.trim()) {
    out = out.filter(j =>
      j.type?.toLowerCase().includes(type.toLowerCase()) ||
      j.employment_type?.toLowerCase().includes(type.toLowerCase())
    );
  }

  return out;
}

export default router;