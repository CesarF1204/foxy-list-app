/** The type strings are the contract between everything that raises a toast and
 *  the component that renders it, so they are named once here. */

/** DOCU: The three toast types the app raises. */
const TOAST_TYPES = {
    success: "SUCCESS",
    error: "ERROR",
    info: "INFO",
};

/** DOCU: The default when a toast arrives without a type. */
const TOAST_DEFAULT_TYPE = TOAST_TYPES.info;

/** DOCU: The colour each toast type is filled with. */
const TOAST_STYLES = {
    SUCCESS: "bg-done-deep",
    ERROR: "bg-red-600",
    INFO: "bg-ink",
};

/** DOCU: The glyph shown at the start of each toast. */
const TOAST_ICONS = {
    SUCCESS: "✓",
    ERROR: "!",
    INFO: "i",
};

/** DOCU: How long each type stays on screen, in ms. Errors last longer because
 *  they usually need to be read and acted on. */
const TOAST_DURATIONS_MS = {
    ERROR: 6000,
    DEFAULT: 3000,
};

/** DOCU: How much of a task title a toast carries. Longer is cut with an
 *  ellipsis rather than wrapped, so a toast never grows into a panel. */
const TOAST_TITLE_LIMIT = 40;

export {
    TOAST_TYPES,
    TOAST_DEFAULT_TYPE,
    TOAST_STYLES,
    TOAST_ICONS,
    TOAST_DURATIONS_MS,
    TOAST_TITLE_LIMIT,
};