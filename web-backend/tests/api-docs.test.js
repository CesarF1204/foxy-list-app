import { req, check, show, state } from './helpers.js';
import {
    HTTP_VERBS,
    PROBE_ID,
    DOC_ROUTES,
    DOC_REQUESTS,
    DOCUMENTED_OPERATIONS,
    BODYLESS_ROUTES,
    danglingRefs,
} from './docsExpectations.js';

/**
 * DOCU: Fetches the document and checks its shape on its own terms.
 *
 * Everything asserted here is a property of the document alone, so this half of the suite
 * would pass identically against a server whose routes had drifted. The other half is what
 * compares the two.
 *
 * @returns {Promise<object>} The fetched document
 */
const specShape = async () => {
    const res = await req('GET', DOC_ROUTES[0], undefined, { auth: false });

    check('the spec is served without a session', res.status, 200);
    check('the spec is JSON, not an error page', res.data?.openapi !== undefined, true);

    const spec = res.data;

    check('it declares an OpenAPI version', spec?.openapi, '3.0.3');
    check('it is titled', spec?.info?.title, 'Foxy List API');
    check('it carries a version', typeof spec?.info?.version, 'string');
    check(
        'it explains cookie authentication in the description',
        /cookie/i.test(spec?.info?.description ?? ''),
        true
    );

    check('it names at least one server', (spec?.servers?.length ?? 0) > 0, true);
    check(
        'it declares a cookie security scheme',
        spec?.components?.securitySchemes?.sessionCookie?.in,
        'cookie'
    );
    check(
        'the scheme names the cookie the server actually sets',
        spec?.components?.securitySchemes?.sessionCookie?.name,
        'session'
    );
    check('it has component schemas', Object.keys(spec?.components?.schemas ?? {}).length > 0, true);
    check('every reference resolves', danglingRefs(spec).length, 0);

    /**
     * A tag list is what groups the endpoints in both Swagger UI and the frontend viewer, so
     * an operation tagged with something absent from `tags` would render in no group at all.
     */
    const declaredTags = new Set((spec?.tags ?? []).map((tag) => tag.name));

    for (const [path, item] of Object.entries(spec?.paths ?? {})) {
        for (const verb of HTTP_VERBS) {
            const operation = item?.[verb];
            if (!operation) continue;

            const at = `${verb.toUpperCase()} ${path}`;

            check(`${at} has a summary`, Boolean(operation.summary), true);
            check(`${at} has a tag`, (operation.tags?.length ?? 0) > 0, true);
            check(
                `${at} is tagged with a declared tag`,
                operation.tags.every((tag) => declaredTags.has(tag)),
                true
            );
            check(`${at} has responses`, Object.keys(operation.responses ?? {}).length > 0, true);
            check(
                `${at} describes every response`,
                Object.values(operation.responses ?? {}).every((r) => Boolean(r.description)),
                true
            );

            /**
             * A guarded operation must document both refusals the middleware can raise,
             * because a client deciding what to do with a failure reads this, not the code.
             * A public one must say so explicitly rather than inherit the document default,
             * since "inherits the default" is exactly how a public route ends up documented
             * as guarded.
             */
            if (operation.security?.length) {
                check(`${at} documents its 401`, Boolean(operation.responses?.['401']), true);
                check(`${at} documents its 403`, Boolean(operation.responses?.['403']), true);
            } else {
                check(`${at} opts out of the document's security`, Array.isArray(operation.security), true);
            }
        }
    }

    return spec;
};

/**
 * DOCU: Checks the document against the routes, so the two cannot quietly disagree.
 *
 * Each documented operation is sent to the real server exactly as the spec describes it -
 * no session, no body - and has to answer with the status its own `security` and validation
 * entries predict. That is what makes this a drift check rather than a restatement of the
 * document: a route that stopped requiring a session, or that began accepting an empty
 * body, fails here.
 *
 * @param {object} spec - The already-fetched document
 * @returns {Promise<void>} Resolves when every operation has been probed
 */
