/**
 * The react-query cache keys, gathered so no two modules invent different keys
 * for the same data. The provider reads the session and sign-in invalidates it.
 */

/** The query key holding the validated session. */
const VALIDATE_TOKEN_KEY = ["validateToken"];

/** The query key holding the signed-in user's tasks. */
const TASKS_KEY = ["tasks"];

export { VALIDATE_TOKEN_KEY, TASKS_KEY };