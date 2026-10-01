/**
 * Shared control styles for the app navbar: fixing the box model in one place keeps every
 * navbar control the same size.
 */

/** The common shape of every navbar control. */
const CONTROL_BASE =
    "inline-flex h-10 items-center justify-center rounded-xl px-3.5 text-sm font-bold " +
    "transition focus-visible:ring-4 focus-visible:ring-fox-200 focus-visible:outline-none " +
    "disabled:cursor-not-allowed disabled:opacity-60";

/** A solid, fox-coloured navbar button. */
const CONTROL_BUTTON = `${CONTROL_BASE} bg-fox-400 text-white hover:bg-fox-500`;

/** A neutral navbar button. */
const CONTROL_BUTTON_SUBTLE = `${CONTROL_BASE} border-2 border-ink bg-white text-ink hover:bg-fox-50`;

/** A small square icon button, sized to match CONTROL_BASE's height. */
const CONTROL_ICON = `${CONTROL_BASE} w-10 px-0 border-2 border-ink bg-white text-ink hover:bg-fox-50`;

/**
 * The matching `--z-*` tokens and the `z-page` / `z-header` / `z-overlay` / `z-toast` classes
 * live in `src/index.css`; this is the same scale, kept here where the other shared values are
 * so the ordering can be asserted rather than eyeballed. Only the relative order is meaningful,
 * and the gaps are headroom for a layer to be slotted in later.
 */
const LAYERS = {
    page: 10,
    header: 30,
    overlay: 50,
    toast: 60,
};

export {
    CONTROL_BASE,
    CONTROL_BUTTON,
    CONTROL_BUTTON_SUBTLE,
    CONTROL_ICON,
    LAYERS,
};