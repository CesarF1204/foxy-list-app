/**
 * The react-query cache keys, gathered so no two modules invent different keys for the same
 * data. The provider reads the session and sign-in invalidates it.
 */

/** The query key holding the validated session. */
const VALIDATE_TOKEN_KEY = ["validateToken"];

/** The query key holding the signed-in user's tasks. */
const TASKS_KEY = ["tasks"];

/** The query key holding the admin dashboard's headline numbers. */
const ADMIN_STATS_KEY = ["admin", "stats"];

/**
 * The root of every admin user query, so a mutation can invalidate the whole family - the list
 * and any single-user view at once - without knowing which filters or page are on screen.
 */
const ADMIN_USERS_KEY = ["admin", "users"];

/**
 * The query key for one page of the users table, filters included, so two different filter
 * combinations do not overwrite each other's cache.
 */
const adminUsersKey = (params) => [...ADMIN_USERS_KEY, params ?? {}];

/** The query key for a single user's admin detail. */
const adminUserKey = (userId) => ["admin", "user", userId];

/** The query key holding the backend's OpenAPI document. */
const OPENAPI_SPEC_KEY = ["openapi", "spec"];

export {
    VALIDATE_TOKEN_KEY,
    TASKS_KEY,
    ADMIN_STATS_KEY,
    ADMIN_USERS_KEY,
    adminUsersKey,
    adminUserKey,
    OPENAPI_SPEC_KEY,
};