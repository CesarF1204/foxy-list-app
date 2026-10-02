/**
 * DOCU: The account objects the API returns.
 *
 * `User` mirrors `toPublicUser` in `services/authService.js` exactly - both `_id` and `id`
 * are present because the frontend reads both. `AdminUser` is that same object plus the task
 * counts `toAdminUser` attaches. No schema here has a password property, because no endpoint
 * ever returns one.
 *
 * Last Updated Date: October 1, 2026
 * @constant userSchemas
 * @type {object}
 * @author Cesar
 */
const userSchemas = {
    /** An account as the API returns it. */
    User: {
        type: 'object',
        required: ['_id', 'id', 'firstName', 'lastName', 'email', 'role', 'status', 'createdAt'],
        properties: {
            _id: { $ref: '#/components/schemas/ObjectId' },
            id: { $ref: '#/components/schemas/ObjectId' },
            firstName: { $ref: '#/components/schemas/Name' },
            lastName: { $ref: '#/components/schemas/Name' },
            email: { $ref: '#/components/schemas/Email' },
            role: { $ref: '#/components/schemas/UserRole' },
            status: { $ref: '#/components/schemas/AccountStatus' },
            createdAt: { type: 'string', format: 'date-time' },
            avatar: {
                type: 'string',
                description:
                    'The Cloudinary secure URL of the profile picture, or `""` when none has ' +
                    'been uploaded. Avatars fall back to initials when this is empty.',
                example: 'https://res.cloudinary.com/foxy/image/upload/foxy-list/avatars/u1.jpg',
            },
        },
    },

    /** How many tasks an account owns, per board, computed on every read. */
    TaskCounts: {
        type: 'object',
        required: ['total', 'todo', 'ongoing', 'done'],
        properties: {
            total: { type: 'integer', minimum: 0, example: 4 },
            todo: { type: 'integer', minimum: 0, example: 2 },
            ongoing: { type: 'integer', minimum: 0, example: 1 },
            done: { type: 'integer', minimum: 0, example: 1 },
        },
    },

    /** A users-table row: the public user plus their task counts. */
    AdminUser: {
        allOf: [
            { $ref: '#/components/schemas/User' },
            {
                type: 'object',
                required: ['taskCounts'],
                properties: { taskCounts: { $ref: '#/components/schemas/TaskCounts' } },
            },
        ],
    },

    /** The body of every endpoint that answers with the current session's account. */
    UserResponse: {
        type: 'object',
        required: ['user'],
        properties: { user: { $ref: '#/components/schemas/User' } },
    },

    /** `POST /api/users/avatar`. */
    AvatarResponse: {
        type: 'object',
        required: ['message', 'avatar', 'user'],
        properties: {
            message: { type: 'string', example: 'Profile picture updated' },
            avatar: {
                type: 'string',
                description: 'The new Cloudinary secure URL, repeated here for convenience.',
            },
            user: { $ref: '#/components/schemas/User' },
        },
    },

    /** `POST /api/users/register`. */
    RegisterResponse: {
        type: 'object',
        required: ['message', 'user'],
        properties: {
            message: { type: 'string', example: 'User registered successfully.' },
            user: { $ref: '#/components/schemas/User' },
        },
    },

    /** `POST /api/users/sign_in`: the token, for clients that cannot hold a cookie. */
    SignInResponse: {
        type: 'object',
        required: ['message', 'token', 'user'],
        properties: {
            message: { type: 'string', example: 'Login successful.' },
            token: {
                type: 'string',
                description:
                    'The session JWT. A browser never needs it - the same token is set as the ' +
                    'httpOnly `session` cookie - but a non-browser client is given it here.',
            },
            user: { $ref: '#/components/schemas/User' },
        },
    },
};

export { userSchemas };
