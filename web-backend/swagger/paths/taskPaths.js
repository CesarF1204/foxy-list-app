import { authResponses, badRequest, notFound, jsonResponse } from './responses.js';

/**
 * DOCU: The path parameter every `/:id` route in this API takes.
 *
 * Declared once and spread into each operation, so the three id-carrying resources cannot
 * drift on what an id looks like. `parseId` is what actually enforces it: anything that is
 * not a 24 character ObjectId is a 400, refused before it reaches Mongo.
 *
 * Last Updated Date: October 1, 2026
 * @function idPathParameter
 * @param {string} name - The parameter's own name, which the path template uses
 * @param {string} label - What the record is called in the messages
 * @returns {object} The OpenAPI path parameter object
 * @author Cesar
 */
const idPathParameter = (name, label) => ({
    name,
    in: 'path',
    required: true,
    description: `The ${label}'s id.`,
    schema: { $ref: '#/components/schemas/ObjectId' },
});

/**
 * DOCU: The paths mounted by `routes/taskRoutes.js`.
 *
 * Every one of them sits behind the session guard, and every query is scoped to the caller
 * in the service rather than filtered afterwards, so a task belonging to somebody else reads
 * as 404 rather than 403 - the API does not confirm that an id exists.
 *
 * `PUT /move` is declared before `/{id}` in the router so "move" is never captured as an id;
 * the paths object lists it in that order for the same reason.
 *
 * Last Updated Date: October 1, 2026
 * @constant taskPaths
 * @type {object}
 * @author Cesar
 */
const taskPaths = {
    '/api/tasks': {
        get: {
            tags: ['Tasks'],
            summary: 'List your tasks',
            description: "Every task the signed-in account owns, in board order.",
            security: [{ sessionCookie: [] }],
            responses: {
                200: jsonResponse('The caller\'s tasks.', { $ref: '#/components/schemas/TasksResponse' }),
                ...authResponses(),
            },
        },
        post: {
            tags: ['Tasks'],
            summary: 'Create a task',
            description:
                'Creates a task at the end of the To Do board. A `status` in the body is ' +
                'refused with a 400 rather than ignored - use the move endpoint to change ' +
                'boards.',
            security: [{ sessionCookie: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/CreateTaskRequest' } },
                },
            },
            responses: {
                201: jsonResponse('The created task.', { $ref: '#/components/schemas/TaskResponse' }),
                400: badRequest,
                ...authResponses(),
            },
        },
    },

    '/api/tasks/move': {
        put: {
            tags: ['Tasks'],
            summary: 'Move a task',
            description:
                'Moves a task to another board and/or position. The board it came from is ' +
                're-numbered so no gap is left behind, which is why this is a PUT on its own ' +
                'path rather than a field on the task.',
            security: [{ sessionCookie: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/MoveTaskRequest' } },
                },
            },
            responses: {
                200: jsonResponse('The moved task.', { $ref: '#/components/schemas/TaskResponse' }),
                400: badRequest,
                404: notFound,
                ...authResponses(),
            },
        },
    },

    '/api/tasks/{id}': {
        get: {
            tags: ['Tasks'],
            summary: 'Get one of your tasks',
            security: [{ sessionCookie: [] }],
            parameters: [idPathParameter('id', 'task')],
            responses: {
                200: jsonResponse('The task.', { $ref: '#/components/schemas/TaskResponse' }),
                400: badRequest,
                404: notFound,
                ...authResponses(),
            },
        },
        patch: {
            tags: ['Tasks'],
            summary: 'Update a task',
            description:
                'Renames or re-describes a task. Only the fields sent are written, so a ' +
                'title-only patch leaves the description alone. An empty body is refused: ' +
                'there is nothing to update.',
            security: [{ sessionCookie: [] }],
            parameters: [idPathParameter('id', 'task')],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/UpdateTaskRequest' } },
                },
            },
            responses: {
                200: jsonResponse('The updated task.', { $ref: '#/components/schemas/TaskResponse' }),
                400: badRequest,
                404: notFound,
                ...authResponses(),
            },
        },
        delete: {
            tags: ['Tasks'],
            summary: 'Delete a task',
            description: 'Deletes the task and closes the gap it leaves on its board.',
            security: [{ sessionCookie: [] }],
            parameters: [idPathParameter('id', 'task')],
            responses: {
                200: jsonResponse('The id that was deleted.', {
                    $ref: '#/components/schemas/DeleteTaskResponse',
                }),
                400: badRequest,
                404: notFound,
                ...authResponses(),
            },
        },
    },
};

export { taskPaths, idPathParameter };
