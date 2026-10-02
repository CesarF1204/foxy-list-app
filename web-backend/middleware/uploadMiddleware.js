import multer from 'multer';
import { badRequest } from '../helpers/errorHelper.js';
import {
    IMAGE_MAX_SIZE_BYTES,
    AVATAR_FIELD_NAME,
    hasAllowedExtension,
    hasAllowedMimeType,
} from '../constants/uploads.js';
import {
    IMAGE_TYPE_MESSAGE,
    IMAGE_SIZE_MESSAGE,
    IMAGE_MISSING_MESSAGE,
} from '../constants/messages.js';

/**
 * DOCU: Multer's parser for the single-image upload endpoint.
 *
 * Memory storage, so nothing is written to disk and there is no temp file to clean up. The
 * size limit is enforced by Multer as the stream is read, which surfaces as LIMIT_FILE_SIZE.
 *
 * Last Updated Date: October 2, 2026
 * @type {import('express').RequestHandler}
 * @author Cesar
 */
const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        /** In bytes. Mirrors IMAGE_MAX_SIZE_BYTES. */
        fileSize: IMAGE_MAX_SIZE_BYTES,

        /** One file per request: an avatar, not a gallery. */
        files: 1,

        /** Bounds a misspelled field name rather than accepting it. */
        fieldNameSize: 100,
    },

    fileFilter: (_req, file, done) => {
        if (!hasAllowedMimeType(file.mimetype) || !hasAllowedExtension(file.originalname)) {
            return done(badRequest(IMAGE_TYPE_MESSAGE));
        }

        return done(null, true);
    },
}).single(AVATAR_FIELD_NAME);

/**
 * DOCU: Runs the parser and reports a missing or malformed file as a 400.
 *
 * Turns Multer's own errors into the app's ApiError, so every upload failure reaches the
 * client through the one error path in `errorMiddleware`.
 *
 * Last Updated Date: October 2, 2026
 * @function parseAvatarUpload
 * @param {object} req - Request
 * @param {object} res - Response
 * @param {Function} next - Passes control to the next handler
 * @returns {void}
 * @author Cesar
 */
const parseAvatarUpload = (req, res, next) =>
    upload(req, res, (error) => {
        /* No file arrived under the expected field name. */
        if (!error && !req.file) return next(badRequest(IMAGE_MISSING_MESSAGE));

        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return next(badRequest(IMAGE_SIZE_MESSAGE));
            }

            if (error.code === 'LIMIT_UNEXPECTED_FILE') {
                return next(
                    badRequest(
                        `Unexpected file field "${error.field}". Send one image as "${AVATAR_FIELD_NAME}".`
                    )
                );
            }

            /* Any other limit, or a malformed body: unusable either way. */
            return next(badRequest(IMAGE_TYPE_MESSAGE));
        }

        /* An ApiError from the file filter, already worded for the user. */
        return next(error);
    });

export { parseAvatarUpload };