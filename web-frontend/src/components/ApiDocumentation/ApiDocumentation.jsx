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
 * The API documentation viewer. Read-only: the specification is fetched from the backend and
 * rendered as that document says, so a new endpoint appears the moment it is documented.
 *
 * @returns {JSX.Element} The viewer, or its loading or error state
 */
const ApiDocumentation = () => {
    /** What the box is bound to, so it responds to every keystroke. */
    const [filterInput, setFilterInput] = useState("");

    /** The debounced term the list is filtered by. The box stays bound to the input. */
    const [filter] = useDebouncedValue(filterInput, SEARCH_DEBOUNCE_MS);

    /** The one open endpoint, so opening one closes whichever was open before it. */
    const [openKey, setOpenKey] = useState(null);

    /** Opening the row that is already open closes it; any other row replaces it. */
    const toggleEndpoint = (key) =>
        setOpenKey((current) => (current === key ? null : key));

    const { data: spec, isLoading, isFetching, isError, error, refetch } = useQuery(
        getOpenApiSpecQueryOptions()
    );

    /** True while the typed term and the filtered term disagree, or the spec is refetching. */
    const isSearching = filterInput !== filter || (isFetching && !isLoading);

    /** Memoised: grouping is a pure function of the document. */
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

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <label className="sr-only" htmlFor="api-docs-filter">
                    Filter endpoints
                </label>

                <div className="relative w-full max-w-sm">
                    <input
                        id="api-docs-filter"
                        type="search"
                        value={filterInput}
                        onChange={(event) => setFilterInput(event.target.value)}
                        placeholder="Filter by method, path or description"
                        aria-busy={isSearching}
                        className={`field ${isSearching ? "pr-11!" : ""}`}
                    />

                    {isSearching && (
                        /** Spins while the box is still being typed into. */
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
                    className="btn btn-neutral py-2! text-sm! sm:py-1.5! sm:text-xs!"
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

            {/* Composed as one string, so it copies out of the page as one address. */}
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
