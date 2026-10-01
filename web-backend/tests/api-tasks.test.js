import { req, check, checkStatus, createAndSignIn, state } from './helpers.js';

/** The suite must be run with the server already listening. */

/** Tests task creation, listing, ownership and bad ids. */
export const crud = async () => {
    console.log('\n--- TASK CRUD ---');

    const owner = await createAndSignIn('owner', 'owner');

    const empty = await req('GET', '/api/tasks', undefined, { jar: owner.jar });
    check('a new account has an empty board', empty.data?.tasks?.length, 0);

    const first = await checkStatus(
        'create a task -> 201',
        'POST',
        '/api/tasks',
        { title: 'Task A', description: 'the first one' },
        201,
        { jar: owner.jar }
    );
    check('a new task starts on the todo board', first.data?.task?.status, 'todo');
    check('a new task is owned by its creator', first.data?.task?.userId, owner.id);
    check('a new task is appended to the board', first.data?.task?.order, 0);

    const taskId = first.data?.task?._id;

    const second = await checkStatus(
        'create a second task -> 201',
        'POST',
        '/api/tasks',
        { title: 'Task B' },
        201,
        { jar: owner.jar }
    );
    check('the second task is appended after the first', second.data?.task?.order, 1);
    check('a task with no description gets an empty one', second.data?.task?.description, '');

    console.log('\n--- VALIDATION ---');

    await checkStatus(
        'create a task with no title -> 400',
        'POST',
        '/api/tasks',
        { description: 'no title here' },
        400,
        { jar: owner.jar }
    );
    await checkStatus(
        'create a task with a blank title -> 400',
        'POST',
        '/api/tasks',
        { title: '    ' },
        400,
        { jar: owner.jar }
    );
    await checkStatus(
        'create a task with a title over 200 characters -> 400',
        'POST',
        '/api/tasks',
        { title: 'x'.repeat(201) },
        400,
        { jar: owner.jar }
    );

    /** A new task always lands on todo, so a client cannot break the ordering rule. */
    await checkStatus(
        'create a task naming its own board -> 400',
        'POST',
        '/api/tasks',
        { title: 'Sneaky', status: 'done' },
        400,
        { jar: owner.jar }
    );

    console.log('\n--- LISTING AND OWNERSHIP ---');

    const list = await req('GET', '/api/tasks', undefined, { jar: owner.jar });
    check('the board holds both tasks', list.data?.tasks?.length, 2);
    check(
        'the board is returned in board order',
        list.data?.tasks?.map((task) => task.order),
        [0, 1]
    );

    const other = await createAndSignIn('other', 'other');

    const otherList = await req('GET', '/api/tasks', undefined, { jar: other.jar });
    check("another user sees none of someone else's tasks", otherList.data?.tasks?.length, 0);

    await checkStatus(
        "reading another user's task -> 404",
        'GET',
        `/api/tasks/${taskId}`,
        undefined,
        404,
        { jar: other.jar }
    );
    await checkStatus(
        "editing another user's task -> 404",
        'PATCH',
        `/api/tasks/${taskId}`,
        { title: 'Hijacked' },
        404,
        { jar: other.jar }
    );
    await checkStatus(
        "deleting another user's task -> 404",
        'DELETE',
        `/api/tasks/${taskId}`,
        undefined,
        404,
        { jar: other.jar }
    );
    await checkStatus(
        "moving another user's task -> 404",
        'PUT',
        '/api/tasks/move',
        { taskId, newStatus: 'done' },
        404,
        { jar: other.jar }
    );

    /** The refusals above must not have changed anything. */
    const stillThere = await req('GET', '/api/tasks', undefined, { jar: owner.jar });
    check('the task survived every attempt to touch it', stillThere.data?.tasks?.length, 2);

    console.log('\n--- BAD IDS ---');

    await checkStatus('a malformed task id -> 400', 'GET', '/api/tasks/not-an-id', undefined, 400, {
        jar: owner.jar,
    });
    await checkStatus(
        'a well-formed but unknown task id -> 404',
        'GET',
        '/api/tasks/0123456789abcdef01234567',
        undefined,
        404,
        { jar: owner.jar }
    );

    console.log('\n--- EDITING ---');

    const edited = await checkStatus(
        'edit a task title -> 200',
        'PATCH',
        `/api/tasks/${taskId}`,
        { title: 'Task A edited' },
        200,
        { jar: owner.jar }
    );
    check('the edit is applied', edited.data?.task?.title, 'Task A edited');
    check('an untouched description is preserved', edited.data?.task?.description, 'the first one');

    await checkStatus(
        'edit a task to a blank title -> 400',
        'PATCH',
        `/api/tasks/${taskId}`,
        { title: '  ' },
        400,
        { jar: owner.jar }
    );
    await checkStatus(
        'edit a task with an empty body -> 400',
        'PATCH',
        `/api/tasks/${taskId}`,
        {},
        400,
        { jar: owner.jar }
    );

    return { owner, other, taskId, secondId: second.data?.task?._id };
};

