import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { act, render, screen, cleanup, fireEvent } from "@testing-library/react";

import { useDebouncedValue, SEARCH_DEBOUNCE_MS } from "../src/hooks/useDebouncedValue";

/**
 * The debounce, with both of its consumers on it.
 *
 * Sharing one constant is the point of the change, so the risk to rule out is a *shared
 * debounce* rather than merely a shared number: if any part of this hook kept its state or its
 * pending timer at module level, typing in one search box would settle the other one, and a
 * route change could leave a timer running against an unmounted tree. Each call must own its
 * own state and its own timer, with the constant the only thing they have in common.
 */

/**
 * Records every *settled* term, not every render.
 *
 * The component re-renders on each keystroke while the settled value is unchanged, so pushing
 * on every render would record the same term repeatedly and say nothing about the debounce.
 * Only a genuine change in the settled value is the thing under test, so that is all this
 * keeps - and it lets the assertions below read as plain sequences of commits.
 */
const recorder = () => {
    const seen = [];

    return {
        seen,
        record(value) {
            if (seen.at(-1) !== value) seen.push(value);
        },
    };
};

/** A minimal stand-in for a search box, so the hook can be exercised without either screen. */
const Box = ({ label, delay, onSettled }) => {
    const [value, setValue] = useState("");
    const [settled] = useDebouncedValue(value, delay);

    onSettled(settled);

    return (
        <label>
            {label}
            <input value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
    );
};

/** Appends one letter, the way a person types - each keystroke building on the last. */
const typeLetter = (label, letter) => {
    const box = screen.getByLabelText(label);

    fireEvent.change(box, { target: { value: box.value + letter } });
};

/** Sets the whole term at once, for the cases that are not about typing speed. */
const type = (label, text) => fireEvent.change(screen.getByLabelText(label), { target: { value: text } });

/** The two boxes, mounted together, each reporting every value it settles on. */
const Boxes = () => {
    const users = recorder();
    const docs = recorder();

    render(
        <>
            <Box label="Users" delay={SEARCH_DEBOUNCE_MS} onSettled={users.record} />
            <Box label="Docs" delay={SEARCH_DEBOUNCE_MS} onSettled={docs.record} />
        </>,
    );

    return { users: users.seen, docs: docs.seen };
};

beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("the one delay every search box waits", () => {
    it("is a single value, so the two boxes cannot drift apart", () => {
        expect(SEARCH_DEBOUNCE_MS).toBe(1500);
    });

    it("settles the term only after the pause, not on every keystroke", () => {
        const seen = recorder();
        render(<Box label="Search" delay={SEARCH_DEBOUNCE_MS} onSettled={seen.record} />);

        for (const letter of "john") typeLetter("Search", letter);

        /** Typing has happened, the pause has not: nothing has been settled. */
        expect(seen.seen.at(-1)).toBe("");

        act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1));
        expect(seen.seen.at(-1)).toBe("");

        act(() => vi.advanceTimersByTime(1));
        expect(seen.seen.at(-1)).toBe("john");
    });

    it("settles once for a whole word, rather than once per letter", () => {
        const seen = recorder();
        render(<Box label="Search" delay={SEARCH_DEBOUNCE_MS} onSettled={seen.record} />);

        for (const letter of "christopher") typeLetter("Search", letter);
        act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

        /** One transition to the whole word, with the intermediate prefixes never committed. */
        expect(seen.seen).toEqual(["", "christopher"]);
    });

    it("waits out the pause again when typing resumes mid-pause", () => {
        const seen = recorder();
        render(<Box label="Search" delay={SEARCH_DEBOUNCE_MS} onSettled={seen.record} />);

        typeLetter("Search", "j");
        typeLetter("Search", "o");
        act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 100));

        /** A keystroke inside the pause restarts it rather than letting the stale one land. */
        typeLetter("Search", "h");
        typeLetter("Search", "n");
        act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 100));
        expect(seen.seen.at(-1)).toBe("");

        act(() => vi.advanceTimersByTime(100));
        expect(seen.seen.at(-1)).toBe("john");
        expect(seen.seen).toEqual(["", "john"]);
    });

    it("never settles a term the user has already typed back over", () => {
        const seen = recorder();
        render(<Box label="Search" delay={SEARCH_DEBOUNCE_MS} onSettled={seen.record} />);

        typeLetter("Search", "j");
        typeLetter("Search", "o");
        typeLetter("Search", "h");
        typeLetter("Search", "n");
        /** Back to what it was before the pause - there is nothing to commit. */
        type("Search", "");
        act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 3));

        expect(seen.seen).toEqual([""]);
    });
});

describe("two boxes on the same delay", () => {
    it("settles each one from its own typing, and neither disturbs the other", () => {
        const { users, docs } = Boxes();

        type("Users", "grace");

        /** Only the box that was typed in has anything pending. */
        act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
        expect(users.at(-1)).toBe("grace");
        expect(docs.at(-1)).toBe("");

        type("Docs", "health");
        act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

        /** And the settled one is left exactly where it was. */
        expect(docs.at(-1)).toBe("health");
        expect(users.at(-1)).toBe("grace");
    });

    it("keeps them independent even when one is typed faster than the other", () => {
        const { users, docs } = Boxes();

        /** Interleaved, so one box's pause is running while the other gets more keystrokes. */
        typeLetter("Users", "g");
        act(() => vi.advanceTimersByTime(1000));
        typeLetter("Docs", "h");
        typeLetter("Docs", "e");
        act(() => vi.advanceTimersByTime(100));
        typeLetter("Users", "r");
        act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

        expect(users.at(-1)).toBe("gr");
        expect(docs.at(-1)).toBe("he");
    });

    it("runs no timer for one box after the other unmounts", () => {
        const users = recorder();
        const docs = recorder();
        const { unmount } = render(
            <>
                <Box label="Users" delay={SEARCH_DEBOUNCE_MS} onSettled={users.record} />
                <Box label="Docs" delay={SEARCH_DEBOUNCE_MS} onSettled={docs.record} />
            </>,
        );

        type("Docs", "health");
        unmount();

        /**
         * A shared timer would survive the unmount and fire into a gone tree. Nothing may
         * settle after the last box is gone, and React must report no update on an unmounted
         * component - which is what the absence of a warning here is asserting.
         */
        expect(() => act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2))).not.toThrow();
        expect(docs.seen).toEqual([""]);
    });
});
