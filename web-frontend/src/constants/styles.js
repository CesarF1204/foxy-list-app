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

export { CONTROL_BASE, CONTROL_BUTTON, CONTROL_BUTTON_SUBTLE, CONTROL_ICON };