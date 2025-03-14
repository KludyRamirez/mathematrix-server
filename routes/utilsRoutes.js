const express = require("express");
const csrfProtection = require("../utils/csrfProtection");
const getCsrfProtection = require("../middleware/getCsrfProtection");

const router = express.Router();

// CSRF Protection
router.get("/csrf-token", csrfProtection, getCsrfProtection);

module.exports = router;
