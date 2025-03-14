const Match = require("../models/Match");

exports.getMultiPlayerLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Match.aggregate([
      {
        $group: {
          _id: "$winner",
          wins: { $sum: 1 },
        },
      },
      { $sort: { wins: -1 } },
      { $limit: 10 },
    ]);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: "Error fetching leaderboard" });
  }
};
