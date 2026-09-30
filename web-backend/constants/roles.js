/** The roles a user can hold. Granted only through the admin endpoints. */
const USER_ROLES = ['user', 'admin'];

/** The role that unlocks the admin API. */
const ADMIN_ROLE = 'admin';

/** The role given to a self-registered account. */
const DEFAULT_ROLE = 'user';

/** The two account statuses. `blocked` ends access at the API layer. */
const ACCOUNT_STATUSES = ['active', 'blocked'];

/** The status that allows sign in and API access. */
const ACTIVE_STATUS = 'active';

/** The status that refuses sign in and API access. */
const BLOCKED_STATUS = 'blocked';

/** The status given to a self-registered account. */
const DEFAULT_ACCOUNT_STATUS = ACTIVE_STATUS;

/**
 * DOCU: Checks whether an account is an administrator.
 * Last Updated Date: October 1, 2026
 * @function isAdmin
 * @param {object} user - The account to check
 * @returns {boolean} True if the account is an admin
 * @author Cesar
 */
const isAdmin = (user) => user?.role === ADMIN_ROLE;

/**
 * DOCU: Checks whether an account may still sign in.
 * Last Updated Date: October 1, 2026
 * @function isActive
 * @param {object} user - The account to check
 * @returns {boolean} True if the account is not blocked
 * @author Cesar
 */
const isActive = (user) => (user?.status ?? DEFAULT_ACCOUNT_STATUS) === ACTIVE_STATUS;

export {
    USER_ROLES,
    ADMIN_ROLE,
    DEFAULT_ROLE,
    ACCOUNT_STATUSES,
    ACTIVE_STATUS,
    BLOCKED_STATUS,
    DEFAULT_ACCOUNT_STATUS,
    isAdmin,
    isActive,
};
