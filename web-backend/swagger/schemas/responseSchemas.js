import { TITLE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH } from '../../constants/validation.js';

/**
 * DOCU: The response objects, kept apart from the request bodies so a client reading the
 * spec sees clearly which direction each schema travels.
 *
 * `Task` mirrors `toPublicTask` in `services/taskService.js`, and the two admin envelopes
 * mirror `getStats` and `listUsers` in `services/adminService.js`.
 *
 * Last Updated Date: October 1, 2026
 * @constant responseSchemas
 * @type {object}
 * @author Cesar
 */
const responseSchemas = {
    /** A task as `toPublicTask` returns it. */
    Task: {
        type: 'object',
        required: ['_id', 'id', 'userId', 'title', 'description', 'status', 'order', 'createdAt'],
        properties: {
            _id: { $ref: '#/components/schemas/ObjectId' },
            id: { $ref: '#/components/schemas/ObjectId' },
            userId: {
                $ref: '#/components/schemas/ObjectId',
                description: 'The owner. Always the caller: the API never reads a task of another account.',
            },
            title: { type: 'string', minLength: 1, maxLength: TITLE_MAX_LENGTH, example: 'Water the plants' },
            description: {
                type: 'string',
                maxLength: DESCRIPTION_MAX_LENGTH,
                description: 'Always present, and `""` rather than null when the task has no notes.',
            },
            status: { $ref: '#/components/schemas/Board' },
            order: { type: 'integer', minimum: 0, description: 'Position within its own board.' },
            createdAt: { type: 'string', format: 'date-time' },
        },
    },

    /** `GET /api/tasks`. */
    TasksResponse: {
        type: 'object',
        required: ['tasks'],
        properties: {
            tasks: {
                type: 'array',
                description: "The caller's own tasks only, in board order.",
                items: { $ref: '#/components/schemas/Task' },
            },
        },
    },

    /** Every task endpoint that answers with a single task. */
    TaskResponse: {
        type: 'object',
        required: ['task'],
        properties: { task: { $ref: '#/components/schemas/Task' } },
    },

    /** `DELETE /api/tasks/{id}`. */
    DeleteTaskResponse: {
        type: 'object',
        required: ['_id'],
        properties: { _id: { $ref: '#/components/schemas/ObjectId' } },
    },

    /** One page of the users table, with the metadata the pager needs. */
    AdminUsersResponse: {
        type: 'object',
        required: ['users'],
        properties: {
            users: {
                allOf: [
                    { $ref: '#/components/schemas/PageMeta' },
                    {
                        type: 'object',
                        required: ['rows'],
                        properties: {
                            rows: {
                                type: 'array',
                                description: 'The accounts on this page, each with its task counts.',
                                items: { $ref: '#/components/schemas/AdminUser' },
                            },
                        },
                    },
                ],
            },
        },
    },

    /** The dashboard totals: account counts and per-board task counts. */
    AdminStatsResponse: {
        type: 'object',
        required: ['stats'],
        properties: {
            stats: {
                type: 'object',
                required: ['users', 'tasks'],
                properties: {
                    users: {
                        type: 'object',
                        required: ['total', 'active', 'blocked', 'admins'],
                        properties: {
                            total: { type: 'integer', minimum: 0 },
                            active: { type: 'integer', minimum: 0 },
                            blocked: { type: 'integer', minimum: 0 },
                            admins: { type: 'integer', minimum: 0 },
                        },
                    },
                    /** Computed from the task records on every request, so `total` always equals the three boards. */
                    tasks: { $ref: '#/components/schemas/TaskCounts' },
                },
            },
        },
    },

    /** `DELETE /api/admin/users/{id}`: the deleted id and how many tasks went with it. */
    DeleteUserResponse: {
        type: 'object',
        required: ['_id', 'removedTasks'],
        properties: {
            _id: { $ref: '#/components/schemas/ObjectId' },
            removedTasks: { type: 'integer', minimum: 0 },
        },
    },

    /** `GET /`, the liveness probe. */
    HealthResponse: {
        type: 'object',
        required: ['message'],
        properties: { message: { type: 'string', example: 'Foxy List API is running' } },
    },
};

export { responseSchemas };
