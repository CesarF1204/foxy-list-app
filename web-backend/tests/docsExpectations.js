/**
 * The expected shape of the OpenAPI document, written out independently of
 * `swagger/openapi.js`.
 *
 * This is the file that makes the documentation a claim rather than a copy. Everything in it
 * is what the API is *supposed* to expose, so if a route is added, changed or removed and
 * the spec is not updated with it, the suite fails on the difference. Keeping it out of the
 * `swagger/` directory is deliberate: a check written by reading the implementation can only
 * confirm the implementation.
 *
 * Last Updated Date: October 1, 2026
 * @author Cesar
 */

/** The verbs a path item may declare. */
const HTTP_VERBS = ['get', 'post', 'put', 'patch', 'delete'];

/** A concrete id, so a documented `{id}` can be probed against the running server. */
const PROBE_ID = '000000000000000000000000';

/**
 * The documentation endpoints, as the spec documents them.
 *
 * `/api-docs` is spelled without the trailing slash here because that is how the path
 * appears in the document. The request below it carries the slash, which is what a browser
 * sends when someone types the address; both reach the same route.
 */
const DOC_ROUTES = ['/openapi.json', '/api-docs'];

/** Where the documentation is actually requested, with the slash a browser sends. */
const DOC_REQUESTS = ['/openapi.json', '/api-docs/'];

/**
 * Every route the API exposes, with the verb and whether it needs a session.
 *
 * Read against `routes/`: `authRoutes` is one guarded route, `userRoutes` splits into five
 * public routes and two guarded ones, `taskRoutes` is guarded in full, and `adminRoutes` is
 * guarded in full behind the admin role - which is why the whole table below lists them as
 * requiring a session.
 */
const DOCUMENTED_OPERATIONS = [
    ['/api/auth/validate_token', 'get', true],
    ['/api/users/register', 'post', false],
    ['/api/users/sign_in', 'post', false],
    ['/api/users/logout', 'post', false],
    ['/api/users/forgot_password', 'post', false],
    ['/api/users/reset_password', 'put', false],
    ['/api/users/profile', 'patch', true],
    ['/api/users/password', 'put', true],
    ['/api/tasks', 'get', true],
    ['/api/tasks', 'post', true],
    ['/api/tasks/move', 'put', true],
    ['/api/tasks/{id}', 'get', true],
    ['/api/tasks/{id}', 'patch', true],
    ['/api/tasks/{id}', 'delete', true],
    ['/api/admin/stats', 'get', true],
    ['/api/admin/users', 'get', true],
    ['/api/admin/users/{id}', 'get', true],
    ['/api/admin/users/{id}', 'patch', true],
    ['/api/admin/users/{id}', 'delete', true],
    ['/api/admin/users/{id}/role', 'put', true],
    ['/api/admin/users/{id}/status', 'put', true],
    ['/api/admin/users/{id}/password', 'put', true],
];

/**
 * The routes that take no request body, and so answer 200 to an empty request rather than
 * refusing it for a missing one.
 *
 * Only sign-out is in here, and it is genuinely bodyless: it clears a cookie and answers.
 * A probe that assumed "public means 400" would read its success as a mismatch.
 */
const BODYLESS_ROUTES = ['/api/users/logout'];

/**
 * DOCU: Every `$ref` target in the document, walked once.
 *
 * A dangling reference is the failure mode a hand-written spec actually has: a schema is
 * renamed and one operation keeps pointing at the old name. Swagger UI renders that as a
 * silently missing model and a JSON consumer as an unresolved pointer, so it is checked here
 * rather than left to whoever opens the page.
 * @param {object} spec - The document
 * @returns {string[]} The referenced schema names that do not exist
 */
const danglingRefs = (spec) => {
    const names = new Set();

    JSON.stringify(spec, (key, value) => {
        if (key === '$ref' && typeof value === 'string') {
            const prefix = '#/components/schemas/';
            if (value.startsWith(prefix)) names.add(value.slice(prefix.length));
        }
        return value;
    });

    return [...names].filter((name) => !spec.components?.schemas?.[name]);
};

export {
    HTTP_VERBS,
    PROBE_ID,
    DOC_ROUTES,
    DOC_REQUESTS,
    DOCUMENTED_OPERATIONS,
    BODYLESS_ROUTES,
    danglingRefs,
};
