import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "../contexts/useAppContext";
import { createTask, moveTask, editTask, deleteTask } from "../api-client/tasks";
import { TASKS_KEY } from "../constants/queryKeys";
import { BOARDS, BOARD_META, DEFAULT_BOARD } from "../constants/boards";
import { TEMP_ID_PREFIX } from "../constants/tasks";
import { statusMoveToast, taskActionToast } from "../helpers/taskToasts";

/**
 * Renumbers boards to a dense 0..n-1 sequence, so two cards can never share a position after a
 * move.
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
 * The task list that results from dropping a card: pulled out, inserted at the new index, and
 * both boards renumbered.
 */
const applyMove = (tasks, taskId, newStatus, newIndex) => {
    const moving = tasks.find((task) => task._id === taskId);
    if (!moving) return tasks;

    /** The destination board is rebuilt from scratch; the others carry over. */
    const offBoard = tasks.filter((task) => task._id !== taskId && task.status !== newStatus);

    const destination = tasks
        .filter((task) => task._id !== taskId && task.status === newStatus)
        .sort((a, b) => a.order - b.order);

    destination.splice(newIndex, 0, { ...moving, status: newStatus });

    /** The moved card takes the dropped position; the rest keep dense orders. */
    const destinationOrder = new Map(destination.map((task, index) => [task._id, index]));

    return renumber(offBoard.concat(destination), moving).map((task) =>
        destinationOrder.has(task._id)
            ? { ...task, order: destinationOrder.get(task._id) }
            : task
    );
};

/** Builds a unique id for an optimistic placeholder card. */
let placeholderCounter = 0;
const makePlaceholderId = () =>
    `${TEMP_ID_PREFIX}${Date.now().toString(36)}-${(placeholderCounter += 1)}`;

/**
 * Adds the placeholder for a create request that is in flight. The order comes from the list
 * being written to, so two in-flight adds cannot collide.
 */
const applyCreatePending = (tasks, placeholder) =>
    renumber(
        tasks.concat({
            ...placeholder,
            order: tasks.filter((task) => task.status === placeholder.status).length,
        })
    );

/**
 * Swaps the placeholder for the task the server stored. Matching by id keeps this idempotent,
 * so a repeated confirmation replaces in place.
 */
const applyCreateConfirmed = (tasks, placeholderId, task) => {
    const list = placeholderId
        ? tasks.filter((item) => item._id !== placeholderId)
        : [...tasks];

    /**
     * The stored task keeps the placeholder's position, so a card cannot jump up the board the
     * moment it is confirmed.
     */
    const placeholder = tasks.find((item) => item._id === placeholderId);
    const confirmed = { ...task, order: placeholder?.order ?? task.order };

    const index = list.findIndex((item) => item._id === task._id);

    if (index === -1) list.push(confirmed);
    else list[index] = confirmed;

    return renumber(list);
};

/** Drops the placeholder again, because the create request failed. */
const applyCreateDiscarded = (tasks, placeholderId) =>
    placeholderId ? tasks.filter((item) => item._id !== placeholderId) : tasks;

/** Owns every task mutation and its optimistic cache updates. */
const useTasks = (tasks) => {
    const { showToast } = useAppContext();
    const queryClient = useQueryClient();

    /** Applies a change to the cached list. */
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
     * The snapshot has to come from an onMutate return: options passed to `mutate` are not the
     * context and are silently dropped on failure.
     */
    const takeSnapshot = useCallback(
        () => ({ snapshot: queryClient.getQueryData(TASKS_KEY) }),
        [queryClient]
    );

    /** Restores the pre-mutation list after a failed request. */
    const rollback = useCallback(
        (context) => {
            if (context?.snapshot) {
                queryClient.setQueryData(TASKS_KEY, context.snapshot);
            }
        },
        [queryClient]
    );

    /**
     * Reads a task before an optimistic write, while its old board is still knowable. See
     * `reorderTask` for why this cannot be done in onMutate.
     */
    const readTask = useCallback(
        (taskId) => queryClient.getQueryData(TASKS_KEY)?.tasks?.find((task) => task._id === taskId),
        [queryClient]
    );

    const moveMutation = useMutation({
        /**
         * No onMutate: it runs a microtask after the caller's optimistic write, so the snapshot
         * and previous board are captured in `reorderTask`. The toast is built in onSuccess, so
         * a refused move never claims a change that did not happen.
         */
        mutationFn: ({ taskId, newStatus, newIndex }) => moveTask({ taskId, newStatus, newIndex }),
        onSuccess: ({ task }, { newStatus, fromStatus, title }) => {
            applyToCache((current) =>
                current.map((item) => (item._id === task._id ? task : item))
            );

            const toast = statusMoveToast({ title, from: fromStatus, to: newStatus });

            if (toast) showToast(toast);
        },
        onError: (error, { snapshot }) => {
            /** The snapshot comes from the variables for the reason above. */
            rollback({ snapshot });
            showToast({ message: error.message, type: "ERROR" });
        },
    });

    const createMutation = useMutation({
        /**
         * The placeholder id rides in the variables, which every callback gets; `context` is no
         * use here, as this mutation has no onMutate.
         */
        mutationFn: ({ title, description }) => createTask({ title, description }),
        onSuccess: ({ task }, variables) => {
            /**
             * Each request carries its own placeholder id, so two creates in flight at once
             * each retire their own card.
             */
            applyToCache((current) =>
                applyCreateConfirmed(current, variables.placeholderId, task)
            );
            showToast(taskActionToast("created", task.title));
        },
        onError: (error, variables) => {
            /** Only this create's own card is withdrawn. */
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
            /**
             * The card is already gone, so the title has to come from the variables rather than
             * the cache.
             */
            showToast(taskActionToast("deleted", title));
        },
        onError: (error, _variables, context) => {
            rollback(context);
            showToast({ message: error.message, type: "ERROR" });
        },
    });

    /**
     * Reorders a task locally, then syncs to the server. The cache write is synchronous so the
     * card moves without waiting for the round trip. The previous board and title are captured
     * here because `onMutate` runs a microtask later, by which time the card is already on its
     * new board.
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
     * Adds a task optimistically; the placeholder is swapped for the stored task once the
     * server confirms it.
     */
    const addTask = useCallback(
        ({ title, description }) => {
            const cleanTitle = title.trim();
            if (!cleanTitle) return;

            const placeholder = {
                _id: makePlaceholderId(),
                title: cleanTitle,
                description: description?.trim() ?? "",
                status: DEFAULT_BOARD,
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

    /** Renames a task optimistically. */
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
     * Removes a task optimistically. The title is read up front, since the success toast still
     * has to name a task the board no longer holds.
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

/** Returns the tasks on a given board, in their own order. */
const getBoardTasks = (tasks, board) =>
    (tasks ?? []).filter((task) => task.status === board).sort((a, b) => a.order - b.order);

export { useTasks, getBoardTasks };
