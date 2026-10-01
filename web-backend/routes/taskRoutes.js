import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import {
    getAllTasks,
    getTaskById,
    createTask,
    moveTask,
    updateTask,
    deleteTask,
} from '../controllers/taskController.js';

/** Every task route needs a signed-in user, so the middleware guards the whole router. */
const router = express.Router();

router.use(authMiddleware);

router.get('/', asyncHandler(getAllTasks));

router.post('/', asyncHandler(createTask));

/** Declared before /:id so "move" is never captured as an id. */
router.put('/move', asyncHandler(moveTask));

router.get('/:id', asyncHandler(getTaskById));
router.patch('/:id', asyncHandler(updateTask));
router.delete('/:id', asyncHandler(deleteTask));

export default router;