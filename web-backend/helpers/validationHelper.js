import { badRequest } from './errorHelper.js';
import { OBJECT_ID_PATTERN } from '../constants/validation.js';

/**
 * DOCU: Validates a request body against a Zod schema and returns the parsed result.
 * Last Updated Date: October 1, 2026
 * @function parseBody
 * @param {object} body - The incoming request body
 * @param {import('zod').ZodType} schema - The schema to check against
 * @returns {object} The parsed data, safe to use directly
 * @author Cesar
 */
const parseBody = (body, schema) => {
    const result = schema.safeParse(body ?? {});

    if (!result.success) {
        throw badRequest(result.error.issues.map((issue) => issue.message));
    }

    return result.data;
};

/**
 * DOCU: Checks that a path value is a valid ObjectId.
 * Last Updated Date: October 1, 2026
 * @function parseId
 * @param {string} name - The field name, used in the error message
 * @param {unknown} value - The raw value
 * @returns {string} The validated id
 * @author Cesar
 */
const parseId = (name, value) => {
    const text = String(value ?? '').trim();

    if (!OBJECT_ID_PATTERN.test(text)) {
        throw badRequest(`${name} is not a valid id.`);
    }

    return text;
};

export { parseBody, parseId };