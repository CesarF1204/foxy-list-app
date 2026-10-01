import { req, check, checkStatus, createAndSignIn, state } from './helpers.js';

/** The suite must be run with the server already listening. */

/**
 * DOCU: Checks that every admin route refuses a non-admin and a stranger.
 * Last Updated Date: October 1, 2026
 * @function authorization
 * @param {object} context - { admin, plain } sessions
 * @returns {Promise<{routes: Array}>} The routes that were exercised
 * @author Cesar
 */
export const authorization = async ({ admin, plain }) => {
    console.log('\n--- ADMIN AUTHORIZATION ---');

    const routes = [
        ['GET', '/api/admin/stats'],
        ['GET', '/api/admin/users'],
        ['GET', `/api/admin/users/${plain.id}`],
        ['PATCH', `/api/admin/users/${plain.id}`],
        ['PUT', `/api/admin/users/${plain.id}/role`],
        ['PUT', `/api/admin/users/${plain.id}/status`],
        ['PUT', `/api/admin/users/${plain.id}/password`],
        ['DELETE', `/api/admin/users/${plain.id}`],
    ];

    const bodies = {
        PATCH: { firstName: 'Hijack', lastName: 'Attempt', email: 'hijack@foxylist.test' },
        PUT: { role: 'admin' },
    };

    for (const [method, path] of routes) {
        await checkStatus(
            `${method} ${path.split('?')[0]} as a plain user -> 403`,
            method,
            path,
            bodies[method],
            403,
            { jar: plain.jar }
        );
    }

    for (const [method, path] of routes) {
        await checkStatus(
            `${method} ${path.split('?')[0]} with no session -> 401`,
            method,
            path,
            bodies[method],
            401,
            { auth: false }
        );
    }

    /* A 403 must come before any lookup, so a non-admin cannot probe for real ids. */
    await checkStatus(
        'a plain user asking about a non-existent id also gets 403',
        'GET',
        '/api/admin/users/0123456789abcdef01234567',
        undefined,
        403,
        { jar: plain.jar }
    );

    return { routes };
};

/**
 * DOCU: Checks the dashboard statistics and that the totals reconcile.
 * Last Updated Date: October 1, 2026
 * @function statistics
 * @param {object} context - { admin, plain } sessions
 * @returns {Promise<{stats: object}>} The stats that were read
 * @author Cesar
 */
export const statistics = async ({ admin, plain }) => {
    console.log('\n--- ADMIN STATISTICS ---');

    const stats = await checkStatus(
        'read the dashboard stats -> 200',
        'GET',
        '/api/admin/stats',
        undefined,
        200,
        { jar: admin.jar }
    );

    check('stats report a user total', typeof stats.data?.stats?.users?.total, 'number');
    check('stats report active users', typeof stats.data?.stats?.users?.active, 'number');
    check('stats report blocked users', typeof stats.data?.stats?.users?.blocked, 'number');
    check('stats report an admin count', typeof stats.data?.stats?.users?.admins, 'number');

    const tasks = stats.data?.stats?.tasks;
    check('task stats reconcile with the boards', tasks?.total, tasks?.todo + tasks?.ongoing + tasks?.done);

    return { stats: stats.data?.stats };
};


/**
 * DOCU: Checks the users table: paging, search, filters and sorting.
 * Last Updated Date: October 1, 2026
 * @function usersTable
 * @param {object} context - { admin, plain } sessions
 * @returns {Promise<{users: object}>} The first page that was read
 * @author Cesar
 */
