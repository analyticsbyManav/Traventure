const fetch = require("node-fetch");

/**
 * Turns a city name into coordinates + a bounding box using the free
 * OpenStreetMap Nominatim API. No API key required.
 *
 * Nominatim asks that you set a real User-Agent and keep request volume low -
 * fine for a student project / dev use.
 */
async function geocodeCity(cityName) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    cityName
  )}&limit=1`;

  const response = await fetch(url, {
    headers: { "User-Agent": "Traventure-Student-Project/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const results = await response.json();

  if (!results.length) {
    throw new Error(`Could not find a location for "${cityName}"`);
  }

  const place = results[0];
  return {
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon),
    displayName: place.display_name,
    // boundingbox is [south, north, west, east] as strings
    boundingBox: place.boundingbox.map(Number),
  };
}

module.exports = { geocodeCity };
