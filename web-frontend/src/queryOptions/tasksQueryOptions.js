import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { getAllTasks } from "../api-client/tasks";
import { TASKS_KEY } from "../constants/queryKeys";
import {
    getAdminStats,
    getAdminUsers,
    getAdminUser,
} from "../api-client/admin";
import {
    ADMIN_STATS_KEY,
    ADMIN_USERS_KEY,
    adminUsersKey,
    adminUserKey,
} from "../constants/queryKeys";

/** DOCU: Query options for the signed-in user's board. Mutations update the cache
 *  directly, so no refetch is needed. */
const getTasksQueryOptions = () =>
    queryOptions({
        queryKey: TASKS_KEY,
        queryFn: getAllTasks,
        staleTime: Infinity,
        retry: 1,
    });

export { getTasksQueryOptions };

/** DOCU: Query options for the dashboard's headline numbers. Short-lived rather
 *  than cached, so a task created a moment ago is in the totals a moment later. */
const getAdminStatsQueryOptions = () =>
    queryOptions({
        queryKey: ADMIN_STATS_KEY,
        queryFn: async () => (await getAdminStats()).stats,
        staleTime: 30_000,
        retry: 1,
    });

/**
 * DOCU: Query options for one page of the users table. The filter object is part
 * of the key, so switching a filter fetches a different page rather than
 * re-rendering the previous one. The fetch, the filtering, the sorting and the
 * paging all happen in the API - the browser only ever holds the rows it asked
 * for.
 *
 * The key is also what makes the search race-safe, so no ordering check is
 * needed on top. Searching "jo" and then "john" starts two different queries;
 * each writes to its own cache entry, and the table only ever reads the entry
 * for the term it is currently showing. A slow "jo" response can therefore
 * never land on top of the newer "john" rows. React Query also aborts the
 * superseded request through the `signal` below, so the browser stops working
 * on a query nobody is waiting for.
 *
 * `keepPreviousData` is what keeps the table on screen while a new key loads.
 * Without it, changing a filter blanks the table to a loading state and the
 * card jumps; with it, the previous page stays put and dimmed under the
 * refresh overlay until the new rows arrive. The previous data is only ever a
 * placeholder - it is marked as such, and the request it belongs to is still in
 * flight - so it can never be shown as if it were the answer to the current
 * filter.
 *
 * @param {object} params - { search, role, status, sortBy, sortDir, page, pageSize }
 */
const getAdminUsersQueryOptions = (params) =>
    queryOptions({
        queryKey: adminUsersKey(params),
        queryFn: async ({ signal }) => (await getAdminUsers(params, { signal })).users,
        placeholderData: keepPreviousData,
        staleTime: 10_000,
        retry: 1,
    });

/** DOCU: Query options for a single user's detail, used to reopen the drawer
 *  with fresh numbers after someone else changed the account. */
const getAdminUserQueryOptions = (userId) =>
    queryOptions({
        queryKey: adminUserKey(userId),
        queryFn: async () => (await getAdminUser(userId)).user,
        staleTime: 10_000,
        retry: 1,
    });

export {
    getAdminStatsQueryOptions,
    getAdminUsersQueryOptions,
    getAdminUserQueryOptions,
    ADMIN_USERS_KEY,
};