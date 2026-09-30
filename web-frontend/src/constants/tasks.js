/**
 * DOCU: The id prefix of a task the client has created but the server has not
 * confirmed. Matched on to tell the two apart, rather than a second flag that
 * could disagree with the id.
 */
const TEMP_ID_PREFIX = "temp-";

export { TEMP_ID_PREFIX };