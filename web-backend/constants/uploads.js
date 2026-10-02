/**
 * The image rules, in one place so the Multer filter and the size limit cannot drift apart.
 * Both the extension and the MIME type are checked: a browser reports whatever type the
 * operating system gave the file, so either check alone can be fooled by a rename.
 */

/** The accepted formats. */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

/** The MIME types those formats correspond to. */
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'];

/** 5 MB. Must match `AVATAR_MAX_SIZE_BYTES` in the frontend exactly. */
const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** The multipart field the client sends the file under. */
const AVATAR_FIELD_NAME = 'avatar';

/** The Cloudinary folder avatars are written to. */
const AVATAR_FOLDER = 'foxy-list/avatars';

/** The lower-cased extension of a filename, or `''` when it has none. */
const extensionOf = (filename) => {
    const name = String(filename ?? '').toLowerCase();
    const dot = name.lastIndexOf('.');

    return dot === -1 ? '' : name.slice(dot);
};

/** True when the filename ends in an accepted extension. */
const hasAllowedExtension = (filename) => IMAGE_EXTENSIONS.includes(extensionOf(filename));

/** True when the browser reported an accepted MIME type. */
const hasAllowedMimeType = (mimetype) => IMAGE_MIME_TYPES.includes(String(mimetype ?? '').toLowerCase());

export {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES,
    IMAGE_MAX_SIZE_BYTES,
    AVATAR_FIELD_NAME,
    AVATAR_FOLDER,
    extensionOf,
    hasAllowedExtension,
    hasAllowedMimeType,
};