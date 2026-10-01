/** The message shown when a server fault happens, so it never leaks internals. */
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/** Shown for a blocked account, by sign in, session validation and the middleware. */
const BLOCKED_ACCOUNT_MESSAGE = 'This account has been blocked. Contact an administrator.';

/** Shown when the session cookie is missing entirely. */
const NO_TOKEN_MESSAGE = 'No token, authorization denied';

/** Shown when the session cookie is present but not a valid token. */
const INVALID_TOKEN_MESSAGE = 'Token is invalid.';

/** Shown when the token was valid but has passed its expiry. */
const EXPIRED_TOKEN_MESSAGE = 'Session expired. Please sign in again.';

/** Shown when the token is valid but the account is gone. */
const ACCOUNT_GONE_MESSAGE = 'Account no longer exists.';

/** Shown for a wrong email or a wrong password, never one of the two alone. */
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

/** Shown when a password is set or reset, so no user object is returned. */
const PASSWORD_UPDATED_MESSAGE = 'Password updated';

/**
 * DOCU: Shown when a "new" password turns out to be the current one.
 *
 * Deliberately says nothing else. It does not need to - the request that triggers
 * it is always one the caller was entitled to make, so there is no account to
 * enumerate - and it must not echo either value back, since a message that
 * repeated a password would put it in a log, a toast and a screenshot.
 */
const PASSWORD_UNCHANGED_MESSAGE = 'Your new password must be different from your current one.';

/** Shown when an email already belongs to another account. */
const DUPLICATE_EMAIL_MESSAGE = 'That email is already in use by another account';

/** Shown when a path id is not a 24 character hex ObjectId. */
const INVALID_ID_MESSAGE = 'That id is not valid';

/** Shown when a route does not exist. */
const ROUTE_NOT_FOUND_MESSAGE = 'Route not found';

/** Shown when a task is missing or belongs to another user. */
const TASK_NOT_FOUND_MESSAGE = 'Task not found';

export {
    GENERIC_ERROR_MESSAGE,
    BLOCKED_ACCOUNT_MESSAGE,
    NO_TOKEN_MESSAGE,
    INVALID_TOKEN_MESSAGE,
    EXPIRED_TOKEN_MESSAGE,
    ACCOUNT_GONE_MESSAGE,
    INVALID_CREDENTIALS_MESSAGE,
    PASSWORD_UPDATED_MESSAGE,
    PASSWORD_UNCHANGED_MESSAGE,
    DUPLICATE_EMAIL_MESSAGE,
    INVALID_ID_MESSAGE,
    ROUTE_NOT_FOUND_MESSAGE,
    TASK_NOT_FOUND_MESSAGE,
};
