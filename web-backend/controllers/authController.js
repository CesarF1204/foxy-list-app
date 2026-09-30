import * as authService from '../services/authService.js';
import { parseBody } from '../helpers/validationHelper.js';
import {
    registerSchema,
    signInSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from '../utils/validationSchemas.js';
import { HTTP_STATUS } from '../constants/http.js';

/**
 * DOCU: Registers a new account.
 * Last Updated Date: October 1, 2026
 * @function register
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { message, user }
 * @author Cesar
 */
export const register = async (req, res) => {
    const data = parseBody(req.body, registerSchema);
    const user = await authService.register(data);

    res.status(HTTP_STATUS.CREATED).json({ message: 'User registered successfully.', user });
};

/**
 * DOCU: Signs a user in and sets the session cookie.
 * Last Updated Date: October 1, 2026
 * @function signIn
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { message, token, user }
 * @author Cesar
 */
export const signIn = async (req, res) => {
    const data = parseBody(req.body, signInSchema);
    const { user, token } = await authService.signIn(data);

    authService.setSessionCookie(res, token);

    res.status(HTTP_STATUS.OK).json({ message: 'Login successful.', token, user });
};

/**
 * DOCU: Signs a user out by clearing the session cookie.
 * Last Updated Date: October 1, 2026
 * @function logOut
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { message }
 * @author Cesar
 */
export const logOut = async (req, res) => {
    authService.clearSessionCookie(res);

    res.status(HTTP_STATUS.OK).json({ message: 'Signed out' });
};

/**
 * DOCU: Returns the account behind the current session cookie.
 * Last Updated Date: October 1, 2026
 * @function validateToken
 * @param {object} req - Request, already carrying the user
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { user }
 * @author Cesar
 */
export const validateToken = async (req, res) => {
    res.status(HTTP_STATUS.OK).json({ user: authService.toPublicUser(req.user) });
};

/**
 * DOCU: Starts password recovery.
 * Last Updated Date: October 1, 2026
 * @function forgotPassword
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { message }
 * @author Cesar
 */
export const forgotPassword = async (req, res) => {
    const data = parseBody(req.body, forgotPasswordSchema);

    res.status(HTTP_STATUS.OK).json({ message: await authService.forgotPassword(data) });
};

/**
 * DOCU: Completes password recovery.
 * Last Updated Date: October 1, 2026
 * @function resetPassword
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { message }
 * @author Cesar
 */
export const resetPassword = async (req, res) => {
    const data = parseBody(req.body, resetPasswordSchema);

    res.status(HTTP_STATUS.OK).json({ message: await authService.resetPassword(data) });
};