import jwt from "jsonwebtoken";
import Task from "../models/Task.js";
import User from "../models/User.js";

/**
 * Returns all tasks belonging to the authenticated user.
 * Authentication is handled via the `session` cookie containing a JWT.
 */
export const getUserTasks = async (req, res) => {
    try {
        const token = req.cookies.session;
        if (!token) return res.status(401).json({ message: "Not authenticated" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.sub);
        if (!user) return res.status(401).json({ message: "Invalid token" });

        const tasks = await Task.find({ userId: user._id });
        return res.json({ tasks });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * Creates a new task for the authenticated user.
 * Tasks are ordered within their board based on existing items.
 */
export const createTask = async (req, res) => {
    try {
        const token = req.cookies.session;
        if (!token) return res.status(401).json({ message: "Not authenticated" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.sub);
        if (!user) return res.status(401).json({ message: "Invalid token" });

        const { title, description } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Title is required" });
        }

        // Determine the next order index for the "todo" board
        const siblings = await Task.find({ userId: user._id, status: "todo" });

        const task = await Task.create({
            userId: user._id,
            title: title.trim(),
            description: description?.trim() ?? "",
            status: "todo",
            order: siblings.length,
            createdAt: new Date().toISOString()
        });

        return res.json({ task });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * Moves a task to a different board or position.
 * Handles reordering within the target board and normalizing the old board.
 */
export const moveTask = async (req, res) => {
    try {
        const token = req.cookies.session;
        if (!token) return res.status(401).json({ message: "Not authenticated" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.sub);
        if (!user) return res.status(401).json({ message: "Invalid token" });

        const { taskId, newStatus, newIndex } = req.body;
        if (!["todo", "ongoing", "done"].includes(newStatus)) {
            return res.status(400).json({ message: "Unknown board" });
        }

        const task = await Task.findOne({ _id: taskId, userId: user._id });
        if (!task) return res.status(404).json({ message: "Task not found" });

        const previousStatus = task.status;

        // Build the target board list excluding the moving task
        const targetBoardTasks = await Task.find({
            userId: user._id,
            status: newStatus,
            _id: { $ne: taskId }
        }).sort({ order: 1 });

        // Insert the task at the requested index
        const insertIndex = Math.max(0, Math.min(newIndex ?? targetBoardTasks.length, targetBoardTasks.length));
        targetBoardTasks.splice(insertIndex, 0, task);

        // Reassign order values in the target board
        for (let i = 0; i < targetBoardTasks.length; i++) {
            targetBoardTasks[i].order = i;
            await targetBoardTasks[i].save();
        }

        // Update the task's board
        task.status = newStatus;
        await task.save();

        // Normalize the old board if the task moved between boards
        if (previousStatus !== newStatus) {
            const oldBoardTasks = await Task.find({
                userId: user._id,
                status: previousStatus
            }).sort({ order: 1 });

            for (let i = 0; i < oldBoardTasks.length; i++) {
                oldBoardTasks[i].order = i;
                await oldBoardTasks[i].save();
            }
        }

        return res.json({ task });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * Updates a task's title or description.
 * Only fields provided in the request body are modified.
 */
export const updateTask = async (req, res) => {
    try {
        const token = req.cookies.session;
        if (!token) return res.status(401).json({ message: "Not authenticated" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.sub);
        if (!user) return res.status(401).json({ message: "Invalid token" });

        const task = await Task.findOne({ _id: req.params.id, userId: user._id });
        if (!task) return res.status(404).json({ message: "Task not found" });

        const { title, description } = req.body;

        if (title !== undefined) {
            if (!title.trim()) {
                return res.status(400).json({ message: "Title cannot be empty" });
            }
            task.title = title.trim();
        }

        if (description !== undefined) {
            task.description = description.trim();
        }

        await task.save();
        return res.json({ task });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * Deletes a task and reorders remaining tasks in the same board.
 */
export const deleteTask = async (req, res) => {
    try {
        const token = req.cookies.session;
        if (!token) return res.status(401).json({ message: "Not authenticated" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.sub);
        if (!user) return res.status(401).json({ message: "Invalid token" });

        const task = await Task.findOne({ _id: req.params.id, userId: user._id });
        if (!task) return res.status(404).json({ message: "Task not found" });

        const removedStatus = task.status;

        await Task.deleteOne({ _id: task._id });

        // Reorder remaining tasks in the same board
        const siblings = await Task.find({
            userId: user._id,
            status: removedStatus
        }).sort({ order: 1 });

        for (let i = 0; i < siblings.length; i++) {
            siblings[i].order = i;
            await siblings[i].save();
        }

        return res.json({ _id: task._id });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};
