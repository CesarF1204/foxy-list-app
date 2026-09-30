/**
 * A temporary end-to-end smoke test of the mock layer, run in Node with a
 * stubbed localStorage. Delete this file when the mock layer is removed.
 * Run with: npm run verify:mock
 *
 * The app's modules use extensionless imports, which plain Node cannot resolve.
 * Rather than change that convention, `src/` is copied to a temp directory with
 * the extensions filled in, and that copy is imported. The whole folder is
 * copied rather than just `src/mock`, because the mock store imports the shared
 * rules it enforces - `api-client/adminApi.js` and the constants - and staging
 * only its own files would leave those unresolvable.
 */
import { existsSync, cpSync, readdirSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "..", "src");

/** Loads `.env` into `process.env`, since sampleData.js reads its account from
 *  there under plain Node. Fails loudly, so a check can never pass against a
 *  hardcoded default. */
const loadEnvFile = () => {
    const envPath = join(here, "..", ".env");

    if (!existsSync(envPath)) {
        console.error(
            "\n  No .env found. Create web-frontend/.env and fill in the " +
                "VITE_MOCK_SAMPLE_* values, then run this again.\n"
        );
        process.exit(1);
    }

    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const entry = line.match(/^\s*([\w.]+)\s*=\s*(.*)?\s*$/);
        /* Blank lines, comments, and anything already exported all get skipped. */
        if (!entry || line.trimStart().startsWith("#")) continue;
        if (process.env[entry[1]] === undefined) process.env[entry[1]] = entry[2] ?? "";
    }
};

loadEnvFile();

/** Every file under `dir`, recursively, as paths relative to `src`. */
const listSourceFiles = (dir, base = dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);

        return entry.isDirectory()
            ? listSourceFiles(full, base)
            : [full.slice(base.length + 1)];
    });

/**
 * Copies `src/` to a temp directory, adding an extension to every relative
 * import that lacks one. A specifier that already names a file - `./boards.js` -
 * is left alone, so the modules that already work this way keep working.
 */
const stageSource = () => {
    const staging = mkdtempSync(join(tmpdir(), "foxylist-mock-"));
    const target = join(staging, "src");

    cpSync(srcDir, target, { recursive: true });

    for (const relative of listSourceFiles(target)) {
        if (!relative.endsWith(".js")) continue;

        const path = join(target, relative);
        const source = readFileSync(path, "utf8").replace(
            /from "(\.[^"]*?)(?<!\.[\w-]+)"/g,
            'from "$1.js"'
        );
        writeFileSync(path, source);
    }

    return join(target, "mock");
};

/** A minimal in-memory stand-in for the browser's localStorage. */
const store = new Map();

globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
};

const staging = stageSource();
const { handleMockRequest, MOCK_SESSION_KEY } = await import(
    pathToFileURL(join(staging, "mockStore.js")).href
);
const { SAMPLE_CREDENTIALS, SAMPLE_ADMIN_CREDENTIALS, MOCK_USER_ID, MOCK_DB_KEY } = await import(
    pathToFileURL(join(staging, "sampleData.js")).href
);

let failures = 0;

const check = (label, condition, extra = "") => {
    if (condition) {
        console.log(`  ok    ${label}`);
    } else {
        failures += 1;
        console.error(`  FAIL  ${label} ${extra}`);
    }
};

const call = (path, method = "GET", body) => handleMockRequest(path, { method, body });

/** Asserts a promise rejects with the given HTTP status. */
const checkThrows = async (label, expectedStatus, promise) => {
    try {
        await promise;
        check(label, false, "(it resolved instead)");
    } catch (error) {
        check(label, error.status === expectedStatus, `(status was ${error.status})`);
    }
};

/** The orders on a board, sorted, so they can be compared with 0..n-1. */
const ordersOf = (tasks, board) =>
    tasks
        .filter((task) => task.status === board)
        .sort((a, b) => a.order - b.order)
        .map((task) => task.order);

const dense = (orders) => orders.every((order, index) => order === index);

console.log("\nSigning in with the sample account:");
await checkThrows("no session is rejected", 401, call("/api/auth/validate_token"));
await checkThrows(
    "a wrong password is rejected",
    401,
    call("/api/users/sign_in", "POST", { email: SAMPLE_CREDENTIALS.email, password: "nope" })
);

