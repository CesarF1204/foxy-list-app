
const USER_ROLES = ["user", "admin"];
const ADMIN_ROLE = "admin";
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

const ACCOUNT_STATUSES = ["active", "blocked"];
const DEFAULT_ACCOUNT_STATUS = "active";

/**
 * Per-status copy and badge styling. Every status carries a label and a distinct shape, so the
 * state never depends on colour alone.
 */
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

/**
 * Whether a user may reach the admin area. Unknown roles are never admins, so a missing or
 * malformed `role` fails closed.
 */
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