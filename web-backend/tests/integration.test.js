import { req, check, checkStatus, createAndSignIn, uniqueEmail, state } from './helpers.js';

/** Replays the exact requests the frontend makes and checks the keys it reads. */

/** Checks the frontend contract for auth and tasks. */
const run = async () => {
    console.log('\n--- FRONTEND CONTRACT: auth.js and users.js ---');

    /** auth.js: validateToken() -> GET /api/auth/validate_token */
    const account = await createAndSignIn('contract', 'contract');

    const session = await req('GET', '/api/auth/validate_token', undefined, {
        jar: 'contract',
    });

    /** AppContext.jsx reads data.user and derives isAuthenticated from it. */
    check('the frontend can read data.user', typeof session.data?.user, 'object');

    /** The navbar and the route guards read these off the session user. */
    for (const key of ['_id', 'firstName', 'lastName', 'email', 'role', 'status']) {
        check(`the session user carries ${key}`, typeof session.data?.user?.[key], 'string');
    }
    check('the session user has no password field', 'password' in (session.data?.user ?? {}), false);

    /** users.js: logOut() -> POST /api/users/logout */
    const out = await req('POST', '/api/users/logout', undefined, { jar: 'contract' });
    check('the frontend can sign out', out.status, 200);

    /** Signing out has to actually end the session. */
    const afterOut = await req('GET', '/api/auth/validate_token', undefined, {
        jar: 'contract',
    });
    check('a signed-out session no longer validates', afterOut.status, 401);

    /** Sign back in, as the app does before showing the board. */
    await req(
        'POST',
        '/api/users/sign_in',
        { email: account.email, password: account.password },
        { jar: 'contract', auth: false }
    );

    /** users.js: registerUser(form) -> POST /api/users/register */
    const registered = await checkStatus(
        'the frontend can register',
        'POST',
        '/api/users/register',
        {
            firstName: 'Contract',
            lastName: 'Tester',
            email: uniqueEmail('contract'),
            password: 'secret123',
        },
        201,
        { auth: false }
    );
    check('registration returns a user the app can read', typeof registered.data?.user?._id, 'string');

    /** RecoverPassword.jsx reads the message, so it must be a string. */
    const forgot = await req(
        'POST',
        '/api/users/forgot_password',
        { email: account.email },
        { auth: false }
    );
    check('the recovery form can read a message', typeof forgot.data?.message, 'string');

    console.log('\n--- FRONTEND CONTRACT: tasks.js ---');

    /** useTasks.js sends { title, description } and reads data.tasks. */
    const created = await checkStatus(
        'the frontend can create a task',
        'POST',
        '/api/tasks',
        { title: 'Contract task', description: 'written by the contract test' },
        201,
        { jar: 'contract' }
    );

    /** useTasks.js reads _id, status and order off every task. */
    const task = created.data?.task;
    for (const key of ['_id', 'userId', 'title', 'description', 'status', 'order']) {
        check(`a task carries ${key}`, typeof task?.[key] !== 'undefined', true);
    }

    const list = await req('GET', '/api/tasks', undefined, { jar: 'contract' });
    check('the board loads as an array', Array.isArray(list.data?.tasks), true);

    /** getBoardTasks() groups by status and sorts on order, so both must exist. */
    const board = list.data.tasks.filter((item) => item.status === 'todo');
    check('the To Do column can be built', board.length > 0, true);

    /** tasks.js: moveTask({ taskId, newStatus, newIndex }) */
    const moved = await checkStatus(
        'the frontend can move a task',
        'PUT',
        '/api/tasks/move',
        { taskId: task._id, newStatus: 'ongoing', newIndex: 0 },
        200,
        { jar: 'contract' }
    );
    check('the move is confirmed with the new board', moved.data?.task?.status, 'ongoing');

    /** tasks.js: editTask({ taskId, title, description }) */
    const edited = await checkStatus(
        'the frontend can edit a task',
        'PATCH',
        `/api/tasks/${task._id}`,
        { title: 'Contract task edited', description: 'now with an edit' },
        200,
        { jar: 'contract' }
    );
    check('the edit is confirmed', edited.data?.task?.title, 'Contract task edited');

    /** tasks.js: deleteTask(taskId) */
    const deleted = await checkStatus(
        'the frontend can delete a task',
        'DELETE',
        `/api/tasks/${task._id}`,
        undefined,
        200,
        { jar: 'contract' }
    );
    check('the delete is confirmed with the id', deleted.data?._id, task._id);

    return { account };
};

