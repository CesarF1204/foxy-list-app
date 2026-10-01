import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import AddTask from "../src/components/Tasks/AddTask";

/** The composer starts collapsed; this opens it and gives back the onAdd spy. */
const open = (onAdd = vi.fn()) => {
    render(<AddTask onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: /add a task/i }));
    return onAdd;
};

/** The title field is the handle used everywhere below. */
const titleField = () => screen.getByLabelText("New task title");
const isOpen = () => Boolean(screen.queryByLabelText("New task title"));

afterEach(() => cleanup());

describe("the add task composer closing", () => {
    it("closes once the task has been added", () => {
        const onAdd = open();

        fireEvent.change(titleField(), { target: { value: "Buy milk" } });
        fireEvent.click(screen.getByRole("button", { name: "Add task" }));

        expect(onAdd).toHaveBeenCalledWith({ title: "Buy milk", description: "" });
        expect(isOpen()).toBe(false);
        expect(screen.getByRole("button", { name: /add a task/i })).toBeInTheDocument();
    });

    it("closes on a click outside of it", () => {
        open();

        fireEvent.mouseDown(document.body);

        expect(isOpen()).toBe(false);
    });

    it("stays open for a click inside it", () => {
        open();

        fireEvent.mouseDown(screen.getByLabelText("New task note"));
        expect(isOpen()).toBe(true);

        fireEvent.mouseDown(screen.getByRole("button", { name: "Close" }));
        expect(isOpen()).toBe(true);
    });

    it("throws away a half written draft when closed from outside", () => {
        open();

        fireEvent.change(titleField(), { target: { value: "Half a thought" } });
        fireEvent.mouseDown(document.body);
        fireEvent.click(screen.getByRole("button", { name: /add a task/i }));

        expect(titleField()).toHaveValue("");
    });

    it("closes on Escape", () => {
        open();

        fireEvent.keyDown(document, { key: "Escape" });

        expect(isOpen()).toBe(false);
    });

    it("keeps listening only while it is open", () => {
        open();

        fireEvent.keyDown(document, { key: "Escape" });
        expect(isOpen()).toBe(false);

        /** Already closed: another Escape must not reach anything and throw. */
        fireEvent.keyDown(document, { key: "Escape" });
        fireEvent.mouseDown(document.body);
        expect(isOpen()).toBe(false);
    });

    it("closes on Enter from the title, and opens blank next time", () => {
        const onAdd = open();

        fireEvent.change(titleField(), { target: { value: "Book the venue" } });
        fireEvent.keyDown(titleField(), { key: "Enter" });

        expect(onAdd).toHaveBeenCalledWith({ title: "Book the venue", description: "" });
        expect(isOpen()).toBe(false);

        fireEvent.click(screen.getByRole("button", { name: /add a task/i }));
        expect(titleField()).toHaveValue("");
    });
});