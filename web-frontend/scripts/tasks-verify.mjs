/**
 * A check of the task creation flow, in particular that one create action
 * leaves exactly one task on the board. <br>
 * The pure helpers live in src/hooks/useTasks.js; they are reproduced here so
 * the optimistic add -> confirm (or fail) lifecycle can be exercised in Node,
 * without a browser or a bundler. Run with: npm run verify:tasks
 *
 * The bug this guards against: the optimistic placeholder was written into the
 * cache on add and never taken out again when the server's task came back, so
 * a single submission rendered two cards.
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

/* --- mirrors of the create helpers in src/hooks/useTasks.js ------------- */

let placeholderCounter = 0;
const makePlaceholderId = () => `temp-${Date.now().toString(36)}-${(placeholderCounter += 1)}`;

const applyCreatePending = (tasks, placeholder) =>
    renumber(
        tasks.concat({
            ...placeholder,
            order: tasks.filter((task) => task.status === placeholder.status).length,
        })
    );

const applyCreateConfirmed = (tasks, placeholderId, task) => {
    const list = placeholderId
        ? tasks.filter((item) => item._id !== placeholderId)
        : [...tasks];
    /* The stored task takes over the placeholder's position on the board. */
    const placeholder = tasks.find((item) => item._id === placeholderId);
    const confirmed = { ...task, order: placeholder?.order ?? task.order };
    const index = list.findIndex((item) => item._id === task._id);
    if (index === -1) list.push(confirmed);
    else list[index] = confirmed;
    return renumber(list);
};

const applyCreateDiscarded = (tasks, placeholderId) =>
    placeholderId ? tasks.filter((item) => item._id !== placeholderId) : tasks;

/* ------------------------------------------------------------------------ */

let failures = 0;

const check = (label, condition, extra = "") => {
    if (condition) {
        console.log(`  ok    ${label}`);
    } else {
        failures += 1;
        console.error(`  FAIL  ${label} ${extra}`);
    }
};

/** A stand-in for the task list held in the query cache. */
const makeBoard = (tasks = []) => ({ tasks });

/** What the user sees: one row per card, in board order. */
const render = (board, status = "todo") =>
    board.tasks
        .filter((task) => task.status === status)
        .sort((a, b) => a.order - b.order)
        .map((task) => task.title);

const ordersOf = (board, status) =>
    board.tasks
        .filter((task) => task.status === status)
        .sort((a, b) => a.order - b.order)
        .map((task) => task.order);

const dense = (orders) => orders.every((order, index) => order === index);

const countByTitle = (board, title) =>
    board.tasks.filter((task) => task.title === title).length;

const hasPlaceholder = (board) => board.tasks.some((task) => task._id.startsWith("temp-"));

/** A server that hands back ids the way the real API does. */
const makeServer = () => {
    let next = 0;
    return {
        create({ title, description }) {
            next += 1;
            return { _id: `srv-${next}`, title, description, status: "todo", order: 0 };
        },
    };
};

/**
 * The whole of `addTask` plus its mutation, wired to a board. The caller
 * decides when each request comes back, which is how the in-flight cases are
 * reproduced.
 */
const createFlow = (board, server) => {
    const pending = [];

    const addTask = ({ title, description }) => {
        const cleanTitle = title.trim();
        if (!cleanTitle) return;

        const placeholder = {
            _id: makePlaceholderId(),
            title: cleanTitle,
            description: description?.trim() ?? "",
            status: "todo",
        };

        board.tasks = applyCreatePending(board.tasks, placeholder);
        pending.push({ placeholderId: placeholder._id, request: { title, description } });
    };

    /* Resolves one outstanding create, as the network eventually would. */
    const settle = (index = 0) => {
        const entry = pending.splice(index, 1)[0];
        if (!entry) return null;
        const task = server.create(entry.request);
        board.tasks = applyCreateConfirmed(board.tasks, entry.placeholderId, task);
        return task;
    };

    const fail = (index = 0) => {
        const entry = pending.splice(index, 1)[0];
        if (!entry) return null;
        board.tasks = applyCreateDiscarded(board.tasks, entry.placeholderId);
        return entry;
    };

    return {
        addTask,
        settle,
        fail,
        get inFlight() {
            return pending.length;
        },
    };
};

/* --- checks -------------------------------------------------------------- */

console.log("\nCreating one task:");
{
    const board = makeBoard();
    const flow = createFlow(board, makeServer());

    flow.addTask({ title: "Buy milk", description: "Semi skimmed" });

    check("the card appears at once", render(board).length === 1);
    check("the pending card is the one that was asked for", render(board)[0] === "Buy milk");
    check("the pending card has a temporary id", hasPlaceholder(board));

    flow.settle();

    check("one add leaves exactly one task", board.tasks.length === 1, `(got ${board.tasks.length})`);
    check("the task is not shown twice", countByTitle(board, "Buy milk") === 1);
    check("the placeholder was replaced, not kept", !hasPlaceholder(board));
    check("the stored task carries the real id", board.tasks[0]._id.startsWith("srv-"));
    check("the note survives the round trip", board.tasks[0].description === "Semi skimmed");
    check("orders are dense", dense(ordersOf(board, "todo")));
}

