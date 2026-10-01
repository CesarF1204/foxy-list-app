import { apiRequest } from "./client";

/** DOCU: Registers a new account. */
const registerUser = (form_data) =>
    apiRequest("/api/users/register", { method: "POST", body: form_data });

/** DOCU: Signs a user in. The auth token is set as an httpOnly cookie. */
const signIn = (form_data) =>
    apiRequest("/api/users/sign_in", { method: "POST", body: form_data });

/** DOCU: Signs the user out and clears the auth cookie. */
const logOut = () => apiRequest("/api/users/logout", { method: "POST" });

/** DOCU: Starts password recovery for an email address. */
const forgotPassword = (email) =>
    apiRequest("/api/users/forgot_password", { method: "POST", body: { email } });

/** DOCU: Completes password recovery by setting a new password. */
const resetPassword = ({ email, password }) =>
    apiRequest("/api/users/reset_password", { method: "PUT", body: { email, password } });

/**
 * DOCU: Updates the signed-in user's own name and email.
 *
 * Self-service, so there is no id in the path - the API acts on whoever the
 * session cookie belongs to. It is the counterpart to the admin route rather
 * than a second way into it: the admin one is `requireAdmin`-guarded and takes
 * a target id, and this one cannot reach any other account at all.
 */
const updateOwnProfile = (profile) =>
    apiRequest("/api/users/profile", { method: "PATCH", body: profile });

/**
 * DOCU: Sets a new password on the signed-in user's own account.
 *
 * Like the profile update, self-service and id-less. The API answers with a
 * message only; the password is sent once and never read back.
 */
const updateOwnPassword = ({ password }) =>
    apiRequest("/api/users/password", { method: "PUT", body: { password } });

export {
    registerUser,
    signIn,
    logOut,
    forgotPassword,
    resetPassword,
    updateOwnProfile,
    updateOwnPassword,
};