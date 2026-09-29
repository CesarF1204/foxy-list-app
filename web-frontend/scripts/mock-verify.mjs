/**
 * A temporary end-to-end smoke test of the mock layer, run in Node with a
 * stubbed localStorage. Delete this file when the mock layer is removed.
 * Run with: npm run verify:mock
 *
 * The app's own modules use extensionless imports, which Vite resolves but
 * plain Node does not. Rather than change the app's conventions, the mock
 * folder is copied to a temp directory with the extensions filled in, and that
 * copy is what gets imported.
 */
import { existsSync } from "node:fs";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mockDir = join(here, "..", "src", "mock");

/**
 * Loads `.env` into `process.env`, because `src/mock/sampleData.js` reads its
 * sample account from the environment and in plain Node that means
 * `process.env` - `import.meta.env` only exists under Vite. Done by hand rather
 * than with a dotenv dependency, and it fails loudly, so a check can never pass
 * against a hardcoded default that is no longer there.
 */
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

/** Copies the mock folder to a temp dir, adding ".js" to relative imports. */
const stageMockFolder = () => {
    const staging = mkdtempSync(join(tmpdir(), "foxylist-mock-"));
    mkdirSync(join(staging, "mock"));

    for (const name of ["sampleData.js", "mockStore.js"]) {
        const source = readFileSync(join(mockDir, name), "utf8").replace(
            /from "\.\/([\w-]+)"/g,
            'from "./$1.js"'
        );
        writeFileSync(join(staging, "mock", name), source);
    }

    return join(staging, "mock");
};

/** A minimal in-memory stand-in for the browser's localStorage. */
const store = new Map();

globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
};

const staging = stageMockFolder();
const { handleMockRequest } = await import(
    pathToFileURL(join(staging, "mockStore.js")).href
);
const { SAMPLE_CREDENTIALS, MOCK_DB_KEY } = await import(
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

console.log("\nThe sample data is still on disk for the next sign-in:");
const db = JSON.parse(store.get(MOCK_DB_KEY));
check("the sample account is persisted", db.users.some((u) => u.email === SAMPLE_CREDENTIALS.email));
check("the sample tasks are persisted", db.tasks.some((t) => t._id.startsWith("mock-task-")));

console.log(
    failures === 0 ? "\nAll mock layer checks passed.\n" : `\n${failures} check(s) failed.\n`
);
process.exitCode = failures === 0 ? 0 : 1;