export { run };

/** Checks the frontend contract for the admin endpoints. */
export const adminContract = async () => {
    console.log('\n--- FRONTEND CONTRACT: admin.js ---');

    /** Reuse the admin suite's promotion rather than writing the role update again. */
    const admin = await createAndSignIn('contractadmin', 'contractadmin');
    const { connectDB, disconnectDB } = await import('../config/db.js');
    const { promote } = await import('./seed-admin.js');

    await connectDB();
    try {
        await promote(admin.email);
    } finally {
        await disconnectDB();
    }

    /** admin.js: getAdminStats() -> GET /api/admin/stats */
    const stats = await checkStatus(
        'the overview can load its stats',
        'GET',
        '/api/admin/stats',
        undefined,
        200,
        { jar: 'contractadmin' }
    );

    /** constants/admin.js STAT_CARDS read these exact paths. */
    check('stats.users.total is a number', typeof stats.data?.stats?.users?.total, 'number');
    check('stats.users.active is a number', typeof stats.data?.stats?.users?.active, 'number');
    check('stats.users.blocked is a number', typeof stats.data?.stats?.users?.blocked, 'number');
    check('stats.tasks.total is a number', typeof stats.data?.stats?.tasks?.total, 'number');

    /** TASK_STAT_CARDS read stats.tasks.<board> for each of the three boards. */
    for (const boardName of ['todo', 'ongoing', 'done']) {
        check(
            `stats.tasks.${boardName} is a number`,
            typeof stats.data?.stats?.tasks?.[boardName],
            'number'
        );
    }

    /** admin.js: getAdminUsers(params) with the exact keys useUserFilters sends. */
    const query = new URLSearchParams({
        search: '',
        role: '',
        status: '',
        sortBy: 'createdAt',
        sortDir: 'desc',
        page: '1',
        pageSize: '10',
    });

    const table = await checkStatus(
        'the users table can load',
        'GET',
        `/api/admin/users?${query.toString()}`,
        undefined,
        200,
        { jar: 'contractadmin' }
    );

    const users = table.data?.users;
    /** AdminUsers.jsx paginates with these; useUserFilters sorts with these. */
    for (const key of ['rows', 'page', 'pageSize', 'total', 'pageCount', 'sortBy', 'sortDir']) {
        check(`the users table carries ${key}`, typeof users?.[key] !== 'undefined', true);
    }

    /** UsersTable.jsx and UserDrawer.jsx read these off every row. */
    const row = users?.rows?.[0];
    for (const key of ['_id', 'firstName', 'lastName', 'email', 'role', 'status', 'createdAt']) {
        check(`a user row carries ${key}`, typeof row?.[key] !== 'undefined', true);
    }
    check('a user row has no password', 'password' in (row ?? {}), false);

    /** TaskCountsCell and UserDrawer read taskCounts.total, .todo, .ongoing, .done. */
    for (const key of ['total', 'todo', 'ongoing', 'done']) {
        check(`a user row carries taskCounts.${key}`, typeof row?.taskCounts?.[key], 'number');
    }

    /** The pager only ever offers 5, 10 and 25 per page. */
    for (const size of ['5', '25']) {
        const sized = await req('GET', `/api/admin/users?pageSize=${size}`, undefined, {
            jar: 'contractadmin',
        });
        check(`pageSize=${size} is accepted`, sized.data?.users?.pageSize, Number(size));
    }

    /** admin.js: getAdminUser(userId) */
    const single = await checkStatus(
        'the drawer can load one user',
        'GET',
        `/api/admin/users/${row._id}`,
        undefined,
        200,
        { jar: 'contractadmin' }
    );
    check(
        'the drawer user carries taskCounts',
        typeof single.data?.user?.taskCounts?.total,
        'number'
    );

    /**
     * The four write endpoints. useAdminActions.js caches the row the first three return, so
     * each must answer with a user.
     */
    /** The target must not be the signed-in admin: the API refuses that. */
    const { id: target } = await createAndSignIn('contracttarget', 'contracttarget');

    /** A valid address; the generated one carries an underscore the email rule rejects. */
    const newEmail = uniqueEmail('renamed');

    const profile = await checkStatus(
        'the drawer can save a profile',
        'PATCH',
        `/api/admin/users/${target}`,
        { firstName: 'Rowan', lastName: 'Target', email: newEmail },
        200,
        { jar: 'contractadmin' }
    );
    check('the saved profile comes back as a user', typeof profile.data?.user?._id, 'string');
    check('the saved profile carries the new name', profile.data?.user?.firstName, 'Rowan');
    check('the saved profile carries the new email', profile.data?.user?.email, newEmail);

    const roleChange = await checkStatus(
        'the drawer can change a role',
        'PUT',
        `/api/admin/users/${target}/role`,
        { role: 'admin' },
        200,
        { jar: 'contractadmin' }
    );
    check('the role change comes back as a user', typeof roleChange.data?.user?.role, 'string');
    check('the role change is applied', roleChange.data?.user?.role, 'admin');

    const statusChange = await checkStatus(
        'the drawer can change a status',
        'PUT',
        `/api/admin/users/${target}/status`,
        { status: 'blocked' },
        200,
        { jar: 'contractadmin' }
    );
    check(
        'the status change comes back as a user',
        typeof statusChange.data?.user?.status,
        'string'
    );
    check('the status change is applied', statusChange.data?.user?.status, 'blocked');

    /** A drawer left open must reflect a change made elsewhere. */
    const reread = await req('GET', `/api/admin/users/${target}`, undefined, {
        jar: 'contractadmin',
    });
    check('the change is visible on a re-read', reread.data?.user?.status, 'blocked');

    /** useAdminActions.js reads only the message from the password endpoint. */
    const password = await checkStatus(
        'the drawer can set a password',
        'PUT',
        `/api/admin/users/${target}/password`,
        { password: 'contract123' },
        200,
        { jar: 'contractadmin' }
    );
    check('the password endpoint returns a message', typeof password.data?.message, 'string');
    check('the password endpoint returns no user', password.data?.user, undefined);

    /** admin.js: deleteAdminUser(userId) */
    const deleted = await checkStatus(
        'the drawer can delete a user',
        'DELETE',
        `/api/admin/users/${target}`,
        undefined,
        200,
        { jar: 'contractadmin' }
    );
    check('the delete confirms the id', deleted.data?._id, target);
};

/** Checks that every refusal carries a message the client can display. */
export const errorContract = async ({ account }) => {
    console.log('\n--- FRONTEND CONTRACT: error shapes ---');

    const refusals = [
        await req('GET', '/api/tasks', undefined, { auth: false }),
        await req('GET', '/api/admin/stats', undefined, { jar: account.jar }),
        await req('GET', '/api/nope', undefined, { auth: false }),
        await req(
            'POST',
            '/api/users/sign_in',
            { email: 'nobody@foxylist.test', password: 'wrong-one' },
            { auth: false }
        ),
    ];

    for (const refusal of refusals) {
        const message = refusal.data?.message;
        const usable = Array.isArray(message) ? message.length > 0 : Boolean(message);
        check(`the ${refusal.status} refusal carries a usable message`, usable, true);
    }

    /** The body must be JSON, never the default HTML error page. */
    const notFound = await req('GET', '/api/nope', undefined, { auth: false });
    check('a 404 is JSON the client can parse', typeof notFound.data, 'object');
};
