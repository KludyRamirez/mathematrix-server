const SinglePlayerMatch = require("../models/SinglePlayerMatch");
const Match = require("../models/Match");

// Get Combined Match History for a User
exports.getCombinedHistoryByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    // Fetch Single Player History
    const singlePlayerMatches = await SinglePlayerMatch.find({ username })
      .sort({ createdAt: -1 }) // Sort by most recent
      .select("createdAt correctAnswers incorrectAnswers");

    // Fetch Multiplayer History
    const multiplayerMatches = await Match.find({
      "players.username": username,
    })
      .sort({ createdAt: -1 }) // Sort by most recent
      .select("createdAt matchId winner players");

    // Format Data for Frontend
    const history = [
      ...singlePlayerMatches.map((match) => ({
        mode: "Single Player",
        date: match.createdAt,
        result: `${match.correctAnswers} Correct, ${match.incorrectAnswers} Wrong`,
      })),
      ...multiplayerMatches.map((match) => ({
        mode: "Multiplayer",
        date: match.createdAt,
        result:
          match.winner === username
            ? "Won"
            : match.winner === "draw"
            ? "Draw"
            : "Lost",
      })),
    ];

    // Sort combined history by date (latest first)
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Error fetching match history" });
  }
};
