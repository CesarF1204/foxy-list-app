/**
 * Integration tests for the task notification system.
 *
 * Unlike scripts/toast-verify.mjs, which checks the wording in isolation, this
 * mounts the *real* AppContextProvider and the *real* useTasks hook, drives
 * them through the public actions, and asserts on the toast that actually
 * reaches the DOM. That is deliberate: the bug these tests exist for was in
 * the wiring, not the copy, and testing the message string alone would never
 * have caught it.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AppContextProvider } from "../src/contexts/AppContext";
import { useTasks } from "../src/hooks/useTasks";
import { TASKS_KEY } from "../src/queryOptions/tasksQueryOptions";

/* The api-client module is mocked so each test decides what the server does. */
const moveTask = vi.fn();
const createTask = vi.fn();
const editTask = vi.fn();
const deleteTask = vi.fn();

vi.mock("../src/api-client/tasks", () => ({
    moveTask: (...args) => moveTask(...args),
    createTask: (...args) => createTask(...args),
    editTask: (...args) => editTask(...args),
    deleteTask: (...args) => deleteTask(...args),
}));

const TITLE = "Write the report";

/** A task as the API returns it. */
const makeTask = (overrides = {}) => ({
    _id: "t1",
    title: TITLE,
    description: "",
    status: "todo",
    order: 0,
    ...overrides,
});

/** Every toast currently on screen. role=status is what a non-error toast uses. */
const toastsOnScreen = () =>
    Array.from(document.querySelectorAll('[role="status"]')).map((node) => node.textContent);

let queryClient;

/** Mounts the real provider and hook, seeded with `tasks`. */
const mountBoard = (tasks) => {
    queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });

    queryClient.setQueryData(TASKS_KEY, { tasks });

    let api;

    const Harness = () => {
        api = useTasks(queryClient.getQueryData(TASKS_KEY)?.tasks);
        return null;
    };

    render(
        <QueryClientProvider client={queryClient}>
            <AppContextProvider>
                <Harness />
            </AppContextProvider>
        </QueryClientProvider>
    );

    return () => api;
};

/** Lets the mutation's promise chain and the resulting re-renders settle. */
const settle = async () => {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    });
};

beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
});

