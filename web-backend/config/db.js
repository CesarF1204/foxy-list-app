import mongoose from 'mongoose';

/**
 * DOCU: Reads an environment variable the process cannot start without.
 * Last Updated Date: October 1, 2026
 * @function requireEnv
 * @param {string} name - The variable to read
 * @returns {string} The value
 * @author Cesar
 */
const requireEnv = (name) => {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(
            `[config] ${name} is not set. Copy .env.example to .env and fill it in.`
        );
    }

    return value;
};

/**
 * DOCU: Connects to MongoDB. Exits the process if the connection fails.
 * Last Updated Date: October 1, 2026
 * @function connectDB
 * @returns {Promise<import('mongoose').Connection>} The open connection
 * @author Cesar
 */
const connectDB = async () => {
    try {
        const connection = await mongoose.connect(requireEnv('MONGODB_URI'));
        console.log(`Database connection successful (${connection.connection.host})`);
        return connection;
    } catch (error) {
        console.error('Failed to connect to database:', error.message);
        process.exit(1);
    }
};

/**
 * DOCU: Closes the database connection.
 * Last Updated Date: October 1, 2026
 * @function disconnectDB
 * @returns {Promise<void>} Resolves once the connection is closed
 * @author Cesar
 */
const disconnectDB = async () => {
    await mongoose.connection.close();
};

export { connectDB, disconnectDB, requireEnv };