/** Tests moving between boards, deleting, and the no-session refusals. */
export const board = async ({ owner, taskId, secondId }) => {
    console.log('\n--- MOVING BETWEEN BOARDS ---');

    const moved = await checkStatus(
        'move a task to ongoing -> 200',
        'PUT',
        '/api/tasks/move',
        { taskId, newStatus: 'ongoing', newIndex: 0 },
        200,
        { jar: owner.jar }
    );
    check('the task is on the ongoing board', moved.data?.task?.status, 'ongoing');

    /** The board it left must be renumbered, leaving no hole at order 0. */
    const afterMove = await req('GET', '/api/tasks', undefined, { jar: owner.jar });
    const todoOrders = afterMove.data.tasks
        .filter((task) => task.status === 'todo')
        .map((task) => task.order);
    check('the source board is renumbered with no gaps', todoOrders, [0]);

    const backToEnd = await checkStatus(
        'move a task to the end of a board, sending no index -> 200',
        'PUT',
        '/api/tasks/move',
        { taskId, newStatus: 'done' },
        200,
        { jar: owner.jar }
    );
    check('a move with no index lands at the end', backToEnd.data?.task?.order, 0);

    await checkStatus(
        'move a task to an unknown board -> 400',
        'PUT',
        '/api/tasks/move',
        { taskId, newStatus: 'archived' },
        400,
        { jar: owner.jar }
    );
    await checkStatus(
        'move a task with a negative position -> 400',
        'PUT',
        '/api/tasks/move',
        { taskId, newStatus: 'todo', newIndex: -1 },
        400,
        { jar: owner.jar }
    );

    /** A position past the end must clamp, not leave a gap. */
    await checkStatus(
        'move a task far past the end -> 200',
        'PUT',
        '/api/tasks/move',
        { taskId, newStatus: 'todo', newIndex: 99 },
        200,
        { jar: owner.jar }
    );
    const clamped = await req('GET', '/api/tasks', undefined, { jar: owner.jar });
    check(
        'the position was clamped to the end of the board',
        clamped.data.tasks.filter((task) => task.status === 'todo').map((task) => task.order),
        [0, 1]
    );

    console.log('\n--- DELETING ---');

    const removed = await checkStatus(
        'delete a task -> 200',
        'DELETE',
        `/api/tasks/${secondId}`,
        undefined,
        200,
        { jar: owner.jar }
    );
    check('the deleted id comes back', removed.data?._id, secondId);

    const afterDelete = await req('GET', '/api/tasks', undefined, { jar: owner.jar });
    check('the board shrank by one', afterDelete.data?.tasks?.length, 1);

    console.log('\n--- NO SESSION ---');

    await checkStatus('list tasks with no cookie -> 401', 'GET', '/api/tasks', undefined, 401, {
        auth: false,
    });
    await checkStatus(
        'create a task with no cookie -> 401',
        'POST',
        '/api/tasks',
        { title: 'Nope' },
        401,
        { auth: false }
    );
    await checkStatus(
        'move a task with no cookie -> 401',
        'PUT',
        '/api/tasks/move',
        { taskId, newStatus: 'done' },
        401,
        { auth: false }
    );
    await checkStatus(
        'a task route with a garbage cookie -> 401',
        'GET',
        '/api/tasks',
        undefined,
        401,
        { auth: false, cookie: 'session=forged' }
    );
};

/** Allow the file to be run on its own, not only through tests/run.js */
if (process.argv[1]?.endsWith('api-tasks.test.js')) {
    crud()
        .then(board)
        .then(() => {
            console.log(
                `\n===== ${state.checks - state.failures}/${state.checks} checks passed, ${state.failures} failed =====`
            );
            process.exit(state.failures ? 1 : 0);
        })
        .catch((error) => {
            console.error('\nTEST RUNNER ERROR:', error.message);
            process.exit(2);
        });
}
