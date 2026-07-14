const express = require("express");
const iconicPlaces = require("../data/iconicPlaces");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ places: iconicPlaces });
});

module.exports = router;