export const usersTable = async ({ admin, plain }) => {
    console.log('\n--- THE USERS TABLE ---');

    const page = await checkStatus(
        'list users -> 200',
        'GET',
        '/api/admin/users',
        undefined,
        200,
        { jar: admin.jar }
    );

    const users = page.data?.users;
    check('the table returns rows', Array.isArray(users?.rows), true);
    check('the table reports its total', typeof users?.total, 'number');
    check('the table reports a page count', typeof users?.pageCount, 'number');
    check('the table defaults to 5 per page', users?.pageSize, 5);
    check('the table starts on page 1', users?.page, 1);
    check(
        'the default sort is newest first',
        users?.sortBy === 'createdAt' && users?.sortDir === 'desc',
        true
    );

    /* A row must never carry a password, even for an admin. */
    check('no row carries a password', users.rows.some((row) => 'password' in row), false);

    const target = users.rows.find((row) => row._id === plain.id);
    check('the table finds the target user', typeof target, 'object');
    check('a row carries its task counts', typeof target?.taskCounts?.total, 'number');
    check(
        'a row reconciles its own counts',
        target?.taskCounts?.total,
        target?.taskCounts?.todo + target?.taskCounts?.ongoing + target?.taskCounts?.done
    );

    const single = await checkStatus(
        'read one user -> 200',
        'GET',
        `/api/admin/users/${plain.id}`,
        undefined,
        200,
        { jar: admin.jar }
    );
    check('the single user matches the row', single.data?.user?._id, plain.id);
    check('the single user never carries a password', single.data?.user?.password, undefined);

    await checkStatus(
        'read a user that does not exist -> 404',
        'GET',
        '/api/admin/users/0123456789abcdef01234567',
        undefined,
        404,
        { jar: admin.jar }
    );
    await checkStatus(
        'read a malformed user id -> 400',
        'GET',
        '/api/admin/users/nope',
        undefined,
        400,
        { jar: admin.jar }
    );

    console.log('\n--- SEARCH ---');

    const byEmail = await req('GET', `/api/admin/users?search=${plain.email}`, undefined, {
        jar: admin.jar,
    });
    check('searching by email finds exactly that user', byEmail.data?.users?.total, 1);
    check('the search hit is the right user', byEmail.data?.users?.rows?.[0]?._id, plain.id);

    const byName = await req('GET', '/api/admin/users?search=Test', undefined, { jar: admin.jar });
    check('searching by first name finds someone', byName.data?.users?.total > 0, true);

    const noMatch = await req('GET', '/api/admin/users?search=zzzznomatchzzzz', undefined, {
        jar: admin.jar,
    });
    check('a search with no matches returns an empty page, not an error', noMatch.status, 200);
    check('a search with no matches returns no rows', noMatch.data?.users?.rows?.length, 0);
    check('a search with no matches reports a total of 0', noMatch.data?.users?.total, 0);

    /* A regex metacharacter must be treated as text, not as a pattern. */
    const injected = await req('GET', '/api/admin/users?search=.*', undefined, { jar: admin.jar });
    check('a regex metacharacter in the search is escaped', injected.data?.users?.total, 0);

    console.log('\n--- FILTERS ---');

    const admins = await req('GET', '/api/admin/users?role=admin', undefined, { jar: admin.jar });
    check(
        'the role filter returns only admins',
        admins.data?.users?.rows?.every((row) => row.role === 'admin'),
        true
    );

    const plainOnly = await req('GET', '/api/admin/users?role=user', undefined, { jar: admin.jar });
    check(
        'the user filter returns only users',
        plainOnly.data?.users?.rows?.every((row) => row.role === 'user'),
        true
    );

    const active = await req('GET', '/api/admin/users?status=active', undefined, { jar: admin.jar });
    check(
        'the status filter returns only active accounts',
        active.data?.users?.rows?.every((row) => row.status === 'active'),
        true
    );

    /* An unknown filter value must not become a Mongo query. */
    const bogus = await req('GET', '/api/admin/users?role=superuser&status=deleted', undefined, {
        jar: admin.jar,
    });
    check('an unknown filter value is ignored, not trusted', bogus.status, 200);
    check(
        'an unknown role filter returns everyone',
        bogus.data?.users?.total,
        active.data?.users?.total
    );

    return { users };
};


/**
 * DOCU: Checks every management action, including the self-lockout rules.
 * Last Updated Date: October 1, 2026
 * @function management
 * @param {object} context - { admin, plain } sessions
 * @returns {Promise<{plain: object}>} The account that was edited
 * @author Cesar
 */
