/* ============================================================================
 * TEMPORARY - FRONTEND MOCK LAYER (local test data, no backend required)
 *
 * The sample account is read from `.env` (see the frontend README), so no
 * credential is ever hardcoded. A second, separate sample admin is read the same
 * way, so there is an unambiguous administrator to sign in as without promoting
 * the demo account. The board is pure data plus helpers relative to today's
 * date, so it always has overdue, due-today and upcoming work. A handful of extra
 * accounts are seeded alongside them, so the admin dashboard has a realistic
 * users table to filter, sort and page through.
 *
 * To undo: delete this `src/mock` folder and the `mock` bypass in
 * `src/api-client/client.js`.
 * ========================================================================== */

import { ADMIN_ROLE, DEFAULT_ROLE, DEFAULT_ACCOUNT_STATUS } from "../constants/roles";

/** The env var backing each field of the sample account. */
const SAMPLE_CREDENTIAL_VARS = Object.freeze({
    firstName: "VITE_MOCK_SAMPLE_FIRST_NAME",
    lastName: "VITE_MOCK_SAMPLE_LAST_NAME",
    email: "VITE_MOCK_SAMPLE_EMAIL",
    password: "VITE_MOCK_SAMPLE_PASSWORD",
});

/** The env var backing each field of the sample admin account. Separate names
 *  from the sample account's on purpose: the two must be independently
 *  configurable, and an admin login that shares the demo login is not really a
 *  second account. */
const SAMPLE_ADMIN_CREDENTIAL_VARS = Object.freeze({
    firstName: "VITE_MOCK_SAMPLE_ADMIN_FIRST_NAME",
    lastName: "VITE_MOCK_SAMPLE_ADMIN_LAST_NAME",
    email: "VITE_MOCK_SAMPLE_ADMIN_EMAIL",
    password: "VITE_MOCK_SAMPLE_ADMIN_PASSWORD",
});

/** The fields both accounts have in common, so the validation below is written
 *  once for the two of them. */
const CREDENTIAL_FIELDS = ["firstName", "lastName", "email", "password"];

/** Vite defines `import.meta.env` in the browser, but `scripts/mock-verify.mjs`
 *  imports this file in plain Node, where the values live on `process.env`. */
const readEnv = (key) => import.meta.env?.[key] ?? globalThis.process?.env?.[key] ?? "";

/**
 * DOCU: Reads and validates one account's credentials from `.env`. Written once
 * and pointed at either account, so the "no hardcoded credentials" rule is
 * enforced identically for both.
 *
 * The read is lazy, so a missing `.env` only fails where an account is actually
 * needed, rather than white-screening the app at startup. These are `VITE_`
 * values, so they are inlined into the bundle and are NOT secret - fine for a
 * mock demo login, and never to be pointed at a real account.
 *
 * @param {object} vars - the env var name backing each field
 * @param {string} label - how the account is named in the error message
 * @returns {object} the frozen, validated values
 * @throws {Error} when any of the vars is unset or blank
 */
const readCredentials = (vars, label) => {
    const values = Object.fromEntries(
        Object.entries(vars).map(([field, key]) => [field, readEnv(key).trim()])
    );

    const missing = Object.entries(vars)
        .filter(([field]) => !values[field])
        .map(([, key]) => key);

    if (missing.length > 0) {
        throw new Error(
            `The mock ${label} is not configured: set ${missing.join(", ")} ` +
                "in web-frontend/.env (see the frontend README for the " +
                "variable names). The app deliberately ships no hardcoded credentials."
        );
    }

    return Object.freeze(values);
};

/**
 * DOCU: Wraps a credential read in lazy getters over a single cached read, so
 * each field is validated at most once per session and only when touched.
 * @returns {object} an object whose fields are lazy getters
 */
