const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
dotenv.config();

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "1d",
  });
};

exports.register = async (req, res) => {
  try {
    const { email, username, password, role } = req.body;

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({ email, username, password: hashedPassword, role });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000,
      sameSite: "none",
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 86400000,
      sameSite: "none",
    });

    res.json({ message: "Login successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
  });
  res.clearCookie("refreshToken", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
  });

  res.status(200).json({ message: "Logged out successfully" });
};

exports.getCurrentUser = async (req, res) => {
  let token = req.cookies.token;
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
          return res
            .status(401)
            .json({ message: "No refresh token available" });
        }
        const decodedRefresh = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        );
        const newToken = jwt.sign(
          { id: decodedRefresh.id },
          process.env.JWT_SECRET,
          {
            expiresIn: "1h",
          }
        );
        res.cookie("token", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 3600000,
          sameSite: "none",
        });
        req.user = decodedRefresh.id;
      } catch (refreshError) {
        return res
          .status(401)
          .json({ message: "Unable to refresh token, please log in again" });
      }
    } else {
      return res.status(401).json({ message: "Invalid token" });
    }
  }

  try {
    const user = await User.findById(req.user).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (dbError) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.forgot = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message:
          "Sorry, cannot find email. Please enter email that is associated with this website.",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Reset Password Link",
      text: `${process.env.CLIENT_API}/reset-password/${user._id}/${token}`,
    };

    const info = await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: "Reset password email has been sent successfully.",
      info,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.reset = async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.id !== id) {
      return res
        .status(400)
        .json({ message: "Invalid token. Please request again." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findByIdAndUpdate(id, { password: hashedPassword });

    return res.json({
      message: "You have changed your password successfully.",
    });
  } catch (err) {
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return res
        .status(400)
        .json({ message: "Expired Token. Please request again." });
    }

    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
