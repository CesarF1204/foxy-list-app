import { USER_ROLES, ACCOUNT_STATUSES } from '../../constants/roles.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../constants/pagination.js';
import { authResponses, badRequest, notFound, jsonResponse } from './responses.js';
import { idPathParameter } from './taskPaths.js';

/**
 * DOCU: The query parameters of the users table, and the reason each one is accepted.
 *
 * Built from the same constants the API parses the query with, so the documented default and
 * the enforced default cannot disagree. Anything the parser does not recognise falls back to
 * the default silently rather than failing, which is why an unknown value is not a 400.
 *
 * Last Updated Date: October 1, 2026
 * @constant userTableParameters
 * @type {object[]}
 * @author Cesar
 */
const userTableParameters = [
    {
        name: 'search',
        in: 'query',
        required: false,
        description:
            'Matches the first name, the last name or the email, case-insensitively. The ' +
            'term is escaped before it becomes a regex, so a search cannot inject one.',
        schema: { type: 'string', default: '' },
    },
    {
        name: 'role',
        in: 'query',
        required: false,
        description: 'Filters to one role. An unrecognised value means no filter.',
        schema: { type: 'string', enum: [...USER_ROLES] },
    },
    {
        name: 'status',
        in: 'query',
        required: false,
        description: 'Filters to one account status. An unrecognised value means no filter.',
        schema: { type: 'string', enum: [...ACCOUNT_STATUSES] },
    },
    {
        name: 'sortBy',
        in: 'query',
        required: false,
        description: 'The column to sort on.',
        schema: {
            type: 'string',
            enum: ['name', 'email', 'role', 'status', 'totalTasks', 'createdAt'],
            default: 'createdAt',
        },
    },
    {
        name: 'sortDir',
        in: 'query',
        required: false,
        description: 'The sort direction. Anything but `asc` sorts descending.',
        schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    },
    {
        name: 'page',
        in: 'query',
        required: false,
        description:
            'The 1-based page. A page past the end is clamped rather than refused, and the ' +
            'clamped page is the one reported back.',
        schema: { type: 'integer', minimum: 1, default: 1 },
    },
    {
        name: 'pageSize',
        in: 'query',
        required: false,
        description: 'How many rows to return. Outside 1-100 is a 400, not a silent clamp.',
        schema: { type: 'integer', minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE },
    },
];

/**
 * DOCU: The paths mounted by `routes/adminRoutes.js`.
 *
 * The whole router sits behind two guards, in this order: a session, then the admin role.
 * Every operation here therefore documents both refusals, and says `security` once with the
 * cookie scheme - there is no bearer token to present, because there is no token the browser
 * could hold.
 *
 * Profile, role, status and password are four separate endpoints rather than one PATCH. That
 * is the point of the design, and it is repeated in each description below: a rename must
 * never be able to carry a privilege change with it, and a single endpoint cannot promise
 * that. An admin also cannot act on their own account in a way that would lock them out of
 * this very router.
 *
 * Last Updated Date: October 1, 2026
 * @constant adminPaths
 * @type {object}
 * @author Cesar
 */
