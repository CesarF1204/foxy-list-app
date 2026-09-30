import { DEFAULT_JWT_EXPIRES_IN, DEFAULT_COOKIE_MAX_AGE } from '../constants/env.js';

/** Driven by the environment, or the browser drops the cookie over plain HTTP. */
const SECURE_COOKIES = process.env.COOKIE_SECURE === 'true';

/** The cookie the JWT is stored in, read by the auth middleware. */
const AUTH_COOKIE_NAME = 'session';

/** The same options set the cookie on sign in and clear it on sign out. */
const AUTH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/',
};

/** Multipliers used to read the token's own lifetime. */
const TOKEN_UNIT_MULTIPLIERS = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

/**
 * DOCU: Returns the cookie lifetime taken from the token's own expiry.
 * Last Updated Date: October 1, 2026
 * @function getAuthCookieMaxAge
 * @returns {number} The lifetime in milliseconds
 * @author Cesar
 */
const getAuthCookieMaxAge = () => {
    const expiresIn = process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;
    const match = /^(\d+)([smhd])$/.exec(String(expiresIn).trim());
    if (!match) return DEFAULT_COOKIE_MAX_AGE;

    return Number(match[1]) * TOKEN_UNIT_MULTIPLIERS[match[2]];
};

export {
    AUTH_COOKIE_NAME,
    AUTH_COOKIE_OPTIONS,
    SECURE_COOKIES,
    getAuthCookieMaxAge,
};
