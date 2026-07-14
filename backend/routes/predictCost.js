const express = require("express");
const fetch = require("node-fetch");

const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

// Expects the same itinerary shape returned by /api/generate-itinerary,
// plus the original trip preferences (budget_tier, group_size, season).
router.post("/", async (req, res) => {
  const { city, budget_tier, group_size, season, avg_place_rating, itinerary } = req.body;

  if (!city || !itinerary || !Array.isArray(itinerary.days)) {
    return res.status(400).json({
      error: "Request must include city, budget_tier, and an itinerary object with a days[] array",
    });
  }

  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/predict-cost`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city,
        num_days: itinerary.days.length,
        budget_tier: budget_tier || "medium",
        group_size: group_size || 1,
        season: season || "shoulder",
        avg_place_rating: avg_place_rating || 4.0,
        days: itinerary.days,
      }),
    });

    if (!mlResponse.ok) {
      const errText = await mlResponse.text();
      throw new Error(`ML service error ${mlResponse.status}: ${errText}`);
    }

    const prediction = await mlResponse.json();
    res.json(prediction);
  } catch (err) {
    console.error("Error calling ML cost prediction service:", err.message);
    res.status(502).json({
      error: "Cost prediction service unavailable",
      details: err.message,
      hint: "Is the ML service running? cd ml-service && uvicorn app:app --port 8001",
    });
  }
});

module.exports = router;