describe("status change toasts", () => {
    const move = async (api, newStatus) => {
        await act(async () => {
            api().reorderTask({ taskId: "t1", newStatus, newIndex: 0 });
        });
        await settle();
    };

    it("shows a toast for To Do -> Ongoing", async () => {
        moveTask.mockResolvedValue({ task: makeTask({ status: "ongoing" }) });
        const api = mountBoard([makeTask()]);
        await move(api, "ongoing");

        expect(moveTask).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("status")).toHaveTextContent(`"${TITLE}" moved to Ongoing`);
    });

    it("shows a toast for Ongoing -> Done", async () => {
        moveTask.mockResolvedValue({ task: makeTask({ status: "done" }) });
        const api = mountBoard([makeTask({ status: "ongoing" })]);
        await move(api, "done");

        expect(screen.getByRole("status")).toHaveTextContent(`"${TITLE}" moved to Done`);
    });

    it("shows a toast for Done -> Ongoing", async () => {
        moveTask.mockResolvedValue({ task: makeTask({ status: "ongoing" }) });
        const api = mountBoard([makeTask({ status: "done" })]);
        await move(api, "ongoing");

        expect(screen.getByRole("status")).toHaveTextContent(`"${TITLE}" moved to Ongoing`);
    });

    it("shows a toast for Ongoing -> To Do, phrased as a move back", async () => {
        moveTask.mockResolvedValue({ task: makeTask({ status: "todo" }) });
        const api = mountBoard([makeTask({ status: "ongoing" })]);
        await move(api, "todo");

        expect(screen.getByRole("status")).toHaveTextContent(`"${TITLE}" moved back to To Do`);
    });

    it("shows a toast for To Do -> Done", async () => {
        moveTask.mockResolvedValue({ task: makeTask({ status: "done" }) });
        const api = mountBoard([makeTask()]);
        await move(api, "done");

        expect(screen.getByRole("status")).toHaveTextContent(`"${TITLE}" moved to Done`);
    });

    it("shows a toast for Done -> To Do", async () => {
        moveTask.mockResolvedValue({ task: makeTask({ status: "todo" }) });
        const api = mountBoard([makeTask({ status: "done" })]);
        await move(api, "todo");

        expect(screen.getByRole("status")).toHaveTextContent(`"${TITLE}" moved back to To Do`);
    });

    it("shows no toast when a card is only reordered on its own board", async () => {
        moveTask.mockResolvedValue({ task: makeTask() });
        const api = mountBoard([makeTask(), makeTask({ _id: "t2", title: "Other", order: 1 })]);
        await move(api, "todo");

        expect(moveTask).toHaveBeenCalledTimes(1);
        expect(toastsOnScreen()).toHaveLength(0);
    });
});
describe("the other task actions", () => {
    it("shows one toast when a task is created", async () => {
        createTask.mockResolvedValue({ task: makeTask() });
        const api = mountBoard([]);

        await act(async () => {
            api().addTask({ title: TITLE, description: "" });
        });
        await settle();

        expect(toastsOnScreen()).toHaveLength(1);
        expect(screen.getByRole("status")).toHaveTextContent(`"${TITLE}" created`);
    });

    it("shows one toast when a task is edited", async () => {
        editTask.mockResolvedValue({ task: makeTask({ title: "New title" }) });
        const api = mountBoard([makeTask()]);

        await act(async () => {
            api().renameTask(makeTask(), "New title", "");
        });
        await settle();

        expect(toastsOnScreen()).toHaveLength(1);
        expect(screen.getByRole("status")).toHaveTextContent(`"New title" updated`);
    });

    it("shows no toast when an edit changes nothing", async () => {
        const api = mountBoard([makeTask()]);

        await act(async () => {
            api().renameTask(makeTask(), TITLE, "");
        });
        await settle();

        expect(editTask).not.toHaveBeenCalled();
        expect(toastsOnScreen()).toHaveLength(0);
    });

    it("shows one toast when a task is deleted", async () => {
        deleteTask.mockResolvedValue({ _id: "t1" });
        const api = mountBoard([makeTask()]);

        await act(async () => {
            api().removeTask("t1");
        });
        await settle();

        expect(toastsOnScreen()).toHaveLength(1);
        expect(screen.getByRole("status")).toHaveTextContent(`"${TITLE}" deleted`);
    });
});
describe("exactly one toast per action", () => {
    it("does not duplicate a toast for a single move", async () => {
        moveTask.mockResolvedValue({ task: makeTask({ status: "ongoing" }) });
        const api = mountBoard([makeTask()]);

        await act(async () => {
            api().reorderTask({ taskId: "t1", newStatus: "ongoing", newIndex: 0 });
        });
        await settle();

        expect(toastsOnScreen()).toHaveLength(1);
    });

    it("does not duplicate a toast for a single create", async () => {
        createTask.mockResolvedValue({ task: makeTask() });
        const api = mountBoard([]);

        await act(async () => {
            api().addTask({ title: TITLE, description: "" });
        });
        await settle();

        expect(toastsOnScreen()).toHaveLength(1);
    });

    it("does not duplicate a toast for a single delete", async () => {
        deleteTask.mockResolvedValue({ _id: "t1" });
        const api = mountBoard([makeTask()]);

        await act(async () => {
            api().removeTask("t1");
        });
        await settle();

        expect(toastsOnScreen()).toHaveLength(1);
    });

    it("shows one toast per action when the same action is repeated", async () => {
        /* Only one toast is ever on screen at a time, so the count stays 1. */
        moveTask.mockResolvedValue({ task: makeTask({ status: "ongoing" }) });
        const api = mountBoard([makeTask()]);

        for (let i = 0; i < 3; i += 1) {
            await act(async () => {
                api().reorderTask({ taskId: "t1", newStatus: "ongoing", newIndex: 0 });
            });
            await settle();
        }

        expect(moveTask).toHaveBeenCalledTimes(3);
        expect(toastsOnScreen()).toHaveLength(1);
    });
});
describe("failures never claim success", () => {
    it("shows no success toast when the move is rejected", async () => {
        moveTask.mockRejectedValue(new Error("Task not found"));
        const api = mountBoard([makeTask()]);

        await act(async () => {
            api().reorderTask({ taskId: "t1", newStatus: "ongoing", newIndex: 0 });
        });
        await settle();

        expect(toastsOnScreen()).toHaveLength(0);
        expect(screen.getByRole("alert")).toHaveTextContent("Task not found");
    });

    it("shows no success toast when the create is rejected", async () => {
        createTask.mockRejectedValue(new Error("Title is required"));
        const api = mountBoard([]);

        await act(async () => {
            api().addTask({ title: TITLE, description: "" });
        });
        await settle();

        expect(toastsOnScreen()).toHaveLength(0);
        expect(screen.getByRole("alert")).toHaveTextContent("Title is required");
    });

    it("shows no success toast when the edit is rejected", async () => {
        editTask.mockRejectedValue(new Error("Title cannot be empty"));
        const api = mountBoard([makeTask()]);

        await act(async () => {
            api().renameTask(makeTask(), "New title", "");
        });
        await settle();

        expect(toastsOnScreen()).toHaveLength(0);
    });

    it("shows no success toast when the delete is rejected", async () => {
        deleteTask.mockRejectedValue(new Error("Task not found"));
        const api = mountBoard([makeTask()]);

        await act(async () => {
            api().removeTask("t1");
        });
        await settle();

        expect(toastsOnScreen()).toHaveLength(0);
    });

    it("restores the board when a move fails", async () => {
        moveTask.mockRejectedValue(new Error("Task not found"));
        const api = mountBoard([makeTask()]);

        await act(async () => {
            api().reorderTask({ taskId: "t1", newStatus: "ongoing", newIndex: 0 });
        });
        await settle();

        const tasks = queryClient.getQueryData(TASKS_KEY).tasks;
        expect(tasks).toHaveLength(1);
        expect(tasks[0].status).toBe("todo");
    });

    it("ignores a blank task rather than announcing it", async () => {
        const api = mountBoard([]);

        await act(async () => {
            api().addTask({ title: "   ", description: "" });
        });
        await settle();

        expect(createTask).not.toHaveBeenCalled();
        expect(toastsOnScreen()).toHaveLength(0);
    });
});

