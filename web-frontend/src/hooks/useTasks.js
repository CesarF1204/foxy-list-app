import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "../contexts/useAppContext";
import { createTask, moveTask, editTask, deleteTask } from "../api-client/tasks";
import { TASKS_KEY } from "../queryOptions/tasksQueryOptions";
import { statusMoveToast, taskActionToast } from "../helpers/taskToasts";

/** The three boards, in display order. */
const BOARDS = ["todo", "ongoing", "done"];

/** Per-board colours and copy, keyed to the CSS custom properties in index.css. */
const BOARD_META = {
    todo: {
        label: "To do",
        hint: "Grab the next thing",
        emptyHint: "Add a task to get started.",
        accent: "bg-todo",
        heading: "text-todo-deep",
        count: "bg-todo/15 text-todo-deep border-todo/40",
    },
    ongoing: {
        label: "Ongoing",
        hint: "You are on it",
        accent: "bg-ongoing",
        heading: "text-ongoing-deep",
        count: "bg-ongoing/15 text-ongoing-deep border-ongoing/40",
    },
    done: {
        label: "Done",
        hint: "Nicely done",
        accent: "bg-done",
        heading: "text-done-deep",
        count: "bg-done/15 text-done-deep border-done/40",
    },
};

/**
 * DOCU: Renumbers every board to a dense 0..n-1 sequence. <br>
 * After a move the source board has a gap and the destination board has a
 * duplicate, so both are renumbered in one pass. This is what keeps two cards
 * from ever sharing a position.
 * @param {Array} tasks - the full task list
 * @param {object} moving - the task that just changed board
 * @returns {Array} the same tasks with fresh `order` values
 */
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

/**
 * DOCU: Produces the task list that results from dropping a card. <br>
 * The card is pulled out, inserted at the requested index on the destination
 * board, and both affected boards are renumbered so their orders stay dense.
 * Doing the whole reorder in one pure function keeps the optimistic update easy
 * to reason about and to test.
 * @param {Array} tasks - the current task list
 * @param {string} taskId - the card being moved
 * @param {string} newStatus - the destination board
 * @param {number} newIndex - the destination index within that board
 * @returns {Array} the new task list
 */
const applyMove = (tasks, taskId, newStatus, newIndex) => {
    const moving = tasks.find((task) => task._id === taskId);
    if (!moving) return tasks;

    /*
      The destination board is rebuilt from scratch: every card already on it,
      plus the moved card at the dropped index. The other boards carry over
      untouched. `offBoard` must exclude the destination board's cards too,
      otherwise they would appear in the list twice.
    */
    const offBoard = tasks.filter((task) => task._id !== taskId && task.status !== newStatus);

    const destination = tasks
        .filter((task) => task._id !== taskId && task.status === newStatus)
        .sort((a, b) => a.order - b.order);

    destination.splice(newIndex, 0, { ...moving, status: newStatus });

    /* The moved card takes the dropped position; the rest keep dense orders. */
    const destinationOrder = new Map(destination.map((task, index) => [task._id, index]));

    return renumber(offBoard.concat(destination), moving).map((task) =>
        destinationOrder.has(task._id)
            ? { ...task, order: destinationOrder.get(task._id) }
            : task
    );
};

/**
 * DOCU: Builds the id of an optimistic placeholder card. <br>
 * `Date.now()` alone is not enough: two adds within the same millisecond would
 * produce the same id, and two cards sharing an id is a duplicate as surely as
 * two cards sharing a title. The counter keeps every placeholder unique.
 */
let placeholderCounter = 0;
const makePlaceholderId = () => `temp-${Date.now().toString(36)}-${(placeholderCounter += 1)}`;

/**
 * DOCU: Inserts the placeholder for a task whose create request is in flight. <br>
 * The order is derived from the list being written to rather than from a value
 * captured by the caller, so a second task added before the first has come back
 * still lands after the first instead of sharing its position.
 * @param {Array} tasks - the current task list
 * @param {object} placeholder - { _id, title, description, status }
 * @returns {Array} the new task list
 */
const applyCreatePending = (tasks, placeholder) =>
    renumber(
        tasks.concat({
            ...placeholder,
            order: tasks.filter((task) => task.status === placeholder.status).length,
        })
    );

/**
 * DOCU: Swaps the placeholder for the task the server actually stored. <br>
 * The placeholder must be removed, not merely followed by the real task, or the
 * board shows the same task twice. Matching the returned task by id also makes
 * this idempotent: a confirmation for a task already in the list replaces it in
 * place instead of appending a second copy.
 * @param {Array} tasks - the current task list
 * @param {string} placeholderId - the id of the card being replaced
 * @param {object} task - the task as the server returned it
 * @returns {Array} the new task list
 */
