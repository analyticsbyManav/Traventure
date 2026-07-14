require("dotenv").config();
const express = require("express");
const cors = require("cors");

const placesRouter = require("./routes/places");
const itineraryRouter = require("./routes/itinerary");
const predictCostRouter = require("./routes/predictCost");
const iconicPlacesRouter = require("./routes/iconicPlaces");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Simple request logger - helpful while you're learning/debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Traventure backend is running" });
});

app.use("/api/places", placesRouter);
app.use("/api/generate-itinerary", itineraryRouter);
app.use("/api/predict-cost", predictCostRouter);
app.use("/api/iconic-places", iconicPlacesRouter);

app.listen(PORT, () => {
  console.log(`Traventure backend listening on http://localhost:${PORT}`);
});
