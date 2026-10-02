import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { parseAvatarUpload } from '../middleware/uploadMiddleware.js';
import {
    getStats,
    listUsers,
    getUser,
    updateUser,
    updateUserRole,
    updateUserStatus,
    updateUserPassword,
    uploadUserAvatar,
    deleteUser,
} from '../controllers/adminController.js';

/** Both middlewares guard the whole router: a session, then an admin role. */
const router = express.Router();

router.use(authMiddleware, requireAdmin);

router.get('/stats', asyncHandler(getStats));

router.get('/users', asyncHandler(listUsers));

router.get('/users/:id', asyncHandler(getUser));

/** Profile, role, status and password are separate, so a rename cannot carry a privilege change. */
router.patch('/users/:id', asyncHandler(updateUser));
router.put('/users/:id/role', asyncHandler(updateUserRole));
router.put('/users/:id/status', asyncHandler(updateUserStatus));
router.put('/users/:id/password', asyncHandler(updateUserPassword));

/**
 * The profile picture, on someone else's account.
 *
 * `parseAvatarUpload` sits between the admin guard and the controller, exactly as on the
 * self-service route: the session and the role are both checked before a byte is read.
 */
router.post('/users/:id/avatar', parseAvatarUpload, asyncHandler(uploadUserAvatar));

router.delete('/users/:id', asyncHandler(deleteUser));

export default router;