/**
 * Shown in place of a name when the account has neither name set. The API
 * always stores both, so this is only ever a guard against a blank render.
 */
const DISPLAY_NAME_FALLBACK = "Guest";

/** Shown in the avatar when there is no name and no email to fall back on. */
const INITIALS_FALLBACK = "?";

export { DISPLAY_NAME_FALLBACK, INITIALS_FALLBACK };