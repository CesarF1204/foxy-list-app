import { authResponses, badRequest, errorResponse, jsonResponse } from './responses.js';

/**
 * DOCU: The public half of `routes/userRoutes.js`, plus the one route that lives in the
 * router named for authentication.
 *
 * Written by hand rather than scraped from the Express router: the router knows which
 * handlers to call and nothing else, so a generated spec could only repeat what it read. The
 * comments here say *why* a route exists; the router file says what it does.
 *
 * The split below mirrors the split in the router. The public entry points are registered
 * before the session guard, and each says so with an explicit `security: []` rather than
 * relying on the document-level default - which is also why signing in lives in the *users*
 * router and the session check lives in the *auth* one.
 *
 * Last Updated Date: October 1, 2026
 * @constant authPaths
 * @type {object}
 * @author Cesar
 */
const authPaths = {
    /** The session check, in the router named for it. */
    '/api/auth/validate_token': {
        get: {
            tags: ['Authentication'],
            summary: 'Validate the current session',
            description:
                'Returns the account behind the session cookie. A client calls this once on ' +
                'load to decide between the board and the sign-in screen - a 401 here means ' +
                '"no session", not "the server is broken".',
            security: [{ sessionCookie: [] }],
            responses: {
                200: jsonResponse('The signed-in account.', {
                    type: 'object',
                    properties: { user: { $ref: '#/components/schemas/User' } },
                }),
                ...authResponses(),
            },
        },
    },

    '/api/users/register': {
        post: {
            tags: ['Authentication'],
            summary: 'Register an account',
            description:
                'Creates an account. A `role` or `status` in the body is refused with a 400 ' +
                'rather than ignored, so a crafted request cannot promote itself. The one ' +
                'exception is the very first account on an empty database, which the server ' +
                'promotes to admin itself.',
            security: [],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } },
                },
            },
            responses: {
                201: jsonResponse('The new account, without a password.', {
                    $ref: '#/components/schemas/RegisterResponse',
                }),
                400: badRequest,
                409: {
                    description: 'That email is already registered.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
            },
        },
    },
    '/api/users/sign_in': {
        post: {
            tags: ['Authentication'],
            summary: 'Sign in',
            description:
                'Signs an account in and sets the session cookie. A blocked account is ' +
                'refused with a 403, and wrong credentials with a 401 that does not say which ' +
                'of the two was wrong.',
            security: [],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/SignInRequest' } },
                },
            },
            responses: {
                200: jsonResponse('The token, for clients that cannot hold a cookie, and the account.', {
                    $ref: '#/components/schemas/SignInResponse',
                }),
                400: badRequest,
                401: {
                    description: 'The email or the password is wrong.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
                403: {
                    description: 'The account exists but has been blocked.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
            },
        },
    },

    '/api/users/logout': {
        post: {
            tags: ['Authentication'],
            summary: 'Sign out',
            description: 'Clears the session cookie. It answers 200 even with no session.',
            security: [],
            responses: {
                200: jsonResponse('Signed out.', { $ref: '#/components/schemas/Message' }),
            },
        },
    },

    '/api/users/forgot_password': {
        post: {
            tags: ['Authentication'],
            summary: 'Start password recovery',
            description:
                'Answers with the same message whether or not the address is registered, so ' +
                'the endpoint cannot be used to find out who has an account.',
            security: [],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordRequest' } },
                },
            },
            responses: {
                200: jsonResponse('Recovery started, if that address is registered.', {
                    $ref: '#/components/schemas/Message',
                }),
                400: badRequest,
            },
        },
    },

    '/api/users/reset_password': {
        put: {
            tags: ['Authentication'],
            summary: 'Set a new password',
            description:
                'Completes recovery. The new password may not be the one already in force: ' +
                'the server compares it against the stored hash and refuses it, so the ' +
                'current password is never sent and never echoed back.',
            security: [],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } },
                },
            },
            responses: {
                200: jsonResponse('The password was changed.', { $ref: '#/components/schemas/Message' }),
                400: badRequest,
                404: {
                    description: 'No account exists for that address.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
            },
        },
    },

    /** The self-service pair, registered after the guard in the same router. */
    '/api/users/profile': {
        patch: {
            tags: ['Authentication'],
            summary: 'Update your own profile',
            description:
                'Self-service, and only self-service: the account comes from the verified ' +
                'session and never from the body or the path, so there is nothing here that ' +
                'could name a different user. `role` and `status` are still refused with a 400.',
            security: [{ sessionCookie: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/UpdateProfileRequest' } },
                },
            },
            responses: {
                200: jsonResponse('The updated account.', {
                    type: 'object',
                    properties: { user: { $ref: '#/components/schemas/User' } },
                }),
                400: badRequest,
                ...authResponses(),
                409: {
                    description: 'That email already belongs to another account.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
            },
        },
    },

    '/api/users/password': {
        put: {
            tags: ['Authentication'],
            summary: 'Set your own new password',
            description:
                'Self-service password change for the signed-in account. Takes no id and no ' +
                'current password: the account is the one behind the verified session, and ' +
                'the server compares the candidate against the stored hash itself.',
            security: [{ sessionCookie: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': { schema: { $ref: '#/components/schemas/SetPasswordRequest' } },
                },
            },
            responses: {
                200: jsonResponse('The password was changed.', { $ref: '#/components/schemas/Message' }),
                400: badRequest,
                ...authResponses(),
            },
        },
    },

    /**
     * The one endpoint that takes a file rather than a JSON body.
     *
     * POST rather than PATCH: the avatar travels as a multipart part, and a client can never
     * name its own URL. The 400 covers the three refusals - wrong format, over 5 MB, no file.
     */
    '/api/users/avatar': {
        post: {
            tags: ['Authentication'],
            summary: 'Upload your own profile picture',
            description:
                'Stores a new profile picture for the signed-in account and answers with the ' +
                'updated account. Self-service: the account comes from the verified session, so ' +
                'there is no id to name and no way to reach another account\'s picture.\n\n' +
                'The file must be a JPG or PNG of at most 5 MB, and both the extension and the ' +
                'reported MIME type are checked. The image is stored by Cloudinary and only its ' +
                'URL is kept, so the server holds no image data.\n\n' +
                'A failed upload never overwrites an existing picture: the image reaches ' +
                'Cloudinary before anything is written to the account, so a rejected file or a ' +
                'Cloudinary outage leaves the current profile picture exactly as it was.',
            security: [{ sessionCookie: [] }],
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
                400: errorResponse(
                    'The upload was refused: the file is not a JPG or PNG, it is larger than ' +
                        '5 MB, or no file was sent at all. The stored picture is unchanged.'
                ),
                ...authResponses(),
            },
        },
    },
};

export { authPaths };

