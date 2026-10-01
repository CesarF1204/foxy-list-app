import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import taskRoutes from './taskRoutes.js';
import adminRoutes from './adminRoutes.js';

/** Mounts every router under its namespace. */
const apiRoutes = (app) => {
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/admin', adminRoutes);
};

export default apiRoutes;