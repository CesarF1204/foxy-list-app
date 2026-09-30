import express from "express";
import { login, register, validateToken } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Register a new user
router.post("/register", register);

// Login an existing user
/**
 *  NOTE: changed the endpoint into /login since login is part of the authentication
 *  A recommended namin convention for routes should be in kebab-case (sign-in) instead of snake-case (sign_in)
 */
router.post("/login", login);

// NOTE: Commented this route and added it as a middleware
// // Route for validating the user's session.
// // The frontend calls this endpoint on page load to check if the user is still logged in.
// // It reads the JWT stored in the `session` cookie and returns the user's profile if valid.
// // If the cookie is missing, invalid, or expired, the controller responds with 401.
// router.get("/auth/validate_token", validateToken);
export default router;
