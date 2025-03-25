const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema({
  matchId: { type: String, required: true},
  players: [
    {
      socketId: { type: String, required: true },
      username: { type: String, required: true },
    },
  ],
  questions: [
    {
      question: String,
      correctAnswer: String,
      options: [String],
    },
  ],
  scores: { type: Object, default: {} }, // { player1SocketId: score, player2SocketId: score }
  winner: { type: String, default: null }, // socketId of the winner, or "draw"
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Match", MatchSchema);
