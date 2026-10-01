const USER_ROLES = ['user', 'admin'];

const ADMIN_ROLE = 'admin';

const DEFAULT_ROLE = 'user';

const ACCOUNT_STATUSES = ['active', 'blocked'];

const ACTIVE_STATUS = 'active';

const BLOCKED_STATUS = 'blocked';

const DEFAULT_ACCOUNT_STATUS = ACTIVE_STATUS;

/** Checks whether an account is an administrator. */
const isAdmin = (user) => user?.role === ADMIN_ROLE;

/** Checks whether an account may still sign in. */
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
