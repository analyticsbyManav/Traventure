// In dev, Vite's proxy forwards "/api" to the local backend (see vite.config.js).
// In production there's no proxy, so the deployed frontend needs the real
// backend URL - set VITE_API_BASE_URL when building/hosting it.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function fetchIconicPlaces() {
  const res = await fetch(`${BASE_URL}/iconic-places`);
  if (!res.ok) {
    throw new Error("Failed to fetch iconic places");
  }
  return res.json();
}

export async function fetchPlaces(city, interests) {
  const params = new URLSearchParams({ city, interests: interests.join(",") });
  const res = await fetch(`${BASE_URL}/places?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.details?.includes("Could not find a location")) {
      throw new Error(err.details);
    }
    throw new Error("Real-time place data is briefly unavailable (the free map service is overloaded) — please hit Generate again.");
  }
  return res.json();
}

export async function generateItinerary({ city, numDays, budget, interests, places }) {
  const res = await fetch(`${BASE_URL}/generate-itinerary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, numDays, budget, interests, places }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate itinerary");
  }
  return res.json();
}

export async function predictCost({ city, budgetTier, groupSize, season, itinerary }) {
  const res = await fetch(`${BASE_URL}/predict-cost`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      city,
      budget_tier: budgetTier,
      group_size: groupSize,
      season,
      itinerary,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to predict cost");
  }
  return res.json();
}
