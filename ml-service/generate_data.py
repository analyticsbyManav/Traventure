"""
generate_data.py

Generates a synthetic dataset for the Trip Cost Prediction model.

Why synthetic data: there's no public dataset that maps itinerary
composition (city, days, budget tier, place-category mix, group size,
season) directly to total trip cost. We simulate one using realistic
cost relationships + random noise, the same approach used for the
BRPL dataset - domain-informed generation rather than pure randomness.

Run: python generate_data.py
Output: data/trip_cost_dataset.csv
"""

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)
N_ROWS = 8000

# Relative cost-of-living/tourism index per destination.
# 1.0 = mid-tier Indian city baseline. Used both for data generation
# and later by the serving API to map a city name to a cost tier.
CITY_COST_INDEX = {
    "Jaipur": 0.8, "Delhi": 1.1, "Mumbai": 1.4, "Goa": 1.3, "Udaipur": 1.0,
    "Varanasi": 0.7, "Rishikesh": 0.75, "Manali": 0.9, "Kochi": 0.95,
    "Bengaluru": 1.2, "Hyderabad": 1.05, "Amritsar": 0.8, "Shimla": 0.95,
    "Agra": 0.75, "Pune": 1.0, "Chennai": 1.05,
    "Paris": 3.2, "London": 3.4, "New York": 3.6, "Dubai": 2.8,
    "Bangkok": 1.6, "Singapore": 2.9, "Bali": 1.5, "Tokyo": 3.0,
    "Rome": 2.7, "Barcelona": 2.5, "Amsterdam": 2.9, "Istanbul": 1.8,
}
CITIES = list(CITY_COST_INDEX.keys())

BUDGET_MULTIPLIER = {"low": 0.6, "medium": 1.0, "high": 1.8}
SEASON_MULTIPLIER = {"peak": 1.28, "off_peak": 0.88, "shoulder": 1.0}

# Categories vary in typical per-visit cost (entry fees, food spend, shopping spend etc.)
CATEGORY_COST_WEIGHT = {
    "history": 0.7, "culture": 0.8, "nature": 0.5,
    "food": 1.3, "nightlife": 1.6, "shopping": 1.9,
}
CATEGORIES = list(CATEGORY_COST_WEIGHT.keys())

BASE_DAILY_COST_INR = 2200  # baseline per-person daily spend at index 1.0, medium budget


def random_category_mix():
    """Random probability distribution over the 6 interest categories."""
    weights = RNG.dirichlet(np.ones(len(CATEGORIES)))
    return dict(zip(CATEGORIES, weights))


def generate_row():
    city = RNG.choice(CITIES)
    cost_index = CITY_COST_INDEX[city]
    num_days = int(RNG.integers(1, 11))
    budget_tier = RNG.choice(["low", "medium", "high"], p=[0.35, 0.45, 0.20])
    group_size = int(RNG.integers(1, 7))
    season = RNG.choice(["peak", "off_peak", "shoulder"], p=[0.3, 0.3, 0.4])
    avg_place_rating = round(float(RNG.uniform(3.2, 5.0)), 2)
    num_places = int(num_days * RNG.integers(2, 4))

    mix = random_category_mix()
    category_cost_factor = sum(mix[c] * CATEGORY_COST_WEIGHT[c] for c in CATEGORIES)

    budget_mult = BUDGET_MULTIPLIER[budget_tier]
    season_mult = SEASON_MULTIPLIER[season]

    # Slightly higher-rated places correlate with modestly higher cost (nicer venues)
    rating_mult = 0.9 + (avg_place_rating - 3.2) * 0.12

    per_person_daily = BASE_DAILY_COST_INR * cost_index * budget_mult * category_cost_factor * season_mult * rating_mult

    # Group trips get mild per-person discounts (shared cabs/rooms) beyond ~2 people
    group_discount = 1.0 if group_size <= 2 else 1.0 - min((group_size - 2) * 0.04, 0.18)

    total_cost = per_person_daily * num_days * group_size * group_discount

    # Add realistic noise (unpredictable spending variance)
    noise = RNG.normal(1.0, 0.12)
    total_cost = max(total_cost * noise, 500)

    row = {
        "city": city,
        "city_cost_index": cost_index,
        "num_days": num_days,
        "budget_tier": budget_tier,
        "group_size": group_size,
        "season": season,
        "avg_place_rating": avg_place_rating,
        "num_places": num_places,
        "pct_history": round(mix["history"], 3),
        "pct_culture": round(mix["culture"], 3),
        "pct_nature": round(mix["nature"], 3),
        "pct_food": round(mix["food"], 3),
        "pct_nightlife": round(mix["nightlife"], 3),
        "pct_shopping": round(mix["shopping"], 3),
        "total_cost_inr": round(total_cost, 2),
    }
    return row


def main():
    rows = [generate_row() for _ in range(N_ROWS)]
    df = pd.DataFrame(rows)
    df.to_csv("data/trip_cost_dataset.csv", index=False)
    print(f"Generated {len(df)} rows -> data/trip_cost_dataset.csv")
    print(df.describe(include="all").T[["count", "mean", "std", "min", "max"]] if False else df.head())
    print("\nTarget stats (total_cost_inr):")
    print(df["total_cost_inr"].describe())


if __name__ == "__main__":
    main()
