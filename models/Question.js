const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  qid: { type: Number, required: true, unique: true },
  question: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  options: {
    type: [{ type: String, required: true }],
    validate: {
      validator: function (arr) {
        return arr.length >= 2;
      },
      message: "A question must have at least two options.",
    },
  },
  correctAnswer: {
    type: String,
    required: true,
    validate: {
      validator: function (answer) {
        return this.options.includes(answer);
      },
      message: "Correct answer must be one of the provided options.",
    },
  },
});

// questionSchema.index({ qid: 1 }, { unique: true });
// questionSchema.index({ question: 1 }, { unique: true });

module.exports = mongoose.model("Question", questionSchema);
