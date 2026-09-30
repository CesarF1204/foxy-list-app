/**
 * A check of the toast raised when a task changes board. <br>
 * The copy itself is a pure function in src/helpers/taskToasts.js and is
 * imported here for real, so the wording on screen and the wording checked
 * here can never drift apart. Run with: npm run verify:toast
 *
 * The two mistakes this guards against are the two that are easy to make in a
 * move handler: announcing a move the server refused (or one that only
 * reordered a card on the board it was already on), and saying the same thing
 * twice for a single change.
 */

import { statusMoveToast, taskActionToast } from "../src/helpers/taskToasts.js";
import { TOAST_TITLE_LIMIT } from "../src/constants/toast.js";

let failures = 0;

const check = (label, condition, extra = "") => {
    if (condition) {
        console.log(`  ok    ${label}`);
    } else {
        failures += 1;
        console.error(`  FAIL  ${label} ${extra}`);
    }
};

const TITLE = "Write the report";

/** Every ordered pair of distinct boards, in both directions. */
const TRANSITIONS = [
    ["todo", "ongoing", "Ongoing"],
    ["ongoing", "todo", "To Do"],
    ["ongoing", "done", "Done"],
    ["done", "ongoing", "Ongoing"],
    ["todo", "done", "Done"],
    ["done", "todo", "To Do"],
];

console.log("\nEvery status change, in both directions, gets one toast:");

for (const [from, to, label] of TRANSITIONS) {
    const toast = statusMoveToast({ title: TITLE, from, to });
    const expected = `"${TITLE}" moved ${to === "todo" ? "back to" : "to"} ${label}`;

    check(
        `${from} -> ${to} announces "${label}"`,
        toast?.message === expected && toast.type === "SUCCESS",
        `expected ${expected}, got ${JSON.stringify(toast)}`
    );
}

console.log("\nThe return trip to To Do reads as a reversal:");

check(
    "done -> todo says 'back to'",
    statusMoveToast({ title: TITLE, from: "done", to: "todo" }).message ===
        `"${TITLE}" moved back to To Do`
);

check(
    "todo -> ongoing does not",
    !statusMoveToast({ title: TITLE, from: "todo", to: "ongoing" }).message.includes("back to")
);

console.log("\nA move that did not change board stays quiet:");

check(
    "a reorder within one board is not a status change",
    statusMoveToast({ title: TITLE, from: "todo", to: "todo" }) === null
);

check(
    "so is a reorder of an Ongoing card",
    statusMoveToast({ title: TITLE, from: "ongoing", to: "ongoing" }) === null
);

console.log("\nNothing to announce, nothing broken:");

check(
    "an unknown destination is refused rather than read aloud",
    statusMoveToast({ title: TITLE, from: "todo", to: "archived" }) === null
);

check(
    "an unknown origin is refused",
    statusMoveToast({ title: TITLE, from: undefined, to: "done" }) === null
);

check(
    "a task with no title still gets a readable toast",
    statusMoveToast({ title: undefined, from: "todo", to: "done" })?.message === "Task moved to Done"
);

check(
    "a blank title is treated as no title",
    statusMoveToast({ title: "   ", from: "todo", to: "ongoing" })?.message ===
        "Task moved to Ongoing"
);

console.log("\nThe title is recognisable but the toast stays short:");

const longTitle = "Prepare the quarterly financial review for the board".repeat(4);
const longToast = statusMoveToast({ title: longTitle, from: "todo", to: "done" });

check(
    "an over-long title is clipped with an ellipsis",
    longToast.message.includes("…") && longToast.message.length <= TOAST_TITLE_LIMIT + 20,
    `length ${longToast.message.length}`
);

check(
    "the clipped title keeps its opening words",
    longToast.message.startsWith('"Prepare the quarterly financial review')
);

check(
    "surrounding whitespace is collapsed, not carried into the toast",
    statusMoveToast({ title: "  Write   the  report ", from: "todo", to: "done" }).message ===
        '"Write the report" moved to Done'
);

check(
    "a title at the limit is left whole",
    statusMoveToast({ title: "a".repeat(TOAST_TITLE_LIMIT), from: "todo", to: "done" })
        .message.includes("a".repeat(TOAST_TITLE_LIMIT))
);

console.log("\nOne move, one toast:");

/** What the mutation layer does: onMutate reads the card off the board, onSuccess
 *  builds the toast from that and the requested destination. Running two moves of
 *  the same card covers the case where the second origin is the first target. */
const runMove = (board, { taskId, newStatus }, serverSucceeds) => {
    const context = board.tasks.find((task) => task._id === taskId);
    const before = { fromStatus: context?.status, title: context?.title };
    const shown = [];

    if (serverSucceeds) {
        const toast = statusMoveToast({ title: before.title, from: before.fromStatus, to: newStatus });
        if (toast) shown.push(toast);
    }

    return shown;
};

const board = {
    tasks: [{ _id: "t1", title: TITLE, status: "todo", order: 0 }],
};

check(
    "a drag to Ongoing shows exactly one toast",
    runMove(board, { taskId: "t1", newStatus: "ongoing" }, true).length === 1
);

check(
    "a rejected move shows none",
    runMove(board, { taskId: "t1", newStatus: "ongoing" }, false).length === 0
);

check(
    "moving a card that is not on the board shows none",
    runMove(board, { taskId: "missing", newStatus: "done" }, true).length === 0
);

const second = runMove(
    { tasks: [{ _id: "t1", title: TITLE, status: "ongoing", order: 0 }] },
    { taskId: "t1", newStatus: "done" },
    true
);

check(
    "a second move in the same direction chain shows exactly one toast",
    second.length === 1
);
check(
    "...and it names the new board, not the old one",
    second[0].message === `"${TITLE}" moved to Done`,
    `got ${second[0]?.message}`
);

console.log("\nCreating, editing and deleting each say so once:");

for (const [action, verb] of [
    ["created", "creat"],
    ["updated", "updat"],
    ["deleted", "delet"],
]) {
    check(
        `${verb}ed names the task`,
        taskActionToast(action, TITLE)?.message === `"${TITLE}" ${action} successfully`,
        `got ${JSON.stringify(taskActionToast(action, TITLE))}`
    );
    check(
        `${verb}ed toast is a success`,
        taskActionToast(action, TITLE)?.type === "SUCCESS"
    );
    check(
        `${verb}ed still reads without a title`,
        taskActionToast(action, "")?.message === `Task ${action} successfully`
    );
}

check("an unknown action raises nothing", taskActionToast("archived", TITLE) === null);

check(
    "a long title is clipped in an action toast too",
    /* The title is cut to the limit; the rest is the fixed verb suffix. */
    taskActionToast("updated", "a".repeat(80)).message ===
        `"${"a".repeat(TOAST_TITLE_LIMIT - 1)}…" updated successfully`
);

console.log(
    failures === 0
        ? "\nAll toast checks passed.\n"
        : `\n${failures} check(s) failed.\n`
);

process.exit(failures === 0 ? 0 : 1);
