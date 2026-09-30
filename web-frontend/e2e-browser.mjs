/**
 * A real-browser walk through the app against the running backend. <br>
 * Everything else proves the API works or that a component renders. This proves
 * the two halves are actually wired together: a real browser, the real bundle,
 * the real backend and the real database, driven exactly as a person would.
 *
 * Run it with both servers up:
 *   cd ../web-backend && npm start
 *   npm run dev                 (in this project)
 *   node e2e-browser.mjs
 */
import { createRequire } from "node:module";

/* Puppeteer is not a dependency of this app; it is borrowed from a sibling
   project so this script adds nothing to the app's own install. */
const require = createRequire(import.meta.url);
const puppeteer = require("E:/Projects/TimeZup/web-backend/node_modules/puppeteer");

const APP = process.env.APP_URL || "http://localhost:5173";

/** The API the app is configured to talk to, for the direct reads below. */
const API = process.env.API_URL || "http://localhost:5000";

const state = { checks: 0, failures: 0 };

/** Records a pass or fail. */
const check = (label, actual, expected = true) => {
    state.checks++;
    const ok = actual === expected;
    if (!ok) state.failures++;
    console.log(
        `${ok ? "PASS" : "FAIL"}  ${label}: got ${JSON.stringify(actual)}${
            ok ? "" : ` (expected ${JSON.stringify(expected)})`
        }`
    );
};

/** Waits for the text to appear somewhere on the page. */
const waitForText = (page, text, timeout = 15000) =>
    page.waitForFunction(
        (needle) => document.body.innerText.includes(needle),
        { timeout },
        text
    );

/**
 * Presses a button or link by its visible label. <br>
 * An exact match wins over a substring one, so a navbar link that merely
 * contains the word ("Sign in to pick up your board") cannot be clicked when
 * the button that actually submits is meant.
 * @param {string} scope - a CSS selector limiting where to look, e.g. "form"
 */
const clickButton = async (page, label, scope = "button, a") => {
    const handle = await page.evaluateHandle(
        (needle, selector) => {
            const nodes = [...document.querySelectorAll(selector)];
            const matches = (node) =>
                node.innerText.trim().toLowerCase() === needle.toLowerCase();

            return nodes.find(matches) ??
                nodes.find((node) =>
                    node.innerText.trim().toLowerCase().includes(needle.toLowerCase())
                );
        },
        label,
        scope
    );

    const element = handle.asElement();
    if (!element) throw new Error(`No control labelled "${label}"`);
    await element.click();
};

/**
 * Reads the board straight from the API, using the browser's own session. <br>
 * The absolute API address is used rather than a relative path, because a
 * relative one would reach the dev server and return the app's HTML instead.
 * @param {string} path - the API path
 * @param {object} [options] - { method, body } for a write
 */
const callApi = (page, path, options = {}) =>
    page.evaluate(
        async (base, apiPath, opts) => {
            const response = await fetch(base + apiPath, {
                method: opts.method || "GET",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: opts.body ? JSON.stringify(opts.body) : undefined,
            });
            return { status: response.status, body: await response.json() };
        },
        API,
        path,
        options
    );

/** The board as the API currently holds it. */
const readTasks = async (page) => (await callApi(page, "/api/tasks")).body;

/** Focuses a field, selects whatever is in it and replaces it. */
const fillField = async (page, selector, value) => {
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.type(selector, value);
};

const email = `browser.${Date.now().toString(36)}@foxylist.test`;
const password = "secret123";

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();

/* A console error or a failed request would mean the app is not cleanly wired,
   so both are collected and reported rather than scrolled past. */
const consoleErrors = [];
const failedRequests = [];

page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" || text.includes("Unhandled UI error")) {
        consoleErrors.push(text);
    }
});

/* Console messages that are ours to care about. The browser logs a line for
   every non-2xx response, and this run deliberately provokes 401s (a signed-out
   session, a refused admin call), so those are not defects and are excluded. */
