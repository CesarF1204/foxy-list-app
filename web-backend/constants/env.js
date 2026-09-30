/** Port used when PORT is not set. */
const DEFAULT_PORT = 5000;

/** Frontend origin allowed by CORS when FRONTEND_URL is not set. */
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

/** Token lifetime used when JWT_EXPIRES_IN is not set. */
const DEFAULT_JWT_EXPIRES_IN = '1d';

/** Cookie lifetime used when JWT_EXPIRES_IN cannot be parsed: 1 day in ms. */
const DEFAULT_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;

/** bcrypt cost factor used when BCRYPT_SALT_ROUNDS is not set. */
const DEFAULT_BCRYPT_SALT_ROUNDS = 12;

/** Largest accepted request body. */
const MAX_REQUEST_BODY_SIZE = '1mb';

export {
    DEFAULT_PORT,
    DEFAULT_FRONTEND_URL,
    DEFAULT_JWT_EXPIRES_IN,
    DEFAULT_COOKIE_MAX_AGE,
    DEFAULT_BCRYPT_SALT_ROUNDS,
    MAX_REQUEST_BODY_SIZE,
};
