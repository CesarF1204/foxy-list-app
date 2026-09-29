/* ============================================================================
 * TEMPORARY - FRONTEND MOCK LAYER (local test data, no backend required)
 * ============================================================================
 *
 * To go back to the real API: delete this whole `src/mock` folder and remove
 * the single `mock` bypass in `src/api-client/client.js`. Nothing else in the
 * app imports from here, so that is a complete, clean undo.
 *
 * This module holds the sample account and the sample task board. The account
 * is not defined here: it is read from `.env` (see the frontend README), so no
 * credential is ever hardcoded in the source. The board is pure data plus the
 * small helpers that keep it relative to today's date, so it always has
 * genuinely overdue, due-today and upcoming work.
 * ========================================================================== */

/** The env var backing each field of the sample account. */
const SAMPLE_CREDENTIAL_VARS = Object.freeze({
    firstName: "VITE_MOCK_SAMPLE_FIRST_NAME",
    lastName: "VITE_MOCK_SAMPLE_LAST_NAME",
    email: "VITE_MOCK_SAMPLE_EMAIL",
    password: "VITE_MOCK_SAMPLE_PASSWORD",
});

/**
 * DOCU: Reads an env var, tolerating both runtimes this file is loaded in. <br>
 * Vite defines `import.meta.env` in the browser, but `scripts/mock-verify.mjs`
 * imports this very file in plain Node, where it does not exist and the values
 * live on `process.env` instead (the script loads `.env` first). `globalThis`
 * reaches the latter without tripping the linter's no-undef rule for a browser
 * file, and the optional chains keep that second case working instead of
 * throwing, so the mock layer stays testable outside the bundler.
 * @param {string} key
 * @returns {string} the value, or "" when it is not set
 */
const readEnv = (key) => import.meta.env?.[key] ?? globalThis.process?.env?.[key] ?? "";

/**
 * DOCU: The sample account, used by the local mock only. <br>
 * Every field comes from `.env` and there is no in-source fallback, so nothing
 * here can leak into a commit or a bundle built on a machine that never had a
 * `.env`. The values are a throwaway demo login for a browser-only mock - they
 * are not a real credential, they grant access to nothing, and the sign-in
 * page already shows them on screen.
 *
 * Because these are `VITE_` variables they are inlined into the bundle and are
 * therefore NOT secret. That is fine for a mock demo login; it would not be
 * fine for a real one. Never point these at a real account.
 *
 * The values are resolved lazily, per field, rather than once at import time.
 * A missing `.env` therefore cannot white-screen the app at startup; it only
 * fails where the mock account is actually needed, with a message naming the
 * exact variables to set.
 * @type {{readonly firstName: string, readonly lastName: string, readonly email: string, readonly password: string}}
 */
let cachedCredentials = null;

/**
 * DOCU: Reads and validates the sample account from the environment.
 * @returns {Readonly<{firstName: string, lastName: string, email: string, password: string}>}
 * @throws {Error} when any of the `SAMPLE_CREDENTIAL_VARS` is unset or blank
 */
const readSampleCredentials = () => {
    const values = Object.fromEntries(
        Object.entries(SAMPLE_CREDENTIAL_VARS).map(([field, key]) => [
            field,
            readEnv(key).trim(),
        ])
    );

    const missing = Object.entries(SAMPLE_CREDENTIAL_VARS)
        .filter(([field]) => !values[field])
        .map(([, key]) => key);

    if (missing.length > 0) {
        throw new Error(
            `The mock sample account is not configured: set ${missing.join(", ")} ` +
                "in web-frontend/.env (see the frontend README for the " +
                "variable names). " +
                "The app deliberately ships no hardcoded credentials."
        );
    }

    return Object.freeze(values);
};

const SAMPLE_CREDENTIALS = {};

/** Exposes each field as a lazy getter over the validated env read. */
for (const field of Object.keys(SAMPLE_CREDENTIAL_VARS)) {
    Object.defineProperty(SAMPLE_CREDENTIALS, field, {
        enumerable: true,
        get: () => (cachedCredentials ??= readSampleCredentials())[field],
    });
}

Object.freeze(SAMPLE_CREDENTIALS);

/** A stable id, so a re-seed never orphans the sample tasks. */
const MOCK_USER_ID = "mock-user-demo-0001";

/** localStorage keys, namespaced so they can never shadow a real backend. */
const MOCK_DB_KEY = "foxylist:mock:db:v1";
const MOCK_SESSION_KEY = "foxylist:mock:session:v1";

/** DOCU: A calendar day `offset` days from today, as "YYYY-MM-DD". */
const dayOffset = (offset) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
};

/** DOCU: An ISO timestamp `offset` days in the past, for `createdAt`. */
const daysAgo = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    return date.toISOString();
};

/**
 * DOCU: The sample user, shaped exactly like the API's user object so nothing
 * downstream (navbar, avatar initials, dashboard greeting) behaves differently.
 * @returns {object}
 */
const buildMockUser = () => ({
    _id: MOCK_USER_ID,
    firstName: SAMPLE_CREDENTIALS.firstName,
    lastName: SAMPLE_CREDENTIALS.lastName,
    email: SAMPLE_CREDENTIALS.email,
    /* Plain text on purpose: a throwaway local mock, never a real one. */
    password: SAMPLE_CREDENTIALS.password,
    createdAt: daysAgo(90),
});

