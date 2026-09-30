/**
 * Tests for the admin API's own rules, in `src/api-client/adminApi.js`.
 *
 * These are the checks that make the dashboard safe rather than merely hidden.
 * Both fake API layers (the local one and the mock one) call into this module, so
 * a rule proved here holds in each of them and in the Express + MongoDB
 * implementation that will replace them. Nothing here renders a component: the
 * boundary being tested is the API, and it is tested directly.
 */

import { describe, it, expect } from "vitest";

import {
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
} from "../src/api-client/adminApi";

/** A `fail` callback shaped like the two fake APIs' HttpError throwers. */
const fail = (status, message) => {
    throw Object.assign(new Error(message), { status });
};

const admin = { _id: "admin-1", firstName: "Ada", lastName: "Lovelace", role: "admin" };
const plain = { _id: "user-1", firstName: "Alan", lastName: "Turing", role: "user" };

/** Tasks spread over two users, including one on an unknown board. */
const TASKS = [
    { _id: "t1", userId: "user-1", status: "todo" },
    { _id: "t2", userId: "user-1", status: "todo" },
    { _id: "t3", userId: "user-1", status: "ongoing" },
    { _id: "t4", userId: "user-1", status: "done" },
    { _id: "t5", userId: "admin-1", status: "done" },
    /* Not on a real board: it must not inflate any count. */
    { _id: "t6", userId: "user-1", status: "archived" },
];

const USERS = [
    { ...admin, email: "ada@example.com", status: "active", createdAt: "2024-01-01" },
    { ...plain, email: "alan@example.com", status: "active", createdAt: "2024-02-01" },
    {
        _id: "user-2",
        firstName: "Grace",
        lastName: "Hopper",
        email: "grace@example.com",
        role: "admin",
        status: "blocked",
        createdAt: "2024-03-01",
    },
];

/** Runs `fn` and returns the error it threw, so its status can be asserted. */
const thrownBy = (fn) => {
    try {
        fn();
    } catch (error) {
        return error;
    }
    return undefined;
};

describe("admin authorization", () => {
    it("passes a signed-in administrator through", () => {
        expect(requireAdmin(admin, fail)).toBe(admin);
    });

    it("answers 401 without a session, not 403", () => {
        const error = thrownBy(() => requireAdmin(null, fail));
        expect(error?.status).toBe(401);
        expect(error?.message).toMatch(/signed in/i);
    });

    it("answers 403 for a signed-in user who is not an admin", () => {
        expect(thrownBy(() => requireAdmin(plain, fail))?.status).toBe(403);
    });

    it("answers 403 for a blocked admin, so a block bites immediately", () => {
        const error = thrownBy(() => requireAdmin({ ...admin, status: "blocked" }, fail));
        expect(error?.status).toBe(403);
        expect(error?.message).toMatch(/blocked/i);
    });

    it("fails closed for a user with a missing or unknown role", () => {
        expect(thrownBy(() => requireAdmin({ ...plain, role: undefined }, fail))).toBeTruthy();
        expect(thrownBy(() => requireAdmin({ ...plain, role: "superuser" }, fail))).toBeTruthy();
    });

    it("treats a user with no stored status as active, not as broken", () => {
        expect(requireAdmin({ ...plain, role: "admin" }, fail)).toBeTruthy();
    });
});

describe("task statistics", () => {
    it("counts each board for one user", () => {
        expect(countTasksByStatus(TASKS, "user-1")).toEqual({
            total: 4,
            todo: 2,
            ongoing: 1,
            done: 1,
        });
    });

    it("keeps total equal to todo + ongoing + done", () => {
        const counts = countTasksByStatus(TASKS, "user-1");
        expect(counts.total).toBe(counts.todo + counts.ongoing + counts.done);
    });

    it("ignores a task on an unknown board rather than inflating the total", () => {
        const counts = countTasksByStatus(TASKS, "user-1");
        expect(counts.total).toBe(4);
        expect(counts).not.toHaveProperty("archived");
    });

    it("ignores another user's tasks", () => {
        expect(countTasksByStatus(TASKS, "user-1").total).not.toBe(TASKS.length);
    });

    it("counts every task on the dashboard, on the same derivation", () => {
        const totals = countAllTasks(TASKS);
        expect(totals).toEqual({ total: 5, todo: 2, ongoing: 1, done: 2 });
        expect(totals.total).toBe(totals.todo + totals.ongoing + totals.done);
    });

    it("reconciles the per-user counts with the dashboard totals", () => {
        const summed = USERS.reduce(
            (total, user) => total + countTasksByStatus(TASKS, user._id).total,
            0
        );
        expect(summed).toBe(countAllTasks(TASKS).total);
    });

    it("reports zeroes for an account with no tasks at all", () => {
        expect(countTasksByStatus(TASKS, "nobody")).toEqual({
            total: 0,
            todo: 0,
            ongoing: 0,
            done: 0,
        });
    });
});

describe("the user view sent to the browser", () => {
    it("never includes the password", () => {
        const view = adminView({ ...plain, password: "hunter2" }, TASKS);
        expect(view).not.toHaveProperty("password");
        expect(JSON.stringify(view)).not.toMatch(/hunter2/);
    });

    it("carries the task counts an admin reads", () => {
        expect(adminView(plain, TASKS).taskCounts).toEqual({
            total: 4,
            todo: 2,
            ongoing: 1,
            done: 1,
        });
    });

    it("defaults a missing status to active rather than leaving it blank", () => {
        expect(adminView({ _id: "x" }, []).status).toBe("active");
    });
});

