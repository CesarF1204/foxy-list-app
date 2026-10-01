import { apiRequest } from "./client";

/** Registers a new account. */
const registerUser = (form_data) =>
    apiRequest("/api/users/register", { method: "POST", body: form_data });

/** Signs a user in. The auth token is set as an httpOnly cookie. */
const signIn = (form_data) =>
    apiRequest("/api/users/sign_in", { method: "POST", body: form_data });

/** Signs the user out and clears the auth cookie. */
const logOut = () => apiRequest("/api/users/logout", { method: "POST" });

/** Starts password recovery for an email address. */
const forgotPassword = (email) =>
    apiRequest("/api/users/forgot_password", { method: "POST", body: { email } });

/** Completes password recovery by setting a new password. */
const resetPassword = ({ email, password }) =>
    apiRequest("/api/users/reset_password", { method: "PUT", body: { email, password } });

/** Updates the signed-in user's own name and email. */
const updateOwnProfile = (profile) =>
    apiRequest("/api/users/profile", { method: "PATCH", body: profile });

/** Sets a new password on the signed-in user's own account. */
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