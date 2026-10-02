import { v2 as cloudinary } from 'cloudinary';
import { requireEnv } from './db.js';

/**
 * DOCU: Configures the Cloudinary client from the environment, once.
 *
 * Called on first upload rather than at import time, because `dotenv.config()` runs in
 * `server.js` after the module graph is loaded.
 *
 * Last Updated Date: October 2, 2026
 * @function configureCloudinary
 * @returns {object} The configured Cloudinary client
 * @author Cesar
 */
const configureCloudinary = () => {
    if (!cloudinary.config().cloud_name) {
        cloudinary.config({
            cloud_name: requireEnv('CLOUDINARY_CLOUD_NAME'),
            api_key: requireEnv('CLOUDINARY_API_KEY'),
            api_secret: requireEnv('CLOUDINARY_API_SECRET'),
            secure: true,
        });

        console.log('[cloudinary] configured');
    }

    return cloudinary;
};

export { configureCloudinary };