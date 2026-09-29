/* ============================================================================
 * TEMPORARY - FRONTEND MOCK LAYER (public entry point)
 * ============================================================================
 *
 * ── HOW TO USE ──────────────────────────────────────────────────────────────
 * Start the frontend (`npm run dev`) and sign in at /login with the sample
 * account. Its values are not in the source: they come from `.env`, via the
 * VITE_MOCK_SAMPLE_* variables documented in the frontend README. Fill them in
 * there - the sign-in page shows the
 * resulting email and password, with a button to fill the form in. They are a
 * fake, local-only demo login for this mock, not a real credential.
 *
 * You land on a board of 19 varied sample tasks. No backend is needed and no
 * network request is made.
 *
 * ── HOW TO GO BACK TO THE REAL API ──────────────────────────────────────────
 * Set MOCK_MODE below to false, and set VITE_API_BASE_URL in `.env`. The real
 * request path in src/api-client/client.js is untouched and takes over again.
 * Deleting this folder altogether works just as well, after dropping the one
 * import of it in client.js.
 * ========================================================================== */

/**
 * DOCU: The master switch for the mock layer. <br>
 * While true, `apiRequest` answers every call from local data and never calls
 * `fetch`, so the app runs entirely offline.
 */
const MOCK_MODE = true;

export { MOCK_MODE };
export { handleMockRequest, HttpError, readDb, writeDb, resetMockData } from "./mockStore";
export {
    SAMPLE_CREDENTIALS,
    MOCK_USER_ID,
    MOCK_DB_KEY,
    MOCK_SESSION_KEY,
    buildMockUser,
    buildSampleTasks,
    dayOffset,
} from "./sampleData";
