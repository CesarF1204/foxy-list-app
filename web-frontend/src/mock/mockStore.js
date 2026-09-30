/* ============================================================================
 * TEMPORARY - FRONTEND MOCK LAYER (in-memory store, no network)
 *
 * A stand-in for the REST API holding everything in localStorage. It implements
 * the same paths, verbs, return shapes and 4xx errors as the real backend, so
 * queries and mutations are written exactly as they would be against it.
 *
 * Delete this folder and the bypass in `src/api-client/client.js` to undo it.
 * ========================================================================== */

import {
    MOCK_DB_KEY,
    MOCK_SESSION_KEY,
    MOCK_ADMIN_USER_ID,
    buildMockUser,
    buildMockAdminUser,
    buildSampleTasks,
    buildSampleUsers,
    buildExtraUserTasks,
} from "./sampleData";
import { ADMIN_PREFIX, handleAdminRequest, parseQuery } from "../api-client/adminApi";
import { DEFAULT_ROLE, DEFAULT_ACCOUNT_STATUS } from "../constants/roles";

/** A small delay, so loading states behave as they will with a real API. */
const delay = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

/** Thrown for any 4xx; carries the status so the query cache can react to it. */
class HttpError extends Error {
    constructor(status, message) {
        super(Array.isArray(message) ? message.join(". ") : message);
        this.status = status;
    }
}

/** An empty database, the shape every read falls back to. */
const emptyDb = () => ({ users: [], tasks: [] });

/**
 * DOCU: Brings a database seeded by an older version of the mock up to date.
 *
 * The role and account-status fields were added after the first release of the
 * mock, so a browser that has been running since before then holds a sample
 * account with neither field. `isAdmin` fails closed on a missing role - which is
 * correct - so that account would be refused by `/admin` with no obvious reason.
 *
 * The migration fills in only fields that are *absent*. A value that is present is
 * left exactly as it is, so a role or status deliberately changed through the
 * admin dashboard is never undone by a reload.
 *
 * @param {object} db - the database, mutated in place
 * @returns {boolean} whether anything changed, i.e. whether to persist
 */
const migrateSeedData = (db) => {
    let changed = false;

    for (const user of db.users) {
        if (user.role === undefined) {
            user.role = DEFAULT_ROLE;
            changed = true;
        }
        if (user.status === undefined) {
            user.status = DEFAULT_ACCOUNT_STATUS;
            changed = true;
        }
    }

    return changed;
};

/** DOCU: The database, seeded on first read. Seeding is idempotent, so a deleted
 *  sample task does not come back on the next reload. */
const readDb = () => {
    let db = emptyDb();

    try {
        const raw = localStorage.getItem(MOCK_DB_KEY);
        if (raw) db = { ...emptyDb(), ...JSON.parse(raw) };
    } catch {
        /** Corrupted or unavailable storage falls through to a fresh seed. */
    }

    /* Before anything is added: an existing database is brought up to date, so a
     * browser seeded by an older build can reach the admin area. */
    if (migrateSeedData(db)) writeDb(db);

    if (!db.users.some((user) => user._id === buildMockUser()._id)) {
        const user = buildMockUser();
        db.users.push(user);
        db.tasks.push(...buildSampleTasks(user._id));
        writeDb(db);
    }

    /* The sample administrator. Seeded on the same idempotent terms as the
     * others, and re-added if it goes missing so there is always a way to sign in
     * as an admin - including after a test that deleted it. */
    if (!db.users.some((user) => user._id === MOCK_ADMIN_USER_ID)) {
        const admin = buildMockAdminUser();
        db.users.push(admin);
        db.tasks.push(...buildExtraUserTasks(admin));
        writeDb(db);
    }

    /* The extra accounts, seeded as one group. The check is "none of them are
     * here", not "each of them is here": an admin deleting a seeded user must
     * not have them reappear on the next read, so the group is seeded once and
     * afterwards only ever shrinks. */
    const extraUsers = buildSampleUsers();

    if (!extraUsers.some((candidate) => db.users.some((user) => user._id === candidate._id))) {
        db.users.push(...extraUsers);
        for (const extra of extraUsers) db.tasks.push(...buildExtraUserTasks(extra));
        writeDb(db);
    }

    return db;
};

const writeDb = (db) => localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));

/** Generates a sortable, collision-resistant id without a uuid dependency. */
const makeId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** DOCU: Strips the password before a user object leaves this module. */
const publicUser = (user) =>
    Object.fromEntries(Object.entries(user).filter(([key]) => key !== "password"));

/**
 * DOCU: The signed-in mock user, or a 401 if there is no session. A blocked
 * account is refused with a 403 here rather than only at sign-in, so an admin
 * blocking someone takes effect on their next request, not their next login.
 */
