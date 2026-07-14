import { useEffect, useState } from "react";
import TripForm from "./components/TripForm.jsx";
import ItineraryView from "./components/ItineraryView.jsx";
import ItineraryMap from "./components/ItineraryMap.jsx";
import CostPredictionCard from "./components/CostPredictionCard.jsx";
import ExploreIndia from "./components/ExploreIndia.jsx";
import { fetchPlaces, generateItinerary, predictCost } from "./api.js";

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [costPrediction, setCostPrediction] = useState(null);
  const [isCostLoading, setIsCostLoading] = useState(false);
  const [presetCity, setPresetCity] = useState("");
  const [heroImage, setHeroImage] = useState(null);
  const [itinerarySource, setItinerarySource] = useState(null);

  useEffect(() => {
    fetch("https://en.wikipedia.org/api/rest_v1/page/summary/Taj_Mahal")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const url = data?.originalimage?.source || data?.thumbnail?.source;
        if (url) setHeroImage(url);
      })
      .catch(() => {});
  }, []);

  const handleSelectCity = (city) => {
    setPresetCity(city);
    document.getElementById("plan-trip")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async ({ city, numDays, budget, interests, groupSize, season }) => {
    setIsLoading(true);
    setError(null);
    setItinerary(null);
    setItinerarySource(null);
    setCostPrediction(null);

    try {
      // Step 1: get real places for the destination
      const placesResult = await fetchPlaces(city, interests);

      if (!placesResult.places.length) {
        throw new Error("No places found for that destination. Try a bigger city.");
      }

      setMapCenter(placesResult.center);

      // Step 2: send places + preferences to the AI itinerary generator
      const result = await generateItinerary({
        city,
        numDays,
        budget,
        interests,
        places: placesResult.places,
      });

      setItinerary(result.itinerary);
      setItinerarySource(result.source);
      setIsLoading(false);

      // Step 3: send the generated itinerary to the ML cost prediction service.
      // Runs after the itinerary renders so the map/timeline never wait on it.
      setIsCostLoading(true);
      try {
        const costResult = await predictCost({
          city,
          budgetTier: budget,
          groupSize,
          season,
          itinerary: result.itinerary,
        });
        setCostPrediction(costResult);
      } catch (costErr) {
        console.warn("Cost prediction failed:", costErr.message);
        // Non-fatal - the itinerary itself still worked, so we just skip the cost card
      } finally {
        setIsCostLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <div
        className="app-header"
        style={heroImage ? { "--hero-image": `url(${heroImage})` } : undefined}
      >
        <span className="eyebrow">🧭 AI Trip Planner</span>
        <h1>Traventure</h1>
        <p>AI-generated travel itineraries, grounded in real places</p>
      </div>

      <ExploreIndia onSelectCity={handleSelectCity} />

      <div id="plan-trip">
        <TripForm onSubmit={handleSubmit} isLoading={isLoading} presetCity={presetCity} />
      </div>

      {error && <div className="error-message">{error}</div>}
      {isLoading && <div className="status-message">Building your itinerary — this can take 10-20 seconds...</div>}

      {itinerary && (
        <>
          {itinerarySource && (
            <div className="source-badge">
              {itinerarySource === "claude" ? "✨ AI-enhanced itinerary" : "🆓 Generated with Traventure's free planner"}
            </div>
          )}
          <CostPredictionCard prediction={costPrediction} isLoading={isCostLoading} />
          <ItineraryMap itinerary={itinerary} center={mapCenter} />
          <ItineraryView itinerary={itinerary} />
        </>
      )}
    </div>
  );
}
