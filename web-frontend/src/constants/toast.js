const TOAST_TYPES = {
    success: "SUCCESS",
    error: "ERROR",
    info: "INFO",
};
const TOAST_DEFAULT_TYPE = TOAST_TYPES.info;

/** The colour each toast type is filled with. */
const TOAST_STYLES = {
    SUCCESS: "bg-done-deep",
    ERROR: "bg-red-600",
    INFO: "bg-ink",
};

/** The icon shown at the start of each toast, named rather than drawn. */
const TOAST_ICONS = {
    SUCCESS: "toastSuccess",
    ERROR: "toastError",
    INFO: "toastInfo",
};

/**
 * How long each type stays on screen, in ms. Errors last longer because they usually need to be
 * read and acted on.
 */
const TOAST_DURATIONS_MS = {
    ERROR: 6000,
    DEFAULT: 3000,
};

const TOAST_TITLE_LIMIT = 40;

export {
    TOAST_TYPES,
    TOAST_DEFAULT_TYPE,
    TOAST_STYLES,
    TOAST_ICONS,
    TOAST_DURATIONS_MS,
    TOAST_TITLE_LIMIT,
};