/* ============================================================================
 * TEMPORARY - FRONTEND MOCK LAYER (in-memory store, no network)
 * ============================================================================
 *
 * A tiny stand-in for the REST API, holding everything in localStorage so
 * changes survive a reload while you test. It implements the same paths,
 * verbs, return shapes and 4xx errors as the real backend, so the app's
 * queries and mutations are written exactly as they would be against it.
 *
 * This file is only reached through the single bypass in
 * `src/api-client/client.js`. Delete the `src/mock` folder and that bypass and
 * the real API is back, untouched.
 * ========================================================================== */

import {
    MOCK_DB_KEY,
    MOCK_SESSION_KEY,
    buildMockUser,
    buildSampleTasks,
} from "./sampleData";

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
 * DOCU: The database, seeded with the sample account and board the first time. <br>
 * Seeding is idempotent: the sample user is only added when absent, so deleting
 * a sample task does not bring it back on the next reload. The sample board is
 * regenerated fresh whenever the seed version changes.
 * @returns {object}
 */
const readDb = () => {
    let db = emptyDb();

    try {
        const raw = localStorage.getItem(MOCK_DB_KEY);
        if (raw) db = { ...emptyDb(), ...JSON.parse(raw) };
    } catch {
        /* Corrupted or unavailable storage falls through to a fresh seed. */
    }

    if (!db.users.some((user) => user._id === buildMockUser()._id)) {
        const user = buildMockUser();
        db.users.push(user);
        db.tasks.push(...buildSampleTasks(user._id));
        writeDb(db);
    }

    return db;
};

const writeDb = (db) => localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));

/** Generates a sortable, collision-resistant id without a uuid dependency. */
const makeId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * DOCU: Strips the password before a user object crosses into the app. <br>
 * The key is built dynamically so the linter can see the property is used,
 * while the caller never has to think about it.
 */
const publicUser = (user) =>
    Object.fromEntries(Object.entries(user).filter(([key]) => key !== "password"));

/** DOCU: The signed-in mock user, or a 401 if there is no session. */
const requireUser = () => {
    const userId = localStorage.getItem(MOCK_SESSION_KEY);
    const user = readDb().users.find((candidate) => candidate._id === userId);
    if (!user) throw new HttpError(401, "Not authenticated");
    return user;
};

/**
 * DOCU: Renumbers a board's tasks to a dense 0..n-1 sequence. <br>
 * Called after every move so ordering stays gap-free and two tasks can never
 * share a position, which is what keeps drag and drop deterministic.
 */
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
 * DOCU: Routes a request to the matching mock endpoint. <br>
 * Mirrors the real API's paths, verbs and error codes, so the calling code
 * needs no knowledge that this is a mock.
 * @param {string} path - e.g. "/api/tasks/move"
 * @param {object} options - { method, body }
 * @returns {Promise<object>} the response body
 * @throws {HttpError} on any 4xx
 */
const handle = async (path, { method = "GET", body } = {}) => {
    await delay();

    const db = readDb();
    const persist = () => writeDb(db);

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

        if (db.users.some((user) => user.email === email)) {
            throw new HttpError(409, "That email is already registered");
        }

        const user = {
            _id: makeId(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email,
            password,
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

        if (!user || user.password !== password) {
            throw new HttpError(401, "Incorrect email or password");
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

        /*
          Deliberately the same response whether or not the email exists, so
          this endpoint cannot be used to discover which addresses are registered.
        */
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

        /* Take it out of the old board, then insert it at the dropped index. */
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

        /* The old board now has a hole where the task used to be. */
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

/**
 * DOCU: Wipes the mock database and session, so the next read re-seeds the
 * sample account and a fresh sample board. Useful when testing has left the
 * board in a messy state.
 * @returns {void}
 */
const resetMockData = () => {
    localStorage.removeItem(MOCK_DB_KEY);
    localStorage.removeItem(MOCK_SESSION_KEY);
};

export { resetMockData };