const requireUser = () => {
    const userId = localStorage.getItem(MOCK_SESSION_KEY);
    const user = readDb().users.find((candidate) => candidate._id === userId);
    if (!user) throw new HttpError(401, "Not authenticated");
    if ((user.status ?? DEFAULT_ACCOUNT_STATUS) !== "active") {
        throw new HttpError(403, "This account has been blocked");
    }
    return user;
};

/** DOCU: Renumbers a board's tasks to a dense 0..n-1 sequence, so two tasks can
 *  never share a position and drag and drop stays deterministic. */
const normaliseOrder = (tasks, userId, status) =>
    tasks
        .filter((task) => task.userId === userId && task.status === status)
        .sort((a, b) => a.order - b.order)
        .forEach((task, index) => {
            task.order = index;
        });

/** DOCU: Two starter tasks, so a self-registered mock user is not empty. */
const starterTasks = (userId) => [
    {
        _id: makeId(),
        userId,
        title: "Drag me between the boards",
        description: "Pick me up and drop me into Ongoing, then Done.",
        status: "todo",
        order: 0,
        dueDate: null,
        createdAt: new Date().toISOString(),
    },
    {
        _id: makeId(),
        userId,
        title: "Write my first task",
        description: "Use the input at the bottom of the To Do column.",
        status: "todo",
        order: 1,
        dueDate: null,
        createdAt: new Date().toISOString(),
    },
];

/**
 * DOCU: Routes a request to the matching mock endpoint, mirroring the real
 * API's paths, verbs and error codes.
 * @param {string} path - e.g. "/api/tasks/move", or a path with a query string
 * @param {object} options - { method, body }
 * @throws {HttpError} on any 4xx
 */