export const management = async ({ admin, plain }) => {
    console.log('\n--- EDITING A PROFILE ---');

    const edited = await checkStatus(
        'edit a profile -> 200',
        'PATCH',
        `/api/admin/users/${plain.id}`,
        { firstName: 'Renamed', lastName: 'Person', email: plain.email },
        200,
        { jar: admin.jar }
    );
    check('the rename is applied', edited.data?.user?.firstName, 'Renamed');
    check('a profile edit returns the task counts too', typeof edited.data?.user?.taskCounts?.total, 'number');

    /* The email is unique across accounts, case-insensitively. */
    await checkStatus(
        'editing to an email another account uses -> 409',
        'PATCH',
        `/api/admin/users/${plain.id}`,
        { firstName: 'Renamed', lastName: 'Person', email: admin.email },
        409,
        { jar: admin.jar }
    );
    await checkStatus(
        'editing to an invalid email -> 400',
        'PATCH',
        `/api/admin/users/${plain.id}`,
        { firstName: 'Renamed', lastName: 'Person', email: 'not-an-email' },
        400,
        { jar: admin.jar }
    );

    /* Role and status have their own endpoints, so a rename cannot smuggle one in. */
    await checkStatus(
        'editing a profile while sending a role -> 400',
        'PATCH',
        `/api/admin/users/${plain.id}`,
        { firstName: 'Renamed', lastName: 'Person', email: plain.email, role: 'admin' },
        400,
        { jar: admin.jar }
    );
    await checkStatus(
        'editing a profile while sending a status -> 400',
        'PATCH',
        `/api/admin/users/${plain.id}`,
        { firstName: 'Renamed', lastName: 'Person', email: plain.email, status: 'blocked' },
        400,
        { jar: admin.jar }
    );

    console.log('\n--- CHANGING A ROLE ---');

    const promoted = await checkStatus(
        'promote a user to admin -> 200',
        'PUT',
        `/api/admin/users/${plain.id}/role`,
        { role: 'admin' },
        200,
        { jar: admin.jar }
    );
    check('the promotion is applied', promoted.data?.user?.role, 'admin');

    const demoted = await checkStatus(
        'demote a user back -> 200',
        'PUT',
        `/api/admin/users/${plain.id}/role`,
        { role: 'user' },
        200,
        { jar: admin.jar }
    );
    check('the demotion is applied', demoted.data?.user?.role, 'user');

    await checkStatus(
        'setting a role that does not exist -> 400',
        'PUT',
        `/api/admin/users/${plain.id}/role`,
        { role: 'superuser' },
        400,
        { jar: admin.jar }
    );
    await checkStatus(
        'sending no role at all -> 400',
        'PUT',
        `/api/admin/users/${plain.id}/role`,
        {},
        400,
        { jar: admin.jar }
    );

    console.log('\n--- BLOCKING AND UNBLOCKING ---');

    const blocked = await checkStatus(
        'block a user -> 200',
        'PUT',
        `/api/admin/users/${plain.id}/status`,
        { status: 'blocked' },
        200,
        { jar: admin.jar }
    );
    check('the block is applied', blocked.data?.user?.status, 'blocked');

    /* A block must bite on the blocked user's next request, not at next sign-in. */
    await checkStatus(
        'a blocked user cannot reach their board -> 403',
        'GET',
        '/api/tasks',
        undefined,
        403,
        { jar: plain.jar }
    );
    await checkStatus(
        'a blocked user cannot validate their session -> 403',
        'GET',
        '/api/auth/validate_token',
        undefined,
        403,
        { jar: plain.jar }
    );
    await checkStatus(
        'a blocked user cannot sign in again -> 403',
        'POST',
        '/api/users/sign_in',
        { email: plain.email, password: plain.password },
        403,
        { auth: false }
    );

    const unblocked = await checkStatus(
        'unblock a user -> 200',
        'PUT',
        `/api/admin/users/${plain.id}/status`,
        { status: 'active' },
        200,
        { jar: admin.jar }
    );
    check('the unblock is applied', unblocked.data?.user?.status, 'active');

    const backIn = await req('GET', '/api/tasks', undefined, { jar: plain.jar });
    check('the unblocked user reaches their board again', backIn.status, 200);

    await checkStatus(
        'setting a status that does not exist -> 400',
        'PUT',
        `/api/admin/users/${plain.id}/status`,
        { status: 'deleted' },
        400,
        { jar: admin.jar }
    );

    console.log('\n--- SETTING A PASSWORD ---');

    const newPassword = 'brandnew123';

    const changed = await checkStatus(
        'set a new password -> 200',
        'PUT',
        `/api/admin/users/${plain.id}/password`,
        { password: newPassword },
        200,
        { jar: admin.jar }
    );
    check('the response carries no user', changed.data?.user, undefined);
    check('the response carries no password', changed.data?.password, undefined);

    await checkStatus(
        'the old password no longer works',
        'POST',
        '/api/users/sign_in',
        { email: plain.email, password: plain.password },
        401,
        { auth: false }
    );
    await checkStatus(
        'the new password works',
        'POST',
        '/api/users/sign_in',
        { email: plain.email, password: newPassword },
        200,
        { auth: false }
    );
    await checkStatus(
        'setting a password that is too short -> 400',
        'PUT',
        `/api/admin/users/${plain.id}/password`,
        { password: 'abc' },
        400,
        { jar: admin.jar }
    );

    /* Whitespace is refused, never trimmed: a silently trimmed password would
     * store one secret while the admin believed they had set another. */
    for (const [label, password] of [
        ['a leading space', ' brandnew123'],
        ['a trailing space', 'brandnew123 '],
        ['an internal space', 'brand new123'],
    ]) {
        await checkStatus(
            `setting a password with ${label} -> 400`,
            'PUT',
            `/api/admin/users/${plain.id}/password`,
            { password },
            400,
            { jar: admin.jar }
        );
    }

    /* The password in force is refused: this is the rule an admin cannot check
     * themselves, since they never see the account's current password. It is
     * compared against the stored hash, so neither value is sent or echoed. */
    const unchanged = await checkStatus(
        'setting the password that is already in force -> 400',
        'PUT',
        `/api/admin/users/${plain.id}/password`,
        { password: newPassword },
        400,
        { jar: admin.jar }
    );
    check(
        'the refusal names the field that was not allowed',
        String(unchanged.data?.message).toLowerCase().includes('different'),
        true
    );
    check('the refusal repeats neither password', JSON.stringify(unchanged.data).includes(newPassword), false);

    await checkStatus(
        'the password that was already in force still works after the refusal',
        'POST',
        '/api/users/sign_in',
        { email: plain.email, password: newPassword },
        200,
        { auth: false }
    );

    return { plain };
};