describe("the dashboard totals", () => {
    const stats = buildStats(USERS, TASKS);

    it("counts every user, and splits them by status", () => {
        expect(stats.users.total).toBe(3);
        expect(stats.users.active).toBe(2);
        expect(stats.users.blocked).toBe(1);
        expect(stats.users.active + stats.users.blocked).toBe(stats.users.total);
    });

    it("counts the administrators", () => {
        expect(stats.users.admins).toBe(2);
    });

    it("reports the task totals from the task records", () => {
        expect(stats.tasks.total).toBe(5);
        expect(stats.tasks.done).toBe(2);
    });
});

describe("the users query", () => {
    it("returns only the requested page, not every row", () => {
        const page = queryUsers(USERS, TASKS, { pageSize: 2, page: 1 });

        expect(page.rows).toHaveLength(2);
        expect(page.total).toBe(3);
        expect(page.pageCount).toBe(2);
    });

    it("hands back a different set of rows on the second page", () => {
        const first = queryUsers(USERS, TASKS, { pageSize: 2, page: 1 }).rows.map((r) => r._id);
        const second = queryUsers(USERS, TASKS, { pageSize: 2, page: 2 }).rows.map((r) => r._id);

        expect(first).not.toEqual(second);
    });

    it("clamps a page past the end onto the last one", () => {
        const page = queryUsers(USERS, TASKS, { pageSize: 2, page: 99 });
        expect(page.page).toBe(page.pageCount);
    });

    it("searches names and emails, ignoring case", () => {
        expect(queryUsers(USERS, TASKS, { search: "grace" }).total).toBe(1);
        expect(queryUsers(USERS, TASKS, { search: "ALAN@" }).total).toBe(1);
        expect(queryUsers(USERS, TASKS, { search: "zzz" }).total).toBe(0);
    });

    it("filters by role and by status", () => {
        expect(queryUsers(USERS, TASKS, { role: "admin" }).total).toBe(2);
        expect(queryUsers(USERS, TASKS, { status: "blocked" }).total).toBe(1);
        expect(queryUsers(USERS, TASKS, { status: "active" }).total).toBe(2);
    });

    it("combines a search with a filter", () => {
        const page = queryUsers(USERS, TASKS, { search: "grace", role: "admin" });
        expect(page.total).toBe(1);
        expect(page.rows[0].email).toBe("grace@example.com");
    });

    it("ignores a sort field the API does not support", () => {
        const page = queryUsers(USERS, TASKS, { sortBy: "password" });
        expect(page.sortBy).toBe("createdAt");
    });

    it("sorts by name, and reverses when the direction flips", () => {
        const ascending = queryUsers(USERS, TASKS, { sortBy: "name", sortDir: "asc" })
            .rows.map((row) => row.firstName);
        const descending = queryUsers(USERS, TASKS, { sortBy: "name", sortDir: "desc" })
            .rows.map((row) => row.firstName);

        expect(ascending).toEqual(["Ada", "Alan", "Grace"]);
        expect(descending).toEqual(["Grace", "Alan", "Ada"]);
    });

    it("sorts by the task count numerically, not as text", () => {
        const busiest = queryUsers(USERS, TASKS, { sortBy: "totalTasks", sortDir: "desc" })
            .rows[0];
        expect(busiest.taskCounts.total).toBe(4);
    });

    it("never returns a password on any row", () => {
        const withSecrets = USERS.map((user) => ({ ...user, password: "secret" }));
        const page = queryUsers(withSecrets, TASKS, { pageSize: 10 });

        expect(page.rows.every((row) => !("password" in row))).toBe(true);
    });
});

describe("value validation", () => {
    it("accepts a well-formed profile and trims it", () => {
        const { errors, values } = validateProfile({
            firstName: "  Ada ",
            lastName: "Lovelace",
            email: "  ADA@Example.com ",
        });

        expect(errors).toEqual({});
        expect(values).toEqual({
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
        });
    });

    it("keys each rejection to the field that caused it", () => {
        const { errors } = validateProfile({
            firstName: "",
            lastName: "Turing2",
            email: "not-an-email",
        });

        expect(errors.firstName).toBeTruthy();
        expect(errors.lastName).toBeTruthy();
        expect(errors.email).toBeTruthy();
    });

    it("only accepts a role from the supported list", () => {
        expect(validateRole("admin").value).toBe("admin");
        expect(validateRole("user").value).toBe("user");
        expect(validateRole("superuser").error).toBeTruthy();
        expect(validateRole(undefined).error).toBeTruthy();
    });

    it("only accepts a status from the supported list", () => {
        expect(validateStatus("blocked").value).toBe("blocked");
        expect(validateStatus("deleted").error).toBeTruthy();
    });

    it("holds a password to the shared minimum length", () => {
        expect(validatePassword("longenough").value).toBe("longenough");
        expect(validatePassword("abc").error).toBeTruthy();
        expect(validatePassword("").error).toBeTruthy();
    });
});

describe("the self-lockout guard", () => {
    it("refuses an admin acting on their own account", () => {
        for (const action of ["demote", "block", "delete"]) {
            expect(thrownBy(() => assertNotSelfLockOut(admin, admin._id, action, fail))?.message)
                .toMatch(/your own account/);
        }
    });

    it("allows the same action against another account", () => {
        expect(() => assertNotSelfLockOut(admin, plain._id, "block", fail)).not.toThrow();
    });
});

describe("the query string", () => {
    it("reads the table's parameters", () => {
        expect(parseQuery("?page=2&role=admin&pageSize=25")).toEqual({
            page: "2",
            role: "admin",
            pageSize: "25",
        });
    });

    it("treats a missing query string as no filters at all", () => {
        expect(parseQuery("")).toEqual({});
        expect(parseQuery(undefined)).toEqual({});
    });
});
