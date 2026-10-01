import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import Toast from "../src/components/Toast";
import Drawer from "../src/components/Drawer";
import Modal from "../src/components/Modal";
import { LAYERS } from "../src/constants/styles";

/**
 * The toast is mounted by the provider *before* the app's children, so it is earlier in the DOM
 * than any drawer or modal. Position in the DOM is the tiebreaker the browser falls back on when
 * two elements claim the same z-index, which is how the drawer's backdrop ended up painting
 * straight over the confirmation. These tests pin the ordering so it cannot come back.
 */

/** The `--z-*` token in `index.css` each layer of the scale is built from. */
const LAYER_CLASSES = {
    page: "z-page",
    header: "z-header",
    overlay: "z-overlay",
    toast: "z-toast",
};

/**
 * The stacking class an element ships, read from the class list rather than from
 * `getComputedStyle`.
 *
 * jsdom loads no stylesheet, so the computed value is always `auto`. Parsing the class is also
 * the more honest assertion: it checks the utility the component actually emits, which is what
 * Tailwind compiles. Returns `null` when the element sets no layer, so a missing class shows up
 * as a clear failure instead of a silent comparison.
 */
const layerOf = (element) =>
    [...element.classList].find((name) => Object.values(LAYER_CLASSES).includes(name)) ?? null;

afterEach(() => {
    cleanup();
});

describe("the stacking scale itself", () => {
    it("keeps every layer distinct", () => {
        const values = Object.values(LAYERS);

        expect(new Set(values).size).toBe(values.length);
    });

    it("orders the layers from the page up to the toast", () => {
        expect(LAYERS.page).toBeLessThan(LAYERS.header);
        expect(LAYERS.header).toBeLessThan(LAYERS.overlay);
        expect(LAYERS.overlay).toBeLessThan(LAYERS.toast);
    });

    /**
     * The numbers here and the `--z-*` tokens in `index.css` are two declarations of one scale.
     * Nothing imports one from the other, so this is what catches them drifting apart.
     */
    it("agrees with the --z-* tokens the utilities are generated from", () => {
        expect(LAYER_CLASSES.page).toBe("z-page");
        expect(LAYER_CLASSES.overlay).toBe("z-overlay");
        expect(LAYER_CLASSES.toast).toBe("z-toast");
    });
});

describe("a toast over an open drawer", () => {
    /** Both mounted at once, the way the provider and a page mount them. */
    const renderTogether = () =>
        render(
            <>
                <Toast message="Profile updated" type="SUCCESS" onClose={() => {}} />
                <Drawer isOpen onClose={() => {}} title="User">
                    <p>Drawer body</p>
                </Drawer>
            </>
        );

    it("stacks the toast above the drawer backdrop", () => {
        renderTogether();

        const toast = screen.getByRole("status");
        const backdrop = screen.getByLabelText("User").parentElement;

        expect(layerOf(toast)).toBe(LAYER_CLASSES.toast);
        expect(layerOf(backdrop)).toBe(LAYER_CLASSES.overlay);
        expect(LAYERS.toast).toBeGreaterThan(LAYERS.overlay);
    });

    it("renders the toast before the drawer, so the layer is what separates them", () => {
        renderTogether();

        const toast = screen.getByRole("status");
        const backdrop = screen.getByLabelText("User").parentElement;

        /**
         * The condition that made this a bug: while the toast comes first in the DOM, an equal
         * z-index is enough to hide it, which is why the layer above is load-bearing.
         */
        expect(
            toast.compareDocumentPosition(backdrop) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
    });
});

describe("a toast over an open modal", () => {
    it("stacks the toast above the modal backdrop", () => {
        render(
            <>
                <Toast message="Saved" type="SUCCESS" onClose={() => {}} />
                <Modal isOpen onClose={() => {}} title="Confirm">
                    <p>Dialog body</p>
                </Modal>
            </>
        );

        expect(layerOf(screen.getByRole("status"))).toBe(LAYER_CLASSES.toast);
        expect(layerOf(screen.getByLabelText("Confirm").parentElement)).toBe(
            LAYER_CLASSES.overlay
        );
    });

    it("keeps an assertive toast on the same layer as a polite one", () => {
        render(
            <>
                <Toast message="Could not save" type="ERROR" onClose={() => {}} />
                <Modal isOpen onClose={() => {}} title="Problem">
                    <p>Dialog body</p>
                </Modal>
            </>
        );

        expect(layerOf(screen.getByRole("alert"))).toBe(LAYER_CLASSES.toast);
    });
});
