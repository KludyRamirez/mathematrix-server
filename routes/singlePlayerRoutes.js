const express = require("express");
const {
  singlePlayerGameStart,
  singlePlayerGameCancel,
  singlePlayerGameAnswer,
  singlePlayerGameEnd,
  getSinglePlayerLeaderboard,
} = require("../controllers/singlePlayerController");
const csrfProtection = require("../utils/csrfProtection");
const protect = require("../middleware/checkAuthToken");

const router = express.Router();

router.post("/start", singlePlayerGameStart);
router.post("/cancel", singlePlayerGameCancel);
router.post("/answer", singlePlayerGameAnswer);
router.post("/end", singlePlayerGameEnd);
router.get("/leaderboard", csrfProtection, protect, getSinglePlayerLeaderboard);

module.exports = router;
