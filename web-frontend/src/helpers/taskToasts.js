/**
 * DOCU: The confirmation shown after a task lands on a different board. <br>
 * Lives on its own, away from React, because both the mutation layer and the
 * verification script need the exact same wording and neither should have to
 * reach into a hook to get it.
 *
 * The copy follows the boards' own names, with "back to" for the return trip to
 * To Do: a card the user has just finished does not read the same as one they
 * have just reopened, and saying so makes the direction of the move obvious
 * from the toast alone.
 */

/** The three boards, keyed as the API and the cache store them. */
const BOARD_LABELS = {
    todo: "To Do",
    ongoing: "Ongoing",
    done: "Done",
};

/**
 * DOCU: How much of a task title the toast will carry. <br>
 * Long enough to recognise the card by, short enough that the toast stays a
 * single line or two. Anything longer is cut with an ellipsis rather than
 * wrapped, so the notification never grows into a panel over the board.
 */
const TOAST_TITLE_LIMIT = 40;

/** DOCU: Collapses whitespace and clips an over-long title. Returns null if there is nothing to show. */
const shortTitle = (title) => {
    const clean = (title ?? "").trim().replace(/\s+/g, " ");

    if (!clean) return null;

    return clean.length > TOAST_TITLE_LIMIT
        ? `${clean.slice(0, TOAST_TITLE_LIMIT - 1).trimEnd()}…`
        : clean;
};

/**
 * DOCU: Builds the SUCCESS toast for a task that changed board. <br>
 * Returns `null` - and so no toast - when the move did not actually change
 * board: dropping a card at a new position on the board it was already on is
 * a reorder, and the card's new position is already visible on the board, so
 * announcing it would be noise. An unknown destination is rejected the same
 * way, which keeps a malformed response from producing a toast that reads
 * "moved to undefined".
 *
 * The caller decides *when* this is shown; this only decides *whether* and
 * *what*.
 * @param {object} params
 * @param {string} params.title - the moved task's title
 * @param {string} params.from - the board it left
 * @param {string} params.to - the board it landed on
 * @returns {object|null} a toast for `showToast`, or null if there is nothing to say
 */
const statusMoveToast = ({ title, from, to }) => {
    const label = BOARD_LABELS[to];

    /* Not a status change, or not a board we know about. */
    if (!label || !from || from === to) return null;

    const short = shortTitle(title);
    const subject = short ? `"${short}"` : "Task";
    const verb = to === "todo" ? "back to" : "to";

    return { message: `${subject} moved ${verb} ${label}`, type: "SUCCESS" };
};

export { statusMoveToast, taskActionToast, shortTitle, BOARD_LABELS, TOAST_TITLE_LIMIT };

/**
 * DOCU: Builds the SUCCESS toast for a create, edit or delete. <br>
 * The same shape as `statusMoveToast` and for the same reason: one place that
 * decides what an action says, so the wording cannot drift between the three.
 * The title is quoted and clipped exactly as it is for a move, which keeps a
 * row of toasts visually consistent however long the task's name is.
 * @param {"created"|"updated"|"deleted"} action - what happened to the task
 * @param {string} title - the task's title, before or after as appropriate
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
        type: "SUCCESS",
    };
};
