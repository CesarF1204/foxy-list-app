import { queryOptions } from "@tanstack/react-query";
import { getOpenApiSpec } from "../api-client/docs";
import { OPENAPI_SPEC_KEY } from "../constants/queryKeys";

/**
 * Query options for the backend's OpenAPI document.
 *
 * Cached hard (`staleTime: Infinity`) and not refetched on focus, because the document is
 * generated from the server's own code: within the lifetime of one running backend it
 * cannot change. A developer who has just changed an endpoint restarts the API, and the
 * page's own Reload control re-asks for it - which is also why nothing invalidates this key
 * behind the viewer's back.
 */
const getOpenApiSpecQueryOptions = () =>
    queryOptions({
        queryKey: OPENAPI_SPEC_KEY,
        queryFn: ({ signal }) => getOpenApiSpec({ signal }),
        staleTime: Infinity,
        gcTime: Infinity,
        retry: 1,
    });

export { getOpenApiSpecQueryOptions };
