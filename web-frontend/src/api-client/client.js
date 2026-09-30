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
 *
 * `signal` is the caller's chance to abandon a request that is no longer wanted.
 * React Query hands one to every query function and aborts it when the key
 * changes or the component unmounts, so a superseded search stops costing
 * bandwidth instead of finishing into a cache entry nobody reads.
 *
 * @param {string} path - the API path, e.g. "/api/tasks"
 * @param {object} [options] - { method, body, signal }
 * @returns {Promise<object>} the parsed response body
 * @throws {Error} when the response is not ok
 */
const apiRequest = async (path, { method = "GET", body, signal } = {}) => {
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
            signal,
        });
    } catch (error) {
        /* A cancelled request is deliberate, not a failure. It must stay an abort
         * so React Query discards it quietly instead of counting it as an error
         * and putting an "Unable to reach the server" message on the screen. */
        if (error?.name === "AbortError") throw error;

        /* Network level failure: server down, blocked by CORS, etc. The original
         * is kept as the cause so the console still says what actually failed. */
        throw new Error("Unable to reach the server. Please check your connection.", {
            cause: error,
        });
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
