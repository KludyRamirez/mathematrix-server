const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
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
