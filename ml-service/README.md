# Traventure ML Service — Trip Cost Predictor

A scikit-learn regression model that predicts total trip cost from itinerary
composition (destination, days, budget tier, group size, season, category
mix of places, average place rating).

## Why this exists

The itinerary generator (Claude) handles *what to do and when*. This service
handles a separate, genuinely ML problem: *what will it cost*. It's trained
on a domain-informed synthetic dataset (same approach as the BRPL project's
synthetic dataset) since no public dataset maps itinerary composition to cost.

## Files

```
ml-service/
├── generate_data.py        # Builds the synthetic training dataset
├── train_model.py          # Trains + evaluates 3 models, saves the best
├── app.py                  # FastAPI service exposing /predict-cost
├── requirements.txt
├── data/
│   └── trip_cost_dataset.csv     (generated)
└── model/
    ├── trip_cost_model.joblib    (generated - the trained pipeline)
    ├── predicted_vs_actual.png   (generated - for your report)
    └── feature_importance.png    (generated - for your report)
```

## Setup

```bash
cd ml-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 1. Generate the dataset

```bash
python generate_data.py
```

Produces `data/trip_cost_dataset.csv` — 8,000 rows. Feature engineering logic
(cost index per city, budget multipliers, category cost weights, seasonal
multipliers, group discounts, noise) is documented in the script itself —
this is the part to walk through carefully in your project report, since
it's the closest thing to "domain modeling" the evaluators will want to see.

## 2. Train the model

```bash
python train_model.py
```

Trains and compares three models: Linear Regression, Random Forest, and
Gradient Boosting. Prints R², MAE, RMSE for each, saves the best-performing
one, plus two plots you should include directly in your synopsis/report:

- `model/predicted_vs_actual.png` — shows how tightly predictions track reality
- `model/feature_importance.png` — shows which features drive cost most

On the current synthetic dataset, Random Forest wins clearly (R² ≈ 0.91,
MAE ≈ ₹14,800), which makes sense — cost depends on nonlinear interactions
between budget tier and category mix that linear regression can't capture.

## 3. Run the service

```bash
uvicorn app:app --reload --port 8001
```

Test it:

```bash
curl http://localhost:8001/health

curl -X POST http://localhost:8001/predict-cost \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Jaipur",
    "num_days": 3,
    "budget_tier": "medium",
    "group_size": 2,
    "season": "peak",
    "avg_place_rating": 4.3,
    "days": [
      {"day_number": 1, "slots": [
        {"place_name": "Amber Fort", "category": "historic"},
        {"place_name": "Local Thali", "category": "restaurant"}
      ]}
    ]
  }'
```

## How it connects to the rest of the app

The Node backend's `/api/predict-cost` route (in `backend/routes/predictCost.js`)
proxies to this service. The frontend calls it automatically right after an
itinerary is generated, and shows the predicted cost as a card above the map.

Run order for full local development:
1. `ml-service`: `uvicorn app:app --port 8001`
2. `backend`: `npm run dev` (port 5000)
3. `frontend`: `npm run dev` (port 5173)

## Retraining with better data later

The synthetic generator is a placeholder to get a working, evaluable pipeline
fast. If you have time before submission, the strongest upgrade is replacing
`generate_data.py`'s synthetic rows with real trip cost data — even a small
manually-collected set (30-50 real trips from travel blogs/forums, budget
breakdowns from sites like Budget Your Trip) layered on top of the synthetic
base would let you show the model generalizing beyond pure simulation, which
is a great point to raise in your viva.
