/**
 * DOCU: An in-browser stand-in for the REST API, faked on top of localStorage
 * while the real backend is unimplemented. Returns the shapes a real Express +
 * MongoDB API would, so swapping them out later is a no-op.
 */

import { BOARDS, DEFAULT_BOARD } from "../constants/boards";

const DB_KEY = "foxylist:db:v1";
const SESSION_KEY = "foxylist:session:v1";

/** A small delay so loading states are actually visible, as with a real API. */
const delay = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

/** Thrown for any 4xx; carries the status so the query cache can react to it. */
class HttpError extends Error {
    constructor(status, message) {
        super(Array.isArray(message) ? message.join(". ") : message);
        this.status = status;
    }
}

const readDb = () => {
    try {
        const raw = localStorage.getItem(DB_KEY);
        if (raw) return JSON.parse(raw);
    } catch {
        /** Corrupted or unavailable storage falls through to a fresh database. */
    }
    return { users: [], tasks: [] };
};

const writeDb = (db) => localStorage.setItem(DB_KEY, JSON.stringify(db));

/** Generates a sortable, collision-resistant id without a uuid dependency. */
const makeId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** DOCU: Strips the password before a user object leaves this module. */
const publicUser = (user) => Object.fromEntries(
    Object.entries(user).filter(([key]) => key !== "password")
);

const requireUser = () => {
    const userId = localStorage.getItem(SESSION_KEY);
    const user = readDb().users.find((candidate) => candidate._id === userId);
    if (!user) throw new HttpError(401, "Not authenticated");
    return user;
};

/** Seeds a couple of starter tasks so a brand new board is not empty. */
const starterTasks = (userId) => [
    {
        _id: makeId(),
        userId,
        title: "Drag me between the boards",
        description: "Pick me up and drop me into Ongoing, then Done.",
        status: DEFAULT_BOARD,
        order: 0,
        createdAt: new Date().toISOString(),
    },
    {
        _id: makeId(),
        userId,
        title: "Write my first task",
        description: "Use the input at the bottom of the To Do column.",
        status: DEFAULT_BOARD,
        order: 1,
        createdAt: new Date().toISOString(),
    },
];

/** DOCU: Renumbers a board's tasks to a dense 0..n-1 sequence, so two tasks can
 *  never share a position and drag and drop stays deterministic. */
const normaliseOrder = (tasks, userId, status) =>
    tasks
        .filter((task) => task.userId === userId && task.status === status)
        .sort((a, b) => a.order - b.order)
        .forEach((task, index) => {
            task.order = index;
        });

/**
 * DOCU: Routes a request to the matching fake endpoint. <br>
 * Mirrors the real API's paths, verbs and error codes so the calling code is
 * written exactly as it would be against the real thing.
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
            /* Plain text only because this is a throwaway local mock. */
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

        localStorage.setItem(SESSION_KEY, user._id);
        return { user: publicUser(user) };
    }

    if (path === "/api/users/logout" && method === "POST") {
        localStorage.removeItem(SESSION_KEY);
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
            (task) => task.userId === user._id && task.status === DEFAULT_BOARD
        );

        const task = {
            _id: makeId(),
            userId: user._id,
            title: title.trim(),
            description: description?.trim() ?? "",
            status: DEFAULT_BOARD,
            order: siblings.length,
            createdAt: new Date().toISOString(),
        };

        db.tasks.push(task);
        persist();

        return { task };
    }

    if (path === "/api/tasks/move" && method === "PUT") {
        const user = requireUser();
        const { taskId, newStatus, newIndex } = body ?? {};

        if (!BOARDS.includes(newStatus)) {
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

    throw new HttpError(404, `No local handler for ${method} ${path}`);
};

export { handle as handleLocalRequest, HttpError };


