/**
 * DOCU: The three boards, in display order. The single list every layer agrees
 * on: the renderer walks it, the optimistic update renumbers it, and both fake
 * API layers validate moves against it. Add a fourth board here first.
 */
const BOARDS = ["todo", "ongoing", "done"];

/** DOCU: The board a task lands on when created, and the one it returns to. */
const DEFAULT_BOARD = "todo";

/**
 * DOCU: The board names as they are read aloud, keyed to the API's own values.
 * Separate from `BOARD_META` because the toast announces a board in a sentence
 * while the board heading is styled copy, and the two must be allowed to differ.
 */
const BOARD_LABELS = {
    todo: "To Do",
    ongoing: "Ongoing",
    done: "Done",
};

/** DOCU: Per-board colours and copy, keyed to the CSS custom properties in index.css.
 * `emptyTitle` and `emptyDescription` are always both set, so every empty
 * column renders the same two-line block and the three line up. */
const BOARD_META = {
    todo: {
        label: "To do",
        hint: "Grab the next thing",
        emptyTitle: "Add a task to get started.",
        emptyDescription: "Type it below, or drag a card in.",
        accent: "bg-todo",
        heading: "text-todo-deep",
        count: "bg-todo/15 text-todo-deep border-todo/40",
        pill: "border-todo text-todo-deep",
    },
    ongoing: {
        label: "Ongoing",
        hint: "You are on it",
        emptyTitle: "Nothing in ongoing",
        emptyDescription: "Drag a card here when you start or finish it.",
        accent: "bg-ongoing",
        heading: "text-ongoing-deep",
        count: "bg-ongoing/15 text-ongoing-deep border-ongoing/40",
        pill: "border-ongoing text-ongoing-deep",
    },
    done: {
        label: "Done",
        hint: "Nicely done",
        emptyTitle: "Nothing in done",
        emptyDescription: "Drag a card here when you start or finish it.",
        accent: "bg-done",
        heading: "text-done-deep",
        count: "bg-done/15 text-done-deep border-done/40",
        pill: "border-done text-done-deep",
    },
};

/**
 * DOCU: How a card marks the board it is on. The coloured spine runs down the
 * left edge of every card; only the done board also gets a tick and a
 * struck-through title, so a finished card reads without checking its position.
 */
const CARD_BOARD_META = {
    todo: { spine: "bg-todo", check: null },
    ongoing: { spine: "bg-ongoing", check: null },
    done: { spine: "bg-done", check: true },
};

export {
    BOARDS,
    DEFAULT_BOARD,
    BOARD_LABELS,
    BOARD_META,
    CARD_BOARD_META,
};