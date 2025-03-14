const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const http = require("http");
const Question = require("./models/Question");
const Match = require("./models/Match");

dotenv.config();

const app = express();
const apiServer = http.createServer(app);
const socketServer = http.createServer();
const io = new Server(socketServer, { cors: { origin: "*" } });

app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true, origin: process.env.CLIENT_API }));

const playersQueue = [];
const activeMatches = {}; // Store ongoing matches
const timers = {}; // Store timers for each match

// 🔹 Handle Socket.IO Connections
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 🔹 Matchmaking Logic
  socket.on("find_match", (username) => {
    playersQueue.push({ socketId: socket.id, username });

    if (playersQueue.length >= 2) {
      const player1 = playersQueue.shift();
      const player2 = playersQueue.shift();
      const matchId = `${player1.username}_vs_${player2.username}`;

      activeMatches[matchId] = {
        players: [player1, player2],
        questions: [],
        currentQuestionIndex: 0,
        scores: { [player1.socketId]: 0, [player2.socketId]: 0 },
        answersReceived: {},
        answerHistory: [], // Store player answers per question
      };

      io.to(player1.socketId).emit("match_found", {
        matchId,
        opponent: player2.username,
      });
      io.to(player2.socketId).emit("match_found", {
        matchId,
        opponent: player1.username,
      });

      startGame(matchId, player1, player2);
    }
  });

  // 🔹 Start Game
  const startGame = async (matchId, player1, player2) => {
    try {
      const questions = await Question.aggregate([{ $sample: { size: 15 } }]);
      const newMatch = new Match({
        matchId,
        players: [
          { socketId: player1.socketId, username: player1.username },
          { socketId: player2.socketId, username: player2.username },
        ],
        questions,
        scores: { [player1.socketId]: 0, [player2.socketId]: 0 },
      });

      await newMatch.save();
      activeMatches[matchId].questions = questions;
      sendNextQuestion(matchId);
    } catch (error) {
      console.error("Error starting game:", error);
    }
  };

  // 🔹 Send Next Question
  const sendNextQuestion = (matchId) => {
    const match = activeMatches[matchId];

    if (!match || match.currentQuestionIndex >= match.questions.length) {
      endGame(matchId);
      return;
    }

    const question = match.questions[match.currentQuestionIndex];
    match.currentQuestionIndex++;
    match.answersReceived = {};

    io.to(match.players[0].socketId).emit("new_question", { question });
    io.to(match.players[1].socketId).emit("new_question", { question });

    if (timers[matchId]) clearTimeout(timers[matchId]);
    timers[matchId] = setTimeout(() => sendNextQuestion(matchId), 180000);
  };

  // 🔹 Handle Player Answer
  socket.on("answer", ({ matchId, answer }) => {
    const match = activeMatches[matchId];
    if (!match) return;

    const playerId = socket.id;
    const currentQuestionIndex = match.currentQuestionIndex - 1;
    const correctAnswer = match.questions[currentQuestionIndex].correctAnswer;
    const player = match.players.find((p) => p.socketId === playerId);

    if (!player) return;

    if (answer === correctAnswer) {
      match.scores[playerId] += 1;
    }

    match.answersReceived[playerId] = true;

    // Store answer history for final game stats
    match.answerHistory.push({
      question: match.questions[currentQuestionIndex].text,
      correctAnswer,
      player1: {
        username: match.players[0].username,
        answer: match.players[0].socketId === playerId ? answer : null,
      },
      player2: {
        username: match.players[1].username,
        answer: match.players[1].socketId === playerId ? answer : null,
      },
    });

    if (
      Object.keys(match.answersReceived).length === 2 ||
      match.currentQuestionIndex >= match.questions.length
    ) {
      clearTimeout(timers[matchId]);
      sendNextQuestion(matchId);
    }
  });

  // 🔹 End Game
  const endGame = async (matchId) => {
    const match = activeMatches[matchId];
    if (!match) return;

    const scores = match.scores;
    const player1 = match.players[0];
    const player2 = match.players[1];

    let winner = "draw";
    if (scores[player1.socketId] > scores[player2.socketId]) {
      winner = player1.username;
    } else if (scores[player2.socketId] > scores[player1.socketId]) {
      winner = player2.username;
    }

    await Match.updateOne({ matchId }, { scores, winner });

    const gameOverData = {
      scores,
      winner,
      answers: match.answerHistory, // Send full question-answer stats
    };

    io.to(player1.socketId).emit("game_over", gameOverData);
    io.to(player2.socketId).emit("game_over", gameOverData);

    delete activeMatches[matchId];
    clearTimeout(timers[matchId]);
    delete timers[matchId];
  };

  // 🔹 Handle User Disconnection
  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove from matchmaking queue
    playersQueue.splice(
      playersQueue.findIndex((p) => p.socketId === socket.id),
      1
    );

    // Check if the disconnected player is in an active match
    for (const matchId in activeMatches) {
      const match = activeMatches[matchId];
      const disconnectedPlayer = match.players.find(
        (p) => p.socketId === socket.id
      );

      if (disconnectedPlayer) {
        const remainingPlayer = match.players.find(
          (p) => p.socketId !== socket.id
        );

        if (remainingPlayer) {
          console.log(
            `Opponent disconnected. ${remainingPlayer.username} wins by default.`
          );

          // Save match result
          await Match.updateOne(
            { matchId },
            { scores: match.scores, winner: remainingPlayer.username }
          );

          const gameOverData = {
            scores: match.scores,
            winner: remainingPlayer.username,
            message: "Your opponent disconnected. You win!",
            answers: match.answerHistory,
          };

          // Notify the remaining player that they won
          io.to(remainingPlayer.socketId).emit("game_over", gameOverData);
        }

        // Remove match from activeMatches
        delete activeMatches[matchId];
        clearTimeout(timers[matchId]);
        delete timers[matchId];

        break; // Exit loop after handling the match
      }
    }
  });
});

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const routesPath = path.join(__dirname, "routes");
fs.readdirSync(routesPath).forEach((file) => {
  if (file.endsWith(".js")) {
    const route = require(path.join(routesPath, file));
    let routeName = file.replace(".js", "").replace("Routes", "");
    app.use(`/api/${routeName}`, route);
  }
});

const API_PORT = process.env.PORT || 5000;
apiServer.listen(API_PORT, () =>
  console.log(`API server running on port ${API_PORT}`)
);

const API_SOCKET_PORT = process.env.SOCKET_PORT || 5001;
socketServer.listen(API_SOCKET_PORT, () =>
  console.log(`Socket.IO server running on port ${API_SOCKET_PORT}`)
);
