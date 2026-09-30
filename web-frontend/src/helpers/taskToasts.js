/** The ".js" is deliberate: `scripts/toast-verify.mjs` loads this file in plain
 *  Node, which does not resolve extensionless specifiers the way Vite does. */
import { BOARD_LABELS, DEFAULT_BOARD } from "../constants/boards.js";
import { TOAST_TITLE_LIMIT, TOAST_TYPES } from "../constants/toast.js";

/** DOCU: Collapses whitespace and clips an over-long title. Returns null if there is nothing to show. */
const shortTitle = (title) => {
    const clean = (title ?? "").trim().replace(/\s+/g, " ");

    if (!clean) return null;

    return clean.length > TOAST_TITLE_LIMIT
        ? `${clean.slice(0, TOAST_TITLE_LIMIT - 1).trimEnd()}…`
        : clean;
};

/**
 * DOCU: The SUCCESS toast for a task that changed board. Kept away from React so
 * the mutation layer and the verify script share one wording. Returns null when
 * the move did not change board: a reorder is already visible, and an unknown
 * destination is rejected rather than read as "moved to undefined".
 * @returns {object|null} a toast for `showToast`, or null if there is nothing to say
 */
const statusMoveToast = ({ title, from, to }) => {
    const label = BOARD_LABELS[to];

    /** Not a status change, or not a board we know about. */
    if (!label || !from || from === to) return null;

    const short = shortTitle(title);
    const subject = short ? `"${short}"` : "Task";
    /** A return trip to To Do reads as a reversal, not a move. */
    const verb = to === DEFAULT_BOARD ? "back to" : "to";

    return { message: `${subject} moved ${verb} ${label}`, type: TOAST_TYPES.success };
};

export { statusMoveToast, taskActionToast, shortTitle, BOARD_LABELS, TOAST_TITLE_LIMIT };

/**
 * DOCU: The SUCCESS toast for a create, edit or delete. Same shape and title
 * clipping as `statusMoveToast`, so the wording cannot drift between the three.
 * @param {"created"|"updated"|"deleted"} action - what happened to the task
 * @returns {object} a toast for `showToast`
 */
const taskActionToast = (action, title) => {
    const verbs = {
        created: "created",
        updated: "updated",
        deleted: "deleted",
    };

    const verb = verbs[action];
    if (!verb) return null;

    const short = shortTitle(title);

    return {
        message: short ? `"${short}" ${verb} successfully` : `Task ${verb} successfully`,
        type: TOAST_TYPES.success,
    };
};
