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

export { registerUser, signIn, logOut, forgotPassword, resetPassword };