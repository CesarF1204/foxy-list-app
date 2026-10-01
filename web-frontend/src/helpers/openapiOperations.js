import { resolveRef, flattenSchema, isObjectIdPattern } from "./openapiSchemas";

/**
 * DOCU: Turns the whole OpenAPI document into the groups the viewer renders.
 *
 * The second half of the app's OpenAPI knowledge, and the last of it: `openapiSchemas.js`
 * reads the schema language, this file reads the document. Everything downstream of here
 * receives plain data - a method, a path, a list of fields - and knows nothing about
 * OpenAPI, which is what lets the same components render a document from any backend, or
 * from a future version of this one, without being touched.
 */

/**
 * The verbs this viewer renders, in the order they appear within one path. Anything outside
 * the list is skipped rather than rendered oddly: a document that introduced `HEAD` or
 * `OPTIONS` would still be valid, and omitting the entry beats showing a verb the page has
 * no styling for.
 */
const HTTP_VERBS = ["get", "post", "put", "patch", "delete"];

/**
 * DOCU: The request body of an operation, as a list of fields.
 *
 * @param {object} operation - The OpenAPI operation
 * @param {object} spec - The whole document
 * @returns {{required: boolean, fields: object[]}|null} The body, or null when there is none
 */
const readRequestBody = (operation, spec) => {
    const content = operation?.requestBody?.content?.["application/json"];
    if (!content) return null;

    const schema = flattenSchema(resolveRef(content.schema, spec), spec);

    return {
        required: Boolean(operation.requestBody.required),
        fields: Object.entries(schema.properties ?? {}).map(([name, field]) => ({
            name,
            type: field.$ref ? field.$ref.replace("#/components/schemas/", "") : field.type ?? "object",
            required: (schema.required ?? []).includes(name),
            description: field.description ?? "",
            enum: field.enum ?? [],
        })),
    };
};

/**
 * DOCU: The parameters of an operation, path ones first.
 *
 * Each keeps its `in`, because "which id goes where" is the question a reader of
 * `PUT /api/admin/users/{id}/role` actually has.
 *
 * @param {object} operation - The OpenAPI operation
 * @param {object} spec - The whole document
 * @returns {object[]} The parameters
 */
const readParameters = (operation, spec) =>
    [...(operation?.parameters ?? [])]
        .sort((a, b) => Number(a.in !== "path") - Number(b.in !== "path"))
        .map((parameter) => {
            const schema = resolveRef(parameter.schema, spec) ?? parameter.schema ?? {};

            return {
                name: parameter.name,
                in: parameter.in,
                required: Boolean(parameter.required),
                type: schema.type ?? "string",
                description: parameter.description ?? "",
                enum: schema.enum ?? [],
                /** Whether the type is the 24 character id this API uses throughout. */
                isId: isObjectIdPattern(schema.pattern),
            };
        });

/**
 * DOCU: The responses of an operation, success codes first.
 *
 * Sorted numerically, so 404 follows 200 rather than preceding it the way a string sort
 * would order them, and each names the schema it returns so a reader can tell `{ task }`
 * from `{ tasks }` without opening anything.
 *
 * @param {object} operation - The OpenAPI operation
 * @returns {object[]} The responses
 */
const readResponses = (operation) =>
    Object.entries(operation?.responses ?? {})
        .map(([status, response]) => ({
            status,
            description: response.description ?? "",
            schema: response.content?.["application/json"]?.schema?.$ref
                ?.replace("#/components/schemas/", "")
                ?? null,
        }))
        .sort((a, b) => Number(a.status) - Number(b.status));

export { HTTP_VERBS, readRequestBody, readParameters, readResponses };
