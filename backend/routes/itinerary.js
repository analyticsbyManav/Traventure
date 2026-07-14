const express = require("express");
const fetch = require("node-fetch");
const { buildFreeItinerary } = require("../utils/freeItinerary");

const router = express.Router();

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
// Haiku is faster/cheaper and plenty capable for this structured-selection task.
// Swap to "claude-sonnet-5" if you want stronger reasoning for complex trips.
const MODEL = "claude-haiku-4-5-20251001";

function buildSystemPrompt() {
  return `You are a travel itinerary planning engine.
You will be given a list of real places (with name, category, lat, lng) and trip constraints.

Rules:
1. Only use places from the provided list. Never invent places.
2. Distribute places across the requested number of days.
3. Each day should have a morning, afternoon, and evening slot where possible.
4. Group geographically close places on the same day where you can.
5. Respect the budget tier when choosing between similar options.
6. Do not repeat the same place across multiple days unless the list is too short to avoid it.
7. Respond with ONLY valid JSON matching this schema, no other text, no markdown fences:

{
  "days": [
    {
      "day_number": 1,
      "slots": [
        { "time_of_day": "morning", "place_name": "...", "category": "...", "lat": 0.0, "lng": 0.0, "description": "..." }
      ]
    }
  ]
}`;
}

function buildUserPrompt({ city, numDays, budget, interests, places }) {
  return `Trip details:
- City: ${city}
- Number of days: ${numDays}
- Budget tier: ${budget}
- Interests: ${interests.join(", ") || "general sightseeing"}

Available places (JSON):
${JSON.stringify(places, null, 2)}

Generate the itinerary now, following the schema exactly.`;
}

function extractJson(text) {
  // Strip accidental markdown fences if the model adds them despite instructions
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

function validateItinerary(itinerary, places, numDays) {
  if (!itinerary || !Array.isArray(itinerary.days)) {
    throw new Error("Itinerary missing 'days' array");
  }
  if (itinerary.days.length !== numDays) {
    throw new Error(`Expected ${numDays} days, got ${itinerary.days.length}`);
  }

  const validNames = new Set(places.map((p) => p.name));
  for (const day of itinerary.days) {
    for (const slot of day.slots || []) {
      if (!validNames.has(slot.place_name)) {
        throw new Error(`Place "${slot.place_name}" was not in the provided list`);
      }
    }
  }
  return true;
}

async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

router.post("/", async (req, res) => {
  const { city, numDays, budget, interests, places } = req.body;

  if (!city || !numDays || !places || !Array.isArray(places) || places.length === 0) {
    return res.status(400).json({
      error: "Request must include city, numDays, budget, interests[], and a non-empty places[] array",
    });
  }

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  const tripDetails = { city, numDays, budget: budget || "medium", interests: interests || [] };

  // The free, rule-based generator is the default - it runs entirely on the
  // real places data already fetched from OpenStreetMap, so the app always
  // works with no API key, no billing, and no external dependency. Claude is
  // only used as an opportunistic upgrade when a working key is configured,
  // and any failure (no credits, network error, bad response) falls straight
  // back to the free generator instead of erroring out.
  if (!hasApiKey) {
    const itinerary = buildFreeItinerary(tripDetails, places);
    return res.json({ city, numDays, budget, interests, itinerary, source: "free" });
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ ...tripDetails, places });

  try {
    let rawText = await callClaude(systemPrompt, userPrompt);
    let itinerary;

    try {
      itinerary = extractJson(rawText);
      validateItinerary(itinerary, places, numDays);
    } catch (parseErr) {
      // One retry with a stricter corrective nudge, per the blueprint's validation strategy
      console.warn("First itinerary attempt invalid, retrying:", parseErr.message);
      const retryPrompt = `${userPrompt}\n\nIMPORTANT: Your previous response was invalid (${parseErr.message}). Respond with ONLY the raw JSON object, matching the schema exactly, using only place names from the provided list.`;
      rawText = await callClaude(systemPrompt, retryPrompt);
      itinerary = extractJson(rawText);
      validateItinerary(itinerary, places, numDays);
    }

    res.json({ city, numDays, budget, interests, itinerary, source: "claude" });
  } catch (err) {
    console.warn("Claude itinerary generation failed, falling back to free generator:", err.message);
    const itinerary = buildFreeItinerary(tripDetails, places);
    res.json({ city, numDays, budget, interests, itinerary, source: "free" });
  }
});

module.exports = router;
