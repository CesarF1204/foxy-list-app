import jwt from 'jsonwebtoken';
import User from '../schemas/userSchema.js';
import { AUTH_COOKIE_NAME } from '../config/cookies.js';
import { isActive } from '../constants/roles.js';
import { HTTP_STATUS } from '../constants/http.js';
import {
    GENERIC_ERROR_MESSAGE,
    NO_TOKEN_MESSAGE,
    INVALID_TOKEN_MESSAGE,
    EXPIRED_TOKEN_MESSAGE,
    ACCOUNT_GONE_MESSAGE,
    BLOCKED_ACCOUNT_MESSAGE,
} from '../constants/messages.js';

/**
 * DOCU: Authenticates a request from the session cookie and attaches req.user.
 * Last Updated Date: October 1, 2026
 * @function authMiddleware
 * @param {object} req - Request
 * @param {object} res - Response
 * @param {Function} next - Passes control to the next handler
 * @author John Vincent, Updated by: Kate, Cesar
 */
const authMiddleware = async (req, res, next) => {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: NO_TOKEN_MESSAGE });
    }

    /* A bad token is a 401; anything failing after this point is a server fault. */
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        const message =
            error.name === 'TokenExpiredError' ? EXPIRED_TOKEN_MESSAGE : INVALID_TOKEN_MESSAGE;

        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message });
    }

    try {
        const user = await User.findById(decoded.sub).lean();

        if (!user) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: ACCOUNT_GONE_MESSAGE });
        }

        /* The user is read on every request, so a block bites immediately. */
        if (!isActive(user)) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({ message: BLOCKED_ACCOUNT_MESSAGE });
        }

        req.user = user;
        req.token = token;
        return next();
    } catch (error) {
        console.error('authMiddleware: failed to resolve the request user:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: GENERIC_ERROR_MESSAGE });
    }
};

export default authMiddleware;