const session = await call("/api/users/sign_in", "POST", {
    email: SAMPLE_CREDENTIALS.email,
    password: SAMPLE_CREDENTIALS.password,
});
check("the sample credentials sign in", session.user?.email === SAMPLE_CREDENTIALS.email);
check("the password is stripped from the response", !("password" in session.user));

const today = new Date().toISOString().slice(0, 10);
const BOARDS = ["todo", "ongoing", "done"];

console.log("\nThe seeded sample board:");
const { tasks } = await call("/api/tasks");

check("sample tasks are seeded", tasks.length >= 15, `(got ${tasks.length})`);
check(
    "all three states are represented",
    BOARDS.every((board) => tasks.some((task) => task.status === board))
);
check(
    "every task belongs to the mock user",
    tasks.every((task) => task.userId === session.user._id)
);
check(
    "every task has a unique id",
    new Set(tasks.map((task) => task._id)).size === tasks.length
);
check("orders are dense on every board", BOARDS.every((b) => dense(ordersOf(tasks, b))));
check(
    "all four priorities appear",
    ["low", "medium", "high", "urgent"].every((p) => tasks.some((t) => t.priority === p))
);
check("there are overdue tasks", tasks.some((t) => t.dueDate && t.dueDate < today));
check("there are tasks due today", tasks.some((t) => t.dueDate === today));
check("there are upcoming tasks", tasks.some((t) => t.dueDate && t.dueDate > today));
check("some tasks have no description", tasks.some((t) => t.description === ""));
check("some tasks have a long description", tasks.some((t) => t.description.length > 100));

const second = (await call("/api/tasks")).tasks;
check("re-reading does not re-seed", second.length === tasks.length);


console.log("\nCreating a task:");
const created = await call("/api/tasks", "POST", {
    title: "  A brand new task  ",
    description: "  a note  ",
});
check("create trims the title", created.task.title === "A brand new task");
check("create trims the description", created.task.description === "a note");
check("create lands on the todo board", created.task.status === "todo");
check("create defaults the priority", created.task.priority === "medium");
await checkThrows(
    "an empty title is rejected",
    400,
    call("/api/tasks", "POST", { title: "   " })
);

console.log("\nStarting and finishing a task:");
const moved = await call("/api/tasks/move", "PUT", {
    taskId: created.task._id,
    newStatus: "done",
    newIndex: 0,
});
check("move changes the board", moved.task.status === "done");
check("move applies the dropped index", moved.task.order === 0);

const afterMove = (await call("/api/tasks")).tasks;
check("the source board is renumbered after a move", dense(ordersOf(afterMove, "todo")));
check(
    "the move persisted",
    afterMove.some((t) => t._id === created.task._id && t.status === "done")
);

const reopened = await call("/api/tasks/move", "PUT", {
    taskId: created.task._id,
    newStatus: "ongoing",
    newIndex: 0,
});
check("a completed task can be reopened", reopened.task.status === "ongoing");
await checkThrows(
    "an unknown board is rejected",
    400,
    call("/api/tasks/move", "PUT", { taskId: created.task._id, newStatus: "nope", newIndex: 0 })
);

console.log("\nEditing a task:");
const edited = await call(`/api/tasks/${created.task._id}`, "PATCH", {
    title: "Renamed task",
    description: "Updated note",
});
check("edit updates the title", edited.task.title === "Renamed task");
check("edit updates the description", edited.task.description === "Updated note");
await checkThrows(
    "edit rejects an empty title",
    400,
    call(`/api/tasks/${created.task._id}`, "PATCH", { title: "  " })
);

console.log("\nDeleting a task:");
const removal = await call(`/api/tasks/${created.task._id}`, "DELETE");
check("delete returns the removed id", removal._id === created.task._id);
const afterDelete = (await call("/api/tasks")).tasks;
check("the task is gone", !afterDelete.some((t) => t._id === created.task._id));
check("deleting closes the gap", dense(ordersOf(afterDelete, "ongoing")));
await checkThrows("deleting an unknown task 404s", 404, call("/api/tasks/no-such-task", "DELETE"));

