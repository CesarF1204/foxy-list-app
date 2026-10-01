import { apiRequest } from "./client";

/** Fetches every task belonging to the signed-in user. */
const getAllTasks = () => apiRequest("/api/tasks");

/** Creates a task. New tasks always land in the To Do board. */
const createTask = (form_data) => apiRequest("/api/tasks", { method: "POST", body: form_data });

/** Moves a task to another board and/or position. */
const moveTask = ({ taskId, newStatus, newIndex }) =>
    apiRequest("/api/tasks/move", { method: "PUT", body: { taskId, newStatus, newIndex } });

/** Updates a task's title and description. */
const editTask = ({ taskId, title, description }) =>
    apiRequest(`/api/tasks/${taskId}`, { method: "PATCH", body: { title, description } });

/** Permanently removes a task. */
const deleteTask = (taskId) => apiRequest(`/api/tasks/${taskId}`, { method: "DELETE" });

export { getAllTasks, createTask, moveTask, editTask, deleteTask };