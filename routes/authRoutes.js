const express = require("express");
const {
  register,
  login,
  logout,
  getCurrentUser,
} = require("../controllers/authController");
const csrfProtection = require("../utils/csrfProtection");
const protect = require("../middleware/checkAuthToken");

const router = express.Router();

router.post("/register", csrfProtection, register);
router.post("/login", csrfProtection, login);
router.post("/logout", csrfProtection, protect, logout);
router.get("/current-user", csrfProtection, protect, getCurrentUser);

module.exports = router;
