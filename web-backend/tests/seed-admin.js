import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import * as userModel from '../models/userModel.js';
import { ADMIN_ROLE } from '../constants/roles.js';
import { OBJECT_ID_PATTERN } from '../constants/validation.js';

dotenv.config();

/**
 * DOCU: Looks an account up by id or by email.
 * Last Updated Date: October 1, 2026
 * @function identify
 * @param {string} value - An email address or a user id
 * @returns {Promise<object|null>} The account, or null
 * @author Cesar
 */
const identify = async (value) =>
    OBJECT_ID_PATTERN.test(value)
        ? await userModel.findById(value)
        : await userModel.findByEmail(value);

/**
 * DOCU: Promotes one account to administrator.
 * Last Updated Date: October 1, 2026
 * @function promote
 * @param {string} value - An email address or a user id
 * @returns {Promise<object|null>} The promoted account, or null if not found
 * @author Cesar
 */
const promote = async (value) => {
    const user = await identify(value);

    if (!user) {
        console.log(`  no account found for ${value}`);
        return null;
    }

    if (user.role === ADMIN_ROLE) {
        console.log(`  ${user.email} is already an administrator`);
        return user;
    }

    const updated = await userModel.updateUser(user._id, { role: ADMIN_ROLE });
    console.log(`  ${user.email} is now an administrator`);

    return updated;
};

/* Only do the work when run directly, not when imported by the test runner. */
if (process.argv[1]?.endsWith('seed-admin.js')) {
    const target = process.argv[2];

    if (!target) {
        console.error('Usage: node tests/seed-admin.js <email-or-id>');
        process.exit(1);
    }

    await connectDB();

    try {
        const promoted = await promote(target);
        if (!promoted) process.exitCode = 1;
    } catch (error) {
        console.error('Failed to promote the account:', error.message);
        process.exitCode = 1;
    } finally {
        await disconnectDB();
    }
}

export { promote };
