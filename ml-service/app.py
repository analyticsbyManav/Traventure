"""
app.py

FastAPI microservice that serves the trained trip-cost model.
The Node backend calls this after Claude generates an itinerary,
passing in the itinerary's actual composition (days, places, category
mix, budget tier, etc.) to get a predicted total cost.

Run: uvicorn app:app --reload --port 8001
"""

from collections import Counter
from typing import List, Optional

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from generate_data import CITY_COST_INDEX, CATEGORIES

app = FastAPI(title="Traventure Trip Cost Predictor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for a student project / local dev
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_BUNDLE = joblib.load("model/trip_cost_model.joblib")
PIPELINE = MODEL_BUNDLE["pipeline"]
NUMERIC_FEATURES = MODEL_BUNDLE["numeric_features"]
CATEGORICAL_FEATURES = MODEL_BUNDLE["categorical_features"]

DEFAULT_CITY_COST_INDEX = 1.1  # used when the destination isn't in our lookup table


class Slot(BaseModel):
    place_name: str
    category: Optional[str] = "attraction"
    time_of_day: Optional[str] = None


class Day(BaseModel):
    day_number: int
    slots: List[Slot] = []


class CostPredictionRequest(BaseModel):
    city: str
    num_days: int
    budget_tier: str  # "low" | "medium" | "high"
    group_size: int = 1
    season: str = "shoulder"  # "peak" | "off_peak" | "shoulder"
    avg_place_rating: float = 4.0
    days: List[Day]


# Maps free-form OSM/Overpass category strings to our 6 training categories.
CATEGORY_ALIAS = {
    "museum": "culture", "gallery": "culture", "artwork": "culture",
    "attraction": "history", "viewpoint": "nature", "historic": "history",
    "monument": "history", "park": "nature", "water": "nature",
    "restaurant": "food", "cafe": "food", "bar": "nightlife",
    "nightclub": "nightlife", "mall": "shopping", "department_store": "shopping",
}


def compute_category_mix(days: List[Day]) -> dict:
    counts = Counter()
    total = 0
    for day in days:
        for slot in day.slots:
            cat = CATEGORY_ALIAS.get((slot.category or "").lower(), "history")
            counts[cat] += 1
            total += 1

    if total == 0:
        # even distribution fallback if itinerary had no slots
        return {c: 1 / len(CATEGORIES) for c in CATEGORIES}

    return {c: counts.get(c, 0) / total for c in CATEGORIES}


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_BUNDLE["model_name"], "r2": MODEL_BUNDLE["metrics"]["r2"]}


@app.post("/predict-cost")
def predict_cost(req: CostPredictionRequest):
    if req.budget_tier not in ("low", "medium", "high"):
        raise HTTPException(400, "budget_tier must be one of: low, medium, high")

    cost_index = CITY_COST_INDEX.get(req.city.strip().title(), DEFAULT_CITY_COST_INDEX)
    num_places = sum(len(d.slots) for d in req.days) or req.num_days * 3
    mix = compute_category_mix(req.days)

    row = {
        "city_cost_index": cost_index,
        "num_days": req.num_days,
        "group_size": req.group_size,
        "avg_place_rating": req.avg_place_rating,
        "num_places": num_places,
        "pct_history": mix["history"],
        "pct_culture": mix["culture"],
        "pct_nature": mix["nature"],
        "pct_food": mix["food"],
        "pct_nightlife": mix["nightlife"],
        "pct_shopping": mix["shopping"],
        "budget_tier": req.budget_tier,
        "season": req.season,
    }

    import pandas as pd
    X = pd.DataFrame([row])[NUMERIC_FEATURES + CATEGORICAL_FEATURES]

    prediction = float(PIPELINE.predict(X)[0])

    # Rough uncertainty band using the forest's individual tree predictions (if available)
    model_step = PIPELINE.named_steps["model"]
    lower, upper = prediction * 0.85, prediction * 1.15
    if hasattr(model_step, "estimators_"):
        X_transformed = PIPELINE.named_steps["preprocess"].transform(X)
        tree_preds = np.array([est.predict(X_transformed)[0] for est in model_step.estimators_])
        lower, upper = float(np.percentile(tree_preds, 10)), float(np.percentile(tree_preds, 90))

    return {
        "city": req.city,
        "cost_index_used": cost_index,
        "predicted_cost_inr": round(prediction, 2),
        "confidence_range_inr": {"low": round(lower, 2), "high": round(upper, 2)},
        "model_used": MODEL_BUNDLE["model_name"],
        "model_r2": MODEL_BUNDLE["metrics"]["r2"],
    }
