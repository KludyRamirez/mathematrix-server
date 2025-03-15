const csurf = require("csurf");

const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
  },
});

module.exports = csrfProtection;
