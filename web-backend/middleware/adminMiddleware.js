import { badRequest } from '../helpers/errorHelper.js';
import { ADMIN_ROLE } from '../constants/roles.js';
import { HTTP_STATUS } from '../constants/http.js';

/**
 * DOCU: Refuses any request that is not made by a signed-in administrator.
 * Last Updated Date: October 1, 2026
 * @function requireAdmin
 * @param {object} req - Request, carrying the user from authMiddleware
 * @param {object} res - Response
 * @param {Function} next - Passes control to the next handler
 * @author Cesar
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'You must be signed in to do that' });
    }

    if (req.user.role !== ADMIN_ROLE) {
        return res
            .status(HTTP_STATUS.FORBIDDEN)
            .json({ message: 'Administrator access is required' });
    }

    return next();
};

/**
 * DOCU: Refuses an admin changing their own account in a way that locks them out.
 * Last Updated Date: October 1, 2026
 * @function assertNotSelfLockOut
 * @param {object} actor - The signed-in administrator
 * @param {string} targetId - The account being changed
 * @param {string} action - The verb, used in the message
 * @author Cesar
 */
const assertNotSelfLockOut = (actor, targetId, action) => {
    if (String(actor._id) === String(targetId)) {
        throw badRequest(`You cannot ${action} your own account`);
    }
};

export { requireAdmin, assertNotSelfLockOut };