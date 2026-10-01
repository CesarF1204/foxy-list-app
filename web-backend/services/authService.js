import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userModel from '../models/userModel.js';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS, getAuthCookieMaxAge } from '../config/cookies.js';
import { unauthorized, forbidden, conflict, notFound } from '../helpers/errorHelper.js';
import { requireEnv } from '../config/db.js';
import { isActive, ADMIN_ROLE } from '../constants/roles.js';
import { DEFAULT_JWT_EXPIRES_IN, DEFAULT_BCRYPT_SALT_ROUNDS } from '../constants/env.js';
import {
    BLOCKED_ACCOUNT_MESSAGE,
    INVALID_CREDENTIALS_MESSAGE,
    ACCOUNT_GONE_MESSAGE,
    PASSWORD_UPDATED_MESSAGE,
    DUPLICATE_EMAIL_MESSAGE,
} from '../constants/messages.js';

/** The cost factor, configurable so tests can run cheaper than production. */
const SALT_ROUNDS = () => Number(process.env.BCRYPT_SALT_ROUNDS || DEFAULT_BCRYPT_SALT_ROUNDS);

/**
 * DOCU: Hashes a plaintext password with bcrypt.
 * Last Updated Date: October 1, 2026
 * @function hashPassword
 * @param {string} password - The plaintext password
 * @returns {Promise<string>} The hash to store
 * @author Cesar
 */
const hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS());

/**
 * DOCU: Converts a user to the shape the API returns.
 * Last Updated Date: October 1, 2026
 * @function toPublicUser
 * @param {object} user - The stored account
 * @returns {object} The user as the client reads it
 * @author Cesar
 */
const toPublicUser = (user) => ({
    _id: String(user._id),
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
});

/**
 * DOCU: Signs a JWT carrying only the user's id.
 * Last Updated Date: October 1, 2026
 * @function issueToken
 * @param {object} user - The account to sign in
 * @returns {string} The signed token
 * @author Cesar
 */
const issueToken = (user) =>
    jwt.sign({ sub: String(user._id) }, requireEnv('JWT_SECRET'), {
        expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN,
    });

/**
 * DOCU: Registers an account. The first account on an empty database becomes an admin.
 * Last Updated Date: October 1, 2026
 * @function register
 * @param {object} data - The validated { firstName, lastName, email, password }
 * @returns {Promise<object>} The new user, without a password
 * @author Cesar
 */
const register = async (data) => {
    const existing = await userModel.findByEmail(data.email);

    if (existing) {
        throw conflict('Email is already registered.');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await userModel.createUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
    });

    /* Bootstrap: the first account ever created administers the app. */
    if ((await userModel.countUsers()) === 1) {
        return toPublicUser(await userModel.updateUser(user._id, { role: ADMIN_ROLE }));
    }

    return toPublicUser(user);
};

/**
 * DOCU: Signs a user in.
 * Last Updated Date: October 1, 2026
 * @function signIn
 * @param {object} data - The validated { email, password }
 * @returns {Promise<{user: object, token: string}>} The user and the token
 * @author Cesar
 */
const signIn = async (data) => {
    const user = await userModel.findForLogin(data.email);

    if (!user) {
        throw unauthorized(INVALID_CREDENTIALS_MESSAGE);
    }

    const matches = await bcrypt.compare(data.password, user.password);

    if (!matches) {
        throw unauthorized(INVALID_CREDENTIALS_MESSAGE);
    }

    if (!isActive(user)) {
        throw forbidden(BLOCKED_ACCOUNT_MESSAGE);
    }

    return { user: toPublicUser(user), token: issueToken(user) };
};


/**
 * DOCU: Returns the account behind a verified session token.
 * Last Updated Date: October 1, 2026
 * @function getSessionUser
 * @param {string} userId - The id carried by the verified token
 * @returns {Promise<object>} The signed-in user
 * @author Cesar
 */
const getSessionUser = async (userId) => {
    const user = await userModel.findById(userId);

    if (!user) {
        throw unauthorized(ACCOUNT_GONE_MESSAGE);
    }

    if (!isActive(user)) {
        throw forbidden(BLOCKED_ACCOUNT_MESSAGE);
    }

    return toPublicUser(user);
};

