/**
 * A stand-in OpenAPI document for the API viewer tests.
 *
 * Deliberately not the real Foxy List document. The viewer is meant to render whatever it is
 * handed, so a fixture full of widgets, health checks and a `health` tag proves it in a way a
 * copy of the production spec could not - and it is small enough that a failing assertion
 * points at the behaviour rather than at the data.
 *
 * It contains one of everything the viewer has to cope with: a tag, a path carrying two
 * verbs, a `$ref` in a body and in a response, an `allOf` that has to be flattened, a path
 * parameter, a query parameter, a secured operation, a public one, an enum and an id pattern.
 *
 * @author Cesar
 */
const SPEC = {
    openapi: "3.0.3",
    info: {
        title: "Widget API",
        version: "2.1.0",
        description: "A stand-in document for the tests.",
    },
    servers: [{ url: "http://localhost:5000" }],
    tags: [
        { name: "Widgets", description: "Everything about widgets." },
        { name: "Health", description: "Liveness." },
    ],
    paths: {
        "/api/widgets": {
            get: {
                tags: ["Widgets"],
                summary: "List widgets",
                security: [{ sessionCookie: [] }],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        description: "Which page.",
                        schema: { type: "integer" },
                    },
                ],
                responses: {
                    200: {
                        description: "The widgets.",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/WidgetList" },
                            },
                        },
                    },
                    401: { description: "No session." },
                },
            },
            post: {
                tags: ["Widgets"],
                summary: "Create a widget",
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateWidget" },
                        },
                    },
                },
                responses: { 201: { description: "Created." } },
            },
        },
        "/api/widgets/{id}": {
            delete: {
                tags: ["Widgets"],
                summary: "Delete a widget",
                security: [{ sessionCookie: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        description: "The widget's id.",
                        schema: { type: "string", pattern: "^[a-fA-F\\d]{24}$" },
                    },
                ],
                responses: { 200: { description: "Deleted." } },
            },
        },
        "/health": {
            get: {
                tags: ["Health"],
                summary: "Liveness probe",
                security: [],
                responses: { 200: { description: "Up." } },
            },
        },
    },
    components: {
        securitySchemes: {
            sessionCookie: { type: "apiKey", in: "cookie", name: "session" },
        },
        schemas: {
            Widget: {
                type: "object",
                properties: {
                    _id: { type: "string" },
                    name: { type: "string" },
                    colour: { type: "string", enum: ["red", "blue"] },
                },
                required: ["_id", "name"],
            },
            /**
             * The composed schema, and the case a renderer that only reads `properties`
             * would show as having no fields at all.
             */
            WidgetList: { allOf: [{ $ref: "#/components/schemas/Widget" }] },
            CreateWidget: {
                type: "object",
                properties: {
                    name: { type: "string", description: "What it is called." },
                    colour: { type: "string", description: "One of the two." },
                },
                required: ["name"],
            },
        },
    },
};

/** A document declaring nothing at all, for the empty and error states. */
const EMPTY_SPEC = { openapi: "3.0.3", info: { title: "Empty" }, paths: {} };

/**
 * A document whose paths the component has never heard of. Rendering it is the proof that no
 * endpoint list is written into the viewer.
 */
const UNKNOWN_SPEC = {
    openapi: "3.0.3",
    info: { title: "Other API", version: "1.0.0" },
    tags: [{ name: "Sprockets" }],
    paths: {
        "/api/sprockets/{code}": {
            patch: {
                tags: ["Sprockets"],
                summary: "Reflate a sprocket",
                security: [],
                responses: { 200: { description: "Done." } },
            },
        },
    },
    components: { schemas: {} },
};

export { SPEC, EMPTY_SPEC, UNKNOWN_SPEC };
