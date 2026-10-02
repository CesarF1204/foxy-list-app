/**
 * Where the API lives.
 *
 * Left empty - or set to "" - every request goes to the origin the page itself was served from,
 * which is how the app is deployed: Vercel forwards `/api` to Render, so the browser only ever
 * talks to one host and the session cookie stays first-party. An absolute URL is still accepted
 * and is what a separately hosted API needs, but it makes every request cross-site, which
 * browsers are increasingly unwilling to carry a session cookie over.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

/** Raised when the API answers with an error. */
class ApiRequestError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "ApiRequestError";
        this.status = status;
    }
}

/** Collapses an error body into one readable message. */
const toErrorMessage = (body, status) => {
    const { message } = body ?? {};

    /** A validation failure arrives as a list, one entry per field. */
    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string" && message.trim()) return message;

    return `Request failed (${status})`;
};

/** Performs a JSON request against the real backend. */
const apiRequest = async (path, { method = "GET", body, signal } = {}) => {
    /**
     * Only reached when a build baked in a value that is not a URL, e.g. `VITE_API_BASE_URL=api`.
     * An unset or empty value is fine and means "same origin", which is the deployed setup, so it
     * must not be treated as a missing backend.
     */
    if (API_BASE_URL && !/^https?:\/\//i.test(API_BASE_URL)) {
        throw new ApiRequestError(
            `VITE_API_BASE_URL must be an absolute URL or empty for same-origin requests, but it is "${API_BASE_URL}". Restart the dev server after changing it.`,
            0
        );
    }

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
        /**
         * A cancelled request is deliberate, not a failure. It must stay an abort so React Query
         * discards it quietly instead of counting it as an error.
         */
        if (error?.name === "AbortError") throw error;

        /**
         * Network level failure: server down, blocked by CORS, etc. The original is kept as the
         * cause so the console still says what actually failed.
         */
        throw new ApiRequestError(
            "Unable to reach the server. Please check your connection.",
            0
        );
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        /**
         * The API already sends a message written for the user; a stack trace or a database
         * error never reaches here, because it never leaves the API.
         */
        throw new ApiRequestError(toErrorMessage(data, response.status), response.status);
    }

    return data;
};

export { API_BASE_URL, apiRequest, toErrorMessage, ApiRequestError };
