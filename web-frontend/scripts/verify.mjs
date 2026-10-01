/**
 * A check of the board's ordering arithmetic. The same helpers live in src/hooks/useTasks.js,
 * reproduced here so the drag-and-drop maths can be exercised in Node. Run with: npm run verify
 */

const BOARDS = ["todo", "ongoing", "done"];

/** Renumbers every board to a dense 0..n-1 sequence. */
const renumber = (tasks, moving) => {
    const touched = new Set([moving?.status, ...BOARDS]);
    const result = tasks.map((task) => ({ ...task }));

    touched.forEach((status) => {
        result
            .filter((task) => task.status === status)
            .sort((a, b) => a.order - b.order)
            .forEach((task, index) => {
                task.order = index;
            });
    });

    return result;
};

/** The task list that results from dropping a card. */
const applyMove = (tasks, taskId, newStatus, newIndex) => {
    const moving = tasks.find((task) => task._id === taskId);
    if (!moving) return tasks;

    /**
     * The destination board is rebuilt from scratch. `offBoard` must exclude its cards too, or
     * they would end up in the list twice.
     */
    const offBoard = tasks.filter(
        (task) => task._id !== taskId && task.status !== newStatus
    );

    const destination = tasks
        .filter((task) => task._id !== taskId && task.status === newStatus)
        .sort((a, b) => a.order - b.order);

    destination.splice(newIndex, 0, { ...moving, status: newStatus });

    /*
     * Assign the destination's positions first, then renumber everything so the gap left behind
     * on the source board closes up.
     */
    const destinationOrder = new Map(destination.map((task, index) => [task._id, index]));

    return renumber(offBoard.concat(destination), moving).map((task) =>
        destinationOrder.has(task._id)
            ? { ...task, order: destinationOrder.get(task._id) }
            : task
    );
};

/** The backend's own move, so both sides of the round trip can be compared. */
const serverMove = (tasks, userId, { taskId, newStatus, newIndex }) => {
    const previousStatus = tasks.find((t) => t._id === taskId)?.status;

    const target = tasks
        .filter((t) => t.userId === userId && t.status === newStatus && t._id !== taskId)
        .sort((a, b) => a.order - b.order);

    const task = tasks.find((t) => t._id === taskId);
    task.status = newStatus;
    target.splice(Math.max(0, Math.min(newIndex ?? target.length, target.length)), 0, task);

    target.forEach((t, index) => {
        t.order = index;
    });

    if (previousStatus !== newStatus) {
        tasks
            .filter((t) => t.userId === userId && t.status === previousStatus)
            .sort((a, b) => a.order - b.order)
            .forEach((t, index) => {
                t.order = index;
            });
    }

    return tasks;
};

const boardOf = (tasks, board) =>
    tasks.filter((t) => t.status === board).sort((a, b) => a.order - b.order).map((t) => t._id);

let failures = 0;

/** Asserts two arrays hold the same ids in the same order. */
const assertEqual = (label, actual, expected) => {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`  ok    ${label}`);
    } else {
        failures += 1;
        console.error(
            `  FAIL  ${label}\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`
        );
    }
};

/** Asserts every board's orders are 0..n-1, with no gaps or duplicates. */
const assertDense = (label, tasks) => {
    for (const board of BOARDS) {
        const orders = tasks
            .filter((t) => t.status === board)
            .sort((a, b) => a.order - b.order)
            .map((t) => t.order);
        assertEqual(`${label}: ${board} orders are dense`, orders, orders.map((_, i) => i));
    }
};

/** A small fixture: two to-do, one ongoing, one done. */
const makeTasks = () => [
    { _id: "a", userId: "u1", status: "todo", order: 0 },
    { _id: "b", userId: "u1", status: "todo", order: 1 },
    { _id: "c", userId: "u1", status: "ongoing", order: 0 },
    { _id: "d", userId: "u1", status: "done", order: 0 },
];

console.log("\nMoving a card to an empty board:");
{
    const move = { taskId: "b", newStatus: "done", newIndex: 0 };
    const optimistic = applyMove(makeTasks(), move.taskId, move.newStatus, move.newIndex);
    const server = serverMove(makeTasks(), "u1", move);

    assertEqual("todo is left with one card", boardOf(optimistic, "todo"), ["a"]);
    assertEqual("done receives it at the front", boardOf(optimistic, "done"), ["b", "d"]);
    assertDense("client", optimistic);
    assertDense("server", server);
    assertEqual("client and server agree", boardOf(optimistic, "done"), boardOf(server, "done"));
}

console.log("\nMoving a card onto a populated board:");
{
    const move = { taskId: "a", newStatus: "done", newIndex: 0 };
    const optimistic = applyMove(makeTasks(), move.taskId, move.newStatus, move.newIndex);
    const server = serverMove(makeTasks(), "u1", move);

    assertEqual("moved card lands first", boardOf(optimistic, "done"), ["a", "d"]);
    assertDense("client", optimistic);
    assertEqual("client and server agree", boardOf(optimistic, "done"), boardOf(server, "done"));
}

console.log("\nReordering within the same board:");
{
    const move = { taskId: "b", newStatus: "todo", newIndex: 0 };
    const optimistic = applyMove(makeTasks(), move.taskId, move.newStatus, move.newIndex);
    const server = serverMove(makeTasks(), "u1", move);

    assertEqual("order is reversed", boardOf(optimistic, "todo"), ["b", "a"]);
    assertDense("client", optimistic);
    assertEqual("client and server agree", boardOf(optimistic, "todo"), boardOf(server, "todo"));
}

console.log("\nEdge cases:");
{
    const before = makeTasks();
    assertEqual("an unknown id changes nothing", applyMove(before, "missing", "done", 0), before);
}

console.log("\nAdding and deleting:");
{
    let tasks = makeTasks();
    tasks = renumber(tasks.concat({ _id: "e", userId: "u1", status: "todo", order: 2 }));
    assertEqual("a new task appends to the end", boardOf(tasks, "todo"), ["a", "b", "e"]);
    assertDense("after add", tasks);

    /** Removing from the middle must close the gap, not leave a hole. */
    tasks = renumber(tasks.filter((t) => t._id !== "a"));
    assertEqual("deleting from the middle closes the gap", boardOf(tasks, "todo"), ["b", "e"]);
    assertDense("after delete", tasks);
}

console.log(
    failures === 0 ? "\nAll ordering checks passed.\n" : `\n${failures} check(s) failed.\n`
);
process.exitCode = failures === 0 ? 0 : 1;
