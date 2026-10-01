import { apiRequest } from "./client";

/** Where the backend serves its OpenAPI document. Relative, like every other call. */
const OPENAPI_PATH = "/openapi.json";

/**
 * Fetches the backend's OpenAPI specification.
 *
 * The one request in the app whose response shape is not a resource: the body is the whole
 * document, unwrapped in no envelope, so it is returned as-is rather than unwrapped the way
 * `tasks.js` and `admin.js` unwrap theirs. Nothing here reads a field out of it - the
 * viewer takes the document whole, which is what keeps it free of any knowledge about which
 * endpoints exist.
 */
const getOpenApiSpec = (options) => apiRequest(OPENAPI_PATH, options);

export { OPENAPI_PATH, getOpenApiSpec };
