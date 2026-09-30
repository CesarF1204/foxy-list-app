/**
 * DOCU: The admin endpoints' shared rules, written once so both fake API layers
 * (`src/mock/mockStore.js` and `src/api-client/localApi.js`) enforce identical
 * authorization, validation and statistics. There must be one definition of
 * "admin" and of what an admin may do, or the two layers drift apart.
 *
 * These are the stand-ins for real server routes. Every admin operation is
 * gated on `requireAdmin` here, at the API boundary, not in the React tree:
 * hiding a button is a usability measure, this is the security boundary. The
 * eventual Express + MongoDB implementation should carry the same checks on
 * the same paths, so the calling code needs no change.
 */

import {
    USER_ROLES,
    ADMIN_ROLE,
    DEFAULT_ROLE,
    ACCOUNT_STATUSES,
    DEFAULT_ACCOUNT_STATUS,
    isAdmin,
} from "../constants/roles";
import { BOARDS } from "../constants/boards";
import {
    EMAIL_PATTERN,
    NAME_PATTERN,
    PASSWORD_MIN_LENGTH,
} from "../constants/validation";
import { USER_SORT_FIELDS, SORT_DIRECTIONS } from "../constants/admin";

/** DOCU: The namespace every admin route lives under. A request that does not
 *  start with it never reaches these handlers at all. */
const ADMIN_PREFIX = "/api/admin";

/**
 * DOCU: Asserts the caller is a signed-in, active administrator. A missing
 * session is 401 and a signed-in non-admin is 403, the same split a real API
 * uses, so the UI can tell "sign in" from "not allowed". A blocked account is
 * refused here too, so blocking bites on the very next request rather than at
 * the next sign-in.
 * @param {object|null} currentUser - the resolved session user, or null
 * @param {Function} fail - throws the calling layer's own HttpError
 * @returns {object} the authenticated administrator
 */
const requireAdmin = (currentUser, fail) => {
    if (!currentUser) fail(401, "You must be signed in to do that");
    if ((currentUser.status ?? DEFAULT_ACCOUNT_STATUS) !== "active") {
        fail(403, "This account has been blocked");
    }
    if (!isAdmin(currentUser)) fail(403, "Administrator access is required");
    return currentUser;
};

/**
 * DOCU: Counts a user's tasks per board. Only the three real boards are
 * counted and the total is summed from them, so `total = todo + ongoing + done`
 * always holds, and a task on an unknown board can never inflate a total.
 * @param {Array} tasks - every task in the database
 * @param {string} userId - whose tasks to count
 * @returns {{total: number, todo: number, ongoing: number, done: number}}
 */
const countTasksByStatus = (tasks, userId) => {
    const counts = { total: 0, todo: 0, ongoing: 0, done: 0 };

    for (const task of tasks) {
        if (task.userId !== userId) continue;
        if (!BOARDS.includes(task.status)) continue;

        counts[task.status] += 1;
        counts.total += 1;
    }

    return counts;
};

/** DOCU: Counts every task in the database by board, for the dashboard totals.
 *  Same derivation as the per-user count, so the two always reconcile. */
const countAllTasks = (tasks) => {
    const totals = { total: 0, todo: 0, ongoing: 0, done: 0 };

    for (const task of tasks) {
        if (!BOARDS.includes(task.status)) continue;

        totals[task.status] += 1;
        totals.total += 1;
    }

    return totals;
};

/**
 * DOCU: The shape a user leaves the API in. The password is dropped here rather
 * than in each handler, so no admin route can leak it even by accident, and the
 * task counts are derived from real task records rather than stored anywhere.
 */
const adminView = (user, tasks) => ({
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: isAdmin(user) ? ADMIN_ROLE : DEFAULT_ROLE,
    status: user.status ?? DEFAULT_ACCOUNT_STATUS,
    createdAt: user.createdAt,
    taskCounts: countTasksByStatus(tasks, user._id),
});

