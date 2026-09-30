import { apiRequest } from "./client";

/**
 * DOCU: The admin endpoints, one function per operation, matching
 * `src/api-client/tasks.js` and `users.js` in shape: a path, a verb and a body.
 *
 * Nothing here decides whether the caller is allowed to call. Authorization
 * lives in the API layer (see `adminApi.js`), so these functions are safe to
 * call from anywhere - a crafted request from the console is refused by exactly
 * the same code path that refuses a normal user's request.
 */

/** DOCU: Serialises the table's filter state into a query string, skipping the
 *  empty values so the URL stays readable and cacheable. */
const toQueryString = (params = {}) => {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === "") continue;
        search.set(key, String(value));
    }

    const query = search.toString();
    return query ? `?${query}` : "";
};

/** DOCU: The dashboard totals: user counts and task counts by board. */
const getAdminStats = () => apiRequest("/api/admin/stats");

/**
 * DOCU: One page of users, with their task counts attached.
 *
 * The signal is the cancellation handle: a search the admin has already typed
 * past hands over the previous request's signal, which `fetch` turns into an
 * aborted request rather than a reply nobody is waiting for.
 *
 * @param {object} params - { search, role, status, sortBy, sortDir, page, pageSize }
 * @param {object} [options] - { signal }
 */
const getAdminUsers = (params, { signal } = {}) =>
    apiRequest(`/api/admin/users${toQueryString(params)}`, { signal });

/** DOCU: A single user's profile, role, status and task counts. */
const getAdminUser = (userId) => apiRequest(`/api/admin/users/${userId}`);

/** DOCU: Updates the profile fields. Role and status have their own endpoints
 *  on purpose, so a rename request cannot carry a privilege change with it. */
const updateAdminUser = ({ userId, firstName, lastName, email }) =>
    apiRequest(`/api/admin/users/${userId}`, { method: "PATCH", body: { firstName, lastName, email } });

/** DOCU: Changes a user's role. Validated server-side against the supported list. */
const updateAdminUserRole = ({ userId, role }) =>
    apiRequest(`/api/admin/users/${userId}/role`, { method: "PUT", body: { role } });

/** DOCU: Blocks or unblocks a user. */
const updateAdminUserStatus = ({ userId, status }) =>
    apiRequest(`/api/admin/users/${userId}/status`, { method: "PUT", body: { status } });

/** DOCU: Sets a new password for a user. The value is sent once and is never
 *  read back - the API returns only a confirmation message. */
const updateAdminUserPassword = ({ userId, password }) =>
    apiRequest(`/api/admin/users/${userId}/password`, { method: "PUT", body: { password } });

/** DOCU: Permanently deletes a user and their tasks. */
const deleteAdminUser = (userId) => apiRequest(`/api/admin/users/${userId}`, { method: "DELETE" });

export {
    getAdminStats,
    getAdminUsers,
    getAdminUser,
    updateAdminUser,
    updateAdminUserRole,
    updateAdminUserStatus,
    updateAdminUserPassword,
    deleteAdminUser,
    toQueryString,
};