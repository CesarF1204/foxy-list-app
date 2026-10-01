/**
 * DOCU: The response blocks every guarded endpoint shares.
 *
 * These are written once here rather than copied into each operation, because the refusals
 * are identical everywhere: `authMiddleware` produces the 401 and the 403, and
 * `errorMiddleware` produces the 400. Two of them are worded by resource, so those are built
 * by a function rather than a constant.
 *
 * Last Updated Date: October 1, 2026
 * @constant responses
 * @type {object}
 * @author Cesar
 */

/** DOCU: The single error body every failure is documented with. */
const errorResponse = (description) => ({
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

/**
 * DOCU: The refusals `authMiddleware` raises, shared by every endpoint that sits behind it.
 * @param {string} [blocked] - The 403 wording, which is the same for every route
 * @returns {object} The 401 and 403 response blocks
 */
const authResponses = (blocked = 'This account has been blocked. Contact an administrator.') => ({
    401: errorResponse(
        'No session, or the session is invalid or expired. The account behind it may also have ' +
            'been deleted. `validate_token` is how a client checks which of these it is.'
    ),
    403: errorResponse(blocked),
});

/** The 400 every validated body or path parameter can raise. */
const badRequest = errorResponse(
    'The request did not match the schema. `message` carries one entry per field that failed.'
);

/** The 404 every unknown or unowned record answers with. */
const notFound = errorResponse('No such record, or it is not yours to read.');

/** DOCU: A JSON body of `schema`, described by `description`. */
const jsonResponse = (description, schema) => ({
    description,
    content: { 'application/json': { schema } },
});

export { errorResponse, authResponses, badRequest, notFound, jsonResponse };
