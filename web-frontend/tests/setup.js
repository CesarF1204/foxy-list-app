import "@testing-library/jest-dom/vitest";

/**
 * jsdom implements neither `matchMedia` nor the observer API, and the mascot the navbar renders
 * prefers reduced motion through both. Stubbed here rather than in one suite, so every test
 * that mounts a page with the navbar can.
 *
 * Returning `matches: false` for everything is correct for a *capability* query -
 * `prefers-reduced-motion: reduce`, `(hover: hover)` - where a headless browser genuinely
 * has no opinion and "assume the simplest case" is the honest answer. It is wrong for a
 * *width* query. `false` there asserts "this viewport is narrower than 48rem", and jsdom does
 * have a viewport: `innerWidth` is 1024. So a component that picks between a desktop table
 * and a mobile card list takes the mobile branch under test and never exercises the layout
 * it was written for - a silent false failure rather than an obvious one.
 *
 * So width queries are answered against the real `innerWidth`, and everything else keeps
 * returning `false`. The stub still needs `addEventListener`/`removeEventListener` wired to a
 * real registry, because `useMediaQuery` subscribes to `change`; a stub that drops the
 * subscription would leave the hook frozen at the value it computed on mount.
 */
if (typeof window !== "undefined" && !window.matchMedia) {
    /** `(min-width: 48rem)` / `(max-width: 40rem)`. `rem` is 16px by definition in CSS. */
    const parseWidth = (query) => {
        const match = /\((min|max)-width:\s*(\d+(?:\.\d+)?)(px|rem)\)/.exec(query);
        if (!match) return null;

        const value = Number(match[2]) * (match[3] === "rem" ? 16 : 1);
        return match[1] === "min" ? window.innerWidth >= value : window.innerWidth <= value;
    };

    window.matchMedia = (query) => {
        const listeners = new Set();

        return {
            matches: parseWidth(query) ?? false,
            media: query,
            onchange: null,

            addEventListener: (_type, listener) => listeners.add(listener),
            removeEventListener: (_type, listener) => listeners.delete(listener),

            /** The legacy API, kept working for the same reason it was here before. */
            addListener: (listener) => listeners.add(listener),
            removeListener: (listener) => listeners.delete(listener),

            dispatchEvent: () => false,
        };
    };
}
