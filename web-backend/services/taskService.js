import * as taskModel from '../models/taskModel.js';
import { notFound } from '../helpers/errorHelper.js';
import { DEFAULT_BOARD } from '../constants/boards.js';
import { TASK_NOT_FOUND_MESSAGE } from '../constants/messages.js';

/**
 * DOCU: Converts a task to the shape the API returns.
 * Last Updated Date: October 1, 2026
 * @function toPublicTask
 * @param {object} task - The stored task
 * @returns {object} The task as the client reads it
 * @author Cesar
 */
const toPublicTask = (task) => ({
    _id: String(task._id),
    id: String(task._id),
    userId: String(task.userId),
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    order: task.order,
    createdAt: task.createdAt,
});

/**
 * DOCU: Returns every task of the signed-in user.
 * Last Updated Date: October 1, 2026
 * @function getAllTasks
 * @param {string} userId - The task owner
 * @returns {Promise<object[]>} The user's tasks
 * @author Cesar
 */
const getAllTasks = async (userId) => {
    const tasks = await taskModel.findByUser(userId);
    return tasks.map(toPublicTask);
};

/**
 * DOCU: Creates a task at the end of the default board.
 * Last Updated Date: October 1, 2026
 * @function createTask
 * @param {string} userId - The task owner
 * @param {object} data - The validated { title, description }
 * @returns {Promise<object>} The created task
 * @author Cesar
 */
const createTask = async (userId, data) => {
    const task = await taskModel.createTask({
        userId,
        title: data.title,
        description: data.description ?? '',
        status: DEFAULT_BOARD,
        order: await taskModel.countOnBoard(userId, DEFAULT_BOARD),
    });

    return toPublicTask(task);
};

/**
 * DOCU: Renames or re-describes a task. Only the fields sent are written.
 * Last Updated Date: October 1, 2026
 * @function updateTask
 * @param {string} userId - The task owner
 * @param {string} taskId - The task id
 * @param {object} data - The validated fields to change
 * @returns {Promise<object>} The updated task
 * @author Cesar
 */
const updateTask = async (userId, taskId, data) => {
    const updates = {};

    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;

    const task = await taskModel.updateTask(taskId, userId, updates);

    if (!task) {
        throw notFound(TASK_NOT_FOUND_MESSAGE);
    }

    return toPublicTask(task);
};

/**
 * DOCU: Deletes a task and closes the gap it leaves on its board.
 * Last Updated Date: October 1, 2026
 * @function deleteTask
 * @param {string} userId - The task owner
 * @param {string} taskId - The task id
 * @returns {Promise<{_id: string}>} The deleted id
 * @author Cesar
 */
const deleteTask = async (userId, taskId) => {
    const removed = await taskModel.deleteTask(taskId, userId);

    if (!removed) {
        throw notFound(TASK_NOT_FOUND_MESSAGE);
    }

    const remaining = await taskModel.findByUser(userId);
    const board = remaining
        .filter((task) => task.status === removed.status)
        .sort((a, b) => a.order - b.order || new Date(a.createdAt) - new Date(b.createdAt));

    await taskModel.rewriteBoardOrder(userId, removed.status, board.map((task) => task._id));

    return { _id: String(removed._id) };
};

/**
 * DOCU: Moves a task to another board or position.
 * Last Updated Date: October 1, 2026
 * @function moveTask
 * @param {string} userId - The task owner
 * @param {object} data - The validated { taskId, newStatus, newIndex }
 * @returns {Promise<object>} The moved task
 * @author Cesar
 */
const moveTask = async (userId, data) => {
    const task = await taskModel.moveTask(userId, data.taskId, data.newStatus, data.newIndex);

    if (!task) {
        throw notFound(TASK_NOT_FOUND_MESSAGE);
    }

    return toPublicTask(task);
};

/**
 * DOCU: Returns one task the caller owns.
 * Last Updated Date: October 1, 2026
 * @function getTaskById
 * @param {string} userId - The task owner
 * @param {string} taskId - The task id
 * @returns {Promise<object>} The task
 * @author Cesar
 */
const getTaskById = async (userId, taskId) => {
    const task = await taskModel.findOwnedById(taskId, userId);

    if (!task) {
        throw notFound(TASK_NOT_FOUND_MESSAGE);
    }

    return toPublicTask(task);
};

export { toPublicTask, getAllTasks, createTask, updateTask, deleteTask, moveTask, getTaskById };