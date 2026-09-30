import express from "express";
import { login, register, validateToken } from "../controllers/authController.js";

const router = express.Router();

// Register a new user
router.post("/auth/register", register);

// Login an existing user
router.post("/users/sign_in", login);

// Route for validating the user's session.
// The frontend calls this endpoint on page load to check if the user is still logged in.
// It reads the JWT stored in the `session` cookie and returns the user's profile if valid.
// If the cookie is missing, invalid, or expired, the controller responds with 401.
router.get("/auth/validate_token", validateToken);

export default router;