const adminPaths = {
    '/api/admin/stats': {
        get: {
            tags: ['Admin'],
            summary: 'Dashboard totals',
            description:
                'Account counts and per-board task counts. Nothing here is stored: the ' +
                'counts are computed from the records on every request, so `total` always ' +
                'equals `todo + ongoing + done` and a task created a moment ago is counted a ' +
                'moment later.',
            security: [{ sessionCookie: [] }],
            responses: {
                200: jsonResponse('The dashboard numbers.', {
                    $ref: '#/components/schemas/AdminStatsResponse',
                }),
                ...authResponses('Administrator access is required.'),
            },
        },
    },

    '/api/admin/users': {
        get: {
            tags: ['Admin'],
            summary: 'List users',
            description:
                'One page of the users table. Searching, filtering, sorting and paging all ' +
                'happen in the API, so the browser only ever holds the rows it asked for.',
            security: [{ sessionCookie: [] }],
            parameters: userTableParameters,
            responses: {
                200: jsonResponse('The matching page of accounts.', {
                    $ref: '#/components/schemas/AdminUsersResponse',
                }),
                400: badRequest,
                ...authResponses('Administrator access is required.'),
            },
        },
    },

    /** The four account actions, each its own endpoint on purpose. */
    '/api/admin/users/{id}': {
        get: {
            tags: ['Admin'],
            summary: 'Get one user',
            description: 'One account with their task counts, for the detail drawer.',
            security: [{ sessionCookie: [] }],
            parameters: [idPathParameter('id', 'user')],
            responses: {
                200: jsonResponse('The account.', {
                    type: 'object',
                    properties: { user: { $ref: '#/components/schemas/AdminUser' } },
                }),
                400: badRequest,
                404: notFound,
                ...authResponses('Administrator access is required.'),
            },
        },
        patch: {
            tags: ['Admin'],
            summary: "Update a user's profile",
            description:
                'Writes the profile fields and nothing else. `role` and `status` are refused ' +
                'with a 400 rather than ignored, so this endpoint cannot grant a privilege.',
            security: [{ sessionCookie: [] }],
            parameters: [idPathParameter('id', 'user')],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/UpdateProfileRequest' } },
                },
            },
            responses: {
                200: jsonResponse('The updated row.', {
                    type: 'object',
                    properties: { user: { $ref: '#/components/schemas/AdminUser' } },
                }),
                400: badRequest,
                404: notFound,
                ...authResponses('Administrator access is required.'),
                409: {
                    description: 'That email already belongs to another account.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
            },
        },
        delete: {
            tags: ['Admin'],
            summary: 'Delete a user',
            description:
                'Deletes the account and every task it owned. An admin deleting their own ' +
                'account is refused with a 400, which would leave this router unreachable.',
            security: [{ sessionCookie: [] }],
            parameters: [idPathParameter('id', 'user')],
            responses: {
                200: jsonResponse('The deleted id and how many tasks went with it.', {
                    $ref: '#/components/schemas/DeleteUserResponse',
                }),
                400: badRequest,
                404: notFound,
                ...authResponses('Administrator access is required.'),
            },
        },
    },

    '/api/admin/users/{id}/role': {
        put: {
            tags: ['Admin'],
            summary: "Change a user's role",
            description:
                'Promotes or demotes an account. An admin demoting their own account is ' +
                'refused with a 400, for the same self-lockout reason as the delete.',
            security: [{ sessionCookie: [] }],
            parameters: [idPathParameter('id', 'user')],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/UpdateRoleRequest' } },
                },
            },
            responses: {
                200: jsonResponse('The updated row.', {
                    type: 'object',
                    properties: { user: { $ref: '#/components/schemas/AdminUser' } },
                }),
                400: badRequest,
                404: notFound,
                ...authResponses('Administrator access is required.'),
            },
        },
    },

    '/api/admin/users/{id}/status': {
        put: {
            tags: ['Admin'],
            summary: 'Block or unblock a user',
            description:
                'Sets whether the account may sign in. A block takes effect on the blocked ' +
                "user's very next request rather than at their next sign-in, because the " +
                'account is re-read on every call. An admin blocking themselves is refused.',
            security: [{ sessionCookie: [] }],
            parameters: [idPathParameter('id', 'user')],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/UpdateStatusRequest' } },
                },
            },
            responses: {
                200: jsonResponse('The updated row.', {
                    type: 'object',
                    properties: { user: { $ref: '#/components/schemas/AdminUser' } },
                }),
                400: badRequest,
                404: notFound,
                ...authResponses('Administrator access is required.'),
            },
        },
    },

    '/api/admin/users/{id}/password': {
        put: {
            tags: ['Admin'],
            summary: "Set a user's password",
            description:
                'Sets a new password for another account. An admin does not know the ' +
                "account's current password, so the client cannot make the 'must differ' " +
                'check - the server compares the candidate against the stored hash itself. ' +
                'Only a confirmation message comes back.',
            security: [{ sessionCookie: [] }],
            parameters: [idPathParameter('id', 'user')],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/SetPasswordRequest' } },
                },
            },
            responses: {
                200: jsonResponse('The password was changed.', { $ref: '#/components/schemas/Message' }),
                400: badRequest,
                404: notFound,
                ...authResponses('Administrator access is required.'),
            },
        },
    },

/**
     * The one admin endpoint that takes a file rather than a JSON body - the same shape as the
     * self-service avatar route, but naming the account in the path instead of reading it from
     * the session.
     *
     * POST rather than PATCH because the avatar travels as a multipart part. Unlike role, status,
     * password and delete, there is no self-lockout guard here: a picture carries no privilege,
     * so an admin may set their own this way.
     */
    '/api/admin/users/{id}/avatar': {
        post: {
            tags: ['Admin'],
            summary: "Set a user's profile picture",
            description:
                'Stores a new profile picture for another account and answers with the updated ' +
                'account, so the open drawer and the table row redraw without a refetch.\n\n' +
                'The file must be a JPG or PNG of at most 5 MB, and both the extension and the ' +
                'reported MIME type are checked. The image is stored by Cloudinary and only its ' +
                'URL is kept.\n\n' +
                'A failed upload never overwrites an existing picture: the image reaches ' +
                'Cloudinary before anything is written to the account.',
            security: [{ sessionCookie: [] }],
            parameters: [idPathParameter('id', 'user')],
            requestBody: {
                required: true,
                content: {
                    'multipart/form-data': {
                        schema: {
                            type: 'object',
                            required: ['avatar'],
                            properties: {
                                avatar: {
                                    type: 'string',
                                    format: 'binary',
                                    description: 'The image file. JPG or PNG, at most 5 MB.',
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                200: jsonResponse('The new picture and the account it belongs to.', {
                    $ref: '#/components/schemas/AvatarResponse',
                }),
                400: badRequest,
                404: notFound,
                ...authResponses('Administrator access is required.'),
            },
        },
    },

};

export { adminPaths, userTableParameters };

