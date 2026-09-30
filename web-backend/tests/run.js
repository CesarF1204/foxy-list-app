import { state, createAndSignIn } from './helpers.js';
import { promote } from './seed-admin.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { run as auth, recovery } from './api-auth.test.js';
import { crud, board } from './api-tasks.test.js';
import {
    authorization,
    statistics,
    usersTable,
    management,
    selfLockOutAndDelete,
} from './api-admin.test.js';
import { run as integration, adminContract, errorContract } from './integration.test.js';

/**
 * DOCU: Runs every suite against a server that is already listening.
 * Last Updated Date: October 1, 2026
 * @function main
 * @returns {Promise<void>} Resolves once every suite has run
 * @author Cesar
 */
const main = async () => {
    console.log('===== Foxy List API test suite =====');
    console.log('Creating accounts...');

    const admin = await createAndSignIn('root', 'admin');
    const plain = await createAndSignIn('member', 'plain');

    console.log(`  admin candidate: ${admin.email}`);
    console.log(`  user:            ${plain.email}`);

    /* Promoted explicitly, so the run works on a fresh database and an existing one. */
    await connectDB();
    try {
        await promote(admin.email);
    } finally {
        await disconnectDB();
    }

    await auth();
    await recovery();

    /* The board suite needs the fixtures the CRUD suite creates. */
    await crud().then(board);

    const context = { admin, plain };
    await authorization(context);
    await statistics(context);
    await usersTable(context);
    await management(context);
    await selfLockOutAndDelete(context);

    /* Last, and against fresh accounts, so it sees the API as a first-time user would. */
    const contract = await integration();
    await adminContract();
    await errorContract(contract);

    console.log(
        `\n===== ${state.checks - state.failures}/${state.checks} checks passed, ${state.failures} failed =====`
    );

    process.exit(state.failures ? 1 : 0);
};

main().catch((error) => {
    console.error('\nTEST RUNNER ERROR:', error.message);
    console.error(error.stack);
    process.exit(2);
});