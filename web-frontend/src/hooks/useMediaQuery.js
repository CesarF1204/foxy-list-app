import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a media query currently matches, kept in step with the window.
 * This exists for the one job CSS breakpoints cannot do: choosing between two
 * different layouts. This hook renders one of them and drops the other.
 * @param {string} query - A media query, e.g. `(min-width: 48rem)`
 * @returns {boolean} Whether the query matches right now
 */
const useMediaQuery = (query) => {
    /** No `window`: server render, or a test with no DOM. The wide branch. */
    const subscribe = useCallback(
        (onChange) => {
            if (typeof window === "undefined" || !window.matchMedia) return () => {};

            const list = window.matchMedia(query);
            list.addEventListener("change", onChange);

            return () => list.removeEventListener("change", onChange);
        },
        [query],
    );

    const getSnapshot = useCallback(() => {
        if (typeof window === "undefined" || !window.matchMedia) return true;

        return window.matchMedia(query).matches;
    }, [query]);

    const getServerSnapshot = useCallback(() => true, []);

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

export default useMediaQuery;