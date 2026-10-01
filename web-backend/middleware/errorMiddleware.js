import { ApiError } from '../helpers/errorHelper.js';
import { HTTP_STATUS } from '../constants/http.js';
import {
    GENERIC_ERROR_MESSAGE,
    DUPLICATE_EMAIL_MESSAGE,
    INVALID_ID_MESSAGE,
} from '../constants/messages.js';

/** The Mongo error code for a duplicate unique key. */
const DUPLICATE_KEY_ERROR = 11000;

/**
 * DOCU: Turns any error into the standard JSON response.
 * Last Updated Date: October 1, 2026
 * @function errorMiddleware
 * @param {Error} err - The error to report
 * @param {object} req - Request
 * @param {object} res - Response
 * @param {Function} _next - Required for Express to treat this as an error handler
 * @author Cesar
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, _next) => {
    if (res.headersSent) return;

    if (err instanceof ApiError) {
        return res.status(err.status).json({ message: err.messages });
    }

    if (err?.code === DUPLICATE_KEY_ERROR) {
        return res.status(HTTP_STATUS.CONFLICT).json({ message: DUPLICATE_EMAIL_MESSAGE });
    }

    /* A malformed ObjectId in a filter is a client mistake, not a server fault. */
    if (err?.name === 'CastError') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: INVALID_ID_MESSAGE });
    }

    console.error(`[server] unhandled error: ${err?.stack ?? err}`);

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: GENERIC_ERROR_MESSAGE });
};

/**
 * DOCU: Wraps an async handler so a rejected promise reaches Express.
 * Last Updated Date: October 1, 2026
 * @function asyncHandler
 * @param {Function} handler - The async controller
 * @returns {Function} A handler that forwards errors to Express
 * @author Cesar
 */
const asyncHandler = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

export { errorMiddleware, asyncHandler };