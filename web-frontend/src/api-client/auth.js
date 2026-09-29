import { apiRequest } from "./client";

/** DOCU: Validates the auth cookie and returns the current user. */
const validateToken = () => apiRequest("/api/auth/validate_token");

export { validateToken };