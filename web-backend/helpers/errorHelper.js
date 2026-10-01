import { HTTP_STATUS } from '../constants/http.js';

/**
 * DOCU: The one error type the whole application throws.
 * Last Updated Date: October 1, 2026
 * @param {number} status - The HTTP status to send
 * @param {string|Array<string>} message - A message, or a list of them
 * @author Cesar
 */
class ApiError extends Error {
    constructor(status, message) {
        super(Array.isArray(message) ? message.join('. ') : message);
        this.name = 'ApiError';
        this.status = status;
        this.messages = Array.isArray(message) ? message : [message];
    }
}

/**
 * DOCU: Builds a 400 error.
 * Last Updated Date: October 1, 2026
 * @function badRequest
 * @param {string|Array<string>} message - The message, or messages, to send
 * @returns {ApiError} The error to throw
 * @author Cesar
 */
const badRequest = (message) => new ApiError(HTTP_STATUS.BAD_REQUEST, message);

/**
 * DOCU: Builds a 401 error.
 * Last Updated Date: October 1, 2026
 * @function unauthorized
 * @param {string|Array<string>} [message] - The message to send
 * @returns {ApiError} The error to throw
 * @author Cesar
 */
const unauthorized = (message = 'No token, authorization denied') =>
    new ApiError(HTTP_STATUS.UNAUTHORIZED, message);

/**
 * DOCU: Builds a 403 error.
 * Last Updated Date: October 1, 2026
 * @function forbidden
 * @param {string|Array<string>} [message] - The message to send
 * @returns {ApiError} The error to throw
 * @author Cesar
 */
const forbidden = (message = 'You do not have permission to do that') =>
    new ApiError(HTTP_STATUS.FORBIDDEN, message);

/**
 * DOCU: Builds a 404 error.
 * Last Updated Date: October 1, 2026
 * @function notFound
 * @param {string|Array<string>} [message] - The message to send
 * @returns {ApiError} The error to throw
 * @author Cesar
 */
const notFound = (message = 'Not found') => new ApiError(HTTP_STATUS.NOT_FOUND, message);

/**
 * DOCU: Builds a 409 error.
 * Last Updated Date: October 1, 2026
 * @function conflict
 * @param {string|Array<string>} message - The message, or messages, to send
 * @returns {ApiError} The error to throw
 * @author Cesar
 */
const conflict = (message) => new ApiError(HTTP_STATUS.CONFLICT, message);

/**
 * DOCU: Logs a server fault and sends a safe 500. The real error never reaches the client.
 * Last Updated Date: October 1, 2026
 * @function handleServerError
 * @param {Error} error - The caught error
 * @param {object} res - Express response
 * @param {string} message - The user-facing message
 * @param {string} [context] - A short label for the failing operation
 * @author Cesar
 */
const handleServerError = (error, res, message, context = '') => {
    console.error(`[server]${context ? ` ${context}:` : ''} ${error?.stack ?? error}`);

    if (res.headersSent) return;

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message });
};

export {
    ApiError,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict,
    handleServerError,
};