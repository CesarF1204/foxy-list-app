import mongoose from 'mongoose';
import { BOARDS, DEFAULT_BOARD } from '../constants/boards.js';
import { TITLE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH } from '../constants/validation.js';

/**
 * DOCU: Defines the schema for a task <br>
 * It specifies the fields and their validation rules for a task record <br>
 * Last Updated Date: October 1, 2026 <br>
 * @constant taskSchema
 * @type {Schema}
 * @description Defines the Mongoose schema for tasks, covering the owning user, the card title and description, the board it sits on, and its position within that board.
 * @property {ObjectId} userId - The id of the user who owns the task. Required and indexed, so every task query can be scoped to one owner.
 * @property {String} title - The task title. Required, trimmed, and between 1 and 200 characters.
 * @property {String} description - Optional notes about the task. Trimmed, defaults to an empty string, and limited to 2000 characters.
 * @property {String} status - The board the task sits on. Must be one of BOARDS, defaults to DEFAULT_BOARD, and is indexed.
 * @property {Number} order - The position of the task within its board. Defaults to 0 and cannot be negative.
 * @property {Date} createdAt - Timestamp of when the task was created (automatically added by Mongoose).
 * @property {Date} updatedAt - Timestamp of when the task was last updated (automatically added by Mongoose).
 * @author John Vincent, Updated by: Cesar
 */
const taskSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'A task must belong to a user'],
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            minlength: [1, 'Title is required'],
            maxlength: [TITLE_MAX_LENGTH, `Title must be under ${TITLE_MAX_LENGTH} characters`],
        },
        description: {
            type: String,
            trim: true,
            default: '',
            maxlength: [
                DESCRIPTION_MAX_LENGTH,
                `Description must be under ${DESCRIPTION_MAX_LENGTH} characters`,
            ],
        },
        status: {
            type: String,
            enum: {
                values: BOARDS,
                message: `Status must be one of: ${BOARDS.join(', ')}`,
            },
            default: DEFAULT_BOARD,
            index: true,
        },
        order: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

/** Backs the query that loads one user's board in display order. */
taskSchema.index({ userId: 1, status: 1, order: 1 });

export default mongoose.model('Task', taskSchema);