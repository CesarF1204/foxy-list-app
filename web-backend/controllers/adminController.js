import * as adminService from '../services/adminService.js';
import { parseBody, parseId } from '../helpers/validationHelper.js';
import {
    updateUserProfileSchema,
    updateUserRoleSchema,
    updateUserStatusSchema,
    updateUserPasswordSchema,
} from '../utils/validationSchemas.js';
import { HTTP_STATUS } from '../constants/http.js';
import { AVATAR_UPDATED_MESSAGE } from '../constants/messages.js';

/**
 * DOCU: Returns the user and task counts for the admin dashboard.
 * Last Updated Date: October 1, 2026
 * @function getStats
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { stats }
 * @author Cesar
 */
export const getStats = async (req, res) => {
    res.status(HTTP_STATUS.OK).json({ stats: await adminService.getStats() });
};

/**
 * DOCU: Returns one page of the filtered users table.
 * Last Updated Date: October 1, 2026
 * @function listUsers
 * @param {object} req - Request, carrying the search and paging query
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { users }
 * @author Cesar
 */
export const listUsers = async (req, res) => {
    res.status(HTTP_STATUS.OK).json({ users: await adminService.listUsers(req.query) });
};

/**
 * DOCU: Returns one user with their task counts.
 * Last Updated Date: October 1, 2026
 * @function getUser
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { user }
 * @author Cesar
 */
export const getUser = async (req, res) => {
    const userId = parseId('User id', req.params.id);

    res.status(HTTP_STATUS.OK).json({ user: await adminService.getUser(req.user, userId) });
};

/**
 * DOCU: Updates a user's profile fields. Role and status are never touched.
 * Last Updated Date: October 1, 2026
 * @function updateUser
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { user }
 * @author Cesar
 */
export const updateUser = async (req, res) => {
    const userId = parseId('User id', req.params.id);
    const data = parseBody(req.body, updateUserProfileSchema);

    res.status(HTTP_STATUS.OK).json({ user: await adminService.updateUserProfile(req.user, userId, data) });
};

/**
 * DOCU: Changes a user's role.
 * Last Updated Date: October 1, 2026
 * @function updateUserRole
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { user }
 * @author Cesar
 */
export const updateUserRole = async (req, res) => {
    const userId = parseId('User id', req.params.id);
    const data = parseBody(req.body, updateUserRoleSchema);

    res.status(HTTP_STATUS.OK).json({ user: await adminService.updateUserRole(req.user, userId, data) });
};

/**
 * DOCU: Blocks or unblocks a user.
 * Last Updated Date: October 1, 2026
 * @function updateUserStatus
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { user }
 * @author Cesar
 */
export const updateUserStatus = async (req, res) => {
    const userId = parseId('User id', req.params.id);
    const data = parseBody(req.body, updateUserStatusSchema);

    res.status(HTTP_STATUS.OK).json({ user: await adminService.updateUserStatus(req.user, userId, data) });
};

/**
 * DOCU: Sets a new password for a user. Only a message is returned.
 * Last Updated Date: October 1, 2026
 * @function updateUserPassword
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { message }
 * @author Cesar
 */
export const updateUserPassword = async (req, res) => {
    const userId = parseId('User id', req.params.id);
    const data = parseBody(req.body, updateUserPasswordSchema);

    res.status(HTTP_STATUS.OK).json({ message: await adminService.updateUserPassword(req.user, userId, data) });
};

/**
 * DOCU: Replaces a user's profile picture with an uploaded image.
 *
 * The file is already read and checked by `parseAvatarUpload`. Cloudinary runs before the
 * database, so a failed upload leaves the stored picture untouched. The whole account comes
 * back, so the open drawer and the table row both redraw from the answer rather than a
 * refetch.
 *
 * Last Updated Date: October 2, 2026
 * @function uploadUserAvatar
 * @param {object} req - Request, carrying the file and the signed-in admin
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { message, avatar, user }
 * @author Cesar
 */
export const uploadUserAvatar = async (req, res) => {
    const userId = parseId('User id', req.params.id);

    const user = await adminService.updateUserAvatar(req.user, userId, req.file);

    res.status(HTTP_STATUS.OK).json({
        message: AVATAR_UPDATED_MESSAGE,
        avatar: user.avatar,
        user,
    });
};

/**
 * DOCU: Deletes a user account and all of its tasks.
 * Last Updated Date: October 1, 2026
 * @function deleteUser
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with the deleted id and task count
 * @author Cesar
 */
export const deleteUser = async (req, res) => {
    const userId = parseId('User id', req.params.id);

    res.status(HTTP_STATUS.OK).json(await adminService.deleteUser(req.user, userId));
};
