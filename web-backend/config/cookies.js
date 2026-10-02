/** The cookie the JWT is stored in, read by the auth middleware. */
const AUTH_COOKIE_NAME = 'session';

/** Hosts that count as "the same origin machine" while developing. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

/** Extracts the hostname from an origin, or an empty string when it is not a URL. */
const hostOf = (origin) => {
    try {
        return new URL(origin).hostname;
    } catch {
        return '';
    }
};

/**
 * DOCU: Whether the API is only ever talked to from a local development page.
 * Last Updated Date: October 1, 2026
 * @description `vercel.app` and `onrender.com` are different sites, so a cookie set by one is
 * third-party to the other. Any public origin in FRONTEND_URL therefore means the deployment is
 * cross-site, which is what decides SameSite. A hostname comparison cannot see that
 * `app.example.com` and `api.example.com` share a site, so a same-site custom-domain deployment
 * must say so explicitly with COOKIE_SAME_SITE=lax.
 * @function isLocalOnlyDeployment
 * @returns {boolean} True when every allowed frontend origin is a local host
 * @author Cesar
 */
const isLocalOnlyDeployment = () => {
    const origins = (process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (!origins.length) return true;

    return origins.every((origin) => LOCAL_HOSTS.has(hostOf(origin)));
};

/**
 * DOCU: The SameSite value to send, honouring the environment first.
 * Last Updated Date: October 1, 2026
 * @description An explicit COOKIE_SAME_SITE always wins. Otherwise the value follows the shape of
 * the deployment: `lax` locally, `none` in production, where the browser will not attach the
 * cookie to a cross-site `fetch` at all if it is anything stricter.
 * @function resolveSameSite
 * @returns {string} `lax`, `strict` or `none`
 * @author Cesar
 */
const resolveSameSite = () => {
    const configured = String(process.env.COOKIE_SAME_SITE || '').trim().toLowerCase();

    if (configured) return configured;

    return isLocalOnlyDeployment() ? 'lax' : 'none';
};

/**
 * DOCU: Builds the cookie options, reading the environment at call time.
 * Last Updated Date: October 1, 2026
 * @description The environment is read here rather than at module load, because the
 * entry point loads .env after the imports are evaluated. A top-level read would
 * always see undefined and silently fall back to the defaults.
 *
 * `Secure` is not left to a remembered environment variable: it is derived, because a `SameSite=None`
 * cookie without it is rejected outright by Safari and by Chrome, and the failure looks exactly
 * like a failed login rather than like a configuration mistake. Over plain HTTP in local
 * development it stays off, or the browser drops the cookie.
 * @function getAuthCookieOptions
 * @returns {object} The options used to set and clear the session cookie
 * @author Cesar
 */
const getAuthCookieOptions = () => {
    const sameSite = resolveSameSite();
    const configured = String(process.env.COOKIE_SECURE || '').trim().toLowerCase();
    /** SameSite=None is meaningless without Secure, so it is forced on rather than trusted. */
    const secure = configured ? configured === 'true' : sameSite === 'none' || process.env.NODE_ENV === 'production';

    return {
        httpOnly: true,
        secure,
        sameSite,
        path: '/',
    };
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
    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
    const match = /^(\d+)([smhd])$/.exec(String(expiresIn).trim());
    if (!match) return 24 * 60 * 60 * 1000;

    return Number(match[1]) * TOKEN_UNIT_MULTIPLIERS[match[2]];
};

export {
    AUTH_COOKIE_NAME,
    isLocalOnlyDeployment,
    resolveSameSite,
    getAuthCookieOptions,
    getAuthCookieMaxAge,
};
