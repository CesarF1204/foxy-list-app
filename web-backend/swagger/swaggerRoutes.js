import swaggerUi from 'swagger-ui-express';
import { buildOpenApiSpec } from './openapi.js';
import { HTTP_STATUS } from '../constants/http.js';

/** Where the specification itself is served, and what the UI is pointed at. */
const OPENAPI_JSON_PATH = '/openapi.json';

/** Where the Swagger UI is mounted. */
const SWAGGER_UI_PATH = '/api-docs';

/**
 * DOCU: Swagger UI's own settings.
 *
 * `docExpansion: 'none'` so the page opens as a readable list of resources rather than a wall
 * of expanded operations. Everything else is the default: this UI is read-mostly, and its
 * "Try it out" is a convenience for poking at the API, not the app's way of working - the
 * frontend never executes requests out of the documentation.
 */
const SWAGGER_UI_OPTIONS = {
    docExpansion: 'none',
    defaultModelsExpandDepth: 1,
    customSiteTitle: 'Foxy List API',
};

/**
 * DOCU: Builds the document once, at mount time.
 *
 * A module-level constant rather than a per-request build, because the document is derived
 * from code and the environment and both are fixed by the time the server starts listening -
 * rebuilding it on every request would produce an identical object at a real cost. The
 * environment is read inside `buildOpenApiSpec`, which `server.js` only reaches after
 * `dotenv.config()` has run.
 */
const openApiSpec = buildOpenApiSpec();

/**
 * DOCU: Serves the OpenAPI document and the Swagger UI that renders it.
 *
 * Three routes, and none of them is guarded. Documentation that requires a session is
 * documentation nobody can read while setting a session up, and neither the document nor the
 * UI contains anything the routes do not already state - the schemas describe shapes, not
 * data. That is also why the frontend can fetch `/openapi.json` cross-origin: the same CORS
 * allowlist every other request passes through applies here.
 *
 * The UI is told to serve the JSON from this same origin rather than reaching for a CDN, so
 * it works on a machine with no outbound internet.
 *
 * Last Updated Date: October 1, 2026
 * @function swaggerRoutes
 * @param {object} app - The Express app
 * @returns {void} Registers the documentation routes
 * @author Cesar
 */
const swaggerRoutes = (app) => {
    /**
     * The document. Serialised per request rather than handed over as the shared object,
     * so no client can reach through the response and mutate what the next request sees,
     * and so the content type cannot be negotiated into something else by a future
     * middleware.
     */
    app.get(OPENAPI_JSON_PATH, (req, res) => {
        res.set('Content-Type', 'application/json').status(HTTP_STATUS.OK).send(
            JSON.stringify(openApiSpec)
        );
    });

    /** Swagger UI's own assets, then the page itself. */
    app.use(SWAGGER_UI_PATH, swaggerUi.serve, swaggerUi.setup(openApiSpec, SWAGGER_UI_OPTIONS));
};

export { swaggerRoutes, openApiSpec, OPENAPI_JSON_PATH, SWAGGER_UI_PATH };
