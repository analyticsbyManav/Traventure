import { useEffect, useState } from "react";
import { fetchIconicPlaces } from "../api.js";

// Live photo lookup via Wikipedia's public REST API — no image hosting,
// no broken links, and it stays current. CORS-enabled, no key needed.
async function fetchWikiImage(title) {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.originalimage?.source || data.thumbnail?.source || null;
}

export default function ExploreIndia({ onSelectCity }) {
  const [places, setPlaces] = useState([]);
  const [images, setImages] = useState({});
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    let cancelled = false;

    fetchIconicPlaces()
      .then(({ places }) => {
        if (cancelled) return;
        setPlaces(places);
        places.forEach((place) => {
          fetchWikiImage(place.wikiTitle)
            .then((url) => {
              if (!cancelled && url) {
                setImages((prev) => ({ ...prev, [place.id]: url }));
              }
            })
            .catch(() => {});
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (!places.length) return null;

  const categories = ["All", ...new Set(places.map((p) => p.category))];
  const visible = activeCategory === "All" ? places : places.filter((p) => p.category === activeCategory);

  return (
    <section className="explore-section">
      <div className="explore-heading">
        <span className="eyebrow">Iconic Destinations</span>
        <h2>Explore India</h2>
        <p>Pick a landmark to start planning, or scroll down and search any city yourself.</p>
      </div>

      <div className="explore-filters">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`filter-chip ${activeCategory === cat ? "active" : ""}`}
            onClick={() => setActiveCategory(cat)}
            type="button"
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="explore-grid">
        {visible.map((place) => (
          <button
            key={place.id}
            type="button"
            className="explore-card"
            onClick={() => onSelectCity(place.searchCity)}
            style={images[place.id] ? { "--bg-image": `url(${images[place.id]})` } : undefined}
          >
            <div className="explore-card-media">
              {images[place.id] ? (
                <img src={images[place.id]} alt={place.name} loading="lazy" />
              ) : (
                <div className="explore-card-media-placeholder" />
              )}
              <span className="explore-card-category">{place.category}</span>
            </div>
            <div className="explore-card-body">
              <div className="explore-card-title">
                <strong>{place.name}</strong>
                <span>{place.state}</span>
              </div>
              <p>{place.blurb}</p>
              <span className="explore-card-cta">Plan this trip →</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
