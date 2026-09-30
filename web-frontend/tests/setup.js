/**
 * Registers jest-dom's matchers (`toHaveTextContent`, `toHaveAttribute`, ...)
 * with Vitest's `expect`, which ships without them.
 */
import "@testing-library/jest-dom/vitest";

/**
 * jsdom implements neither `matchMedia` nor the observer API, and the mascot the
 * navbar renders prefers reduced motion through both. Stubbed here rather than
 * in one suite, so every test that mounts a page with the navbar can.
 */
if (typeof window !== "undefined" && !window.matchMedia) {
    window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    });
}
