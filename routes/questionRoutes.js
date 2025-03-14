const express = require("express");
const {
  addQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} = require("../controllers/questionController");
const csrfProtection = require("../utils/csrfProtection");
const protect = require("../middleware/checkAuthToken");

const router = express.Router();

router.post("/add", csrfProtection, protect, addQuestion);
router.get("/get", csrfProtection, protect, getAllQuestions);
router.get("/get/:id", csrfProtection, protect, getQuestionById);
router.put("/update/:id", csrfProtection, protect, updateQuestion);
router.delete("/delete/:id", csrfProtection, protect, deleteQuestion);

module.exports = router;
