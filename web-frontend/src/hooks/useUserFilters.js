import { useEffect, useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE, DEFAULT_USER_SORT, SORT_DIRECTIONS } from "../constants/admin";

const SEARCH_DEBOUNCE_MS = 1500;

/** The users table's filter, sort and paging state, and the one object the query is keyed on. */
const useUserFilters = () => {
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [sortBy, setSortBy] = useState(DEFAULT_USER_SORT);
    const [sortDir, setSortDir] = useState(SORT_DIRECTIONS.desc);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    /**
     * The debounce. The committed term is what the query uses, so the input can stay responsive
     * while the request waits. Typing "john" sets `searchInput` four times and `search` once:
     * the input updates on every keystroke, the table asks the API once. Bailing out when the
     * term is unchanged keeps a pause between two words, or a filter change, from re-running
     * the query.
     */
    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (searchInput === search) return;

            setSearch(searchInput);
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [searchInput, search]);

    /**
     * Only the committed term reaches the query, and the object is kept stable between renders
     * so an unrelated render cannot hand React Query a new key.
     */
    const params = useMemo(
        () => ({ search, role, status, sortBy, sortDir, page, pageSize }),
        [search, role, status, sortBy, sortDir, page, pageSize],
    );

    /** Any filter narrowing the list invalidates the current page number. */
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

    /**
     * Clicking the active column again reverses the order, which is the behaviour every table
     * has trained people to expect.
     */
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