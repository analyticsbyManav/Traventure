import { useEffect, useState } from "react";

const INTEREST_OPTIONS = ["history", "food", "nature", "nightlife", "shopping", "culture"];

export default function TripForm({ onSubmit, isLoading, presetCity }) {
  const [city, setCity] = useState("");

  useEffect(() => {
    if (presetCity) setCity(presetCity);
  }, [presetCity]);
  const [numDays, setNumDays] = useState(3);
  const [budget, setBudget] = useState("medium");
  const [interests, setInterests] = useState([]);
  const [groupSize, setGroupSize] = useState(2);
  const [season, setSeason] = useState("shoulder");

  const toggleInterest = (tag) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    onSubmit({
      city: city.trim(),
      numDays: Number(numDays),
      budget,
      interests,
      groupSize: Number(groupSize),
      season,
    });
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-field">
          <label>Destination</label>
          <input
            type="text"
            placeholder="e.g. Jaipur, India"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label>Number of days</label>
          <input
            type="number"
            min="1"
            max="10"
            value={numDays}
            onChange={(e) => setNumDays(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Budget</label>
          <select value={budget} onChange={(e) => setBudget(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label>Group size</label>
          <input
            type="number"
            min="1"
            max="10"
            value={groupSize}
            onChange={(e) => setGroupSize(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Season</label>
          <select value={season} onChange={(e) => setSeason(e.target.value)}>
            <option value="off_peak">Off-peak</option>
            <option value="shoulder">Shoulder</option>
            <option value="peak">Peak</option>
          </select>
        </div>
      </div>

      <div className="form-field" style={{ marginBottom: 20 }}>
        <label>Interests</label>
        <div className="interest-tags">
          {INTEREST_OPTIONS.map((tag) => (
            <button
              type="button"
              key={tag}
              className={`tag-button ${interests.includes(tag) ? "active" : ""}`}
              onClick={() => toggleInterest(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <button className="submit-button" type="submit" disabled={isLoading}>
        {isLoading ? "Planning your trip..." : "Generate Itinerary"}
      </button>
    </form>
  );
}
