import express from 'express';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { register, signIn, logOut, forgotPassword, resetPassword } from '../controllers/authController.js';

/** The public, unauthenticated entry points. */
const router = express.Router();

router.post('/register', asyncHandler(register));

router.post('/sign_in', asyncHandler(signIn));

router.post('/logout', asyncHandler(logOut));

router.post('/forgot_password', asyncHandler(forgotPassword));

router.put('/reset_password', asyncHandler(resetPassword));

export default router;