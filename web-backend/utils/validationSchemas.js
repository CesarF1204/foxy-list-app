import { z } from 'zod';
import { BOARDS } from '../constants/boards.js';
import { USER_ROLES, ACCOUNT_STATUSES } from '../constants/roles.js';
import {
    EMAIL_PATTERN,
    NAME_PATTERN,
    OBJECT_ID_PATTERN,
    PASSWORD_MIN_LENGTH,
    NAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    TITLE_MAX_LENGTH,
    DESCRIPTION_MAX_LENGTH,
} from '../constants/validation.js';

/**
 * DOCU: Builds a trimmed name field that accepts letters and spaces only.
 * Last Updated Date: October 1, 2026
 * @function nameField
 * @param {string} label - The field name, used in the error messages
 * @returns {import('zod').ZodType} The field schema
 * @author Cesar
 */
const nameField = (label) =>
    z
        .string({ error: `${label} is required` })
        .trim()
        .min(1, `${label} is required`)
        .max(NAME_MAX_LENGTH, `${label} must be under ${NAME_MAX_LENGTH} characters`)
        .regex(NAME_PATTERN, `${label} should only contain letters and spaces`);

/** Email: trimmed, lowercased and well formed, so one mailbox is one account. */
const emailField = z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .regex(EMAIL_PATTERN, 'Enter a valid email address');

/**
 * DOCU: Builds a password field with the length rules.
 * Last Updated Date: October 1, 2026
 * @function passwordField
 * @param {string} [label] - The field name, used in the error messages
 * @returns {import('zod').ZodType} The field schema
 * @author Cesar
 */
const passwordField = (label = 'Password') =>
    z
        .string({ error: `${label} is required` })
        .min(1, `${label} is required`)
        .min(PASSWORD_MIN_LENGTH, `${label} must be at least ${PASSWORD_MIN_LENGTH} characters`)
        .max(PASSWORD_MAX_LENGTH, `${label} must be under ${PASSWORD_MAX_LENGTH} characters`);

/**
 * DOCU: Builds a field that carries a 24 character ObjectId.
 * Last Updated Date: October 1, 2026
 * @function idField
 * @param {string} label - The field name, used in the error messages
 * @returns {import('zod').ZodType} The field schema
 * @author Cesar
 */
const idField = (label) => z
    .string({ error: `${label} is required` })
    .regex(OBJECT_ID_PATTERN, `${label} is not a valid id`);

/**
 * DOCU: Builds a field the client is never allowed to send.
 * Last Updated Date: October 1, 2026
 * @function forbiddenField
 * @param {string} label - The field name
 * @param {string} why - Why it is refused
 * @returns {import('zod').ZodType} The field schema
 * @author Cesar
 */
const forbiddenField = (label, why) =>
    z.never({ error: `${label} cannot be set here: ${why}` }).optional();

const registerSchema = z.object({
    firstName: nameField('First name'),
    lastName: nameField('Last name'),
    email: emailField,
    password: passwordField(),
    role: forbiddenField('role', 'a new account is always a plain user'),
    status: forbiddenField('status', 'a new account is always active'),
});

const signInSchema = z.object({
    email: emailField,
    password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({ email: emailField });

const resetPasswordSchema = z.object({
    email: emailField,
    password: passwordField('New password'),
});

const moveTaskSchema = z.object({
    taskId: idField('Task id'),
    newStatus: z.enum(BOARDS, { error: `Status must be one of: ${BOARDS.join(', ')}` }),
    newIndex: z.coerce
        .number()
        .int('Position must be a whole number')
        .min(0, 'Position cannot be negative')
        .optional(),
});

const createTaskSchema = z.object({
    title: z
        .string({ error: 'Title is required' })
        .trim()
        .min(1, 'Title is required')
        .max(TITLE_MAX_LENGTH, `Title must be under ${TITLE_MAX_LENGTH} characters`),
    description: z
        .string()
        .trim()
        .max(DESCRIPTION_MAX_LENGTH, `Description must be under ${DESCRIPTION_MAX_LENGTH} characters`)
        .optional()
        .default(''),
    status: forbiddenField('status', 'a new task always starts on the To Do board'),
});

/** Every field is optional, but an empty body is refused. */
const updateTaskSchema = z
    .object({
        title: z
            .string({ error: 'Title is required' })
            .trim()
            .min(1, 'Title cannot be empty')
            .max(TITLE_MAX_LENGTH, `Title must be under ${TITLE_MAX_LENGTH} characters`)
            .optional(),
        description: z
            .string()
            .trim()
            .max(DESCRIPTION_MAX_LENGTH, `Description must be under ${DESCRIPTION_MAX_LENGTH} characters`)
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'Nothing to update.',
    });

/** Profile fields only; role and status have their own endpoints. */
const updateUserProfileSchema = z.object({
    firstName: nameField('First name'),
    lastName: nameField('Last name'),
    email: emailField,
    role: forbiddenField('role', 'it has its own endpoint'),
    status: forbiddenField('status', 'it has its own endpoint'),
});

const updateUserRoleSchema = z.object({
    role: z.enum(USER_ROLES, { error: `Role must be one of: ${USER_ROLES.join(', ')}` }),
});

const updateUserStatusSchema = z.object({
    status: z.enum(ACCOUNT_STATUSES, { error: `Status must be one of: ${ACCOUNT_STATUSES.join(', ')}` }),
});

const updateUserPasswordSchema = z.object({ password: passwordField('New password') });

export {
    registerSchema,
    signInSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    moveTaskSchema,
    createTaskSchema,
    updateTaskSchema,
    updateUserProfileSchema,
    updateUserRoleSchema,
    updateUserStatusSchema,
    updateUserPasswordSchema,
};
