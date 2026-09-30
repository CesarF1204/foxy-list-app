import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import taskRoutes from "./taskRoutes.js";

const apiRoutes = (app) => {
  // Mount all authentication-related routes under /api.
  // This includes login, register, validate_token, logout, etc.
  app.use("/api/auth", authRoutes);

  /**
   * Mount user related routes
   * Use authMiddleware to authenticate the user
   */
  app.use("/api/user", userRoutes);

  // Mounts all task-related routes under the /api/tasks endpoint.
  app.use("/api/tasks", taskRoutes);
};

export default apiRoutes;
