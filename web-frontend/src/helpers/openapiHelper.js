import { HTTP_VERBS, readRequestBody, readParameters, readResponses } from "./openapiOperations";

/**
 * DOCU: Groups every documented operation by its tag.
 *
 * Endpoints are grouped by the *first* tag, because the first names the resource and any
 * others are a cross-cutting concern that would only scatter the list. Groups follow the
 * document's own `tags` order where it declares them, so a reader sees the API in the order
 * its author intended; anything undeclared goes last rather than being dropped.
 *
 * An operation with no tag at all lands in "Untagged" rather than vanishing - a document that
 * omits a tag is incomplete, and hiding the route would hide that too.
 *
 * @param {object} spec - The OpenAPI document
 * @returns {object[]} One group per tag: { name, description, endpoints }
 */
const groupOperationsByTag = (spec) => {
    const byTag = new Map();

    for (const [path, item] of Object.entries(spec?.paths ?? {})) {
        if (!item || typeof item !== "object") continue;

        for (const [verb, operation] of Object.entries(item)) {
            if (!HTTP_VERBS.includes(verb)) continue;
            if (!operation || typeof operation !== "object") continue;

            const tags = operation.tags?.length ? operation.tags : ["Untagged"];
            const tag = tags[0];

            if (!byTag.has(tag)) byTag.set(tag, []);
            byTag.get(tag).push({
                /** The verb as a path segment, and as the label the badge shows. */
                method: verb.toUpperCase(),
                /** The path as documented, `{id}` included - that is the readable form. */
                path,
                summary: operation.summary ?? "",
                description: operation.description ?? "",
                /**
                 * True when the operation needs a session, rather than having opted out of
                 * the document's default. An absent `security` means it inherits, and an
                 * inherited guard is still a guard.
                 */
                secured: operation.security === undefined || operation.security.length > 0,
                parameters: readParameters(operation, spec),
                requestBody: readRequestBody(operation, spec),
                responses: readResponses(operation),
            });
        }
    }

    const declaredTags = (spec?.tags ?? []).map((entry) => entry.name);
    const ordered = [
        ...declaredTags.filter((name) => byTag.has(name)),
        ...[...byTag.keys()].filter((name) => !declaredTags.includes(name)).sort(),
    ];

    const descriptions = new Map((spec?.tags ?? []).map((entry) => [entry.name, entry.description]));

    return ordered.map((name) => ({
        name,
        description: descriptions.get(name) ?? "",
        endpoints: byTag.get(name),
    }));
};

/**
 * DOCU: The document's headline, for the page above the endpoint list.
 *
 * Read defensively throughout: this renders whatever the backend served, and a document
 * missing a field should produce a shorter header rather than a blank page.
 *
 * @param {object} spec - The OpenAPI document
 * @returns {{title: string, version: string, description: string, endpointCount: number}}
 */
const readSpecSummary = (spec) => ({
    title: spec?.info?.title ?? "API",
    version: spec?.info?.version ?? "",
    description: spec?.info?.description ?? "",
    endpointCount: Object.values(spec?.paths ?? {}).reduce(
        (total, item) =>
            total + Object.keys(item ?? {}).filter((verb) => HTTP_VERBS.includes(verb)).length,
        0
    ),
});

/**
 * DOCU: The identity of one documented operation, across the whole viewer.
 *
 * A path alone is not unique - `GET /api/widgets` and `POST /api/widgets` are two operations on
 * the same path - so the verb is part of the key. Every layer that needs to name an endpoint
 * uses this, so the row's React key, the "which one is open" state and the list never drift
 * apart into three slightly different identities for the same operation.
 *
 * @param {object} endpoint - One operation from `groupOperationsByTag`
 * @returns {string} A stable key for that operation
 */
const endpointKey = ({ method, path }) => `${method}-${path}`;

export { groupOperationsByTag, readSpecSummary, endpointKey };
