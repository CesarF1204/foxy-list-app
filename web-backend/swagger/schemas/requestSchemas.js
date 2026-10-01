import { TITLE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH } from '../../constants/validation.js';

/**
 * DOCU: Every request body this API accepts, one schema per Zod schema in
 * `utils/validationSchemas.js`.
 *
 * The bodies that refuse a field document it too, with `type: 'never'` and the reason. That
 * is not decoration: the API answers 400 for a `role` sent to the profile endpoint rather than
 * silently ignoring it, so a client reading this knows the difference before it tries.
 *
 * Last Updated Date: October 1, 2026
 * @constant requestSchemas
 * @type {object}
 * @author Cesar
 */
const requestSchemas = {
    /** `POST /api/users/register`. */
    RegisterRequest: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'password'],
        additionalProperties: false,
        properties: {
            firstName: { $ref: '#/components/schemas/Name' },
            lastName: { $ref: '#/components/schemas/Name' },
            email: { $ref: '#/components/schemas/Email' },
            password: { $ref: '#/components/schemas/NewPassword' },
            role: { type: 'never', description: 'Refused with a 400: a new account is always a plain user.' },
            status: { type: 'never', description: 'Refused with a 400: a new account is always active.' },
        },
    },

    /** `POST /api/users/sign_in`. */
    SignInRequest: {
        type: 'object',
        required: ['email', 'password'],
        additionalProperties: false,
        properties: {
            email: { $ref: '#/components/schemas/Email' },
            password: {
                type: 'string',
                format: 'password',
                minLength: 1,
                description:
                    'Not checked against the password rules here: an existing account may ' +
                    'predate them, and the check belongs at sign-in rather than at the boundary.',
            },
        },
    },

    /** `POST /api/users/forgot_password`. */
    ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        additionalProperties: false,
        properties: { email: { $ref: '#/components/schemas/Email' } },
    },

    /** `PUT /api/users/reset_password`. */
    ResetPasswordRequest: {
        type: 'object',
        required: ['email', 'password'],
        additionalProperties: false,
        properties: {
            email: { $ref: '#/components/schemas/Email' },
            password: { $ref: '#/components/schemas/NewPassword' },
        },
    },

    /** `PUT /api/users/password` and `PUT /api/admin/users/{id}/password`. */
    SetPasswordRequest: {
        type: 'object',
        required: ['password'],
        additionalProperties: false,
        properties: { password: { $ref: '#/components/schemas/NewPassword' } },
    },

    /**
     * `PATCH /api/users/profile` and `PATCH /api/admin/users/{id}`. One schema for both:
     * role and status have their own endpoints and are refused here, so a rename can never
     * carry a privilege change with it.
     */
    UpdateProfileRequest: {
        type: 'object',
        required: ['firstName', 'lastName', 'email'],
        additionalProperties: false,
        properties: {
            firstName: { $ref: '#/components/schemas/Name' },
            lastName: { $ref: '#/components/schemas/Name' },
            email: { $ref: '#/components/schemas/Email' },
            role: { type: 'never', description: 'Refused with a 400: it has its own endpoint.' },
            status: { type: 'never', description: 'Refused with a 400: it has its own endpoint.' },
        },
    },

    /** `PUT /api/admin/users/{id}/role`. */
    UpdateRoleRequest: {
        type: 'object',
        required: ['role'],
        additionalProperties: false,
        properties: { role: { $ref: '#/components/schemas/UserRole' } },
    },

    /** `PUT /api/admin/users/{id}/status`. */
    UpdateStatusRequest: {
        type: 'object',
        required: ['status'],
        additionalProperties: false,
        properties: { status: { $ref: '#/components/schemas/AccountStatus' } },
    },

    /** `POST /api/tasks`. `status` is refused: a new task always starts on To Do. */
    CreateTaskRequest: {
        type: 'object',
        required: ['title'],
        additionalProperties: false,
        properties: {
            title: { type: 'string', minLength: 1, maxLength: TITLE_MAX_LENGTH, example: 'Water the plants' },
            description: {
                type: 'string',
                maxLength: DESCRIPTION_MAX_LENGTH,
                default: '',
                description: 'Optional. A task with no notes stores and returns `""`.',
            },
            status: { type: 'never', description: 'Refused with a 400: a new task always starts on To Do.' },
        },
    },

    /** `PATCH /api/tasks/{id}`. Every field is optional, but an empty body is refused. */
    UpdateTaskRequest: {
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        properties: {
            title: {
                type: 'string',
                minLength: 1,
                maxLength: TITLE_MAX_LENGTH,
                description: 'Cannot be emptied. Only the fields sent are written.',
            },
            description: { type: 'string', maxLength: DESCRIPTION_MAX_LENGTH },
        },
    },

    /** `PUT /api/tasks/move`. */
    MoveTaskRequest: {
        type: 'object',
        required: ['taskId', 'newStatus'],
        additionalProperties: false,
        properties: {
            taskId: { $ref: '#/components/schemas/ObjectId' },
            newStatus: { $ref: '#/components/schemas/Board' },
            newIndex: {
                type: 'integer',
                minimum: 0,
                description: 'Where to put it on the target board. Omit it to append to the end.',
            },
        },
    },
};

export { requestSchemas };
