import { commonSchemas } from './schemas/commonSchemas.js';
import { userSchemas } from './schemas/userSchemas.js';
import { requestSchemas } from './schemas/requestSchemas.js';
import { responseSchemas } from './schemas/responseSchemas.js';
import { authPaths } from './paths/authPaths.js';
import { taskPaths } from './paths/taskPaths.js';
import { adminPaths } from './paths/adminPaths.js';
import { systemPaths } from './paths/systemPaths.js';
import { jsonResponse } from './paths/responses.js';
import { AUTH_COOKIE_NAME } from '../config/cookies.js';

/**
 * DOCU: The tags, in the order the API is meant to be read.
 *
 * Swagger UI groups by tag in this order, and so does the frontend viewer, so this list is a
 * reading order rather than an alphabet: who you are, then your tasks, then the admin tools.
 */
const API_TAGS = [
    { name: 'Authentication', description: 'Registering, signing in and the signed-in account.' },
    { name: 'Tasks', description: 'The three-board task list. Every route is scoped to the caller.' },
    { name: 'Admin', description: 'The dashboard and the users table. Admin role required.' },
    { name: 'System', description: 'Health checks and this documentation.' },
];

/**
 * DOCU: The one security scheme, which is a cookie rather than a header.
 *
 * The API is cookie based: the session JWT is set as an httpOnly cookie, which is why there
 * is no bearer token for a client to hold. `AUTH_COOKIE_NAME` is imported rather than retyped
 * so the scheme cannot end up naming a cookie the server does not set.
 */
const API_SECURITY_SCHEMES = {
    sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: AUTH_COOKIE_NAME,
        description:
            'The session JWT, set as an httpOnly cookie by `POST /api/users/sign_in` and ' +
            'cleared by `POST /api/users/logout`. Send it as `Cookie: session=<token>`. A ' +
            'client that cannot hold cookies can send the same token in that header; the API ' +
            'reads the cookie either way.',
    },
};

/**
 * DOCU: The prose every reader of the spec sees first, written once here.
 *
 * It is the two things a newcomer gets wrong otherwise: that auth is a cookie rather than a
 * header, and that every failure is `{ message }`.
 */
const API_DESCRIPTION = [
    'The backend for the Foxy List todo board: accounts, a three-board task list, and an',
    'admin dashboard.',
    '',
    '### Authentication',
    '',
    'Auth is cookie based. `POST /api/users/sign_in` sets the session JWT as an httpOnly',
    '`session` cookie, and every guarded route reads that cookie and answers 401 without it.',
    'The sign-in response also carries the raw token, for clients that cannot hold a cookie.',
    '',
    '### Errors',
    '',
    'Every failure is `{ "message": ... }`, and a validation failure carries one message per',
    'field as an array. The frontend reads that one field and nothing else, so no endpoint in',
    'this document describes an error body of any other shape.',
].join('\n');

/**
 * DOCU: Builds the OpenAPI document.
 *
 * A function rather than a constant because the server list is read from the environment at
 * call time, the same way `config/cookies.js` does it: `server.js` loads `.env` after the
 * imports are evaluated, so a top-level read would always see undefined and would document
 * the wrong address.
 *
 * Built once here and handed out read-only, so a handler cannot mutate what the next request
 * sees.
 *
 * Last Updated Date: October 1, 2026
 * @function buildOpenApiSpec
 * @returns {object} The OpenAPI 3.0.3 document
 * @author Cesar
 */
const buildOpenApiSpec = () => {
    const port = process.env.PORT || 5000;
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();

    return {
        openapi: '3.0.3',
        info: {
            title: 'Foxy List API',
            version: '1.0.0',
            description: API_DESCRIPTION,
        },

        servers: [
            { url: `http://localhost:${port}`, description: 'This server, on its own port' },
            { url: frontendUrl, description: 'The frontend origin, for CORS-configured clients' },
        ],

        tags: API_TAGS,

        /** The document-level default; the public routes opt out with `security: []`. */
        security: [{ sessionCookie: [] }],

        paths: {
            ...authPaths,
            ...taskPaths,
            ...adminPaths,
            ...systemPaths,
        },

        components: {
            securitySchemes: API_SECURITY_SCHEMES,
            schemas: {
                ...commonSchemas,
                ...userSchemas,
                ...requestSchemas,
                ...responseSchemas,
            },
        },
    };
};

export { buildOpenApiSpec, API_TAGS, API_SECURITY_SCHEMES };
