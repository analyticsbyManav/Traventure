// Deterministic, zero-cost itinerary builder. Runs entirely on the real
// places data already fetched from OpenStreetMap - no external AI API, no
// billing, no API key required. Used as the default generator, and as an
// automatic fallback whenever the optional Claude integration is unavailable
// (missing key, no credits, network error, etc.) so the app never breaks.

const SIGHTSEEING_CATEGORIES = new Set([
  "attraction", "viewpoint", "museum", "gallery", "park", "monument",
  "artwork", "water", "historic", "point_of_interest",
]);
const FOOD_CATEGORIES = new Set(["restaurant", "cafe"]);
const LEISURE_CATEGORIES = new Set(["bar", "nightclub", "mall", "department_store"]);

const INTEREST_PREFERRED_CATEGORIES = {
  history: new Set(["historic", "monument", "attraction"]),
  culture: new Set(["museum", "gallery"]),
  nature: new Set(["park", "water", "viewpoint"]),
  food: new Set(["restaurant", "cafe"]),
  nightlife: new Set(["bar", "nightclub"]),
  shopping: new Set(["mall", "department_store"]),
};

const CATEGORY_LABELS = {
  attraction: "attraction",
  viewpoint: "viewpoint",
  museum: "museum",
  gallery: "art gallery",
  park: "park",
  monument: "monument",
  artwork: "landmark",
  water: "waterfront spot",
  historic: "historic site",
  restaurant: "restaurant",
  cafe: "café",
  bar: "bar",
  nightclub: "nightclub",
  mall: "shopping mall",
  department_store: "department store",
  point_of_interest: "landmark",
};

function bucketOf(category) {
  if (FOOD_CATEGORIES.has(category)) return "food";
  if (LEISURE_CATEGORIES.has(category)) return "leisure";
  return "sightseeing"; // default bucket, covers SIGHTSEEING_CATEGORIES + anything unrecognized
}

function describeSlot(place, timeOfDay) {
  const label = CATEGORY_LABELS[place.category] || "spot";
  if (FOOD_CATEGORIES.has(place.category)) {
    return `Grab a ${timeOfDay === "morning" ? "bite" : "meal"} at ${place.name}, a local ${label}.`;
  }
  if (LEISURE_CATEGORIES.has(place.category)) {
    return `Wind down at ${place.name}, a popular ${label}.`;
  }
  return `Explore ${place.name}, a notable ${label}.`;
}

// Sorts a bucket so places matching the traveler's chosen interests come first.
function prioritize(places, interests) {
  const preferredCategories = new Set();
  interests.forEach((interest) => {
    const cats = INTEREST_PREFERRED_CATEGORIES[interest];
    if (cats) cats.forEach((c) => preferredCategories.add(c));
  });

  return [...places].sort((a, b) => {
    const aPreferred = preferredCategories.has(a.category) ? 0 : 1;
    const bPreferred = preferredCategories.has(b.category) ? 0 : 1;
    return aPreferred - bPreferred;
  });
}

function buildFreeItinerary({ city, numDays, interests = [] }, places) {
  const named = places.filter((p) => p.name);
  const buckets = { sightseeing: [], food: [], leisure: [] };
  named.forEach((p) => buckets[bucketOf(p.category)].push(p));

  buckets.sightseeing = prioritize(buckets.sightseeing, interests);
  buckets.food = prioritize(buckets.food, interests);
  buckets.leisure = prioritize(buckets.leisure, interests);

  // Cursor per bucket - cycles back to the start (repeats) once exhausted,
  // rather than failing, so short place lists can still fill every day.
  const cursors = { sightseeing: 0, food: 0, leisure: 0 };

  function nextFrom(bucketName, fallbackBucketName) {
    const bucket = buckets[bucketName].length ? bucketName : fallbackBucketName;
    const list = buckets[bucket];
    if (!list || !list.length) return null;
    const place = list[cursors[bucket] % list.length];
    cursors[bucket] += 1;
    return place;
  }

  const days = [];
  for (let dayNum = 1; dayNum <= numDays; dayNum++) {
    const slots = [];
    const plan = [
      { timeOfDay: "morning", bucket: "sightseeing", fallback: "leisure" },
      { timeOfDay: "afternoon", bucket: "food", fallback: "sightseeing" },
      { timeOfDay: "evening", bucket: "leisure", fallback: "sightseeing" },
    ];

    plan.forEach(({ timeOfDay, bucket, fallback }) => {
      const place = nextFrom(bucket, fallback);
      if (!place) {
        slots.push({
          time_of_day: timeOfDay,
          place_name: `Free time in ${city}`,
          category: "leisure",
          description: "Nothing scheduled here - a good gap for resting or wandering on your own.",
        });
        return;
      }
      slots.push({
        time_of_day: timeOfDay,
        place_name: place.name,
        category: place.category,
        lat: place.lat,
        lng: place.lng,
        description: describeSlot(place, timeOfDay),
      });
    });

    days.push({ day_number: dayNum, slots });
  }

  return { days };
}

module.exports = { buildFreeItinerary };
