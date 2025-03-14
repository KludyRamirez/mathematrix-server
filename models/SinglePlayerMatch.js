const mongoose = require("mongoose");

const singlePlayerMatchSchema = new mongoose.Schema({
  username: { type: String, required: true },
  questions: { type: Array, required: true },
  correctAnswers: { type: Number, required: true },
  incorrectAnswers: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SinglePlayerMatch", singlePlayerMatchSchema);
