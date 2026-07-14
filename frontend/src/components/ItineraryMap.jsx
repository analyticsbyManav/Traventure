import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";

export default function ItineraryMap({ itinerary, center }) {
  if (!itinerary || !itinerary.days || !center) return null;

  const allSlots = itinerary.days.flatMap((day) =>
    (day.slots || []).map((slot) => ({ ...slot, day_number: day.day_number }))
  );

  const routePoints = allSlots
    .filter((s) => s.lat && s.lng)
    .map((s) => [s.lat, s.lng]);

  return (
    <div className="map-wrapper">
      <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {allSlots.map(
          (slot, idx) =>
            slot.lat &&
            slot.lng && (
              <Marker key={idx} position={[slot.lat, slot.lng]}>
                <Popup>
                  Day {slot.day_number} — {slot.time_of_day}
                  <br />
                  <strong>{slot.place_name}</strong>
                </Popup>
              </Marker>
            )
        )}
        {routePoints.length > 1 && <Polyline positions={routePoints} color="#2e5c8a" />}
      </MapContainer>
    </div>
  );
}