const specMatchesRoutes = async (spec) => {
    for (const [path, verb, guarded] of DOCUMENTED_OPERATIONS) {
        const operation = spec.paths?.[path]?.[verb];
        const at = `${verb.toUpperCase()} ${path}`;

        check(`${at} is documented`, Boolean(operation), true);

        /** The spec's own claim about the guard, compared with the routes'. */
        check(`${at} agrees about authentication`, Boolean(operation?.security?.length), guarded);

        const concrete = path.replace('{id}', PROBE_ID);
        const res = await req(verb.toUpperCase(), concrete, undefined, { auth: false });

        /**
         * A guarded route answers 401 with no cookie. A public one answers 400 for a missing
         * body - except the routes that take none, which succeed, and the spec says so too.
         */
        const expected = guarded ? 401 : BODYLESS_ROUTES.includes(path) ? 200 : 400;

        check(`${at} answers ${expected} as documented`, res.status, expected);

        /**
         * Every documented refusal has to actually be the JSON `{ message }` the `Error`
         * schema claims, because that one field is what the frontend reads.
         */
        if (res.status >= 400) {
            check(`${at} answers with the documented error shape`, res.data?.message !== undefined, true);
        }
    }
};

/**
 * DOCU: Checks that both documentation routes are reachable, and that the UI really renders.
 *
 * @returns {Promise<void>} Resolves when both routes have been probed
 */
const docRoutes = async () => {
    const spec = await req('GET', DOC_REQUESTS[0], undefined, { auth: false });
    check('the spec is reachable with no session', spec.status, 200);

    const ui = await req('GET', DOC_REQUESTS[1], undefined, { auth: false });

    check('Swagger UI is served without a session', ui.status, 200);
    check(
        "Swagger UI is served as HTML, not as the API's JSON",
        typeof ui.data === 'string' && ui.data.includes('<!DOCTYPE html>'),
        true
    );
    check('Swagger UI mounts its renderer', String(ui.data).includes('id="swagger-ui"'), true);
    check('Swagger UI is titled for this API', String(ui.data).includes('Foxy List API'), true);

    /**
     * Swagger UI fetches its assets from this same origin rather than from a CDN, so the page
     * still works on a machine with no outbound internet.
     */
    const asset = await req('GET', '/api-docs/swagger-ui.css', undefined, { auth: false });
    check('Swagger UI serves its own assets', asset.status, 200);

    show('openapi.json', spec);
};

/**
 * DOCU: Runs the documentation suite.
 *
 * Called from `tests/run.js` alongside the four behavioural suites, and on its own by
 * `npm run test:docs`. It creates no accounts and mutates nothing, so it is safe to run at
 * any point in the sequence - and it runs against a server that has to already be listening,
 * like every other suite here.
 *
 * @returns {Promise<void>} Resolves when every check has run
 */
const documentation = async () => {
    console.log('\n--- Documentation ---');

    const spec = await specShape();

    /**
     * Compared against the distinct paths rather than the operation count: two of the
     * documented operations share `/api/tasks`, and a path count below the operation count
     * would be correct rather than a missing route.
     */
    const expectedPaths = new Set(DOCUMENTED_OPERATIONS.map(([path]) => path));

    check(
        'every known route is documented',
        [...expectedPaths].every((path) => Boolean(spec.paths?.[path])),
        true
    );
    check(
        'the document documents nothing that is not a known route',
        Object.keys(spec.paths ?? {}).every(
            (path) => expectedPaths.has(path) || DOC_ROUTES.includes(path) || path === '/'
        ),
        true
    );

    await specMatchesRoutes(spec);
    await docRoutes();
};

export { documentation };

/** Allow the file to be run on its own, not only through tests/run.js */
if (process.argv[1]?.endsWith('api-docs.test.js')) {
    documentation()
        .then(() => {
            console.log(
                `\n===== ${state.checks - state.failures}/${state.checks} checks passed, ${state.failures} failed =====`
            );
            process.exit(state.failures ? 1 : 0);
        })
        .catch((error) => {
            console.error('\nTEST RUNNER ERROR:', error.message);
            process.exit(2);
        });
}