console.log("\nOther users and sign-out:");
await call("/api/users/register", "POST", {
    firstName: "New",
    lastName: "Person",
    email: "new@example.com",
    password: "secret123",
});
await checkThrows(
    "registering the same email twice is rejected",
    409,
    call("/api/users/register", "POST", {
        firstName: "New",
        lastName: "Person",
        email: "new@example.com",
        password: "secret123",
    })
);

await call("/api/users/sign_in", "POST", { email: "new@example.com", password: "secret123" });
const newUserTasks = (await call("/api/tasks")).tasks;
check("a new user gets their own starter tasks", newUserTasks.length === 2);
check(
    "a new user sees none of the sample tasks",
    newUserTasks.every((t) => !t._id.startsWith("mock-task-"))
);

await call("/api/users/logout", "POST");
await checkThrows("signing out ends the session", 401, call("/api/auth/validate_token"));
await checkThrows(
    "tasks are unreachable once signed out",
    401,
    call("/api/tasks")
);

/* ---------------------------------------------------------------------------
 * The admin area.
 *
 * Starting signed out, so the refusals are met in the order a real attack would:
 * no session, then the wrong role, then the rights of a signed-in administrator.
 * Authorization is exercised through the API rather than through the UI, because
 * the API is the boundary that has to hold.
 * ------------------------------------------------------------------------- */

console.log("\nThe admin API refuses a signed-out caller:");
await checkThrows("the stats need a session", 401, call("/api/admin/stats"));
await checkThrows("the user list needs a session", 401, call("/api/admin/users"));
await checkThrows(
    "one user's details need a session",
    401,
    call("/api/admin/users/mock-user-extra-001")
);
await checkThrows(
    "a role change needs a session",
    401,
    call("/api/admin/users/mock-user-extra-001/role", "PUT", { role: "admin" })
);

console.log("\nThe admin API refuses a signed-in non-admin:");
await call("/api/users/sign_in", "POST", {
    email: SAMPLE_CREDENTIALS.email,
    password: SAMPLE_CREDENTIALS.password,
});
const plainUser = (await call("/api/auth/validate_token")).user;
check(
    "the sample user really is a plain user",
    plainUser.role === "user",
    `(role was ${plainUser.role})`
);
await checkThrows("a plain user cannot read the stats", 403, call("/api/admin/stats"));
await checkThrows("a plain user cannot list users", 403, call("/api/admin/users"));
await checkThrows(
    "a plain user cannot read one user",
    403,
    call("/api/admin/users/mock-user-extra-001")
);
await checkThrows(
    "a plain user cannot promote themselves",
    403,
    call(`/api/admin/users/${plainUser._id}/role`, "PUT", { role: "admin" })
);
await checkThrows(
    "a plain user cannot delete anyone",
    403,
    call("/api/admin/users/mock-user-extra-001", "DELETE")
);
await checkThrows(
    "a plain user cannot reset a password",
    403,
    call("/api/admin/users/mock-user-extra-001/password", "PUT", { password: "hijacked" })
);

console.log("\nThe admin API serves a signed-in administrator:");
await call("/api/users/sign_in", "POST", {
    email: SAMPLE_ADMIN_CREDENTIALS.email,
    password: SAMPLE_ADMIN_CREDENTIALS.password,
});
const signedInAdmin = (await call("/api/auth/validate_token")).user;
check("the sample admin signs in", signedInAdmin.email === SAMPLE_ADMIN_CREDENTIALS.email);
check("the sample admin holds the admin role", signedInAdmin.role === "admin");
check(
    "the sample admin has tasks of their own",
    (await call("/api/tasks")).tasks.some((task) => task.userId === signedInAdmin._id)
);
check("the sample admin can read the stats", Boolean((await call("/api/admin/stats")).stats));
await checkThrows(
    "the wrong admin password is refused",
    401,
    call("/api/users/sign_in", "POST", {
        email: SAMPLE_ADMIN_CREDENTIALS.email,
        password: "not-the-password",
    })
);

/** Every account on disk, so a total can be checked against a real count. */
const allUsers = () => JSON.parse(store.get(MOCK_DB_KEY)).users;
const allTasks = () => JSON.parse(store.get(MOCK_DB_KEY)).tasks;

const stats = (await call("/api/admin/stats")).stats;
check("the stats count every registered user", stats.users.total === allUsers().length);
check(
    "active and blocked add up to the total",
    stats.users.active + stats.users.blocked === stats.users.total
);
check("the seeded blocked account is counted", stats.users.blocked >= 1);
check(
    "the task totals add up",
    stats.tasks.total === stats.tasks.todo + stats.tasks.ongoing + stats.tasks.done
);
check("the task total matches the task records", stats.tasks.total === allTasks().length);

