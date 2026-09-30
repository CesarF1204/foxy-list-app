import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { getProfile } from "../controllers/userController.js";

const router = express.Router();

router.use(authenticate);

/**
 *  GET /api/users/profile
 *  Authenticate the request before retrieving the authenticated user's profile.
 *  The authenticate middleware verifies the user's credentials/token and attaches
 *  the authenticated user information to req.user.
 *  If authentication succeeds, getProfile handles the request and returns the user's profile.
 */
router.get("/profile", authenticate, getProfile);

export default router;
