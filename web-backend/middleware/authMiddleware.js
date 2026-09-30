import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check whether the Authorization header exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required. Please provide a token.",
      });
    }

    // Extract the token from "Bearer <token>"
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Invalid authorization header.",
      });
    }

    // Verify the token's signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Retrieve the current user from MongoDB
    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        message: "User account no longer exists.",
      });
    }

    // Attach the authenticated user to the request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    // Continue to the next middleware or controller
    next();
  } catch (error) {
    const invalidExpiredNames = ["TokenExpiredError", "JsonWebTokenError", "NotBeforeError"];
    if (invalidExpiredNames.includes(error.name)) {
      return res.status(401).json({
        message: "Invalid or expired token.",
      });
    }

    console.error("Authentication error:", error.message);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};