const page = (await call("/api/admin/users?pageSize=5&page=1")).users;
check("the list is paged to the requested size", page.rows.length === 5, `(${page.rows.length})`);
check("the list reports the full total", page.total === stats.users.total);
check("the list reports the page count", page.pageCount === Math.ceil(stats.users.total / 5));
check("no password is ever returned", page.rows.every((row) => !("password" in row)));
check(
    "every row carries counts that add up",
    page.rows.every(
        (row) =>
            row.taskCounts.total ===
            row.taskCounts.todo + row.taskCounts.ongoing + row.taskCounts.done
    )
);

console.log("\nSearching, filtering and sorting happen in the API:");
const searched = (await call("/api/admin/users?search=ada")).users;
check("a search matches one row", searched.total === 1, `(${searched.total})`);
check("the search found the right row", searched.rows[0]?.firstName === "Ada");
check(
    "a search ignores case",
    (await call("/api/admin/users?search=ADA@EXAMPLE.COM")).users.total === 1
);
check(
    "the role filter returns only admins",
    (await call("/api/admin/users?role=admin")).users.rows.every((row) => row.role === "admin")
);
check(
    "the status filter returns only blocked accounts",
    (await call("/api/admin/users?status=blocked")).users.rows.every(
        (row) => row.status === "blocked"
    )
);

const byName = (await call("/api/admin/users?sortBy=name&sortDir=asc")).users;
const fullName = (row) => `${row.firstName} ${row.lastName}`.toLowerCase();
check(
    "sorting by name is alphabetical",
    byName.rows.every((row, index) => index === 0 || fullName(byName.rows[index - 1]) <= fullName(row))
);

const clamped = (await call("/api/admin/users?page=999")).users;
check("a page beyond the end lands on the last page", clamped.page === clamped.pageCount);

console.log("\nAn admin changes an account:");
const target = (await call("/api/admin/users?search=alan")).users.rows[0];

const renamed = await call(`/api/admin/users/${target._id}`, "PATCH", {
    firstName: "Alonzo",
    lastName: "Church",
    email: "alonzo@example.com",
});
check("a rename is applied", renamed.user.firstName === "Alonzo");
check("the email is normalised", renamed.user.email === "alonzo@example.com");
check("a rename does not change the role", renamed.user.role === target.role);

await checkThrows(
    "a malformed email is rejected",
    400,
    call(`/api/admin/users/${target._id}`, "PATCH", {
        firstName: "Alonzo",
        lastName: "Church",
        email: "not-an-email",
    })
);
await checkThrows(
    "a duplicate email is rejected",
    409,
    call(`/api/admin/users/${target._id}`, "PATCH", {
        firstName: "Alonzo",
        lastName: "Church",
        email: "ada@example.com",
    })
);

const promoted = await call(`/api/admin/users/${target._id}/role`, "PUT", { role: "admin" });
check("a role change is applied", promoted.user.role === "admin");
await checkThrows(
    "an unknown role is rejected",
    400,
    call(`/api/admin/users/${target._id}/role`, "PUT", { role: "superuser" })
);
await checkThrows(
    "an unknown status is rejected",
    400,
    call(`/api/admin/users/${target._id}/status`, "PUT", { status: "deleted" })
);
const blockedRow = await call(`/api/admin/users/${target._id}/status`, "PUT", {
    status: "blocked",
});
check("a block is applied", blockedRow.user.status === "blocked");

console.log("\nA block bites on the blocked account's next request:");
await checkThrows(
    "a blocked account cannot sign in",
    403,
    call("/api/users/sign_in", "POST", {
        email: "alonzo@example.com",
        password: "throwaway-2",
    })
);

/* Back in as the administrator: the failed sign-in above left the session alone,
 * but re-authenticating makes the following unblock independent of that. */
await call("/api/users/sign_in", "POST", {
    email: SAMPLE_ADMIN_CREDENTIALS.email,
    password: SAMPLE_ADMIN_CREDENTIALS.password,
});
const unblocked = await call(`/api/admin/users/${target._id}/status`, "PUT", { status: "active" });
check("an unblock is applied", unblocked.user.status === "active");

