/**
 * DOCU: A range that reads sensibly to a screen reader when it is a column
 * header or a chart label, e.g. "3 tasks, To do".
 */

/** The page sizes the users table offers. */
const PAGE_SIZE_OPTIONS = [5, 10, 25];

/**
 * DOCU: The page size used until the admin picks another.
 *
 * Five, and it has to agree with `DEFAULT_PAGE_SIZE` in the API's
 * `constants/pagination.js`. The picker renders the `pageSize` the API reported,
 * so if the two defaults disagreed the control would read "5" while the table held
 * ten rows - and the first page an admin sees would silently change shape between
 * deployments. One number, stated once per side, both equal to the first entry in
 * `PAGE_SIZE_OPTIONS`.
 */
const DEFAULT_PAGE_SIZE = 5;

/**
 * DOCU: The columns the users table can be sorted by, mapped to the field the
 * API sorts on. The API is what actually sorts, so a column not listed here is
 * deliberately not clickable rather than sorting only the current page.
 */
const USER_SORT_FIELDS = {
    name: "name",
    email: "email",
    role: "role",
    status: "status",
    totalTasks: "totalTasks",
    createdAt: "createdAt",
};

/** DOCU: The column the table starts sorted by. */
const DEFAULT_USER_SORT = "createdAt";

const SORT_DIRECTIONS = {
    asc: "asc",
    desc: "desc",
};

/**
 * DOCU: The summary cards on the overview, in display order. The board cards
 * carry their own accent so the numbers match the board colours on the task
 * board, and `value` reads the live stats object rather than a hardcoded path.
 */
const STAT_CARDS = [
    { key: "users.total", label: "Registered users", accent: "bg-ink", hint: "Every account" },
    { key: "users.active", label: "Active users", accent: "bg-done", hint: "Can sign in" },
    { key: "users.blocked", label: "Blocked users", accent: "bg-red-500", hint: "Access refused" },
    { key: "tasks.total", label: "Total tasks", accent: "bg-fox-400", hint: "All boards" },
];

/** DOCU: The task totals, one card per board, so the three task counts sit next
 *  to the user's own counts in the same order as the boards themselves. */
const TASK_STAT_CARDS = [
    { board: "todo", label: "Todo tasks", accent: "bg-todo" },
    { board: "ongoing", label: "Ongoing tasks", accent: "bg-ongoing" },
    { board: "done", label: "Done tasks", accent: "bg-done" },
];

/** DOCU: The columns the users table shows, in order. `sort` names the field the
 *  API sorts on, and is absent on a column that cannot be sorted, so the header
 *  does not offer a sort the API would ignore. */
const USER_COLUMNS = [
    /* DOCU: The name, first name, last name and email live in one cell, the way
     * a person is listed elsewhere in the app: avatar, full name, email under
     * it. So there is one `User` column, sorted on the combined name. */
    { key: "name", label: "User", sort: "name" },
    { key: "role", label: "Role", sort: "role" },
    { key: "status", label: "Account status", sort: "status" },
    { key: "tasks", label: "Tasks", sort: "totalTasks", numeric: true },
    { key: "createdAt", label: "Created at", sort: "createdAt" },
    { key: "actions", label: "Actions" },
];

export {
    PAGE_SIZE_OPTIONS,
    DEFAULT_PAGE_SIZE,
    USER_SORT_FIELDS,
    DEFAULT_USER_SORT,
    SORT_DIRECTIONS,
    STAT_CARDS,
    TASK_STAT_CARDS,
    USER_COLUMNS,
};