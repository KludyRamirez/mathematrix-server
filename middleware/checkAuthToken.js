const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const protect = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Token is not valid" });
    }
    req.user = decoded.id;
    next();
  });
};

module.exports = protect;
