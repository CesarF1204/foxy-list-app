import express from 'express';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';
import {
    register,
    signIn,
    logOut,
    forgotPassword,
    resetPassword,
    updateProfile,
    updatePassword,
} from '../controllers/authController.js';

/**
 * The public, unauthenticated entry points. Signing in has to be reachable without a session,
 * so these are registered before the guard below.
 */
const router = express.Router();

router.post('/register', asyncHandler(register));

router.post('/sign_in', asyncHandler(signIn));

router.post('/logout', asyncHandler(logOut));

router.post('/forgot_password', asyncHandler(forgotPassword));

router.put('/reset_password', asyncHandler(resetPassword));

/**
 * Self-service, and only self-service: both handlers act on the account behind the verified
 * cookie, since neither reads an id from the request. A plain user is a legitimate caller here,
 * which is why these live outside `adminRoutes`.
 */
router.use(authMiddleware);

router.patch('/profile', asyncHandler(updateProfile));

router.put('/password', asyncHandler(updatePassword));

export default router;