const lazyCredentials = (vars, label) => {
    let cached = null;

    const credentials = {};

    for (const field of CREDENTIAL_FIELDS) {
        Object.defineProperty(credentials, field, {
            enumerable: true,
            get: () => (cached ??= readCredentials(vars, label))[field],
        });
    }

    return Object.freeze(credentials);
};

/** The demo account's credentials. */
const SAMPLE_CREDENTIALS = lazyCredentials(SAMPLE_CREDENTIAL_VARS, "sample account");

/** The sample administrator's credentials. */
const SAMPLE_ADMIN_CREDENTIALS = lazyCredentials(
    SAMPLE_ADMIN_CREDENTIAL_VARS,
    "sample admin account"
);

/** A stable id, so a re-seed never orphans the sample tasks. */
const MOCK_USER_ID = "mock-user-demo-0001";

/** A stable id for the sample administrator, for the same reason. Distinct from
 *  `MOCK_USER_ID` so the two accounts never collide. */
const MOCK_ADMIN_USER_ID = "mock-user-admin-0001";

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

/** DOCU: The demo user, shaped like the API's so downstream behaves the same. A
 *  plain user: the administrator is the separately seeded `buildMockAdminUser`
 *  below, so the sign-in screen's "sample user" label is true and there is
 *  exactly one account that can reach `/admin`. */
const buildMockUser = () => ({
    _id: MOCK_USER_ID,
    firstName: SAMPLE_CREDENTIALS.firstName,
    lastName: SAMPLE_CREDENTIALS.lastName,
    email: SAMPLE_CREDENTIALS.email,
    /** Plain text on purpose: a throwaway local mock, never a real one. */
    password: SAMPLE_CREDENTIALS.password,
    /* Seeded, never requested: a role is something an admin grants. */
    role: DEFAULT_ROLE,
    status: DEFAULT_ACCOUNT_STATUS,
    createdAt: daysAgo(90),
});

/**
 * DOCU: The sample administrator, seeded so there is always an account that can
 * reach `/admin`. A self-registered account can never be one - the register
 * endpoint gives every new account the `user` role - so the first administrator
 * has to arrive with the seed data, exactly as it would in a real deployment
 * where a migration creates it.
 *
 * Its credentials come from `.env` like every other sample account's, so there
 * is still no hardcoded credential in the source.
 */
const buildMockAdminUser = () => ({
    _id: MOCK_ADMIN_USER_ID,
    firstName: SAMPLE_ADMIN_CREDENTIALS.firstName,
    lastName: SAMPLE_ADMIN_CREDENTIALS.lastName,
    email: SAMPLE_ADMIN_CREDENTIALS.email,
    /** Plain text on purpose: a throwaway local mock, never a real one. */
    password: SAMPLE_ADMIN_CREDENTIALS.password,
    /* The whole reason this account exists. */
    role: ADMIN_ROLE,
    status: DEFAULT_ACCOUNT_STATUS,
    createdAt: daysAgo(365),
});

/**
 * DOCU: A handful of extra accounts, so the users table has more than one row:
 * filters, sorting, paging and the blocked badge all have something to act on.
 * They carry no usable password - the mock only ever authenticates the sample
 * account and anyone who registers through the form.
 */
