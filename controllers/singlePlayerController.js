const Question = require("../models/Question");
const SinglePlayerMatch = require("../models/SinglePlayerMatch");

exports.singlePlayerGameStart = async (req, res) => {
  try {
    const { username } = req.body;

    const questions = await Question.aggregate([{ $sample: { size: 15 } }]);

    const newGame = new SinglePlayerMatch({
      username,
      questions,
      correctAnswers: 0,
      incorrectAnswers: 0,
    });

    await newGame.save();

    res.json({ gameId: newGame._id, questions });
  } catch (error) {
    res.status(500).json({ error: "Error starting single-player game" });
  }
};

exports.singlePlayerGameCancel = async (req, res) => {
  try {
    const { gameId } = req.body;

    if (!gameId) {
      return res.status(400).json({ error: "Game ID is required" });
    }

    await SinglePlayerMatch.findByIdAndDelete(gameId);

    res.json({ message: "Game canceled successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.singlePlayerGameAnswer = async (req, res) => {
  try {
    const { gameId, questionIndex, answer } = req.body;

    const game = await SinglePlayerMatch.findById(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });

    const correctAnswer = game.questions[questionIndex].correctAnswer;

    if (answer === correctAnswer) {
      game.correctAnswers += 1;
    } else {
      game.incorrectAnswers += 1;
    }

    await game.save();

    res.json({ correct: answer === correctAnswer });
  } catch (error) {
    res.status(500).json({ error: "Error submitting answer" });
  }
};

exports.singlePlayerGameEnd = async (req, res) => {
  try {
    const { gameId } = req.body;

    const game = await SinglePlayerMatch.findById(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });

    res.json({
      correctAnswers: game.correctAnswers,
      incorrectAnswers: game.incorrectAnswers,
    });
  } catch (error) {
    res.status(500).json({ error: "Error ending game" });
  }
};

exports.getSinglePlayerLeaderboard = async (req, res) => {
  try {
    const leaderboard = await SinglePlayerMatch.aggregate([
      {
        $group: {
          _id: "$username",
          totalCorrect: { $sum: "$correctAnswers" },
          totalIncorrect: { $sum: "$incorrectAnswers" },
          gamesPlayed: { $sum: 1 },
        },
      },
      { $sort: { totalCorrect: -1 } },
    ]);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
