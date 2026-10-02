import { configureCloudinary } from '../config/cloudinary.js';
import { AVATAR_FOLDER } from '../constants/uploads.js';
import { IMAGE_UPLOAD_FAILED_MESSAGE } from '../constants/messages.js';
import { ApiError } from '../helpers/errorHelper.js';
import { HTTP_STATUS } from '../constants/http.js';

/**
 * DOCU: Uploads an image to Cloudinary and returns its secure URL.
 * Last Updated Date: October 2, 2026
 * @function uploadAvatarImage
 * @param {object} file - The Multer file: `buffer` and `mimetype`
 * @param {string} userId - The account, used as the Cloudinary public id
 * @returns {Promise<string>} The Cloudinary secure URL
 * @author Cesar
 */
const uploadAvatarImage = async (file, userId) => {
    const cloudinary = configureCloudinary();

    /** Keeps the format the user chose, rather than the SDK's default. */
    const format = file.mimetype === 'image/png' ? 'png' : 'jpg';

    try {
        const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            {
                folder: AVATAR_FOLDER,
                /** Keyed by account, so a re-upload replaces the old image instead of piling up. */
                public_id: String(userId),
                overwrite: true,
                invalidate: true,
                resource_type: 'image',
                format,
            }
        );

        return result.secure_url;
    } catch (error) {
        /** Logged here, answered below: this layer has no response to write to. */
        console.error(`[server] cloudinary avatar upload failed: ${error?.stack ?? error}`);

        /** One readable message, and the caller's avatar is left untouched. */
        throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, IMAGE_UPLOAD_FAILED_MESSAGE);
    }
};

export { uploadAvatarImage };