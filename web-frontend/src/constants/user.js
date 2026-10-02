/**
 * Shown in place of a name when the account has neither name set. The API always stores both,
 * so this is only ever a guard against a blank render.
 */
const DISPLAY_NAME_FALLBACK = "Guest";

/** Shown in the avatar when there is no name and no email to fall back on. */
const INITIALS_FALLBACK = "?";

/**
 * The rules an uploaded profile picture must satisfy, checked before a byte is sent.
 *
 * Each value has an exact twin in `web-backend/constants/uploads.js`. The duplication is
 * deliberate: the client check is a courtesy, the server check is the boundary.
 */

/** The image formats accepted, as the browser's `accept` attribute wants them. */
const AVATAR_ACCEPT = ".jpg,.jpeg,.png";

/** The same three formats, for checking a file's extension. */
const AVATAR_EXTENSIONS = [".jpg", ".jpeg", ".png"];

/** 5 MB. Must match `IMAGE_MAX_SIZE_BYTES` in the backend exactly. */
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** The size as the user sees it written, built from the number above. */
const AVATAR_MAX_SIZE_MB = AVATAR_MAX_SIZE_BYTES / (1024 * 1024);

/** What to say when a chosen file is refused. */
const AVATAR_MESSAGES = {
    type: "That file is not an image. Pick a JPG or PNG.",
    size: `That image is too large. Pick one under ${AVATAR_MAX_SIZE_MB} MB.`,
};

/** The multipart field name the upload endpoint reads the file from. */
const AVATAR_FIELD = "avatar";

/** The lower-cased extension of a filename, or `""` when it has none. */
const getFileExtension = (filename) => {
    const name = String(filename ?? "").toLowerCase();
    const dot = name.lastIndexOf(".");

    return dot === -1 ? "" : name.slice(dot);
};

/**
 * Checks a file against the same rules the server enforces, and answers with the message to
 * show rather than a boolean - so no two screens can word the same refusal differently.
 *
 * @param {File|{name?: string, size?: number}} file - The chosen file
 * @returns {string} The problem, or `""` when the file is acceptable
 */
const validateAvatarFile = (file) => {
    if (!file) return AVATAR_MESSAGES.type;

    if (!AVATAR_EXTENSIONS.includes(getFileExtension(file.name))) {
        return AVATAR_MESSAGES.type;
    }

    if (file.size > AVATAR_MAX_SIZE_BYTES) {
        return AVATAR_MESSAGES.size;
    }

    return "";
};

export {
    DISPLAY_NAME_FALLBACK,
    INITIALS_FALLBACK,
    AVATAR_FIELD,
    AVATAR_ACCEPT,
    AVATAR_EXTENSIONS,
    AVATAR_MAX_SIZE_BYTES,
    AVATAR_MAX_SIZE_MB,
    AVATAR_MESSAGES,
    getFileExtension,
    validateAvatarFile,
};