console.log("\nCreating the same title twice is still two tasks:");
{
    const board = makeBoard();
    const flow = createFlow(board, makeServer());

    flow.addTask({ title: "Water the plants", description: "" });
    flow.settle();
    flow.addTask({ title: "Water the plants", description: "" });
    flow.settle();

    check("identical titles are not de-duplicated", board.tasks.length === 2);
    check("both copies are kept", countByTitle(board, "Water the plants") === 2);
    check("the two have distinct ids", board.tasks[0]._id !== board.tasks[1]._id);
    check("orders are dense", dense(ordersOf(board, "todo")));
}

console.log("\nAdding several tasks one after another:");
{
    const board = makeBoard();
    const flow = createFlow(board, makeServer());

    for (const title of ["One", "Two", "Three", "Four"]) {
        flow.addTask({ title, description: "" });
        flow.settle();
    }

    check("each add produced one task", board.tasks.length === 4, `(got ${board.tasks.length})`);
    check("no title is repeated", new Set(board.tasks.map((t) => t.title)).size === 4);
    check(
        "they are in the order they were added",
        JSON.stringify(render(board)) === JSON.stringify(["One", "Two", "Three", "Four"])
    );
    check("orders are dense", dense(ordersOf(board, "todo")));
}

console.log("\nSubmitting again before the first request comes back:");
{
    const board = makeBoard();
    const flow = createFlow(board, makeServer());

    flow.addTask({ title: "First", description: "" });
    flow.addTask({ title: "Second", description: "" });
    flow.addTask({ title: "Third", description: "" });

    check("each pending add has its own card", render(board).length === 3);
    check("the three cards have distinct ids", new Set(board.tasks.map((t) => t._id)).size === 3);
    check("three requests are in flight", flow.inFlight === 3);

    flow.settle();
    flow.settle();
    flow.settle();

    check("three adds leave exactly three tasks", board.tasks.length === 3, `(got ${board.tasks.length})`);
    check("no placeholders survive", !hasPlaceholder(board));
    check(
        "the titles are right",
        JSON.stringify(render(board)) === JSON.stringify(["First", "Second", "Third"])
    );
    check("orders are dense", dense(ordersOf(board, "todo")));
}

console.log("\nConfirmations arriving out of order:");
{
    const board = makeBoard();
    const flow = createFlow(board, makeServer());

    flow.addTask({ title: "Alpha", description: "" });
    flow.addTask({ title: "Beta", description: "" });
    flow.addTask({ title: "Gamma", description: "" });

    /* The last request answers first, the way a slow first request would. */
    flow.settle(2);
    flow.settle(1);
    flow.settle(0);

    check("three adds leave exactly three tasks", board.tasks.length === 3, `(got ${board.tasks.length})`);
    check("no title appears twice", new Set(board.tasks.map((t) => t.title)).size === 3);
    check("no placeholders survive", !hasPlaceholder(board));
    check("orders are dense", dense(ordersOf(board, "todo")));
}

console.log("\nA confirmation delivered twice:");
{
    const board = makeBoard();
    const flow = createFlow(board, makeServer());

    flow.addTask({ title: "Only once", description: "" });
    const task = flow.settle();

    board.tasks = applyCreateConfirmed(board.tasks, null, task);

    check(
        "a repeated confirmation does not add a second card",
        board.tasks.length === 1,
        `(got ${board.tasks.length})`
    );
    check("the task is still shown once", countByTitle(board, "Only once") === 1);
}

console.log("\nA create that fails:");
{
    const board = makeBoard();
    const flow = createFlow(board, makeServer());

    flow.addTask({ title: "Doomed", description: "" });
    flow.addTask({ title: "Fine", description: "" });

    flow.fail(0);
    flow.settle(0);

    check("the failed card is withdrawn", countByTitle(board, "Doomed") === 0);
    check("the successful card survives", countByTitle(board, "Fine") === 1);
    check("no placeholders survive", !hasPlaceholder(board));
    check("orders are dense", dense(ordersOf(board, "todo")));
}

