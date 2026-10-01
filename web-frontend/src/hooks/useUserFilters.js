import { useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE, DEFAULT_USER_SORT, SORT_DIRECTIONS } from "../constants/admin";
import { useDebouncedValue, SEARCH_DEBOUNCE_MS } from "./useDebouncedValue";

/** The users table's filter, sort and paging state, and the one object the query is keyed on. */
const useUserFilters = () => {
    const [searchInput, setSearchInput] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [sortBy, setSortBy] = useState(DEFAULT_USER_SORT);
    const [sortDir, setSortDir] = useState(SORT_DIRECTIONS.desc);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    /**
     * The debounce, and the only filter not applied on every keystroke.
     *
     * The box is bound to `searchInput` so it stays responsive, while the query reads the
     * settled `search` - typing "john" updates the box four times and asks the API once.
     * The term coming back to what it already was is settled immediately rather than waiting
     * out the pause, so clearing the box does not leave a stale term in the query for a second
     * and a half.
     */
    const [search, settleSearch] = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

    /**
     * The page number, which is only meaningful for the term it was chosen under.
     *
     * Held as `{ term, page }` rather than a bare number so a new term can invalidate it in the
     * same render that reads it: page 2 of a three page list has no page 2 in a one page
     * result, so a search has to start again from page 1.
     *
     * The remembered page is the source of truth while the term is unchanged, which is every
     * page button press. When the term moves on, `page` reads 1 and the remembered value is
     * overwritten on the way past - one piece of state, no effect, and no render showing the
     * new term alongside the page being left behind.
     */
    const [paging, setPaging] = useState({ term: search, page: 1 });

    if (paging.term !== search) {
        setPaging({ term: search, page: 1 });
    }

    const page = paging.term === search ? paging.page : 1;

    /** Paging by hand is a deliberate choice, so it only applies to the term in view. */
    const changePage = (value) => setPaging({ term: search, page: value });

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
        changePage(1);
    };

    const changeStatus = (value) => {
        setStatus(value);
        changePage(1);
    };

    const changePageSize = (value) => {
        setPageSize(value);
        changePage(1);
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
        changePage(1);
    };

    const clear = () => {
        setSearchInput("");
        settleSearch("");
        setRole("");
        setStatus("");
        changePage(1);
    };

    return {
        params,
        searchInput,
        search,
        sortBy,
        sortDir,
        setPage: changePage,
        setSearchInput,
        changeRole,
        changeStatus,
        changePageSize,
        toggleSort,
        clear,
    };
};

export { useUserFilters, SEARCH_DEBOUNCE_MS };