const SAMPLE_USERS = [
    { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", role: "user", age: 74 },
    { firstName: "Grace", lastName: "Hopper", email: "grace@example.com", role: "admin", age: 61 },
    { firstName: "Alan", lastName: "Turing", email: "alan@example.com", role: "user", age: 52 },
    { firstName: "Katherine", lastName: "Johnson", email: "katherine@example.com", role: "user", age: 30 },
    { firstName: "Linus", lastName: "Torvalds", email: "linus@example.com", role: "user", age: 18 },
    { firstName: "Barbara", lastName: "Liskov", email: "barbara@example.com", role: "user", age: 45, blocked: true },
    { firstName: "Tim", lastName: "Berners", email: "tim@example.com", role: "user", age: 9 },
    { firstName: "Radia", lastName: "Perlman", email: "radia@example.com", role: "user", age: 66 },
    { firstName: "Donald", lastName: "Knuth", email: "donald@example.com", role: "user", age: 88 },
    { firstName: "Margaret", lastName: "Hamilton", email: "margaret@example.com", role: "user", age: 40 },
    { firstName: "Edsger", lastName: "Dijkstra", email: "edsger@example.com", role: "user", age: 33 },
    { firstName: "Anita", lastName: "Borg", email: "anita@example.com", role: "user", age: 57 },
];

/**
 * DOCU: Builds the extra sample accounts, spread over the last year so the
 * "Joined" column and its default newest-first sort have a real spread to show.
 */
const buildSampleUsers = () =>
    SAMPLE_USERS.map(({ blocked, age, ...fields }, index) => ({
        _id: `mock-user-extra-${String(index + 1).padStart(3, "0")}`,
        ...fields,
        /** Unusable on purpose: only the sample account can sign in. */
        password: `throwaway-${index}`,
        status: blocked ? "blocked" : DEFAULT_ACCOUNT_STATUS,
        createdAt: daysAgo(age),
    }));

/**
 * DOCU: A few tasks per extra account, so the table's task columns are non-zero
 * and varied. The counts are derived from these records by the API, never
 * stored on the user, which is what keeps `total = todo + ongoing + done` true.
 */
const buildExtraUserTasks = (user) => {
    const layout = {
        "mock-user-extra-001": ["todo", "todo", "ongoing", "done"],
        "mock-user-extra-002": ["todo", "ongoing", "ongoing", "ongoing", "done", "done"],
        "mock-user-extra-003": ["todo", "done"],
        "mock-user-extra-004": ["todo", "todo", "todo", "ongoing"],
        "mock-user-extra-005": ["done", "done", "done"],
        "mock-user-extra-006": ["todo", "ongoing", "done"],
        "mock-user-extra-007": ["todo", "todo"],
        "mock-user-extra-008": ["todo", "ongoing", "ongoing", "done", "done", "done", "done"],
        "mock-user-extra-009": ["done"],
        "mock-user-extra-010": ["todo", "ongoing"],
        "mock-user-extra-011": ["todo", "todo", "ongoing", "ongoing", "done"],
        "mock-user-extra-012": ["todo", "done", "done"],
        "mock-user-admin-0001": ["todo", "ongoing", "done"],
    }[user._id] ?? ["todo"];

    /* The order counter is per board, which is what the task board itself does. */
    const orders = {};

    return layout.map((status, index) => {
        orders[status] = (orders[status] ?? -1) + 1;

        return {
            _id: `${user._id}-task-${index}`,
            userId: user._id,
            title: `Sample task ${index + 1} for ${user.firstName}`,
            description: "",
            priority: "medium",
            dueDate: null,
            status,
            order: orders[status],
            createdAt: daysAgo(30 - index),
        };
    });
};

/**
 * DOCU: Builds one task, filling in the shared fields so the data below only
 * describes what makes each task different.
 * @param {number|null} dueOffset - days from today, or null for no due date
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
 * DOCU: The sample board, deliberately varied: all three states, overdue /
 * due-today / upcoming / no due date, every priority, and both empty and very
 * long fields. `priority`, `dueDate` and `labels` mirror the real API's shape so
 * this data doubles as a fixture; the UI ignores them until those features exist.
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
    SAMPLE_ADMIN_CREDENTIALS,
    SAMPLE_CREDENTIAL_VARS,
    SAMPLE_ADMIN_CREDENTIAL_VARS,
    MOCK_USER_ID,
    MOCK_ADMIN_USER_ID,
    MOCK_DB_KEY,
    MOCK_SESSION_KEY,
    dayOffset,
    daysAgo,
    buildMockUser,
    buildMockAdminUser,
    buildSampleTasks,
    buildSampleUsers,
    buildExtraUserTasks,
};
