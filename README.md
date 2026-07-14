# Traventure — AI Travel Itinerary Planner

**Live site: [traventure-frontend.onrender.com](https://traventure-frontend.onrender.com)**

Starter scaffold matching the Week 1 plan from the project blueprint. Real place data (free, no API key) + Claude-powered itinerary generation + an interactive map.

## What's already working

- `GET /api/places?city=Jaipur&interests=history,food` — geocodes the city and pulls real points of interest from OpenStreetMap (free, no key needed)
- `POST /api/generate-itinerary` — sends those places + your preferences to Claude, gets back a structured day-by-day plan, validates it, retries once if invalid
- **ML trip cost predictor** (`ml-service/`) — a scikit-learn Random Forest regression model (R² ≈ 0.91), trained on a domain-modeled synthetic dataset, served via FastAPI. Predicts total trip cost from the generated itinerary's actual composition (days, budget tier, category mix, group size, season). See `ml-service/README.md` for the full training/eval writeup.
- React frontend — trip form, day-by-day timeline, map with markers and route line, ML-predicted cost card

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and add your Anthropic API key (get one at https://console.anthropic.com — sign up, go to API Keys, create a new key). You do NOT need a Google Places key — place data uses the free OpenStreetMap APIs.

Start the backend:

```bash
npm run dev
```

It should print `Traventure backend listening on http://localhost:5000`. Test it's alive:

```bash
curl http://localhost:5000/api/health
```

Test the places endpoint on its own before touching the frontend:

```bash
curl "http://localhost:5000/api/places?city=Jaipur&interests=history,food"
```

## 2. ML service setup

In a **new terminal**:

```bash
cd ml-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python generate_data.py         # builds the synthetic training dataset
python train_model.py           # trains + evaluates, saves the model
uvicorn app:app --reload --port 8001
```

`train_model.py` prints R²/MAE/RMSE for three models and saves two plots
(`model/predicted_vs_actual.png`, `model/feature_importance.png`) — keep
these, you'll want them for your project report.

## 3. Frontend setup

In a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). The dev server proxies `/api/*` calls to your backend on port 5000, so backend, ML service, and frontend all need to be running at the same time.

## 4. Try it

1. Enter a city (start with somewhere well-mapped, like "Jaipur", "Paris", or "Delhi" — smaller towns may have sparse OpenStreetMap data)
2. Pick number of days, budget, interests
3. Click Generate — first call to the places API + Claude can take 10-20 seconds, that's normal

## Project structure

```
traventure/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── routes/
│   │   ├── places.js          # Geocoding + Overpass API integration
│   │   ├── itinerary.js       # Claude prompt, call, validation, retry
│   │   └── predictCost.js     # Proxies to the Python ML service
│   ├── utils/geocode.js       # Nominatim geocoding helper
│   └── .env.example
├── ml-service/
│   ├── generate_data.py       # Synthetic training dataset generator
│   ├── train_model.py         # Trains + evaluates 3 regression models
│   ├── app.py                 # FastAPI serving layer (/predict-cost)
│   ├── requirements.txt
│   ├── data/                  # generated CSV lives here
│   └── model/                 # generated model + evaluation plots live here
└── frontend/
    ├── src/
    │   ├── App.jsx             # Ties form -> API calls -> results together
    │   ├── api.js               # fetch() wrappers for the backend
    │   └── components/
    │       ├── TripForm.jsx
    │       ├── ItineraryView.jsx
    │       ├── ItineraryMap.jsx
    │       └── CostPredictionCard.jsx
    └── vite.config.js
```

## Next steps (from the blueprint's Week 2-4 plan)

- [ ] Test the full pipeline against 3-5 different cities and note failure cases (sparse OSM data, LLM edge cases)
- [ ] Add loading/error states polish on the frontend
- [ ] Add PDF export (Section 4.1 of the blueprint)
- [ ] Optional stretch features: save trips (needs a DB + light auth), regenerate single day, weather-aware suggestions

## Troubleshooting

- **"Could not find a location for X"** — the city name might be too ambiguous or misspelled; try adding a country, e.g. "Springfield, USA"
- **Empty places list** — Overpass has spotty coverage for very small towns; test with a major city first
- **Anthropic API errors** — double check `ANTHROPIC_API_KEY` in `backend/.env` is set correctly and has no extra spaces
- **CORS errors in browser console** — make sure the backend is actually running on port 5000; the Vite proxy only works if it's up