const handle = async (requestPath, { method = "GET", body } = {}) => {
    await delay();

    /* Split off the query string once, so every handler compares a clean path
     * and the admin list can read its filters out of the same string a browser
     * would send. */
    const [path, search = ""] = requestPath.split("?");

    const db = readDb();
    const persist = () => writeDb(db);

    /* ------------------------------- admin ------------------------------ */

    if (path.startsWith(ADMIN_PREFIX)) {
        /** DOCU: Reads the session without the blocked-account check, because a
         *  blocked admin's session has to reach `requireAdmin` to be told why it
         *  was refused rather than looking signed out. */
        const currentUser = () => {
            const userId = localStorage.getItem(MOCK_SESSION_KEY);
            return db.users.find((candidate) => candidate._id === userId) ?? null;
        };

        const result = handleAdminRequest({
            path: path.slice(ADMIN_PREFIX.length),
            query: parseQuery(search),
            method,
            body,
            users: db.users,
            tasks: db.tasks,
            currentUser,
            fail: (status, message) => {
                throw new HttpError(status, message);
            },
            persist,
        });

        /** An unknown admin path must not fall through to the task routes below,
         *  or `/api/admin/../api/tasks` style confusion could reach them. */
        if (result === null) throw new HttpError(404, `No mock handler for ${method} ${path}`);
        return result;
    }

    /* ------------------------------- auth ------------------------------ */

    if (path === "/api/users/register" && method === "POST") {
        const { firstName, lastName, email, password } = body ?? {};

        const errors = [];
        if (!firstName?.trim()) errors.push("First name is required");
        if (!lastName?.trim()) errors.push("Last name is required");
        if (!email?.trim()) errors.push("Email is required");
        if (!password || password.length < 6) {
            errors.push("Password must be at least 6 characters");
        }
        if (errors.length) throw new HttpError(400, errors);

        /* Compared case-insensitively, so the same mailbox cannot be registered
         * twice with different capitalisation. */
        if (db.users.some((user) => user.email?.toLowerCase() === email.toLowerCase())) {
            throw new HttpError(409, "That email is already registered");
        }

        const user = {
            _id: makeId(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email,
            password,
            /* Self-registration can only ever produce a plain user. A role is
             * something an admin grants, never something a request body asks
             * for, so privilege escalation through the signup form is impossible. */
            role: DEFAULT_ROLE,
            status: DEFAULT_ACCOUNT_STATUS,
            createdAt: new Date().toISOString(),
        };

        db.users.push(user);
        db.tasks.push(...starterTasks(user._id));
        persist();

        return { user: publicUser(user) };
    }

    if (path === "/api/users/sign_in" && method === "POST") {
        const { email, password } = body ?? {};
        const user = db.users.find((candidate) => candidate.email === email);

        /* One message for a wrong password and an unknown email, so the sign-in
         * form cannot be used to discover which addresses are registered. */
        if (!user || user.password !== password) {
            throw new HttpError(401, "Incorrect email or password");
        }

        if ((user.status ?? DEFAULT_ACCOUNT_STATUS) !== "active") {
            throw new HttpError(403, "This account has been blocked. Contact an administrator.");
        }

        localStorage.setItem(MOCK_SESSION_KEY, user._id);
        return { user: publicUser(user) };
    }

    if (path === "/api/users/logout" && method === "POST") {
        localStorage.removeItem(MOCK_SESSION_KEY);
        return { message: "Signed out" };
    }

    if (path === "/api/auth/validate_token" && method === "GET") {
        return { user: publicUser(requireUser()) };
    }

    if (path === "/api/users/forgot_password" && method === "POST") {
        const { email } = body ?? {};
        if (!email?.trim()) throw new HttpError(400, "Email is required");

        /** The same response whether or not the email exists, so this endpoint
         *  cannot be used to discover which addresses are registered. */
        return { message: "If that email exists, a reset link is on its way" };
    }

    if (path === "/api/users/reset_password" && method === "PUT") {
        const { email, password } = body ?? {};

        const errors = [];
        if (!email?.trim()) errors.push("Email is required");
        if (!password || password.length < 6) {
            errors.push("Password must be at least 6 characters");
        }
        if (errors.length) throw new HttpError(400, errors);

        const user = db.users.find((candidate) => candidate.email === email);
        if (!user) throw new HttpError(404, "No account found for that email");

        user.password = password;
        persist();

        return { message: "Password updated" };
    }

    /* ------------------------------ tasks ------------------------------ */

    if (path === "/api/tasks" && method === "GET") {
        const user = requireUser();
        return { tasks: db.tasks.filter((task) => task.userId === user._id) };
    }

    if (path === "/api/tasks" && method === "POST") {
        const user = requireUser();
        const { title, description } = body ?? {};

        if (!title?.trim()) throw new HttpError(400, "Title is required");

        const siblings = db.tasks.filter(
            (task) => task.userId === user._id && task.status === "todo"
        );

        const task = {
            _id: makeId(),
            userId: user._id,
            title: title.trim(),
            description: description?.trim() ?? "",
            status: "todo",
            order: siblings.length,
            dueDate: body?.dueDate ?? null,
            priority: body?.priority ?? "medium",
            createdAt: new Date().toISOString(),
        };

        db.tasks.push(task);
        persist();

        return { task };
    }

    if (path === "/api/tasks/move" && method === "PUT") {
        const user = requireUser();
        const { taskId, newStatus, newIndex } = body ?? {};

        if (!["todo", "ongoing", "done"].includes(newStatus)) {
            throw new HttpError(400, "Unknown board");
        }

        const task = db.tasks.find(
            (candidate) => candidate._id === taskId && candidate.userId === user._id
        );
        if (!task) throw new HttpError(404, "Task not found");

        const previousStatus = task.status;

        /** Take it out of the old board, then insert it at the dropped index. */
        const target = db.tasks
            .filter(
                (candidate) =>
                    candidate.userId === user._id &&
                    candidate.status === newStatus &&
                    candidate._id !== taskId
            )
            .sort((a, b) => a.order - b.order);

        task.status = newStatus;
        target.splice(Math.max(0, Math.min(newIndex ?? target.length, target.length)), 0, task);

        target.forEach((candidate, index) => {
            candidate.order = index;
        });

        /** The old board now has a hole where the task used to be. */
        if (previousStatus !== newStatus) {
            normaliseOrder(db.tasks, user._id, previousStatus);
        }

        persist();
        return { task };
    }

    const taskMatch = path.match(/^\/api\/tasks\/([\w-]+)$/);

    if (taskMatch && method === "PATCH") {
        const user = requireUser();
        const task = db.tasks.find(
            (candidate) => candidate._id === taskMatch[1] && candidate.userId === user._id
        );
        if (!task) throw new HttpError(404, "Task not found");

        const { title, description } = body ?? {};

        if (title !== undefined) {
            if (!title.trim()) throw new HttpError(400, "Title cannot be empty");
            task.title = title.trim();
        }
        if (description !== undefined) task.description = description.trim();

        persist();
        return { task };
    }

    if (taskMatch && method === "DELETE") {
        const user = requireUser();
        const index = db.tasks.findIndex(
            (candidate) => candidate._id === taskMatch[1] && candidate.userId === user._id
        );
        if (index === -1) throw new HttpError(404, "Task not found");

        const [removed] = db.tasks.splice(index, 1);
        normaliseOrder(db.tasks, user._id, removed.status);
        persist();

        return { _id: removed._id };
    }

    throw new HttpError(404, `No mock handler for ${method} ${path}`);
};

export { handle as handleMockRequest, HttpError, readDb, writeDb };

/** DOCU: Wipes the mock database and session, so the next read re-seeds. */
const resetMockData = () => {
    localStorage.removeItem(MOCK_DB_KEY);
    localStorage.removeItem(MOCK_SESSION_KEY);
};

export { resetMockData, migrateSeedData };