describe("the toast itself", () => {
    it("is announced politely and is dismissible", async () => {
        moveTask.mockResolvedValue({ task: makeTask({ status: "ongoing" }) });
        const api = mountBoard([makeTask()]);

        await act(async () => {
            api().reorderTask({ taskId: "t1", newStatus: "ongoing", newIndex: 0 });
        });
        await settle();

        expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");

        await act(async () => {
            screen.getByLabelText("Dismiss notification").click();
        });

        await waitFor(() => expect(toastsOnScreen()).toHaveLength(0));
    });

    it("keeps a long title from stretching the toast", async () => {
        const longTitle = "Prepare the quarterly financial review for the board".repeat(3);
        moveTask.mockResolvedValue({ task: makeTask({ status: "done", title: longTitle }) });
        const api = mountBoard([makeTask({ title: longTitle })]);

        await act(async () => {
            api().reorderTask({ taskId: "t1", newStatus: "done", newIndex: 0 });
        });
        await settle();

        const text = screen.getByRole("status").textContent;
        /* Not the literal ellipsis glyph: any non-ASCII char proves the title was clipped. */
        expect(text).toMatch(/[^\x20-\x7E]/);
        expect(text.length).toBeLessThan(90);
    });
});
describe("the bug this suite was written for", () => {
    /*
     * Regression guard for the original defect. The previous board used to be
     * read inside `onMutate`, which React Query awaits inside its async
     * `execute()` - so it ran a microtask *after* the optimistic write had put
     * the card on its new board. `from` then equalled `to`, the move was
     * mistaken for a same-board reorder, and no toast was ever shown.
     *
     * This drives the real hook and asserts the toast really reaches the DOM,
     * which is the only form of that check that would have caught it.
     */
    it("still announces a move whose optimistic write happens first", async () => {
        moveTask.mockResolvedValue({ task: makeTask({ status: "ongoing" }) });
        const api = mountBoard([makeTask({ status: "todo" })]);

        /* The card is on the todo board when the action starts... */
        expect(queryClient.getQueryData(TASKS_KEY).tasks[0].status).toBe("todo");

        await act(async () => {
            api().reorderTask({ taskId: "t1", newStatus: "ongoing", newIndex: 0 });
        });
        await settle();

        /* ...and the toast names the board it came from, not the one it is on. */
        expect(screen.getByRole("status")).toHaveTextContent("moved to Ongoing");
    });

    it("reports the original board, not the destination, for a return trip", async () => {
        moveTask.mockResolvedValue({ task: makeTask({ status: "todo" }) });
        const api = mountBoard([makeTask({ status: "done" })]);

        await act(async () => {
            api().reorderTask({ taskId: "t1", newStatus: "todo", newIndex: 0 });
        });
        await settle();

        expect(screen.getByRole("status")).toHaveTextContent("moved back to To Do");
    });

    it("still rolls the board back when the request fails", async () => {
        moveTask.mockRejectedValue(new Error("Task not found"));
        const api = mountBoard([makeTask({ status: "todo" })]);

        await act(async () => {
            api().reorderTask({ taskId: "t1", newStatus: "ongoing", newIndex: 0 });
        });
        await settle();

        expect(queryClient.getQueryData(TASKS_KEY).tasks[0].status).toBe("todo");
    });
});