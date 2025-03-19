const SinglePlayerMatch = require("../models/SinglePlayerMatch");
const Match = require("../models/Match");

exports.getCombinedHistoryByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const singlePlayerMatches = await SinglePlayerMatch.find({ username })
      .sort({ createdAt: -1 })
      .select("createdAt correctAnswers incorrectAnswers");

    const multiplayerMatches = await Match.find({
      "players.username": username,
    })
      .sort({ createdAt: -1 })
      .select("createdAt matchId winner players");

    const history = [
      ...singlePlayerMatches.map((match) => ({
        mode: "Single Player",
        date: match.createdAt,
        result: `${match.correctAnswers} - ${match.incorrectAnswers}`,
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

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Error fetching match history" });
  }
};