/**
 * DOCU: Checks the self-lockout rules and the delete cascade.
 * Last Updated Date: October 1, 2026
 * @function selfLockOutAndDelete
 * @param {object} context - { admin, plain } sessions
 * @returns {Promise<void>} Resolves once the checks have run
 * @author Cesar
 */
export const selfLockOutAndDelete = async ({ admin, plain }) => {
    console.log('\n--- SELF LOCKOUTS ---');

    /* An admin who could demote, block or delete themselves would lock everyone out. */
    await checkStatus(
        'an admin cannot demote themselves -> 400',
        'PUT',
        `/api/admin/users/${admin.id}/role`,
        { role: 'user' },
        400,
        { jar: admin.jar }
    );
    await checkStatus(
        'an admin cannot block themselves -> 400',
        'PUT',
        `/api/admin/users/${admin.id}/status`,
        { status: 'blocked' },
        400,
        { jar: admin.jar }
    );
    await checkStatus(
        'an admin cannot delete themselves -> 400',
        'DELETE',
        `/api/admin/users/${admin.id}`,
        undefined,
        400,
        { jar: admin.jar }
    );

    /* The admin is untouched by those attempts. */
    const stillAdmin = await req('GET', '/api/admin/stats', undefined, { jar: admin.jar });
    check('the admin still reaches the dashboard', stillAdmin.status, 200);

    console.log('\n--- DELETING A USER ---');

    /* Give the doomed user some tasks, so the cascade is observable. */
    for (const title of ['Doomed 1', 'Doomed 2', 'Doomed 3']) {
        await req('POST', '/api/tasks', { title }, { jar: plain.jar });
    }

    const before = await req('GET', '/api/tasks', undefined, { jar: plain.jar });
    check('the user has tasks before the delete', before.data?.tasks?.length, 3);

    const beforeStats = await req('GET', '/api/admin/stats', undefined, { jar: admin.jar });
    const tasksBefore = beforeStats.data?.stats?.tasks?.total;

    const deleted = await checkStatus(
        'delete a user -> 200',
        'DELETE',
        `/api/admin/users/${plain.id}`,
        undefined,
        200,
        { jar: admin.jar }
    );
    check('the deleted id comes back', deleted.data?._id, plain.id);

    await checkStatus(
        'the deleted user is gone -> 404',
        'GET',
        `/api/admin/users/${plain.id}`,
        undefined,
        404,
        { jar: admin.jar }
    );
    await checkStatus(
        "the deleted user's session no longer works -> 401",
        'GET',
        '/api/tasks',
        undefined,
        401,
        { jar: plain.jar }
    );

    /* The tasks go with the account, or the dashboard keeps counting orphans. */
    const afterStats = await req('GET', '/api/admin/stats', undefined, { jar: admin.jar });
    check(
        "the deleted user's tasks went with them",
        afterStats.data?.stats?.tasks?.total,
        tasksBefore - 3
    );

    const usersAfter = await req('GET', '/api/admin/users', undefined, { jar: admin.jar });
    check(
        'the table no longer lists the deleted user',
        usersAfter.data?.users?.rows?.some((row) => row._id === plain.id),
        false
    );

    console.log('\n--- STATISTICS RECONCILE ---');

    const users = afterStats.data?.stats?.users;
    check('the user total matches its own parts', users?.active + users?.blocked, users?.total);
    check('the admin count is at least the one signed in', users?.admins >= 1, true);
};

/* Allow the file to be run on its own, not only through tests/run.js */
if (process.argv[1]?.endsWith('api-admin.test.js')) {
    const admin = await createAndSignIn('root', 'admin');
    const plain = await createAndSignIn('member', 'plain');

    /* Promoted explicitly, so the file works on a fresh or an existing database. */
    const { connectDB, disconnectDB } = await import('../config/db.js');
    const { promote } = await import('./seed-admin.js');

    await connectDB();
    try {
        await promote(admin.email);
    } finally {
        await disconnectDB();
    }

    const context = { admin, plain };

    await authorization(context);
    await statistics(context);
    await usersTable(context);
    await management(context);
    await selfLockOutAndDelete(context);

    console.log(
        `\n===== ${state.checks - state.failures}/${state.checks} checks passed, ${state.failures} failed =====`
    );
    process.exit(state.failures ? 1 : 0);
}
