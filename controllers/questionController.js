const Question = require("../models/Question");

exports.addQuestion = async (req, res) => {
  try {
    const existingQuestion = await Question.findOne({
      question: req.body.question,
    });
    if (existingQuestion) {
      return res.status(400).json({ message: "This question already exists." });
    }

    const lastQuestion = await Question.findOne().sort({ qid: -1 });
    const newQid = lastQuestion ? lastQuestion.qid + 1 : 1;

    const question = new Question({ ...req.body, qid: newQid });

    await question.save();

    res.status(201).json({
      data: question,
      message: `A new question on ${question.category} has been added successfully!`,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.status(200).json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.status(200).json({
      data: question,
      message: `A question on ${question.category} has been updated successfully!`,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.status(200).json({
      message: `A question on ${question.category} category has been deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
