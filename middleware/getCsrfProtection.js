const getCsrfProtection = (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
};

module.exports = getCsrfProtection;
