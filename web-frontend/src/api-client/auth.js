import { apiRequest } from "./client";

/** Validates the auth cookie and returns the current user. */
const validateToken = () => apiRequest("/api/auth/validate_token");

export { validateToken };