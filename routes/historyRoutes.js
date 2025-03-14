const express = require("express");
const {
  getCombinedHistoryByUsername,
} = require("../controllers/historyController");
const csrfProtection = require("../utils/csrfProtection");
const protect = require("../middleware/checkAuthToken");

const router = express.Router();

router.get("/:username", csrfProtection, protect, getCombinedHistoryByUsername);

module.exports = router;
