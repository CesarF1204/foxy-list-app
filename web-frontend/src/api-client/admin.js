import { apiRequest, apiUpload } from "./client";
import { AVATAR_FIELD } from "../constants/user";

/** The admin endpoints, one function per operation, matching */

/**
 * Serialises the table's filter state into a query string, skipping the empty values so the URL
 * stays readable and cacheable.
 */
const toQueryString = (params = {}) => {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === "") continue;
        search.set(key, String(value));
    }

    const query = search.toString();
    return query ? `?${query}` : "";
};

/** The dashboard totals: user counts and task counts by board. */
const getAdminStats = () => apiRequest("/api/admin/stats");

/** One page of users, with their task counts attached. */
const getAdminUsers = (params, { signal } = {}) =>
    apiRequest(`/api/admin/users${toQueryString(params)}`, { signal });

/** A single user's profile, role, status and task counts. */
const getAdminUser = (userId) => apiRequest(`/api/admin/users/${userId}`);

/**
 * Updates the profile fields. Role and status have their own endpoints on purpose, so a rename
 * request cannot carry a privilege change with it.
 */
const updateAdminUser = ({ userId, firstName, lastName, email }) =>
    apiRequest(`/api/admin/users/${userId}`, { method: "PATCH", body: { firstName, lastName, email } });

/** Changes a user's role. Validated server-side against the supported list. */
const updateAdminUserRole = ({ userId, role }) =>
    apiRequest(`/api/admin/users/${userId}/role`, { method: "PUT", body: { role } });

/** Blocks or unblocks a user. */
const updateAdminUserStatus = ({ userId, status }) =>
    apiRequest(`/api/admin/users/${userId}/status`, { method: "PUT", body: { status } });

/**
 * Sets a new password for a user. The value is sent once and is never read back - the API
 * returns only a confirmation message.
 */
const updateAdminUserPassword = ({ userId, password }) =>
    apiRequest(`/api/admin/users/${userId}/password`, { method: "PUT", body: { password } });

/**
 * Uploads a new profile picture for a user the admin is managing.
 *
 * The one admin endpoint that carries a file, so it is an upload rather than a JSON request. The
 * account is named in the path - which is exactly what the self-service route refuses to do.
 *
 * @param {object} payload - `{ userId }` and the chosen image
 * @param {File} payload.file - The chosen image
 * @param {(percent: number) => void} [payload.onProgress] - Progress callback
 * @returns {Promise<{message: string, avatar: string, user: object}>} The updated account
 */
const updateAdminUserAvatar = ({ userId, file, onProgress }) => {
    const form = new FormData();
    form.append(AVATAR_FIELD, file);

    return apiUpload(`/api/admin/users/${userId}/avatar`, form, onProgress);
};

/** Permanently deletes a user and their tasks. */
const deleteAdminUser = (userId) => apiRequest(`/api/admin/users/${userId}`, { method: "DELETE" });

export {
    getAdminStats,
    getAdminUsers,
    getAdminUser,
    updateAdminUser,
    updateAdminUserRole,
    updateAdminUserStatus,
    updateAdminUserPassword,
    updateAdminUserAvatar,
    deleteAdminUser,
    toQueryString,
};