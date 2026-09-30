import dotenv from 'dotenv';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { DEFAULT_PORT } from './constants/env.js';

dotenv.config();

/* Connect before listening, so the API is never reachable with no database behind it. */
await connectDB();

const PORT = process.env.PORT || DEFAULT_PORT;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

/**
 * DOCU: Closes the server and the database connection on a clean shutdown.
 * Last Updated Date: October 1, 2026
 * @function shutdown
 * @param {string} signal - The signal that triggered the shutdown
 * @returns {Promise<void>} Resolves once the process is exiting
 * @author Cesar
 */
const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down`);
    server.close();
    await disconnectDB();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default server;