const applyCreateConfirmed = (tasks, placeholderId, task) => {
    const list = placeholderId
        ? tasks.filter((item) => item._id !== placeholderId)
        : [...tasks];

    /*
      The stored task takes over the placeholder's position. The order the
      server reports is its own, and trusting it would let a card jump up the
      board the moment it is confirmed - most visibly when two tasks are added
      in quick succession and the first is confirmed after the second.
    */
    const placeholder = tasks.find((item) => item._id === placeholderId);
    const confirmed = { ...task, order: placeholder?.order ?? task.order };

    const index = list.findIndex((item) => item._id === task._id);

    if (index === -1) list.push(confirmed);
    else list[index] = confirmed;

    return renumber(list);
};

/** DOCU: Drops the placeholder again, because the create request failed. */
const applyCreateDiscarded = (tasks, placeholderId) =>
    placeholderId ? tasks.filter((item) => item._id !== placeholderId) : tasks;

/**
 * DOCU: Owns every task mutation and the optimistic updates that go with them. <br>
 * The React Query cache is the single source of truth, so there is no second
 * copy of the list to keep in step with it. Each mutation writes its optimistic
 * result into the cache and rolls it back if the request fails, so the UI can
 * never drift out of sync with the database.
 * @param {Array} tasks - the current task list, straight from the query
 */
