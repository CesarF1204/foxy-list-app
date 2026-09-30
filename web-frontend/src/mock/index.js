/* ============================================================================
 * TEMPORARY - FRONTEND MOCK LAYER (public entry point)
 *
 * To use: sign in at /login with either sample account. The values come from
 * `.env` via the VITE_MOCK_SAMPLE_* and VITE_MOCK_SAMPLE_ADMIN_* variables in the
 * frontend README; the sign-in page displays both. They are fake, local-only demo
 * logins, not real credentials. The admin one is the account that can reach
 * `/admin`.
 *
 * To go back to the real API: set MOCK_MODE below to false and set
 * VITE_API_BASE_URL in `.env`. Deleting this folder works too, after dropping the
 * one import of it in client.js.
 * ========================================================================== */

/** DOCU: The master switch for the mock layer. */
const MOCK_MODE = true;

export { MOCK_MODE };
export {
    handleMockRequest,
    HttpError,
    readDb,
    writeDb,
    resetMockData,
    migrateSeedData,
} from "./mockStore";
export {
    SAMPLE_CREDENTIALS,
    SAMPLE_ADMIN_CREDENTIALS,
    MOCK_USER_ID,
    MOCK_ADMIN_USER_ID,
    MOCK_DB_KEY,
    MOCK_SESSION_KEY,
    buildMockUser,
    buildMockAdminUser,
    buildSampleTasks,
    buildSampleUsers,
    buildExtraUserTasks,
    dayOffset,
} from "./sampleData";
