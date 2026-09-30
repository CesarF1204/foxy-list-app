/**
 * DOCU: The roles a user can hold, and how each one is labelled. The API is the
 * authority: it stores `role` and validates every incoming value against
 * `USER_ROLES`, so a request cannot invent a role. The UI reads the same list
 * to build its selects, so the two cannot drift.
 */
const USER_ROLES = ["user", "admin"];

/** DOCU: The role that unlocks `/admin`. */
const ADMIN_ROLE = "admin";

/** DOCU: The role given to a self-registered account. */
const DEFAULT_ROLE = "user";

/** Per-role copy and badge styling, keyed to the tokens in index.css. */
const ROLE_META = {
    admin: {
        label: "Admin",
        badge: "bg-fox-100 text-fox-800 border-fox-400",
        /** Announced to screen readers, so the badge is not colour alone. */
        hint: "Full access, including the admin dashboard",
    },
    user: {
        label: "User",
        badge: "bg-white text-ink border-ink-faint",
        hint: "Manages their own tasks only",
    },
};

/**
 * DOCU: Whether an account can use the app. `blocked` is set by an admin and
 * ends the account's access at the API layer, not just in the UI.
 */
const ACCOUNT_STATUSES = ["active", "blocked"];

const DEFAULT_ACCOUNT_STATUS = "active";

/** Per-status copy and badge styling. Every status carries a label and a
 *  distinct shape, so the state never depends on colour alone. */
const ACCOUNT_STATUS_META = {
    active: {
        label: "Active",
        badge: "bg-done/15 text-done-deep border-done/40",
        /** The dot shown next to the label: filled for active, hollow when blocked. */
        dot: "●",
        hint: "Can sign in and use the app",
    },
    blocked: {
        label: "Blocked",
        badge: "bg-red-100 text-red-800 border-red-400",
        dot: "○",
        hint: "Cannot sign in or use the app",
    },
};

/** DOCU: Whether a user may reach the admin area. Unknown roles are never
 *  admins, so a missing or malformed `role` fails closed. */
const isAdmin = (user) => user?.role === ADMIN_ROLE;

export {
    USER_ROLES,
    ADMIN_ROLE,
    DEFAULT_ROLE,
    ROLE_META,
    ACCOUNT_STATUSES,
    DEFAULT_ACCOUNT_STATUS,
    ACCOUNT_STATUS_META,
    isAdmin,
};