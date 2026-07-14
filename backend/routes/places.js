const express = require("express");
const fetch = require("node-fetch");
const { geocodeCity } = require("../utils/geocode");

const router = express.Router();

// Maps our friendly interest tags to OpenStreetMap tags used by Overpass.
// Extend this as you find more categories you want to support.
const INTEREST_TAG_MAP = {
  history: ['"historic"'],
  food: ['"amenity"="restaurant"', '"amenity"="cafe"'],
  nature: ['"leisure"="park"', '"natural"="water"'],
  nightlife: ['"amenity"="bar"', '"amenity"="nightclub"'],
  shopping: ['"shop"="mall"', '"shop"="department_store"'],
  culture: ['"tourism"="museum"', '"tourism"="gallery"'],
};

function buildOverpassQuery(lat, lng, radiusMeters, interests) {
  // Always include generic "tourism" attractions regardless of interest tags,
  // so we never return an empty list.
  const tagFilters = ['"tourism"="attraction"', '"tourism"="viewpoint"'];

  interests.forEach((interest) => {
    if (INTEREST_TAG_MAP[interest]) {
      tagFilters.push(...INTEREST_TAG_MAP[interest]);
    }
  });

  const nodeQueries = tagFilters
    .map((tag) => `node[${tag}](around:${radiusMeters},${lat},${lng});`)
    .join("\n");

  return `
    [out:json][timeout:25];
    (
      ${nodeQueries}
    );
    out body 60;
  `;
}

// Public Overpass instances, tried in order until one responds.
// The main overpass-api.de endpoint has been blocking requests with a bare
// 406 from Apache (unrelated to query content), so we fail over to mirrors.
const OVERPASS_ENDPOINTS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

async function queryOverpass(query) {
  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const overpassRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: query,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!overpassRes.ok) {
        lastError = new Error(`${endpoint} failed with status ${overpassRes.status}`);
        continue;
      }
      return await overpassRes.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("All Overpass endpoints failed");
}

router.get("/", async (req, res) => {
  const city = req.query.city;
  const interests = (req.query.interests || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!city) {
    return res.status(400).json({ error: "Query param 'city' is required" });
  }

  try {
    const location = await geocodeCity(city);
    const query = buildOverpassQuery(location.lat, location.lng, 6000, interests);

    const data = await queryOverpass(query);

    const places = (data.elements || [])
      .filter((el) => el.tags && el.tags.name) // skip unnamed nodes
      .map((el) => ({
        name: el.tags.name,
        category:
          el.tags.tourism || el.tags.amenity || el.tags.leisure || el.tags.shop || "point_of_interest",
        lat: el.lat,
        lng: el.lon,
      }))
      // de-duplicate by name
      .filter((place, idx, arr) => arr.findIndex((p) => p.name === place.name) === idx)
      .slice(0, 40);

    res.json({
      city: location.displayName,
      center: { lat: location.lat, lng: location.lng },
      count: places.length,
      places,
    });
  } catch (err) {
    console.error("Error fetching places:", err.message);
    res.status(500).json({ error: "Failed to fetch places", details: err.message });
  }
});

module.exports = router;