console.log("\nPasswords:");
const passwordResult = await call(`/api/admin/users/${target._id}/password`, "PUT", {
    password: "brand-new-secret",
});
check("a password change answers with a message only", !("user" in passwordResult));
await checkThrows(
    "a short password is rejected",
    400,
    call(`/api/admin/users/${target._id}/password`, "PUT", { password: "abc" })
);

console.log("\nAn admin cannot lock themselves out:");
const me = (await call("/api/auth/validate_token")).user;
await checkThrows(
    "an admin cannot demote themselves",
    400,
    call(`/api/admin/users/${me._id}/role`, "PUT", { role: "user" })
);
await checkThrows(
    "an admin cannot block themselves",
    400,
    call(`/api/admin/users/${me._id}/status`, "PUT", { status: "blocked" })
);
await checkThrows(
    "an admin cannot delete themselves",
    400,
    call(`/api/admin/users/${me._id}`, "DELETE")
);

console.log("\nDeleting a user:");
const doomed = (await call("/api/admin/users?search=linus")).users.rows[0];
const beforeDelete = (await call("/api/admin/stats")).stats;
const removedId = (await call(`/api/admin/users/${doomed._id}`, "DELETE"))._id;
check("delete returns the removed id", removedId === doomed._id);
const afterRemoval = (await call("/api/admin/stats")).stats;
check("the user total drops by one", afterRemoval.users.total === beforeDelete.users.total - 1);
check(
    "the deleted user's tasks go with them",
    afterRemoval.tasks.total === beforeDelete.tasks.total - doomed.taskCounts.total
);
await checkThrows(
    "a deleted user is gone",
    404,
    call(`/api/admin/users/${doomed._id}`)
);
await checkThrows(
    "an unknown admin path is refused rather than falling through",
    404,
    call("/api/admin/nope")
);


console.log("\nThe sample data is still on disk for the next sign-in:");
const db = JSON.parse(store.get(MOCK_DB_KEY));
check("the sample account is persisted", db.users.some((u) => u.email === SAMPLE_CREDENTIALS.email));
check(
    "the sample admin is persisted",
    db.users.some((u) => u.email === SAMPLE_ADMIN_CREDENTIALS.email && u.role === "admin")
);
check("the sample tasks are persisted", db.tasks.some((t) => t._id.startsWith("mock-task-")));

console.log("\nA database seeded before roles existed is migrated, not left broken:");
{
    /* A database in the shape an earlier build left behind: users with neither a
     * role nor a status, and no admin account at all. */
    store.set(
        MOCK_DB_KEY,
        JSON.stringify({
            users: [{ _id: MOCK_USER_ID, email: SAMPLE_CREDENTIALS.email, password: "x" }],
            tasks: [{ _id: "legacy-task", userId: MOCK_USER_ID, status: "todo", order: 0 }],
        })
    );
    store.delete(MOCK_SESSION_KEY);

    await call("/api/auth/validate_token");

    const migrated = JSON.parse(store.get(MOCK_DB_KEY));
    const legacyUser = migrated.users.find((u) => u._id === MOCK_USER_ID);

    check("the legacy user gains a role", legacyUser?.role === "user");
    check("the legacy user gains a status", legacyUser?.status === "active");
    check(
        "the missing sample admin is seeded back in",
        migrated.users.some((u) => u.role === "admin")
    );
    check("the legacy task is kept", migrated.tasks.some((t) => t._id === "legacy-task"));
}

console.log("\nA role changed through the dashboard is never undone by the migration:");
{
    const current = JSON.parse(store.get(MOCK_DB_KEY));
    const changed = current.users.find((u) => u.email === SAMPLE_ADMIN_CREDENTIALS.email);
    changed.role = "user";
    store.set(MOCK_DB_KEY, JSON.stringify(current));

    await call("/api/auth/validate_token");

    const after = JSON.parse(store.get(MOCK_DB_KEY)).users.find(
        (u) => u._id === changed._id
    );
    check("a deliberate role change survives a reload", after.role === "user");
}

console.log(
    failures === 0 ? "\nAll mock layer checks passed.\n" : `\n${failures} check(s) failed.\n`
);
process.exitCode = failures === 0 ? 0 : 1;
