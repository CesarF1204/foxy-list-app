import User from '../schemas/userSchema.js';
import {
    DEFAULT_ROLE,
    DEFAULT_ACCOUNT_STATUS,
    ADMIN_ROLE,
    ACTIVE_STATUS,
    BLOCKED_STATUS,
} from '../constants/roles.js';
import { BOARDS } from '../constants/boards.js';

/**
 * DOCU: Looks an account up by email, case-insensitively.
 * Last Updated Date: October 1, 2026
 * @function findByEmail
 * @param {string} email - The email address
 * @returns {Promise<object|null>} The account, without a password hash
 * @author Cesar
 */
const findByEmail = async (email) =>
    User.findOne({ email: String(email).trim().toLowerCase() }).lean();

/**
 * DOCU: Looks an account up by email together with its password hash.
 * Last Updated Date: October 1, 2026
 * @function findForLogin
 * @param {string} email - The email address
 * @returns {Promise<object|null>} The account, with a password hash
 * @author Cesar
 */
const findForLogin = async (email) => User.findForLogin(email);

/**
 * DOCU: Looks an account up by id.
 * Last Updated Date: October 1, 2026
 * @function findById
 * @param {string} userId - The account id
 * @returns {Promise<object|null>} The account, or null
 * @author Cesar
 */
const findById = async (userId) => User.findById(userId).lean();

/**
 * DOCU: Counts users by status and role in a single aggregation.
 * Last Updated Date: October 1, 2026
 * @function getUserStats
 * @returns {Promise<{total: number, active: number, blocked: number, admins: number}>} The counts
 * @author Cesar
 */
const getUserStats = async () => {
    const [row] = await User.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                    $sum: { $cond: [{ $eq: ['$status', ACTIVE_STATUS] }, 1, 0] },
                },
                blocked: {
                    $sum: { $cond: [{ $eq: ['$status', BLOCKED_STATUS] }, 1, 0] },
                },
                admins: {
                    $sum: { $cond: [{ $eq: ['$role', ADMIN_ROLE] }, 1, 0] },
                },
            },
        },
    ]);

    return {
        total: row?.total ?? 0,
        active: row?.active ?? 0,
        blocked: row?.blocked ?? 0,
        admins: row?.admins ?? 0,
    };
};

/**
 * DOCU: Counts how many accounts exist, used to bootstrap the first admin.
 * Last Updated Date: October 1, 2026
 * @function countUsers
 * @returns {Promise<number>} The number of accounts
 * @author Cesar
 */
const countUsers = async () => User.countDocuments();

/**
 * DOCU: Returns one page of users with their task counts, in one aggregation.
 * Last Updated Date: October 1, 2026
 * @function queryUsersPage
 * @param {object} options.filter - The Mongo filter
 * @param {object} options.sort - The Mongo sort
 * @param {number} options.skip - How many rows to skip
 * @param {number} options.limit - How many rows to return
 * @returns {Promise<{rows: object[], total: number}>} The page and the matching total
 * @author Cesar
 */
const queryUsersPage = async ({ filter, sort, skip, limit }) => {
    /* Only the three real boards are counted, so total always equals their sum. */
    const taskCountsShape = {
        total: {
            $size: {
                $filter: {
                    input: '$userTasks',
                    as: 'task',
                    cond: { $in: ['$$task.status', BOARDS] },
                },
            },
        },
    };

    for (const board of BOARDS) {
        taskCountsShape[board] = {
            $size: {
                $filter: {
                    input: '$userTasks',
                    as: 'task',
                    cond: { $eq: ['$$task.status', board] },
                },
            },
        };
    }

    const [result] = await User.aggregate([
        { $match: filter },
        {
            $lookup: {
                from: 'tasks',
                localField: '_id',
                foreignField: 'userId',
                as: 'userTasks',
            },
        },
        {
            $addFields: {
                fullName: { $concat: ['$firstName', ' ', '$lastName'] },
                taskCounts: taskCountsShape,
            },
        },
        { $sort: sort },
        {
            $facet: {
                rows: [{ $skip: skip }, { $limit: limit }],
                counted: [{ $count: 'total' }],
            },
        },
    ]);

    return {
        rows: result?.rows ?? [],
        total: result?.counted?.[0]?.total ?? 0,
    };
};

/**
 * DOCU: Creates an account with the default role and status.
 * Last Updated Date: October 1, 2026
 * @function createUser
 * @param {object} data - { firstName, lastName, email, passwordHash }
 * @returns {Promise<object>} The created account
 * @author Cesar
 */
const createUser = async ({ firstName, lastName, email, passwordHash }) => {
    const user = await User.create({
        firstName,
        lastName,
        email,
        password: passwordHash,
        role: DEFAULT_ROLE,
        status: DEFAULT_ACCOUNT_STATUS,
    });

    return user.toObject();
};

/**
 * DOCU: Applies a set of whitelisted fields to an account.
 * Last Updated Date: October 1, 2026
 * @function updateUser
 * @param {string} userId - The account id
 * @param {object} updates - The fields to write
 * @returns {Promise<object|null>} The updated account, or null
 * @author Cesar
 */
const updateUser = async (userId, updates) =>
    User.findByIdAndUpdate(userId, updates, {
        returnDocument: 'after',
        runValidators: true,
    }).lean();

/**
 * DOCU: Replaces the stored password hash.
 * Last Updated Date: October 1, 2026
 * @function updatePassword
 * @param {string} userId - The account id
 * @param {string} passwordHash - The new hash
 * @returns {Promise<object|null>} The updated account, or null
 * @author Cesar
 */
const updatePassword = async (userId, passwordHash) =>
    User.findByIdAndUpdate(
        userId,
        { password: passwordHash },
        { returnDocument: 'after' }
    ).lean();

/**
 * DOCU: Removes an account.
 * Last Updated Date: October 1, 2026
 * @function deleteUser
 * @param {string} userId - The account id
 * @returns {Promise<object|null>} The removed account, or null
 * @author Cesar
 */
const deleteUser = async (userId) => User.findByIdAndDelete(userId).lean();

export {
    findByEmail,
    findForLogin,
    findById,
    getUserStats,
    countUsers,
    queryUsersPage,
    createUser,
    updateUser,
    updatePassword,
    deleteUser,
};