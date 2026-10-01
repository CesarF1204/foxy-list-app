const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const BLOCKED_ACCOUNT_MESSAGE = 'This account has been blocked. Contact an administrator.';

const NO_TOKEN_MESSAGE = 'No token, authorization denied';

const INVALID_TOKEN_MESSAGE = 'Token is invalid.';

const EXPIRED_TOKEN_MESSAGE = 'Session expired. Please sign in again.';

const ACCOUNT_GONE_MESSAGE = 'Account no longer exists.';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

const PASSWORD_UPDATED_MESSAGE = 'Password updated';

/**
 * Shown when a "new" password turns out to be the current one. It must never echo either value
 * back, since a message repeating a password would put it in a log, a toast and a screenshot.
 */
const PASSWORD_UNCHANGED_MESSAGE = 'Your new password must be different from your current one.';

const DUPLICATE_EMAIL_MESSAGE = 'That email is already in use by another account';

const INVALID_ID_MESSAGE = 'That id is not valid';

const ROUTE_NOT_FOUND_MESSAGE = 'Route not found';

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
