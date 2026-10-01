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
 * The public, unauthenticated entry points. Signing in has to be reachable
 * without a session, so these are registered before the guard below.
 */
const router = express.Router();

router.post('/register', asyncHandler(register));

router.post('/sign_in', asyncHandler(signIn));

router.post('/logout', asyncHandler(logOut));

router.post('/forgot_password', asyncHandler(forgotPassword));

router.put('/reset_password', asyncHandler(resetPassword));

/**
 * Self-service, and only self-service: everything past this line acts on the
 * account behind the verified cookie, because neither handler reads an id from
 * the request. `authMiddleware` alone is the whole requirement - a plain user
 * is a legitimate caller here. That is why these live outside `adminRoutes`,
 * where `requireAdmin` would refuse exactly the people they exist for.
 *
 * There is deliberately no role, block or delete route here. Those stay behind
 * `requireAdmin` on the admin router, so this pair cannot widen access to them.
 */
router.use(authMiddleware);

router.patch('/profile', asyncHandler(updateProfile));

router.put('/password', asyncHandler(updatePassword));

export default router;