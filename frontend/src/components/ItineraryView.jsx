const CATEGORY_ICONS = {
  history: "🏛️",
  food: "🍽️",
  nature: "🌿",
  nightlife: "🌃",
  shopping: "🛍️",
  culture: "🎭",
};

export default function ItineraryView({ itinerary }) {
  if (!itinerary || !itinerary.days) return null;

  return (
    <div>
      {itinerary.days.map((day) => (
        <div className="day-card" key={day.day_number}>
          <h3>Day {day.day_number}</h3>
          {(day.slots || []).map((slot, idx) => (
            <div className="slot" key={idx}>
              <div className="slot-time">{slot.time_of_day}</div>
              <div className="slot-details">
                <strong>{slot.place_name}</strong>
                <div className="slot-category">
                  {CATEGORY_ICONS[slot.category] || "📌"} {slot.category}
                </div>
                {slot.description && <p>{slot.description}</p>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
