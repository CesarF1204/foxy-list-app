import * as taskService from '../services/taskService.js';
import { parseBody, parseId } from '../helpers/validationHelper.js';
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from '../utils/validationSchemas.js';
import { HTTP_STATUS } from '../constants/http.js';

/**
 * DOCU: Returns every task belonging to the signed-in user.
 * Last Updated Date: October 1, 2026
 * @function getAllTasks
 * @param {object} req - Request, carrying the user from authMiddleware
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { tasks }
 * @author Cesar
 */
export const getAllTasks = async (req, res) => {
    res.status(HTTP_STATUS.OK).json({ tasks: await taskService.getAllTasks(req.user._id) });
};

/**
 * DOCU: Returns one task owned by the signed-in user.
 * Last Updated Date: October 1, 2026
 * @function getTaskById
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { task }
 * @author Cesar
 */
export const getTaskById = async (req, res) => {
    const taskId = parseId('Task id', req.params.id);

    res.status(HTTP_STATUS.OK).json({ task: await taskService.getTaskById(req.user._id, taskId) });
};

/**
 * DOCU: Creates a task on the default board for the signed-in user.
 * Last Updated Date: October 1, 2026
 * @function createTask
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { task }
 * @author John Vincent, Updated by: Cesar
 */
export const createTask = async (req, res) => {
    const data = parseBody(req.body, createTaskSchema);

    res.status(HTTP_STATUS.CREATED).json({ task: await taskService.createTask(req.user._id, data) });
};

/**
 * DOCU: Moves a task to another board or position.
 * Last Updated Date: October 1, 2026
 * @function moveTask
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { task }
 * @author John Vincent, Updated by: Cesar
 */
export const moveTask = async (req, res) => {
    const data = parseBody(req.body, moveTaskSchema);

    res.status(HTTP_STATUS.OK).json({ task: await taskService.moveTask(req.user._id, data) });
};

/**
 * DOCU: Renames or re-describes a task.
 * Last Updated Date: October 1, 2026
 * @function updateTask
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with { task }
 * @author John Vincent, Updated by: Cesar
 */
export const updateTask = async (req, res) => {
    const taskId = parseId('Task id', req.params.id);
    const data = parseBody(req.body, updateTaskSchema);

    res.status(HTTP_STATUS.OK).json({ task: await taskService.updateTask(req.user._id, taskId, data) });
};

/**
 * DOCU: Deletes a task owned by the signed-in user.
 * Last Updated Date: October 1, 2026
 * @function deleteTask
 * @param {object} req - Request
 * @param {object} res - Response
 * @returns {Promise<void>} Responds with the deleted id
 * @author John Vincent, Updated by: Cesar
 */
export const deleteTask = async (req, res) => {
    const taskId = parseId('Task id', req.params.id);

    res.status(HTTP_STATUS.OK).json(await taskService.deleteTask(req.user._id, taskId));
};