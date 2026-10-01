const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
     * Fail loudly when the app has no backend to talk to. Silently answering with fake data
     * here would hide a missing environment variable behind a screen that looks like it works.
     */
    if (!API_BASE_URL) {
        throw new ApiRequestError(
            "The app is not connected to a backend. Set VITE_API_BASE_URL in .env and restart.",
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
         * A cancelled request is deliberate, not a failure. It must stay an abort so React
         * Query discards it quietly instead of counting it as an error and putting an "Unable
         * to reach the server" message on the screen.
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
