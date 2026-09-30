import * as userModel from '../models/userModel.js';
import * as taskModel from '../models/taskModel.js';
import { hashPassword, toPublicUser } from './authService.js';
import { notFound, conflict } from '../helpers/errorHelper.js';
import { assertNotSelfLockOut } from '../middleware/adminMiddleware.js';
import { escapeRegex, parsePagination } from '../helpers/queryHelper.js';
import { USER_ROLES, ACCOUNT_STATUSES, isAdmin, DEFAULT_ROLE, DEFAULT_ACCOUNT_STATUS } from '../constants/roles.js';
import { emptyTaskCounts } from '../constants/boards.js';
import {
    DEFAULT_USER_SORT_FIELD,
    DEFAULT_USER_SORT_DIRECTION,
    FIRST_PAGE,
} from '../constants/pagination.js';
import { DUPLICATE_EMAIL_MESSAGE, PASSWORD_UPDATED_MESSAGE } from '../constants/messages.js';

/** The columns the users table can sort on. */
const USER_SORT_FIELDS = {
    name: 'name',
    email: 'email',
    role: 'role',
    status: 'status',
    totalTasks: 'totalTasks',
    createdAt: 'createdAt',
};

/** The accepted sort directions. */
const SORT_DIRECTIONS = { asc: 1, desc: -1 };

/** Sort fields the aggregation pipeline computes rather than stores. */
const COMPUTED_SORT_FIELDS = { name: 'fullName', totalTasks: 'taskCounts.total' };

/**
 * DOCU: Converts a user row to the shape the admin API returns.
 * Last Updated Date: October 1, 2026
 * @function toAdminUser
 * @param {object} user - The stored account
 * @param {object} [taskCounts] - The counts from the aggregation
 * @returns {object} The row the admin table reads
 * @author Cesar
 */
const toAdminUser = (user, taskCounts) => ({
    ...toPublicUser(user),
    role: isAdmin(user) ? user.role : DEFAULT_ROLE,
    status: user.status ?? DEFAULT_ACCOUNT_STATUS,
    taskCounts: taskCounts ?? emptyTaskCounts(),
});

/**
 * DOCU: Returns the user and task counts for the dashboard.
 * Last Updated Date: October 1, 2026
 * @function getStats
 * @returns {Promise<{users: object, tasks: object}>} The dashboard numbers
 * @author Cesar
 */
const getStats = async () => {
    const [users, tasks] = await Promise.all([userModel.getUserStats(), taskModel.getTaskStats()]);

    return { users, tasks };
};

/**
 * DOCU: Reads the users table query string into a validated plan.
 * Last Updated Date: October 1, 2026
 * @function parseUserQuery
 * @param {object} query - The Express query object
 * @returns {object} { search, role, status, sortBy, sortDir, page, pageSize, skip }
 * @author Cesar
 */
const parseUserQuery = (query = {}) => {
    const sortBy = USER_SORT_FIELDS[query.sortBy] ? query.sortBy : DEFAULT_USER_SORT_FIELD;
    const sortDir = query.sortDir === 'asc' ? 'asc' : DEFAULT_USER_SORT_DIRECTION;

    const { page, pageSize, skip } = parsePagination(query);

    return {
        search: (query.search ?? '').trim(),
        role: USER_ROLES.includes(query.role) ? query.role : '',
        status: ACCOUNT_STATUSES.includes(query.status) ? query.status : '',
        sortBy,
        sortDir,
        page,
        pageSize,
        skip,
    };
};

/**
 * DOCU: Builds the Mongo filter for a parsed query.
 * Last Updated Date: October 1, 2026
 * @function buildUserFilter
 * @param {object} plan - The parsed query
 * @returns {object} The Mongo filter
 * @author Cesar
 */
const buildUserFilter = ({ search, role, status }) => {
    const filter = {};

    if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i');
        filter.$or = [{ firstName: pattern }, { lastName: pattern }, { email: pattern }];
    }

    if (role) filter.role = role;
    if (status) filter.status = status;

    return filter;
};

/**
 * DOCU: Builds the Mongo sort for a plan, using the id as a tiebreaker.
 * Last Updated Date: October 1, 2026
 * @function buildUserSort
 * @param {object} plan - The parsed query
 * @returns {object} The Mongo sort
 * @author Cesar
 */
const buildUserSort = ({ sortBy, sortDir }) => {
    const direction = SORT_DIRECTIONS[sortDir] ?? SORT_DIRECTIONS[DEFAULT_USER_SORT_DIRECTION];

    const field = COMPUTED_SORT_FIELDS[sortBy] ?? sortBy;

    return { [field]: direction, _id: 1 };
};

/**
 * DOCU: Returns one page of the users table.
 * Last Updated Date: October 1, 2026
 * @function listUsers
 * @param {object} query - The request's query string
 * @returns {Promise<object>} { rows, page, pageSize, total, pageCount, sortBy, sortDir }
 * @author Cesar
 */
