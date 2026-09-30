import { handleLocalRequest } from "./localApi";
import { MOCK_MODE, handleMockRequest } from "../mock";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * DOCU: True when requests are answered locally instead of by a backend.
 * `MOCK_MODE` wins over `VITE_API_BASE_URL`, so a real server cannot be hit by
 * accident while testing the mock.
 */
const isMocked = MOCK_MODE || !API_BASE_URL;

/** DOCU: Collapses an error body into one readable message. */
const toErrorMessage = (body, status) => {
    const { message } = body ?? {};

    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string" && message.trim()) return message;

    return `Request failed (${status})`;
};

/**
 * DOCU: Performs a JSON request. Auth is cookie based, so credentials are always
 * included and no token header is needed.
 * @param {string} path - the API path, e.g. "/api/tasks"
 * @returns {Promise<object>} the parsed response body
 * @throws {Error} when the response is not ok
 */
const apiRequest = async (path, { method = "GET", body } = {}) => {
    if (MOCK_MODE) return handleMockRequest(path, { method, body });
    if (isMocked) return handleLocalRequest(path, { method, body });

    /** Real API path: reached only when MOCK_MODE is off and a base URL is set. */
    let response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        /* Network level failure: server down, blocked by CORS, etc. */
        throw new Error("Unable to reach the server. Please check your connection.");
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        throw new Error(toErrorMessage(data, response.status));
    }

    return data;
};

export { API_BASE_URL, apiRequest, toErrorMessage, isMocked };