/**
 * DOCU: Sets the session cookie using the shared cookie options.
 * Last Updated Date: October 1, 2026
 * @function setSessionCookie
 * @param {object} res - Express response
 * @param {string} token - The signed token
 * @author Cesar
 */
const setSessionCookie = (res, token) => {
    res.cookie(AUTH_COOKIE_NAME, token, {
        ...AUTH_COOKIE_OPTIONS,
        maxAge: getAuthCookieMaxAge(),
    });
};

/**
 * DOCU: Clears the session cookie using the same options it was set with.
 * Last Updated Date: October 1, 2026
 * @function clearSessionCookie
 * @param {object} res - Express response
 * @author Cesar
 */
const clearSessionCookie = (res) => {
    res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS);
};

/**
 * DOCU: Starts password recovery. The answer never reveals whether the email exists.
 * Last Updated Date: October 1, 2026
 * @function forgotPassword
 * @param {object} data - The validated { email }
 * @returns {Promise<string>} The message to send
 * @author Cesar
 */
const forgotPassword = async (data) => {
    await userModel.findByEmail(data.email);

    return 'If that email exists, a reset link is on its way';
};

/**
 * DOCU: Completes password recovery by storing a new hash.
 * Last Updated Date: October 1, 2026
 * @function resetPassword
 * @param {object} data - The validated { email, password }
 * @returns {Promise<string>} The confirmation message
 * @author Cesar
 */
const resetPassword = async (data) => {
    const user = await userModel.findByEmail(data.email);

    if (!user) {
        throw notFound('No account found for that email');
    }

    await userModel.updatePassword(user._id, await hashPassword(data.password));

    return PASSWORD_UPDATED_MESSAGE;
};

/**
 * DOCU: Updates the signed-in user's own profile fields.
 *
 * Self-service, so it takes no id: the account is the one behind the verified
 * session, never one named in the body or the path. A caller cannot reach
 * another account here, which is the whole difference between this and
 * `adminService.updateUserProfile`.
 *
 * `role` and `status` are still refused by `updateUserProfileSchema`, so a
 * crafted body cannot promote this account even though the endpoint is the
 * account's own.
 *
 * Last Updated Date: October 1, 2026
 * @function updateOwnProfile
 * @param {object} actor - The signed-in user, from authMiddleware
 * @param {object} data - The validated profile fields
 * @returns {Promise<object>} The updated user, without a password
 * @author Cesar
 */
const updateOwnProfile = async (actor, data) => {
    /* The same duplicate-address check the admin path performs: the collision
     * is always about the email, and the message is shared so it reads the
     * same whoever triggers it. */
    const clash = await userModel.findByEmail(data.email);

    if (clash && String(clash._id) !== String(actor._id)) {
        throw conflict(DUPLICATE_EMAIL_MESSAGE);
    }

    const updated = await userModel.updateUser(actor._id, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
    });

    return toPublicUser(updated);
};

/**
 * DOCU: Sets a new password on the signed-in user's own account.
 *
 * Like the profile update this takes no id, and it reuses the admin
 * password schema so both paths refuse exactly the same values. The value is
 * hashed and never returned; only a message comes back.
 *
 * Last Updated Date: October 1, 2026
 * @function setOwnPassword
 * @param {object} actor - The signed-in user, from authMiddleware
 * @param {object} data - The validated { password }
 * @returns {Promise<string>} The confirmation message
 * @author Cesar
 */
const setOwnPassword = async (actor, data) => {
    await userModel.updatePassword(actor._id, await hashPassword(data.password));

    return PASSWORD_UPDATED_MESSAGE;
};

export {
    SALT_ROUNDS,
    hashPassword,
    toPublicUser,
    issueToken,
    register,
    signIn,
    getSessionUser,
    setSessionCookie,
    clearSessionCookie,
    forgotPassword,
    resetPassword,
    updateOwnProfile,
    setOwnPassword,
};
