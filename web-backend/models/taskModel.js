import Task from '../schemas/taskSchema.js';
import { BOARDS, emptyTaskCounts } from '../constants/boards.js';

/**
 * DOCU: Returns every task of one user, in board order.
 * Last Updated Date: October 1, 2026
 * @function findByUser
 * @param {string} userId - The task owner
 * @returns {Promise<object[]>} The user's tasks
 * @author Cesar
 */
const findByUser = async (userId) =>
    Task.find({ userId }).sort({ status: 1, order: 1, createdAt: 1 }).lean();

/**
 * DOCU: Returns one task, but only if that user owns it.
 * Last Updated Date: October 1, 2026
 * @function findOwnedById
 * @param {string} taskId - The task id
 * @param {string} userId - The task owner
 * @returns {Promise<object|null>} The task, or null
 * @author Cesar
 */
const findOwnedById = async (taskId, userId) => Task.findOne({ _id: taskId, userId }).lean();

/**
 * DOCU: Counts the tasks on a board, used to append a new one at the end.
 * Last Updated Date: October 1, 2026
 * @function countOnBoard
 * @param {string} userId - The task owner
 * @param {string} status - The board name
 * @returns {Promise<number>} The number of tasks on the board
 * @author Cesar
 */
const countOnBoard = async (userId, status) => Task.countDocuments({ userId, status });

/**
 * DOCU: Creates a task.
 * Last Updated Date: October 1, 2026
 * @function createTask
 * @param {object} task - The task fields
 * @returns {Promise<object>} The created task
 * @author Cesar
 */
const createTask = async (task) => Task.create(task);

/**
 * DOCU: Applies a set of fields to a task the caller owns.
 * Last Updated Date: October 1, 2026
 * @function updateTask
 * @param {string} taskId - The task id
 * @param {string} userId - The task owner
 * @param {object} updates - The fields to write
 * @returns {Promise<object|null>} The updated task, or null
 * @author Cesar
 */
const updateTask = async (taskId, userId, updates) =>
    Task.findOneAndUpdate({ _id: taskId, userId }, updates, {
        returnDocument: 'after',
        runValidators: true,
    }).lean();

/**
 * DOCU: Removes a task the caller owns.
 * Last Updated Date: October 1, 2026
 * @function deleteTask
 * @param {string} taskId - The task id
 * @param {string} userId - The task owner
 * @returns {Promise<object|null>} The removed task, or null
 * @author Cesar
 */
const deleteTask = async (taskId, userId) =>
    Task.findOneAndDelete({ _id: taskId, userId }).lean();

/**
 * DOCU: Rewrites a board's order so it stays a dense sequence.
 * Last Updated Date: October 1, 2026
 * @function rewriteBoardOrder
 * @param {string} userId - The task owner
 * @param {string} status - The board name
 * @param {Array<string>} orderedIds - The task ids in their new order
 * @returns {Promise<void>} Resolves once every order is written
 * @author Cesar
 */
const rewriteBoardOrder = async (userId, status, orderedIds) => {
    await Promise.all(
        orderedIds.map((id, index) =>
            Task.updateOne({ _id: id, userId }, { $set: { order: index } })
        )
    );
};

/**
 * DOCU: Moves a card to a board and position, then renumbers both boards.
 * Last Updated Date: October 1, 2026
 * @function moveTask
 * @param {string} userId - The task owner
 * @param {string} taskId - The task being moved
 * @param {string} newStatus - The destination board
 * @param {number} [newIndex] - The position; the end of the board when absent
 * @returns {Promise<object|null>} The moved task, or null
 * @author Cesar
 */
const moveTask = async (userId, taskId, newStatus, newIndex) => {
    const previous = await Task.findOne({ _id: taskId, userId }).lean();
    if (!previous) return null;

    const previousStatus = previous.status;

    const destination = await Task.find({ userId, status: newStatus, _id: { $ne: taskId } })
        .sort({ order: 1, createdAt: 1 })
        .lean();

    const target = Math.max(0, Math.min(newIndex ?? destination.length, destination.length));
    const reorderedIds = destination.map((task) => task._id);
    reorderedIds.splice(target, 0, taskId);

    await rewriteBoardOrder(userId, newStatus, reorderedIds);
    await Task.updateOne({ _id: taskId, userId }, { $set: { status: newStatus } });

    /* A card that changed board leaves a hole in the one it came from. */
    if (previousStatus !== newStatus) {
        const source = await Task.find({ userId, status: previousStatus })
            .sort({ order: 1, createdAt: 1 })
            .lean();

        await rewriteBoardOrder(userId, previousStatus, source.map((task) => task._id));
    }

    return Task.findOne({ _id: taskId, userId }).lean();
};

/**
 * DOCU: Counts tasks per board in a single aggregation.
 * Last Updated Date: October 1, 2026
 * @function getTaskStats
 * @returns {Promise<{total: number, todo: number, ongoing: number, done: number}>} The counts
 * @author Cesar
 */
const getTaskStats = async () => {
    const rows = await Task.aggregate([
        { $match: { status: { $in: BOARDS } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    /* Start zeroed, so an empty collection still returns every key. */
    const counts = emptyTaskCounts();

    for (const { _id: status, count } of rows) {
        counts[status] = count;
        counts.total += count;
    }

    return counts;
};

/**
 * DOCU: Removes every task belonging to a user.
 * Last Updated Date: October 1, 2026
 * @function deleteTasksByUser
 * @param {string} userId - The task owner
 * @returns {Promise<number>} How many tasks were removed
 * @author Cesar
 */
const deleteTasksByUser = async (userId) => {
    const result = await Task.deleteMany({ userId });
    return result.deletedCount ?? 0;
};

export {
    findByUser,
    findOwnedById,
    countOnBoard,
    createTask,
    updateTask,
    deleteTask,
    rewriteBoardOrder,
    moveTask,
    getTaskStats,
    deleteTasksByUser,
};