/** DOCU: Case-insensitive "does this row match the search box" test, over the
 *  fields an admin would actually search by. An empty term matches everything,
 *  which is what makes the same filter usable as "no filter". */
const matchesSearch = (user, term) => {
    const needle = (term ?? "").trim().toLowerCase();
    if (!needle) return true;

    return [user.firstName, user.lastName, user.email].some((value) =>
        (value ?? "").toLowerCase().includes(needle)
    );
};

/** DOCU: The value a column sorts on. Names sort on the combined name, and the
 *  task count sorts on the number, not on a formatted string. */
const sortValue = (row, field) => {
    if (field === "name") return `${row.firstName} ${row.lastName}`.toLowerCase();
    if (field === "email") return row.email.toLowerCase();
    if (field === "totalTasks") return row.taskCounts.total;
    return row[field] ?? "";
};

/** DOCU: Compares two rows for one sort field, with the id as a tiebreaker so
 *  paging is stable and two rows cannot swap places between identical pages. */
const compareRows = (a, b, field, direction) => {
    const left = sortValue(a, field);
    const right = sortValue(b, field);

    const ordering =
        typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right));

    if (ordering !== 0) return direction === SORT_DIRECTIONS.desc ? -ordering : ordering;
    return a._id.localeCompare(b._id);
};

/**
 * DOCU: Filters, sorts and pages the user list, then attaches task counts.
 *
 * All of it happens before the response is built, so the browser only receives
 * the rows of the page it asked for. This is what a real server does with a
 * query string, and it is why the table stays usable with thousands of users
 * instead of dragging every record into the browser to filter there.
 *
 * @param {Array} users - every user in the database
 * @param {Array} tasks - every task in the database
 * @param {object} query - { search, role, status, sortBy, sortDir, page, pageSize }
 * @returns {object} the page of rows plus the counts the table paginates with
 */
const queryUsers = (users, tasks, query = {}) => {
    const role = query.role ?? "";
    const status = query.status ?? "";

    const rows = users
        .filter((user) => matchesSearch(user, query.search))
        .filter((user) => !role || (isAdmin(user) ? ADMIN_ROLE : DEFAULT_ROLE) === role)
        .filter((user) => !status || (user.status ?? DEFAULT_ACCOUNT_STATUS) === status)
        .map((user) => adminView(user, tasks));

    const field = USER_SORT_FIELDS[query.sortBy] ? query.sortBy : "createdAt";
    const sortDir = query.sortDir === SORT_DIRECTIONS.asc ? "asc" : SORT_DIRECTIONS.desc;
    rows.sort((a, b) => compareRows(a, b, field, sortDir));

    const pageSize = Math.max(1, Number(query.pageSize) || 10);
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    /** Clamped, so a filter that shrinks the list behind the admin's back, or a
     *  stale page number in the URL, lands on a real page rather than an empty
     *  table with no explanation. */
    const page = Math.min(Math.max(1, Number(query.page) || 1), pageCount);

    return {
        rows: rows.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        total: rows.length,
        pageCount,
        sortBy: field,
        sortDir,
    };
};

/**
 * DOCU: The dashboard headline numbers, computed from the real user and task
 * records on every request. Nothing is cached or denormalised, so a task
 * created a moment ago is in the totals a moment later.
 * @returns {{users: object, tasks: object}} totals for the summary cards
 */
const buildStats = (users, tasks) => {
    const usersWithStatus = users.map((user) => ({
        ...user,
        status: user.status ?? DEFAULT_ACCOUNT_STATUS,
    }));

    return {
        users: {
            total: users.length,
            active: usersWithStatus.filter((user) => user.status === "active").length,
            blocked: usersWithStatus.filter((user) => user.status === "blocked").length,
            admins: users.filter((user) => isAdmin(user)).length,
        },
        tasks: countAllTasks(tasks),
    };
};

/** DOCU: Validates the editable profile fields, returning a field-keyed error
 *  object so the caller can render each message beside its own input. */