/**
 * DOCU: Builds one task of a board, filling in the shared fields so the data
 * below only has to describe what makes each task different.
 * @param {string} userId - the mock user these tasks belong to
 * @param {string} status - the board: "todo", "ongoing" or "done"
 * @param {number} order - position within that board
 * @param {number|null} dueOffset - days from today, or null for no due date
 * @param {object} task - the task-specific fields
 * @returns {object}
 */
const makeTask = (userId, status, order, dueOffset, task) => ({
    _id: `mock-task-${userId}-${status}-${order}`,
    userId,
    status,
    order,
    dueDate: dueOffset === null ? null : dayOffset(dueOffset),
    createdAt: daysAgo(20 - order),
    ...task,
});

/**
 * DOCU: The sample board, deliberately varied so every part of the Tasks
 * feature can be exercised:
 *   - all three states (pending / in progress / completed)
 *   - overdue, due-today, upcoming and no due date at all
 *   - every priority, and a mix of short and very long titles and descriptions
 *   - some tasks with an empty description, so the card layout is tested too
 *
 * Fields the current card does not render yet (`priority`, `dueDate`, `labels`)
 * are included on purpose: they mirror the shape the real API is expected to
 * return, so this data doubles as a fixture later. The UI ignores them until
 * those features exist.
 * @param {string} userId - the mock user these tasks belong to
 * @returns {Array<object>}
 */
const buildSampleTasks = (userId) => {
    /** Folds a list of task bodies into a board, assigning order and dates. */
    const board = (status, dueOffsets, bodies) =>
        bodies.map((body, order) =>
            makeTask(userId, status, order, dueOffsets[order], body)
        );

    const todo = board(
        "todo",
        [-5, -1, 0, 3, 4, 7, 10, 21],
        [
            {
                title: "Reply to the landlord about the lease renewal",
                description:
                    "Wants an answer before the end of the month. Reply to the lease renewal email and ask for the updated contract.",
                priority: "urgent",
                labels: ["home"],
            },
            {
                title: "Book the dentist",
                description: "Six month check-up, overdue since last week.",
                priority: "high",
                labels: ["health"],
            },
            {
                title: "Rewrite the project README",
                description: "",
                priority: "low",
                labels: ["work"],
            },
            {
                title: "Plan the weekend hike route and check the weather",
                description:
                    "Three candidates: Ridgeway (12 km), Lakeside loop (8 km) and the coastal path (16 km). Check the forecast on Friday evening and pick the drier one.",
                priority: "medium",
                labels: ["personal", "outdoors"],
            },
            {
                title: "Cancel the unused subscription",
                description: "Still being charged monthly. Cancel before the renewal.",
                priority: "medium",
                labels: ["home"],
            },
            {
                title: "Find a birthday present for Sam",
                description: "",
                priority: "medium",
                labels: ["personal"],
            },
            {
                title: "Sort out the recycling",
                description: "Blue bin goes out tonight.",
                priority: "low",
                labels: ["chores"],
            },
            {
                title: "Finish the taxes",
                description: "Final return, three receipts still missing.",
                priority: "high",
                labels: ["money"],
            },
        ]
    );

    const ongoing = board(
        "ongoing",
        [-3, 0, -2, 6, 12, 26],
        [
            {
                title: "Finish the frontend milestone",
                description: "Board, sign-in and task editing. Overdue, but nearly there.",
                priority: "urgent",
                labels: ["work"],
            },
            {
                title: "Prepare the presentation slides",
                description: "Ten slides, five minutes, one take.",
                priority: "high",
                labels: ["work"],
            },
            {
                title: "Fix the leaking kitchen tap",
                description: "Was due last week. New washer arrived, just needs fitting.",
                priority: "medium",
                labels: ["home"],
            },
            {
                title: "Review Alex's pull request",
                description: "",
                priority: "medium",
                labels: ["work"],
            },
            {
                title: "Start the running plan",
                description: "Three runs a week, building to 5 km by the end of the month.",
                priority: "low",
                labels: ["health"],
            },
            {
                title: "Research the new camera",
                description:
                    "Comparing mirrorless options: sensor size, autofocus, weight and price. Also weigh a used body against a new one.",
                priority: "low",
                labels: ["personal"],
            },
        ]
    );

    const done = board(
        "done",
        [-14, -8, -6, -4, -2],
        [
            {
                title: "Set up the project repository",
                description: "Repo, branches and the first commit.",
                priority: "high",
                labels: ["work"],
            },
            {
                title: "Order new running shoes",
                description: "Delivered and already broken in.",
                priority: "medium",
                labels: ["health"],
            },
            {
                title: "Pay the electricity bill",
                description: "",
                priority: "urgent",
                labels: ["money"],
            },
            {
                title: "Clean the flat",
                description: "Kitchen, bathroom, and the vacuuming that was overdue as well.",
                priority: "low",
                labels: ["chores"],
            },
        ]
    );

    return [...todo, ...ongoing, ...done];
};

export {
    SAMPLE_CREDENTIALS,
    MOCK_USER_ID,
    MOCK_DB_KEY,
    MOCK_SESSION_KEY,
    dayOffset,
    daysAgo,
    buildMockUser,
    buildSampleTasks,
};
