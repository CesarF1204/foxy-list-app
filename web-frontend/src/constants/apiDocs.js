/**
 * How each HTTP method is coloured, and what it is called when the colour is not the only
 * cue.
 *
 * Built from the app's own tokens rather than from a new palette, so the viewer reads as part
 * of Foxy List instead of as a borrowed tool: a read is the calm blue of the To Do board, a
 * write is the brand's fox orange, and a delete is the same red the destructive buttons
 * already use. The method name is always spelled out beside the colour, because colour alone
 * is not information a screen reader can pass on.
 */
const METHOD_STYLES = {
    GET: "bg-todo text-white",
    POST: "bg-fox-400 text-white",
    PUT: "bg-ongoing text-white",
    PATCH: "bg-ongoing-deep text-white",
    DELETE: "bg-[#e04b4b] text-white",
};

/**
 * The status code bands, used for the dot beside a documented response. Success is the done
 * board's green, a client error the same red as a delete, and a server fault the deep
 * fox tone - so a 200 and a 500 are distinguishable at a glance without reading the digits.
 */
const STATUS_STYLES = {
    success: "bg-done",
    clientError: "bg-[#e04b4b]",
    serverError: "bg-fox-700",
};

/**
 * DOCU: The style for a documented status code.
 * @param {string} status - The code, as a string
 * @returns {string} The dot's class
 */
const statusStyle = (status) => {
    const code = Number(status);

    if (code >= 500) return STATUS_STYLES.serverError;
    if (code >= 400) return STATUS_STYLES.clientError;
    return STATUS_STYLES.success;
};

/**
 * DOCU: The style for a documented method.
 * @param {string} method - The verb, upper case
 * @returns {string} The badge's class, falling back to the neutral one
 */
const methodStyle = (method) => METHOD_STYLES[method] ?? "bg-ink-soft text-white";

export { METHOD_STYLES, STATUS_STYLES, statusStyle, methodStyle };
