import { jsonResponse } from './responses.js';

/**
 * DOCU: The paths that document the API rather than being part of it.
 *
 * The liveness probe is declared here too even though it is registered inline in `server.js`
 * rather than in a router, so that the spec covers every path the server actually answers.
 * The two documentation routes are included for the same reason: a reader who opens the spec
 * should be able to see where to fetch it from.
 *
 * Last Updated Date: October 1, 2026
 * @constant systemPaths
 * @type {object}
 * @author Cesar
 */
const systemPaths = {
    '/': {
        get: {
            tags: ['System'],
            summary: 'Liveness probe',
            description:
                'Answers while the server is up. Meant for a container or a load balancer: ' +
                'it touches no database and needs no session.',
            security: [],
            responses: {
                200: jsonResponse('The API is running.', {
                    $ref: '#/components/schemas/HealthResponse',
                }),
            },
        },
    },

    '/openapi.json': {
        get: {
            tags: ['System'],
            summary: 'This specification',
            description:
                'The document you are reading. The frontend API viewer fetches this URL and ' +
                'renders it, and any OpenAPI-aware tool can consume the same URL.',
            security: [],
            responses: {
                200: jsonResponse('The OpenAPI document.', {
                    type: 'object',
                    description: 'The full document, as `openapi`, `info`, `paths` and `components`.',
                    properties: {
                        openapi: { type: 'string', example: '3.0.3' },
                        info: { type: 'object' },
                        paths: { type: 'object' },
                    },
                }),
            },
        },
    },

    '/api-docs': {
        get: {
            tags: ['System'],
            summary: 'Swagger UI',
            description:
                'The interactive Swagger UI, rendered from `/openapi.json`. Its "Try it ' +
                'out" sends real requests, so it needs a session cookie for anything guarded.',
            security: [],
            responses: {
                200: {
                    description: 'The Swagger UI page.',
                    content: { 'text/html': { schema: { type: 'string' } } },
                },
            },
        },
    },
};

export { systemPaths };
