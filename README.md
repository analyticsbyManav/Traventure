# Traventure — AI Travel Itinerary Planner

**Live site: [traventure-frontend.onrender.com](https://traventure-frontend.onrender.com)**

Traventure is a full-stack web app that combines AI and machine learning to plan trips across India.

AI — When generating an itinerary, real places (fetched live from OpenStreetMap) are handed to Claude (Anthropic's LLM) along with the traveler's preferences (days, budget, interests). Claude reasons over that list and returns a structured day-by-day plan — deciding what to see in the morning vs. evening, grouping nearby places together, and respecting the budget tier. If no AI key is available, a rule-based algorithm (written by hand, not AI) takes over automatically so the app never breaks.

Machine Learning — A separate model, trained with scikit-learn, predicts the total cost of a trip in rupees. It's a Random Forest regression model, trained on a domain-modeled synthetic dataset with features like number of days, budget tier, group size, season, and the itinerary's actual category mix (history vs. food vs. nightlife, etc.). It achieves an R² of ~0.91 on held-out test data, and is served live through a FastAPI microservice.

Full Stack — The app is three coordinated services: a React (Vite) frontend for the UI (trip form, interactive Leaflet map, destination gallery), a Node.js/Express backend that handles geocoding, place search, and talks to Claude, and a Python/FastAPI microservice that runs the ML model. All three are deployed and communicate over HTTP in production.
