import mongoose from "mongoose";

/**
 * Task Schema
 * Represents an individual task created by a user in the Todo application.
 * Each task belongs to a specific user and is organized into boards
 * (todo, ongoing, done) with an order index for drag‑and‑drop positioning.
 *
 * Collection: tasks
 * Fields:
 *
 * @property {ObjectId} userId
 * Reference to the user who owns the task.
 * * Required
 * * Must reference a valid User document
 *
 * @property {String} title
 * The main title or name of the task.
 * * Required
 * * Should be trimmed before saving
 *
 * @property {String} description
 * Additional details or notes about the task.
 * * Optional
 * * Can be empty
 *
 * @property {String} status
 * Indicates which board the task belongs to.
 * * Required
 * * Allowed values: "todo", "ongoing", "done"
 * * Whitespace is trimmed
 *
 * @property {Number} order
 * Determines the task's position within its board.
 * * Optional
 * * Must be >= 0
 * * Used for drag‑and‑drop sorting
 *
 * @property {Date} createdAt
 * Timestamp when the task was created.
 * * Defaults to the current date/time
 *
 * Timestamps:
 * Mongoose automatically adds:
 * * createdAt: Date when the task was created
 * * updatedAt: Date when the task was last updated
 */

const taskSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            min: 0,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        status: {
            type: String,
            required: true,
            trim: true,
        },
        order: {
            type: Number,
            min: 0,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Task", taskSchema);