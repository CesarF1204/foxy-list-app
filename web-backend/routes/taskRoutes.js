import express from "express";
const router = express.Router();

import {
    getUserTasks,
    createTask,
    moveTask,
    updateTask,
    deleteTask,
} from "../controllers/taskController.js";

// Get all Tasks of a User
router.get("/", getUserTasks);

// Create a task for a User
router.post("/", createTask);

// Change status of a Task
router.put("/move", moveTask);

// Delete a Task
router.route("/:id").patch(updateTask).delete(deleteTask);

export default router;