const validateProfile = (body = {}) => {
    const errors = {};
    const firstName = (body.firstName ?? "").trim();
    const lastName = (body.lastName ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();

    if (!firstName) errors.firstName = "First name is required";
    else if (!NAME_PATTERN.test(firstName)) errors.firstName = "Letters and spaces only";

    if (!lastName) errors.lastName = "Last name is required";
    else if (!NAME_PATTERN.test(lastName)) errors.lastName = "Letters and spaces only";

    if (!email) errors.email = "Email is required";
    else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address";

    return { errors, values: { firstName, lastName, email } };
};

/** DOCU: Validates a role against the supported list, so a crafted request
 *  cannot set `role: "superuser"` and grant itself capabilities nobody defined. */
const validateRole = (role) =>
    USER_ROLES.includes(role) ? { value: role } : { error: `Role must be one of: ${USER_ROLES.join(", ")}` };

/** DOCU: Validates an account status against the supported list, the same way. */
const validateStatus = (status) =>
    ACCOUNT_STATUSES.includes(status)
        ? { value: status }
        : { error: `Status must be one of: ${ACCOUNT_STATUSES.join(", ")}` };

/** DOCU: The bar a new password must clear, shared with the auth forms so an
 *  admin cannot set a password the app itself would refuse. */
const validatePassword = (password) => {
    if (!password) return { error: "Password is required" };
    if (password.length < PASSWORD_MIN_LENGTH) {
        return { error: `Must be at least ${PASSWORD_MIN_LENGTH} characters` };
    }
    return { value: password };
};

/**
 * DOCU: Rejects the self-inflicted lockouts: an admin dropping their own admin
 * role, blocking themselves, or deleting themselves, which would leave the
 * dashboard unreachable. The UI disables those actions; this is the check that
 * actually holds, since the UI can be bypassed.
 * @param {object} actor - the signed-in administrator
 * @param {string} targetId - the user being changed
 */
const assertNotSelfLockOut = (actor, targetId, action, fail) => {
    if (actor._id === targetId) fail(400, `You cannot ${action} your own account`);
};

/**
 * DOCU: Runs an admin request against the given database.
 *
 * Every path calls `requireAdmin` before it reads or writes anything, so an
 * unauthorized caller cannot learn whether a user exists, cannot read task
 * counts and cannot mutate an account. Errors are raised through the calling
 * layer's `fail`, which is what makes the status codes match a real API.
 *
 * @param {object} options
 * @param {string} options.path - the request path, relative to the admin prefix
 * @param {object} options.query - the parsed query string
 * @param {string} options.method - the HTTP verb
 * @param {object} options.body - the parsed request body
 * @param {Array} options.users - the users collection
 * @param {Array} options.tasks - the tasks collection
 * @param {Function} options.currentUser - returns the signed-in user, or null
 * @param {Function} options.fail - throws this layer's HttpError
 * @param {Function} options.persist - writes the collections back
 * @returns {object|null} the response body, or null if the path is not an admin route
 */
const handleAdminRequest = ({
    path,
    query,
    method,
    body,
    users,
    tasks,
    currentUser,
    fail,
    persist,
}) => {
    /* --------------------------------- read --------------------------------- */

    if (method === "GET" && path === "/stats") {
        requireAdmin(currentUser(), fail);
        return { stats: buildStats(users, tasks) };
    }

    if (method === "GET" && path === "/users") {
        requireAdmin(currentUser(), fail);
        return { users: queryUsers(users, tasks, query) };
    }

    /** The id capture, shared by every single-user admin route below. */
    const idMatch = path.match(/^\/users\/([\w-]+)$/);
    const roleMatch = path.match(/^\/users\/([\w-]+)\/role$/);
    const statusMatch = path.match(/^\/users\/([\w-]+)\/status$/);
    const passwordMatch = path.match(/^\/users\/([\w-]+)\/password$/);
    const targetId = idMatch?.[1] ?? roleMatch?.[1] ?? statusMatch?.[1] ?? passwordMatch?.[1];

    /**
     * DOCU: Authorizes, then resolves the target. Authorization comes first, so
     * a non-admin gets 403 whether or not the account exists and cannot use the
     * endpoint to discover which ids are real.
     */
    const findTarget = () => {
        const actor = requireAdmin(currentUser(), fail);
        const target = users.find((user) => user._id === targetId);
        if (!target) fail(404, "That user no longer exists");
        return { actor, target };
    };

    if (method === "GET" && idMatch) {
        requireAdmin(currentUser(), fail);
        const target = users.find((user) => user._id === idMatch[1]);
        if (!target) fail(404, "That user no longer exists");

        return { user: adminView(target, tasks) };
    }

    /* -------------------------------- write -------------------------------- */

    if (method === "PATCH" && idMatch) {
        const { target } = findTarget();

        const { errors, values } = validateProfile(body);
        if (Object.keys(errors).length) fail(400, errors);

        /* The email is the login identity, so it has to stay unique. Case is
         * normalised on both sides, otherwise Ada@example.com and
         * ada@example.com would be two accounts sharing one mailbox. */
        const clash = users.some(
            (user) => user._id !== target._id && user.email?.toLowerCase() === values.email
        );
        if (clash) fail(409, "That email is already in use by another account");

        /* Profile and role are separate endpoints on purpose. Bundling them would
         * let a "rename" request quietly demote or promote an account, so each
         * change has to be asked for by name. */
        Object.assign(target, values);
        persist();

        return { user: adminView(target, tasks) };
    }

    if (method === "PUT" && roleMatch) {
        const { actor, target } = findTarget();

        const { value, error } = validateRole(body?.role);
        if (error) fail(400, { role: error });

        assertNotSelfLockOut(actor, target._id, "demote", fail);

        target.role = value;
        persist();

        return { user: adminView(target, tasks) };
    }

    if (method === "PUT" && statusMatch) {
        const { actor, target } = findTarget();

        const { value, error } = validateStatus(body?.status);
        if (error) fail(400, { status: error });

        assertNotSelfLockOut(actor, target._id, "block", fail);

        target.status = value;
        persist();

        return { user: adminView(target, tasks) };
    }

    if (method === "PUT" && passwordMatch) {
        const { target } = findTarget();

        const { value, error } = validatePassword(body?.password);
        if (error) fail(400, { password: error });

        /* The mock store keeps a throwaway plaintext copy because it is a local
         * stand-in with no hashing to do. A real API hashes here (bcrypt or
         * argon2) and never stores what it received. Either way the value is
         * written and never returned, and never leaves this function. */
        target.password = value;
        persist();

        return { message: "Password updated" };
    }

    if (method === "DELETE" && idMatch) {
        const { actor, target } = findTarget();

        assertNotSelfLockOut(actor, target._id, "delete", fail);

        users.splice(users.indexOf(target), 1);

        /* The user's tasks go with them. Leaving them would keep orphaned rows
         * counted in the dashboard totals with no owner left to ever clear them. */
        for (let index = tasks.length - 1; index >= 0; index -= 1) {
            if (tasks[index].userId === target._id) tasks.splice(index, 1);
        }

        persist();

        return { _id: target._id };
    }

    return null;
};

/**
 * DOCU: Parses the query string the admin UI sends.
 * @param {string} search - e.g. "?page=2&role=admin"
 * @returns {object} the parameters as a plain object
 */
const parseQuery = (search) => {
    const query = {};
    for (const [key, value] of new URLSearchParams(search ?? "")) query[key] = value;
    return query;
};

export {
    ADMIN_PREFIX,
    requireAdmin,
    countTasksByStatus,
    countAllTasks,
    adminView,
    queryUsers,
    buildStats,
    validateProfile,
    validateRole,
    validateStatus,
    validatePassword,
    assertNotSelfLockOut,
    parseQuery,
    handleAdminRequest,
};