const useTasks = (tasks) => {
    const { showToast } = useAppContext();
    const queryClient = useQueryClient();

    /**
     * DOCU: Applies a change to the cached list. <br>
     * React Query passes the previous cache value to this updater, so the
     * closure never captures a stale copy of the list.
     */
    const applyToCache = useCallback(
        (updater) => {
            queryClient.setQueryData(TASKS_KEY, (previous) => ({
                ...previous,
                tasks: updater(previous?.tasks ?? []),
            }));
        },
        [queryClient]
    );

    /**
     * DOCU: Captures the cached list for a mutation that may have to be undone. <br>
     * React Query only hands a `context` to the callbacks when `onMutate`
     * returns one, so this is where the snapshot has to be taken. Passing it to
     * `mutate` as an option instead looks right but is silently dropped: those
     * options are not the context, and a failure would then leave the
     * optimistic change on the board with nothing to restore it.
     */
    const takeSnapshot = useCallback(
        () => ({ snapshot: queryClient.getQueryData(TASKS_KEY) }),
        [queryClient]
    );

    /** DOCU: Restores the pre-mutation list after a failed request. */
    const rollback = useCallback(
        (context) => {
            if (context?.snapshot) {
                queryClient.setQueryData(TASKS_KEY, context.snapshot);
            }
        },
        [queryClient]
    );

    /**
     * DOCU: Reads a task off the board as it stands right now. <br>
     * Used to capture the card's board *before* an optimistic write, because
     * that information cannot be recovered afterwards: once the cache holds the
     * moved card, the board it came from is gone. See `reorderTask` for why
     * this has to happen there rather than in `onMutate`.
     */
    const readTask = useCallback(
        (taskId) => queryClient.getQueryData(TASKS_KEY)?.tasks?.find((task) => task._id === taskId),
        [queryClient]
    );

    const moveMutation = useMutation({
        /*
          `fromStatus` and `title` arrive in the variables, captured by
          `reorderTask` before it touched the cache - see the note there for why
          `onMutate` is too late to read them. They are stripped out again in
          `mutationFn` so the API still receives only the three fields it knows.

          The move is announced from `onSuccess`, never from the drag handler:
          the card has already slid across optimistically, so a toast raised at
          drop time would claim a change the server might still refuse. Waiting
          means exactly one toast per move, only ever for a move that stuck, and
          an error toast replaces it rather than adding to it.
        */
        mutationFn: ({ taskId, newStatus, newIndex }) => moveTask({ taskId, newStatus, newIndex }),
        /*
          No `onMutate` here, and that is deliberate. `onMutate` is awaited inside
          React Query's async `execute()`, so it runs a microtask *after* the
          caller's optimistic write has already landed - which makes it useless
          for both jobs this mutation needs done before that write. The snapshot
          to roll back to and the card's previous board both have to be captured
          in `reorderTask`, which runs before the write. See the note there.
        */
        onSuccess: ({ task }, { newStatus, fromStatus, title }) => {
            applyToCache((current) =>
                current.map((item) => (item._id === task._id ? task : item))
            );

            const toast = statusMoveToast({ title, from: fromStatus, to: newStatus });

            if (toast) showToast(toast);
        },
        onError: (error, { snapshot }) => {
            /* The snapshot comes from the variables for the reason above. */
            rollback({ snapshot });
            showToast({ message: error.message, type: "ERROR" });
        },
    });

    const createMutation = useMutation({
        /*
          The placeholder's id rides along in the mutation's variables, which
          every callback is guaranteed to receive. `context` cannot be used for
          it: that is only ever what `onMutate` returned, and there is no
          onMutate here, so reading it would throw and leave the placeholder on
          the board - a card stuck showing as still pending. Only the two fields
          the API expects are forwarded.
        */
        mutationFn: ({ title, description }) => createTask({ title, description }),
        onSuccess: ({ task }, variables) => {
            /*
              The optimistic card is replaced here, not left in place next to
              the real one. Because each request carries its own placeholder id,
              two creates in flight at once each retire their own card.
            */
            applyToCache((current) =>
                applyCreateConfirmed(current, variables.placeholderId, task)
            );
            showToast(taskActionToast("created", task.title));
        },
        onError: (error, variables) => {
            /* Only this create's own card is withdrawn, so a failure never
               discards an unrelated task that was added at the same time. */
            applyToCache((current) => applyCreateDiscarded(current, variables.placeholderId));
            showToast({ message: error.message, type: "ERROR" });
        },
    });

    const editMutation = useMutation({
        mutationFn: editTask,
        onMutate: takeSnapshot,
        onSuccess: ({ task }) => {
            applyToCache((current) =>
                current.map((item) => (item._id === task._id ? task : item))
            );
            showToast(taskActionToast("updated", task.title));
        },
        onError: (error, _variables, context) => {
            rollback(context);
            showToast({ message: error.message, type: "ERROR" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: ({ taskId }) => deleteTask(taskId),
        onMutate: takeSnapshot,
        onSuccess: (_data, { title }) => {
            /*
              The card is already gone from the board by now, so the title has to
              come from the variables rather than the cache. `removeTask` reads
              it before it deletes anything for the same reason `reorderTask`
              reads a card's board before it moves it.
            */
            showToast(taskActionToast("deleted", title));
        },
        onError: (error, _variables, context) => {
            rollback(context);
            showToast({ message: error.message, type: "ERROR" });
        },
    });

    /**
     * DOCU: Reorders a task locally, then syncs to the server. <br>
     * The cache update has to happen synchronously in the drag handler, or the
     * card would not move until the round trip completed.
     *
     * The card's *previous* board and title are read here, before that write,
     * and travel with the request in the mutation's variables. This is the
     * subtle part, and it is why the toast used never to appear: reading them
     * in `onMutate` looks equivalent but is not. `onMutate` is awaited inside
     * React Query's async `execute()`, so it runs in a later microtask - by
     * then the line below has already put the card on its new board, so
     * `fromStatus` read the *new* status, `from` equalled `to`, and the toast
     * was suppressed as a no-op reorder. Capturing here is the only point
     * where the old board still exists.
     * @param {object} payload - { taskId, newStatus, newIndex }
     */
    const reorderTask = useCallback(
        ({ taskId, newStatus, newIndex }) => {
            const moving = readTask(taskId);
            const snapshot = queryClient.getQueryData(TASKS_KEY);

            applyToCache((current) => applyMove(current, taskId, newStatus, newIndex));

            moveMutation.mutate({
                taskId,
                newStatus,
                newIndex,
                snapshot,
                fromStatus: moving?.status,
                title: moving?.title,
            });
        },
        [applyToCache, moveMutation, queryClient, readTask]
    );

    /**
     * DOCU: Adds a task, showing a placeholder until the server confirms it. <br>
     * The caller's job is one call per task the user meant to create; the
     * placeholder is written optimistically and then swapped for the stored
     * task, so a single call can only ever leave one card on the board.
     * @param {object} payload - { title, description }
     */
    const addTask = useCallback(
        ({ title, description }) => {
            const cleanTitle = title.trim();
            if (!cleanTitle) return;

            const placeholder = {
                _id: makePlaceholderId(),
                title: cleanTitle,
                description: description?.trim() ?? "",
                status: "todo",
            };

            applyToCache((current) => applyCreatePending(current, placeholder));

            createMutation.mutate({
                title: placeholder.title,
                description: placeholder.description,
                placeholderId: placeholder._id,
            });
        },
        [applyToCache, createMutation]
    );

    /** DOCU: Renames a task optimistically. */
    const renameTask = useCallback(
        (task, title, description) => {
            const cleanTitle = title.trim();
            if (!cleanTitle) return;
            if (cleanTitle === task.title && description === task.description) return;

            applyToCache((current) =>
                current.map((item) =>
                    item._id === task._id ? { ...item, title: cleanTitle, description } : item
                )
            );
            editMutation.mutate({ taskId: task._id, title: cleanTitle, description });
        },
        [applyToCache, editMutation]
    );

    /**
     * DOCU: Removes a task optimistically. <br>
     * The title is read before the card leaves the board, for the same reason
     * `reorderTask` reads a card's board before moving it: once the delete has
     * been applied there is nothing left to read the name from, and the success
     * toast still has to name the task the user removed.
     */
    const removeTask = useCallback(
        (taskId) => {
            const title = readTask(taskId)?.title;

            applyToCache((current) =>
                renumber(current.filter((task) => task._id !== taskId))
            );
            deleteMutation.mutate({ taskId, title });
        },
        [applyToCache, deleteMutation, readTask]
    );

    return {
        tasks,
        boards: BOARDS,
        boardMeta: BOARD_META,
        addTask,
        renameTask,
        removeTask,
        reorderTask,
    };
};

/** DOCU: Returns the tasks on a given board, in their own order. */
const getBoardTasks = (tasks, board) =>
    (tasks ?? []).filter((task) => task.status === board).sort((a, b) => a.order - b.order);

export { useTasks, getBoardTasks, BOARDS, BOARD_META };
