import { useCallback, useEffect, useState } from "react";

/**
 * How long a search box waits after the last keystroke before the term is committed.
 *
 * One delay for every search box in the app, so the users table and the API viewer feel the
 * same. The pause keeps a typed word from becoming a pass over the data on every letter - a
 * request for the table, a full re-filter for the viewer.
 */
const SEARCH_DEBOUNCE_MS = 1500;

/**
 * DOCU: A value that settles `delay` ms after it stops changing.
 *
 * The two-state pattern the users table already used: `value` is what an input is bound to and
 * updates on every keystroke, while the returned value is what expensive work should read. Typing
 * "john" sets the first four times and the second once.
 *
 * The effect depends on the settled value as well as the incoming one, and bails out when they
 * match, so a settled term does not schedule a timer that fires to set the value it already
 * holds. That guard is what stops a stale term from overwriting a newer one: a keystroke landing
 * mid-pause clears the pending timer through the cleanup rather than queueing behind it.
 *
 * Every caller gets its own state and its own pending timer, so the users table and the API
 * viewer can share one delay constant without sharing a debounce. Sharing the constant is
 * deliberate; sharing the state would be a bug.
 *
 * @param {string} value - The immediate value, e.g. straight from an input
 * @param {number} delay - How long to wait after the last change, in ms
 * @returns {[string, Function]} The settled value, and a way to settle it now
 */
const useDebouncedValue = (value, delay) => {
    const [settled, setSettled] = useState(value);

    useEffect(() => {
        if (value === settled) return undefined;

        const timer = window.setTimeout(() => setSettled(value), delay);

        return () => window.clearTimeout(timer);
    }, [value, settled, delay]);

    /**
     * Settle immediately, for the actions that mean "stop filtering by this" rather than
     * "filter by something else" - clearing the box, or a filter change. Waiting out the
     * pause there would leave the list showing results for a term the user has just dismissed.
     */
    const settleNow = useCallback((next) => setSettled(next), []);

    return [settled, settleNow];
};

export { useDebouncedValue, SEARCH_DEBOUNCE_MS };