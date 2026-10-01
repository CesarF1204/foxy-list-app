/** Email shape: something, an @, something, a dot, something. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Names take letters and spaces only. */
const NAME_PATTERN = /^[A-Za-z\s]+$/;

/** A 24 character hex ObjectId, used for ids in paths and bodies. */
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

/** Must match PASSWORD_MIN_LENGTH in the frontend exactly. */
const PASSWORD_MIN_LENGTH = 6;

/** Maximum name length. */
const NAME_MAX_LENGTH = 60;

/** Maximum password length. */
const PASSWORD_MAX_LENGTH = 128;

/**
 * A password is never trimmed or rewritten: " my password" is a different secret from "my
 * password", and silent trimming would store one thing while the user believes they stored
 * another. Whitespace is refused rather than fixed.
 */
const PASSWORD_NO_SPACES_PATTERN = /\s/;

/** Maximum task title length. */
const TITLE_MAX_LENGTH = 200;

/** Maximum task description length. */
const DESCRIPTION_MAX_LENGTH = 2000;

export {
    EMAIL_PATTERN,
    NAME_PATTERN,
    OBJECT_ID_PATTERN,
    PASSWORD_MIN_LENGTH,
    NAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    PASSWORD_NO_SPACES_PATTERN,
    TITLE_MAX_LENGTH,
    DESCRIPTION_MAX_LENGTH,
};
