/* ============================================================================
 * TEMPORARY - FRONTEND MOCK LAYER (public entry point)
 *
 * To use: sign in at /login with the sample account. Its values come from `.env`
 * via the VITE_MOCK_SAMPLE_* variables in the frontend README; the sign-in page
 * displays them. They are a fake, local-only demo login, not a real credential.
 *
 * To go back to the real API: set MOCK_MODE below to false and set
 * VITE_API_BASE_URL in `.env`. Deleting this folder works too, after dropping the
 * one import of it in client.js.
 * ========================================================================== */

/** DOCU: The master switch for the mock layer. */
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
