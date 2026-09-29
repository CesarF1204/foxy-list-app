import { handleLocalRequest } from "./localApi";
import { MOCK_MODE, handleMockRequest } from "../mock";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * DOCU: True when the app is running on local mock data instead of a real
 * backend. `MOCK_MODE` (src/mock/index.js) is the temporary switch: while it is
 * on, every request is answered in the browser and nothing touches the network.
 * It wins over `VITE_API_BASE_URL`, so you cannot accidentally hit a real
 * server while testing the mock.
 */
const isMocked = MOCK_MODE || !API_BASE_URL;

/**
 * DOCU: Normalises an error response body into a single readable message. <br>
 * The API returns "message" as either a string or an array of validation
 * messages, so both shapes collapse to one line here.
 * @param {object} body - the parsed response body
 * @param {number} status - the HTTP status code
 * @returns {string}
 */
const toErrorMessage = (body, status) => {
    const { message } = body ?? {};

    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string" && message.trim()) return message;

    return `Request failed (${status})`;
};

/**
 * DOCU: Performs a JSON request against the API. <br>
 * Auth is cookie based, so credentials are always included and no token header
 * needs to be attached by callers. While the mock layer is switched on
 * (`MOCK_MODE`), the request is served from local data and never leaves the
 * browser.
 * @param {string} path - the API path, e.g. "/api/tasks"
 * @param {object} [options]
 * @param {string} [options.method] - defaults to GET
 * @param {object} [options.body] - JSON serialised into the request body
 * @returns {Promise<object>} the parsed response body
 * @throws {Error} when the response is not ok
 */
const apiRequest = async (path, { method = "GET", body } = {}) => {
    if (MOCK_MODE) return handleMockRequest(path, { method, body });
    if (isMocked) return handleLocalRequest(path, { method, body });

    /*
      REAL API PATH - reached only when MOCK_MODE is off and VITE_API_BASE_URL
      is set. Left completely intact so switching back is a one-line change.
    */
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
