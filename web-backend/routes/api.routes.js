import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import taskRoutes from './taskRoutes.js';
import adminRoutes from './adminRoutes.js';

/**
 * DOCU: Mounts every router under its namespace.
 * Last Updated Date: October 1, 2026
 * @function apiRoutes
 * @param {object} app - The Express application
 * @returns {void} Registers the routers on the app
 * @author Kate, Updated by: Cesar
 */
const apiRoutes = (app) => {
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/admin', adminRoutes);
};

export default apiRoutes;