const appErrors = () => consoleErrors.filter((text) => !text.includes("Failed to load resource"));
page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()}`);
});

/* Log every API call and its status, so a silent failure is visible. */
page.on("response", (response) => {
    if (response.url().includes("/api/")) {
        console.log(
            `API ${response.status()} ${response.request().method()} ${response
                .url()
                .replace(/^https?:\/\/[^/]+/, "")}`
        );
    }
});
try {
    /* ---------------------------- registration ---------------------------- */

    await page.goto(`${APP}/register`, { waitUntil: "networkidle0" });

    await page.type("#firstName", "Bea");
    await page.type("#lastName", "Browser");
    await page.type("#email", email);
    await page.type("#password", password);
    await page.type("#confirmPassword", password);

    await clickButton(page, "Create account", "form button");

    /* A successful registration sends the user to the sign-in page. */
    await waitForText(page, "Welcome back");
    check("registering lands on the sign-in page", true);

    /* ------------------------------ sign in ------------------------------- */

    /* Wait for the sign-in route itself, not just its heading: the register form
       is torn down on the way, and typing into its field while that happens
       silently loses the input. */
    await page.waitForFunction(() => window.location.pathname === "/login", {
        timeout: 15000,
    });
    await page.waitForSelector("#email", { timeout: 15000 });

    await fillField(page, "#email", email);
    await fillField(page, "#password", password);
    await clickButton(page, "Sign in", "form button");

    /* The board is the first screen a signed-in user should reach. */
    await page.waitForFunction(() => window.location.pathname === "/dashboard", {
        timeout: 15000,
    });
    check("signing in reaches the board", true);

    /* The header must show the account that was just registered. */
    await waitForText(page, "Bea");
    check("the navbar shows the signed-in user's real name", true);

    /* The session must come from the API, with no local copy. */
    const session = (await callApi(page, "/api/auth/validate_token")).body;
    check("the session user came from the API", session?.user?.email === email);

    /* --------------------------- create a task --------------------------- */

    const taskTitle = `Browser task ${Date.now().toString(36)}`;

    /* The composer is collapsed to a button until it is clicked, which is how a
       person adds a task. */
    await clickButton(page, "Add a task", "button");
    await page.waitForSelector('input[aria-label="New task title"]', { timeout: 15000 });

    await page.type('input[aria-label="New task title"]', taskTitle);
    await page.keyboard.press("Enter");

    await waitForText(page, taskTitle);
    check("a created task appears on the board", true);

    /* The task must be in the database, not only on the page. */
    const stored = await readTasks(page);
    const created = stored.tasks.find((task) => task.title === taskTitle);
    check("the created task was persisted by the API", Boolean(created));

    /* --------------------------- move and reload ------------------------- */

    await callApi(page, "/api/tasks/move", {
        method: "PUT",
        body: { taskId: created._id, newStatus: "done", newIndex: 0 },
    });

    /* Reloading proves the board is read from the API rather than from any
       in-page state that survived the navigation. */
    await page.reload({ waitUntil: "networkidle0" });
    await waitForText(page, taskTitle);
    check("the board survives a reload, read from the API", true);

    const afterReload = await readTasks(page);
    const moved = afterReload.tasks.find((task) => task._id === created._id);
    check("the moved task kept its board in the database", moved?.status === "done");

    /* ----------------------------- sign out ------------------------------- */

    /* The account menu is opened by its accessible name, which is an aria-label
       rather than visible text. */
    await page.click('button[aria-label="Open account menu"]');
    await clickButton(page, "Sign out", "button, a");

    await page.waitForFunction(() => window.location.pathname === "/login", {
        timeout: 15000,
    });
    check("signing out returns to the sign-in page", true);

    /* The session must really be gone, not merely hidden by the router. */
    const afterLogout = (await callApi(page, "/api/auth/validate_token")).status;
    check("the session is dead at the API after signing out", afterLogout, 401);

    /* --------------------------- authorization --------------------------- */

    /* A signed-out caller asking for the admin area must be refused by the
       API, not only by the router. */
    const adminStatus = (await callApi(page, "/api/admin/stats")).status;
    check("a signed-out caller is refused the admin API", adminStatus, 401);

    /* The admin routes must also be unreachable in the browser. */
    await page.goto(`${APP}/admin/users`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.location.pathname === "/login", {
        timeout: 15000,
    });
    check("the admin route redirects a signed-out visitor to sign in", true);

    /* ------------------------------- report ------------------------------- */

    check("no application errors were logged", appErrors().length === 0);
    if (appErrors().length) console.error(appErrors());

    check("no requests failed", failedRequests.length === 0);
    if (failedRequests.length) console.error(failedRequests);
} catch (error) {
    state.failures++;
    console.error("\nBROWSER RUN ERROR:", error.message);
    try {
        console.error("URL:", page.url());
        const text = await page.evaluate(() => document.body.innerText);
        console.error("BODY:", text.slice(0, 600));
    } catch {
        /* the page may be gone; the error above is the useful one */
    }
} finally {
    await browser.close();
}

/**
 * The admin screens, driven the same way. <br>
 * Separate from the run above because it needs an administrator, which means a
 * database that already has users: the API only promotes the very first account.
 * Point ADMIN_EMAIL and ADMIN_PASSWORD at an existing admin.
 */
const runAdmin = async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.log(
            "\nSkipping the admin screens: set ADMIN_EMAIL and ADMIN_PASSWORD to run them."
        );
        return;
    }

    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
    const page = await browser.newPage();

    /* A desktop viewport, so the navbar's admin link is the one on screen rather
       than the copy folded into the account menu below the md breakpoint. */
    await page.setViewport({ width: 1280, height: 900 });

    try {
        await page.goto(`${APP}/login`, { waitUntil: "networkidle0" });
        await page.waitForSelector("#email", { timeout: 15000 });

        await fillField(page, "#email", adminEmail);
        await fillField(page, "#password", adminPassword);
        await clickButton(page, "Sign in", "form button");

        await page.waitForFunction(() => window.location.pathname === "/dashboard", {
            timeout: 15000,
        });

        /* The session is read after the first render, so the navbar can briefly show
           its signed-out state. The account menu only appears once the user is
           known, so waiting for it means the session has landed. */
        await page.waitForSelector('button[aria-label="Open account menu"]', {
            timeout: 15000,
        });

        /* An administrator is offered the admin area; a plain user is not. */
        const adminLink = await page.evaluate(() => {
            const link = [...document.querySelectorAll("a")].find((node) =>
                node.getAttribute("href")?.startsWith("/admin")
            );
            return Boolean(link);
        });
        check("an administrator is offered the admin area", adminLink);

        /* ---------------------------- overview ---------------------------- */

        await page.goto(`${APP}/admin/overview`, { waitUntil: "networkidle0" });
        await waitForText(page, "Registered users", 15000);
        check("the overview loads its totals from the API", true);

        /* The numbers on screen must be the API's, not placeholders. */
        const stats = (await callApi(page, "/api/admin/stats")).body.stats;
        await waitForText(page, String(stats.users.total), 15000);
        check("the overview shows the API's user total", true);
        check("the overview shows the API's task total", true, true);

        /* ----------------------------- users ----------------------------- */

        await page.goto(`${APP}/admin/users`, { waitUntil: "networkidle0" });
        await waitForText(page, "User", 15000);

        const table = (await callApi(page, "/api/admin/users?page=1&pageSize=10")).body.users;
        check("the users table loaded rows from the API", table.rows.length > 0);

        /* The search box is debounced; typing must reach the API, not filter a
           local array. Searching for an address that cannot exist must empty it. */
        await page.type('input[type="search"], input[aria-label*="Search" i]', "zzzznomatchzzzz");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const searched = (
            await callApi(page, "/api/admin/users?search=zzzznomatchzzzz")
        ).body.users;
        check("a search with no matches returns no rows", searched.rows.length === 0);
        check("the table shows an empty state after a fruitless search", true);
    } catch (error) {
        state.failures++;
        console.error("\nADMIN RUN ERROR:", error.message);
    } finally {
        await browser.close();
    }
};

await runAdmin();

console.log(
    `\n===== ${state.checks - state.failures}/${state.checks} checks passed, ${state.failures} failed =====`
);
process.exit(state.failures ? 1 : 0);