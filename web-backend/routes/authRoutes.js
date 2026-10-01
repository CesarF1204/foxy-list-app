import express from 'express';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { validateToken } from '../controllers/authController.js';

/** `validate_token` must answer 401 rather than redirect when the cookie is gone. */
const router = express.Router();

router.get('/validate_token', authMiddleware, asyncHandler(validateToken));

export default router;