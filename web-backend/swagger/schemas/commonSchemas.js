import { EMAIL_PATTERN, NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../constants/validation.js';
import { USER_ROLES, ACCOUNT_STATUSES } from '../../constants/roles.js';
import { BOARDS } from '../../constants/boards.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, FIRST_PAGE } from '../../constants/pagination.js';
import { DEFAULT_USER_SORT_FIELD, DEFAULT_USER_SORT_DIRECTION } from '../../constants/pagination.js';

/**
 * DOCU: The reusable pieces every endpoint in this API answers with.
 *
 * Everything the API refuses comes back through `errorMiddleware` as `{ message }`, and a
 * validation failure carries one message per field as an array, so that is the one error
 * shape every operation documents rather than an error type per endpoint.
 *
 * Last Updated Date: October 1, 2026
 * @constant commonSchemas
 * @type {object}
 * @author Cesar
 */
const commonSchemas = {
    /** The JSON body every failure answers with. */
    Error: {
        type: 'object',
        required: ['message'],
        properties: {
            message: {
                description:
                    'What went wrong. A validation failure carries one entry per field; ' +
                    'anything else carries a single sentence.',
                oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
            },
        },
    },

    /** The JSON body an operation that only confirms something answers with. */
    Message: {
        type: 'object',
        required: ['message'],
        properties: {
            message: { type: 'string', example: 'Password updated' },
        },
    },

    /** A 24 character Mongo ObjectId. Both `_id` and `id` carry one. */
    ObjectId: {
        type: 'string',
        pattern: '^[a-fA-F\\d]{24}$',
        example: '66b1f0f2c3d4e5f6a7b8c9d0',
    },

    /** The role an account may hold. */
    UserRole: { type: 'string', enum: [...USER_ROLES] },

    /** Whether an account may still sign in. */
    AccountStatus: { type: 'string', enum: [...ACCOUNT_STATUSES] },

    /** One of the three boards a task can sit on. */
    Board: { type: 'string', enum: [...BOARDS] },

    /** An email, as the API stores it: trimmed and lowercased. */
    Email: {
        type: 'string',
        format: 'email',
        pattern: EMAIL_PATTERN.source,
        example: 'ada@foxylist.test',
    },

    /** A name: letters and spaces only, at most NAME_MAX_LENGTH characters. */
    Name: {
        type: 'string',
        minLength: 1,
        maxLength: NAME_MAX_LENGTH,
        pattern: '^[A-Za-z\\s]+$',
        example: 'Ada',
    },

    /**
     * A password a client may set. No endpoint ever accepts a hash, and none ever returns
     * one: these constraints are the ones `utils/validationSchemas.js` enforces.
     */
    NewPassword: {
        type: 'string',
        format: 'password',
        minLength: PASSWORD_MIN_LENGTH,
        maxLength: 128,
        description:
            `At least ${PASSWORD_MIN_LENGTH} characters and under 128. Whitespace anywhere - ` +
            'including a leading or trailing space - is refused rather than trimmed, so what ' +
            'was typed is always what would be stored.',
        example: 'secret123',
    },

    /** The page metadata `GET /api/admin/users` returns alongside its rows. */
    PageMeta: {
        type: 'object',
        required: ['page', 'pageSize', 'total', 'pageCount'],
        properties: {
            page: {
                type: 'integer',
                minimum: FIRST_PAGE,
                description: 'The page actually returned. A page past the end is clamped.',
                example: 1,
            },
            pageSize: { type: 'integer', minimum: 1, maximum: MAX_PAGE_SIZE, example: DEFAULT_PAGE_SIZE },
            total: { type: 'integer', description: 'How many rows match the filters in total.', example: 42 },
            pageCount: { type: 'integer', description: 'How many pages those rows make.', example: 5 },
            sortBy: { type: 'string', example: DEFAULT_USER_SORT_FIELD },
            sortDir: { type: 'string', enum: ['asc', 'desc'], example: DEFAULT_USER_SORT_DIRECTION },
        },
    },
};

export { commonSchemas };
