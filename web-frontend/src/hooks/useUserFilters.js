import { useEffect, useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE, DEFAULT_USER_SORT, SORT_DIRECTIONS } from "../constants/admin";

/** DOCU: How long the search box waits after the last keystroke before the table
 *  asks the API for a new page. Long enough to skip the requests made while
 *  still typing, short enough that the table feels live. */
const SEARCH_DEBOUNCE_MS = 1500;

/**
 * DOCU: The users table's filter, sort and paging state, and the one object the
 * query is keyed on.
 *
 * Two decisions live here rather than in the page. First, the search term is
 * debounced while the role and the status apply at once, because typing is a
 * stream and picking a filter is a click. Second, every filter change returns to
 * page 1: staying on page 7 of a list that now has two pages would show an empty
 * table, and the API would clamp it anyway - better to be honest about the
 * filter and land on the first page.
 *
 * The hook owns the split that makes typing usable, and the page must not undo
 * it: the search box is bound to `searchInput` (what the user has typed, right
 * now) and the request is keyed on `search` (what they finished typing, once
 * they paused). Binding the input to `search` instead makes the field lag a
 * keystroke behind and React rewrites it, so the search resets mid-word.
 *
 * @returns {object} the live input value, the params the query is keyed on, plus
 *   the setters and a `clear` helper
 */
const useUserFilters = () => {
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [sortBy, setSortBy] = useState(DEFAULT_USER_SORT);
    const [sortDir, setSortDir] = useState(SORT_DIRECTIONS.desc);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    /* The debounce. The committed term is what the query uses, so the input can
     * stay responsive while the request waits. Typing "john" sets `searchInput`
     * four times and `search` once: the input updates on every keystroke, the
     * table asks the API once. Bailing out when the term is unchanged keeps a
     * pause between two words, or a filter change, from re-running the query. */
    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (searchInput === search) return;

            setSearch(searchInput);
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [searchInput, search]);

    /* Only the committed term reaches the query, and the object is kept stable
     * between renders so an unrelated render cannot hand React Query a new key. */
    const params = useMemo(
        () => ({ search, role, status, sortBy, sortDir, page, pageSize }),
        [search, role, status, sortBy, sortDir, page, pageSize],
    );

    /* Any filter narrowing the list invalidates the current page number. */
    const changeRole = (value) => {
        setRole(value);
        setPage(1);
    };

    const changeStatus = (value) => {
        setStatus(value);
        setPage(1);
    };

    const changePageSize = (value) => {
        setPageSize(value);
        setPage(1);
    };

    /** DOCU: Clicking the active column again reverses the order, which is the
     *  behaviour every table has trained people to expect. */
    const toggleSort = (field) => {
        if (field === sortBy) {
            setSortDir((current) => (current === "asc" ? "desc" : "asc"));
            return;
        }
        setSortBy(field);
        setSortDir(field === DEFAULT_USER_SORT ? SORT_DIRECTIONS.desc : SORT_DIRECTIONS.asc);
        setPage(1);
    };

    const clear = () => {
        setSearchInput("");
        setSearch("");
        setRole("");
        setStatus("");
        setPage(1);
    };

    return {
        params,
        /* The live value for the search box, and the term the query is using. */
        searchInput,
        search,
        sortBy,
        sortDir,
        setPage,
        setSearchInput,
        changeRole,
        changeStatus,
        changePageSize,
        toggleSort,
        clear,
    };
};

export { useUserFilters, SEARCH_DEBOUNCE_MS };