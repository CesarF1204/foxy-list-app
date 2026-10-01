import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getOpenApiSpecQueryOptions } from "../../queryOptions/docsQueryOptions";
import { groupOperationsByTag, readSpecSummary } from "../../helpers/openapiHelper";
import { API_BASE_URL } from "../../api-client/client";
import { OPENAPI_PATH } from "../../api-client/docs";
import { FullScreenLoader, ErrorState, EmptyState, Spinner } from "../Feedback";
import { useDebouncedValue, SEARCH_DEBOUNCE_MS } from "../../hooks/useDebouncedValue";
import ApiGroup from "./ApiGroup";

/**
 * The API documentation viewer.
 *
 * Read-only on purpose. The specification is fetched from the backend and rendered as
 * whatever that document says - no endpoint is written down here, and no branch in this file
 * mentions a task or a user - so a new endpoint appears the moment the backend documents it,
 * and this component is never the thing that has to be updated. `openapiHelper.js` does the
 * reading; this file arranges the result on screen and handles the three states a request
 * can be in.
 *
 * Reusable by construction: it renders any OpenAPI 3 document. It is a viewer for this API
 * because that is what it is pointed at, not because it knows anything about it.
 *
 * The open endpoint lives here rather than in each row, because the viewer is what knows the
 * rows are siblings: one open at a time is a claim about the whole list, and a row holding its
 * own state could not enforce it. Opening one row replaces the key rather than adding to it,
 * so the row that was open closes by the same rule that opened the new one.
 *
 * @returns {JSX.Element} The viewer, or its loading or error state
 */
const ApiDocumentation = () => {
    /** What the box is bound to, so it responds to every keystroke. */
    const [filterInput, setFilterInput] = useState("");

    /**
     * The term the list is actually filtered by, and the box.
     *
     * Debounced like the users table's search, on the same delay, so the two feel alike:
     * matching every endpoint in a large specification on each keystroke re-renders the whole
     * list, and on a document with hundreds of paths that is enough to make the box feel like
     * it is lagging. The box stays bound to the immediate value, so it never waits on this.
     */
    const [filter] = useDebouncedValue(filterInput, SEARCH_DEBOUNCE_MS);

    /**
     * The one open endpoint, by `endpointKey`, or null when everything is closed.
     *
     * Held here so that opening an endpoint closes whichever was open before it. It is compared
     * against the rows rather than stored per row, so filtering an open endpoint out of the
     * list hides its panel with it and leaves no stale detail mounted behind the filter.
     */
    const [openKey, setOpenKey] = useState(null);

    /** Opening the row that is already open closes it; any other row replaces it. */
    const toggleEndpoint = (key) =>
        setOpenKey((current) => (current === key ? null : key));

    const { data: spec, isLoading, isFetching, isError, error, refetch } = useQuery(
        getOpenApiSpecQueryOptions()
    );

    /**
     * Whether a search is still being worked out.
     *
     * The list is filtered in the page rather than fetched, so "in flight" here is the gap
     * between the term in the box and the term the list is filtered by: a keystroke that has
     * not yet been committed by the debounce, or a document being refetched behind the
     * filter. Both are work the reader is waiting on, so both are what the box reports.
     *
     * Reading it as a difference between two states rather than as a separate flag means it
     * cannot disagree with them: the moment the term settles, the spinner goes, with no
     * effect to forget to run.
     */
    const isSearching = filterInput !== filter || (isFetching && !isLoading);

    /**
     * Grouping is a pure function of the document, so it is memoised rather than recomputed
     * on every keystroke of the filter box.
     */
    const groups = useMemo(() => groupOperationsByTag(spec), [spec]);
    const summary = useMemo(() => readSpecSummary(spec), [spec]);

    /** A group survives the filter if any one of its endpoints matches. */
    const visibleGroups = useMemo(() => {
        const term = filter.trim().toLowerCase();
        if (!term) return groups;

        return groups
            .map((group) => ({
                ...group,
                endpoints: group.endpoints.filter((endpoint) =>
                    `${endpoint.method} ${endpoint.path} ${endpoint.summary}`
                        .toLowerCase()
                        .includes(term)
                ),
            }))
            .filter((group) => group.endpoints.length > 0);
    }, [groups, filter]);

    if (isLoading) {
        return <FullScreenLoader label="Loading the API documentation..." />;
    }

    if (isError) {
        return (
            <div className="p-6">
                <ErrorState
                    title="Could not load the API documentation"
                    message={error?.message ?? "The OpenAPI specification could not be read."}
                    onRetry={refetch}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {summary.description && (
                <section className="surface p-5">
                    <h2 className="text-base font-extrabold text-ink">About this API</h2>
                    <p className="mt-2 text-sm leading-relaxed font-semibold whitespace-pre-line text-ink-soft">
                        {summary.description}
                    </p>
                </section>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <label className="sr-only" htmlFor="api-docs-filter">
                    Filter endpoints
                </label>

                {/* The box and its spinner, in a `relative` wrapper rather than one element:
                    the ring is positioned against the field's own box, and it is rendered
                    inside it so the two can never be separated by a wrap on a narrow screen.
                    The wrapper keeps `max-w-sm` from the input, so the field is exactly as
                    wide as it was before the spinner existed. */}
                <div className="relative w-full max-w-sm">
                    <input
                        id="api-docs-filter"
                        type="search"
                        value={filterInput}
                        onChange={(event) => setFilterInput(event.target.value)}
                        placeholder="Filter by method, path or description"
                        /** `aria-busy` states the search is unfinished; the words beside the
                            ring say the same thing to anyone who cannot see it spin. */
                        aria-busy={isSearching}
                        className={`field ${isSearching ? "pr-11!" : ""}`}
                    />

                    {isSearching && (
                        /** The app's one spinner, at its smallest size, in the app's own
                            colours - the same ring the full-page loader and the refresh
                            overlay use, so this reads as the product's loading state and
                            not as decoration invented for this field. `pointer-events-none`
                            because the box is still typed into while it spins, and
                            `right-4` clears the field's own padding. `role="status"` wraps a
                            live region around it, so the state is announced once rather
                            than on every keystroke. */
                        <span
                            className="pointer-events-none absolute inset-y-0 right-4 flex items-center"
                            role="status"
                        >
                            <span className="sr-only">Searching the documentation...</span>
                            <Spinner size="xs" />
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="btn btn-neutral py-1.5! text-xs!"
                >
                    Reload spec
                </button>
            </div>

            {visibleGroups.length === 0 ? (
                <EmptyState
                    title={filter ? "Nothing matches that filter" : "No endpoints documented"}
                    description={
                        filter
                            ? "Try a shorter term, or clear the filter to see every endpoint."
                            : "The backend served a specification with no endpoints in it."
                    }
                />
            ) : (
                visibleGroups.map((group) => (
                    <ApiGroup
                        key={group.name}
                        group={group}
                        openKey={openKey}
                        onToggle={(key) => toggleEndpoint(key)}
                    />
                ))
            )}

            {/* Where the document itself lives, so a reader can go and read the raw JSON.
                Composed as one string rather than as adjacent nodes, so it copies out of the
                page as one address rather than as two fragments. */}
            <p className="text-xs font-semibold text-ink-faint">
                Generated from{" "}
                <code className="font-mono break-anywhere">{`${API_BASE_URL}${OPENAPI_PATH}`}</code>
                . Swagger UI is at{" "}
                <code className="font-mono break-anywhere">{`${API_BASE_URL}/api-docs`}</code>.
            </p>
        </div>
    );
};

export default ApiDocumentation;