console.log("\nTasks already on the board:");
{
    const board = makeBoard([
        { _id: "a", title: "Existing one", description: "", status: "todo", order: 0 },
        { _id: "b", title: "Existing two", description: "", status: "ongoing", order: 0 },
    ]);
    const flow = createFlow(board, makeServer());

    flow.addTask({ title: "Brand new", description: "" });
    flow.settle();

    check("the existing tasks are untouched", countByTitle(board, "Existing one") === 1);
    check("the existing tasks are not duplicated", countByTitle(board, "Existing two") === 1);
    check("the new task was added once", countByTitle(board, "Brand new") === 1);
    check("the new task is on the todo board", render(board).includes("Brand new"));
    check("orders are dense", dense(ordersOf(board, "todo")));

    /*
      Editing and completing a freshly created task has to work, which means
      the card must be reachable by the id the server gave it - not the
      temporary one.
    */
    const created = board.tasks.find((task) => task.title === "Brand new");
    board.tasks = board.tasks.map((task) =>
        task._id === created._id ? { ...task, title: "Edited", status: "done", order: 0 } : task
    );

    check("the new task can be edited and completed", countByTitle(board, "Edited") === 1);
    check("it left the todo board", render(board).includes("Edited") === false);
    check("it is on the done board", render(board, "done").includes("Edited"));
}

console.log("\nEmpty input:");
{
    const board = makeBoard();
    const flow = createFlow(board, makeServer());

    flow.addTask({ title: "   ", description: "" });
    flow.addTask({ title: "", description: "" });

    check("a blank title creates nothing", board.tasks.length === 0);
    check("no request is sent", flow.inFlight === 0);
}

console.log("\nHow the create mutation is wired to React Query:");
{
    /*
      React Query calls the callbacks as (data, variables, context), where
      `context` is only ever what `onMutate` returned. This create has no
      onMutate, so `context` is undefined - reading the placeholder id from
      there throws, the placeholder is never replaced, and the card stays on
      the board marked as pending (faded) for good. These checks model that
      contract, so reintroducing the mistake fails here rather than in the UI.
    */
    const wiring = (board, api, { onMutate } = {}) => {
        let sent = null;

        const mutationFn = ({ title, description }) => {
            sent = { title, description };
            return api({ title, description });
        };

        /* onSuccess/onError exactly as defined on the mutation in the hook. */
        const onSuccess = (data, variables) => {
            board.tasks = applyCreateConfirmed(board.tasks, variables.placeholderId, data.task);
        };
        const onError = (_error, variables) => {
            board.tasks = applyCreateDiscarded(board.tasks, variables.placeholderId);
        };

        return {
            /* Mirrors mutation.execute: onMutate's result becomes the context. */
            async run(variables) {
                const context = await onMutate?.(variables);
                try {
                    const data = await mutationFn(variables);
                    onSuccess(data, variables, context);
                } catch (error) {
                    onError(error, variables, context);
                }
            },
            get sent() {
                return sent;
            },
        };
    };

    const board = makeBoard();
    const api = makeServer();
    /* The API answers with { task }, which is what onSuccess destructures. */
    const mutation = wiring(board, (payload) => ({ task: api.create(payload) }));

    const placeholder = { _id: makePlaceholderId(), title: "Wired up", description: "note", status: "todo" };
    board.tasks = applyCreatePending(board.tasks, placeholder);
    await mutation.run({
        title: placeholder.title,
        description: placeholder.description,
        placeholderId: placeholder._id,
    });

    check("the request carries the placeholder id in its variables",
        placeholder._id.startsWith("temp-"));
    check("the confirmation needs no context to find the placeholder",
        !hasPlaceholder(board));
    check("exactly one task remains", board.tasks.length === 1, `(got ${board.tasks.length})`);
    check("the stored task is on the board", countByTitle(board, "Wired up") === 1);

    /* The client-only id must never reach the API. */
    check("only the API's own fields are sent",
        JSON.stringify(Object.keys(mutation.sent).sort()) === JSON.stringify(["description", "title"]),
        `(sent ${JSON.stringify(mutation.sent)})`);

    /* A failure resolves the same way: the card is withdrawn, not left faded. */
    const failingBoard = makeBoard();
    const failing = wiring(failingBoard, () => {
        throw new Error("nope");
    });
    const doomed = { _id: makePlaceholderId(), title: "Doomed", description: "", status: "todo" };
    failingBoard.tasks = applyCreatePending(failingBoard.tasks, doomed);
    await failing.run({ title: "Doomed", description: "", placeholderId: doomed._id });

    check("a failed create leaves no faded card behind",
        failingBoard.tasks.length === 0, `(got ${failingBoard.tasks.length})`);

    /* Mutations that do roll back take their snapshot from onMutate. */
    const snapshotBoard = makeBoard([{ _id: "a", title: "Keep me", description: "", status: "todo", order: 0 }]);
    const onMutate = () => ({ snapshot: { tasks: [...snapshotBoard.tasks] } });
    const context = await onMutate();
    snapshotBoard.tasks = snapshotBoard.tasks.filter((task) => task._id !== "a");
    check("the snapshot is taken before the optimistic change", context.snapshot.tasks.length === 1);
}

console.log(
    failures === 0 ? "\nAll task creation checks passed.\n" : `\n${failures} check(s) failed.\n`
);
process.exitCode = failures === 0 ? 0 : 1;
