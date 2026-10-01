/**
 * Reading an OpenAPI document into plain data.
 *
 * This is the only file in the app that knows what an OpenAPI document looks like. Every
 * component downstream receives plain objects and no notion of `$ref` or `allOf`, which is
 * what lets the same components render a document from any backend rather than from this
 * one in particular.
 */

/**
 * DOCU: Reads the meaning out of a 24 character ObjectId pattern.
 *
 * Every id in this API looks the same, so the pattern itself carries nothing worth showing.
 * Recognising it lets the viewer say what the pattern *means* instead.
 *
 * @param {string} [pattern] - The schema's pattern
 * @returns {boolean} Whether this is an id pattern rather than a real constraint
 */
const isObjectIdPattern = (pattern) => typeof pattern === "string" && pattern.includes("24");

/**
 * DOCU: Follows a `$ref` to the schema it names.
 * @param {object} spec - The whole document, which is where the components live
 * @param {string} ref - A local pointer such as `#/components/schemas/Task`
 * @returns {object|null} The schema, or null when the pointer does not resolve
 */
const resolveRef = (schema, spec) => {
    if (typeof schema?.$ref !== "string") return schema ?? null;
    if (!schema.$ref.startsWith("#/components/schemas/")) return null;

    return spec?.components?.schemas?.[schema.$ref.replace("#/components/schemas/", "")] ?? null;
};

/**
 * DOCU: Flattens a schema's `allOf` into one object schema.
 *
 * `allOf` is how OpenAPI expresses inheritance, and both composed schemas in this API use
 * it - `AdminUser`, which is a `User` plus task counts, and the users-table envelope. A
 * renderer that only read `properties` would show them as having no fields at all, so the
 * members are merged here instead.
 *
 * @param {object} schema - The schema to flatten, already dereferenced
 * @param {object} spec - The whole document, for the members' own references
 * @returns {object} One schema with the merged properties
 */
const flattenSchema = (schema, spec) => {
    if (!schema) return { properties: {}, required: [] };

    const { allOf, ...rest } = schema;
    const own = { ...rest, properties: { ...rest.properties }, required: [...(rest.required ?? [])] };

    if (!allOf) return own;

    return allOf.reduce((merged, member) => {
        const flat = flattenSchema(resolveRef(member, spec), spec);

        return {
            ...merged,
            ...flat,
            properties: { ...merged.properties, ...flat.properties },
            required: [...new Set([...(merged.required ?? []), ...(flat.required ?? [])])],
        };
    }, own);
};

export { isObjectIdPattern, resolveRef, flattenSchema };