const listUsers = async (query) => {
    const plan = parseUserQuery(query);

    const { rows, total } = await userModel.queryUsersPage({
        filter: buildUserFilter(plan),
        sort: buildUserSort(plan),
        skip: plan.skip,
        limit: plan.pageSize,
    });

    const pageCount = Math.max(FIRST_PAGE, Math.ceil(total / plan.pageSize));
    const page = Math.min(plan.page, pageCount);

    /* A clamped page needs a different window than the one first requested. */
    const offset = (page - FIRST_PAGE) * plan.pageSize;
    const window =
        offset === plan.skip
            ? rows
            : (
                  await userModel.queryUsersPage({
                      filter: buildUserFilter(plan),
                      sort: buildUserSort(plan),
                      skip: offset,
                      limit: plan.pageSize,
                  })
              ).rows;

    return {
        rows: window.map((row) => toAdminUser(row, row.taskCounts)),
        page,
        pageSize: plan.pageSize,
        total,
        pageCount,
        sortBy: plan.sortBy,
        sortDir: plan.sortDir,
    };
};

/**
 * DOCU: Resolves the account an admin is acting on, applying the self-lockout rule.
 * Last Updated Date: October 1, 2026
 * @function resolveTarget
 * @param {object} actor - The signed-in administrator
 * @param {string} userId - The account being acted on
 * @param {string} [action] - The verb, when a self-change must also be refused
 * @returns {Promise<object>} The target account
 * @author Cesar
 */
const resolveTarget = async (actor, userId, action) => {
    if (action) {
        assertNotSelfLockOut(actor, userId, action);
    }

    const target = await userModel.findById(userId);

    if (!target) {
        throw notFound('That user no longer exists');
    }

    return target;
};

/**
 * DOCU: Returns one user with their task counts.
 * Last Updated Date: October 1, 2026
 * @function getUser
 * @param {object} actor - The signed-in administrator
 * @param {string} userId - The account to read
 * @returns {Promise<object>} The admin row
 * @author Cesar
 */
const getUser = async (actor, userId) => {
    const target = await resolveTarget(actor, userId);

    const { rows } = await userModel.queryUsersPage({
        filter: { _id: target._id },
        sort: { _id: 1 },
        skip: 0,
        limit: 1,
    });

    return toAdminUser(target, rows[0]?.taskCounts);
};

/**
 * DOCU: Updates a user's profile fields.
 * Last Updated Date: October 1, 2026
 * @function updateUserProfile
 * @param {object} actor - The signed-in administrator
 * @param {string} userId - The account to edit
 * @param {object} data - The validated profile fields
 * @returns {Promise<object>} The updated admin row
 * @author Cesar
 */
const updateUserProfile = async (actor, userId, data) => {
    const target = await resolveTarget(actor, userId);

    const clash = await userModel.findByEmail(data.email);

    if (clash && String(clash._id) !== String(target._id)) {
        throw conflict(DUPLICATE_EMAIL_MESSAGE);
    }

    const updated = await userModel.updateUser(target._id, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
    });

    return toAdminUser(updated);
};

/**
 * DOCU: Changes a user's role.
 * Last Updated Date: October 1, 2026
 * @function updateUserRole
 * @param {object} actor - The signed-in administrator
 * @param {string} userId - The account to change
 * @param {object} data - The validated { role }
 * @returns {Promise<object>} The updated admin row
 * @author Cesar
 */
const updateUserRole = async (actor, userId, data) => {
    const target = await resolveTarget(actor, userId, 'demote');

    return toAdminUser(await userModel.updateUser(target._id, { role: data.role }));
};

/**
 * DOCU: Blocks or unblocks a user.
 * Last Updated Date: October 1, 2026
 * @function updateUserStatus
 * @param {object} actor - The signed-in administrator
 * @param {string} userId - The account to change
 * @param {object} data - The validated { status }
 * @returns {Promise<object>} The updated admin row
 * @author Cesar
 */
const updateUserStatus = async (actor, userId, data) => {
    const target = await resolveTarget(actor, userId, 'block');

    return toAdminUser(await userModel.updateUser(target._id, { status: data.status }));
};

/**
 * DOCU: Sets a new password for a user.
 * Last Updated Date: October 1, 2026
 * @function updateUserPassword
 * @param {object} actor - The signed-in administrator
 * @param {string} userId - The account to change
 * @param {object} data - The validated { password }
 * @returns {Promise<string>} The confirmation message
 * @author Cesar
 */
const updateUserPassword = async (actor, userId, data) => {
    const target = await resolveTarget(actor, userId);

    await userModel.updatePassword(target._id, await hashPassword(data.password));

    return PASSWORD_UPDATED_MESSAGE;
};

/**
 * DOCU: Deletes an account together with the tasks it owned.
 * Last Updated Date: October 1, 2026
 * @function deleteUser
 * @param {object} actor - The signed-in administrator
 * @param {string} userId - The account to delete
 * @returns {Promise<{_id: string, removedTasks: number}>} The deleted id and task count
 * @author Cesar
 */
const deleteUser = async (actor, userId) => {
    const target = await resolveTarget(actor, userId, 'delete');

    const removedTasks = await taskModel.deleteTasksByUser(target._id);
    await userModel.deleteUser(target._id);

    return { _id: String(target._id), removedTasks };
};

export {
    USER_SORT_FIELDS,
    SORT_DIRECTIONS,
    toAdminUser,
    getStats,
    listUsers,
    getUser,
    updateUserProfile,
    updateUserRole,
    updateUserStatus,
    updateUserPassword,
    deleteUser,
};

