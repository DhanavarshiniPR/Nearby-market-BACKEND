require('dotenv').config();  // Ensure dotenv is loaded

const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  // Extract token from the Authorization header
  const token = req?.header("Authorization")?.split(" ")[1];

  // If no token, send 401 Unauthorized response
  if (!token) {
    return res.status(401).json({ message: "Authorization failed. No token provided." });
  }

  try {
    // Verify the token using the secret key from environment variables
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded;  // Attach the decoded token (user info) to the request
    next();  // Proceed to the next middleware or route handler
  } catch (error) {
    return res.status(401).json({ message: "Authorization failed. Invalid token." });
  }
};

module.exports = authMiddleware;
