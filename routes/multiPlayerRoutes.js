const express = require("express");
const {
  getMultiPlayerLeaderboard,
} = require("../controllers/multiPlayerController");
const csrfProtection = require("../utils/csrfProtection");
const protect = require("../middleware/checkAuthToken");

const router = express.Router();

router.get("/leaderboard", csrfProtection, protect, getMultiPlayerLeaderboard);

module.exports = router;
