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

/**
 * Query options for the signed-in user's board. Mutations update the cache directly, so no
 * refetch is needed.
 */
const getTasksQueryOptions = () =>
    queryOptions({
        queryKey: TASKS_KEY,
        queryFn: getAllTasks,
        staleTime: Infinity,
        retry: 1,
    });

export { getTasksQueryOptions };

/**
 * Query options for the dashboard's headline numbers. Short-lived rather than cached, so a task
 * created a moment ago is in the totals a moment later.
 */
const getAdminStatsQueryOptions = () =>
    queryOptions({
        queryKey: ADMIN_STATS_KEY,
        queryFn: async () => (await getAdminStats()).stats,
        staleTime: 30_000,
        retry: 1,
    });

/**
 * Query options for one page of the users table. The filter object is part of the key, so
 * switching a filter fetches a different page rather than re-rendering the previous one. The
 * fetch, the filtering, the sorting and the paging all happen in the API - the browser only
 * ever holds the rows it asked for.
 */
const getAdminUsersQueryOptions = (params) =>
    queryOptions({
        queryKey: adminUsersKey(params),
        queryFn: async ({ signal }) => (await getAdminUsers(params, { signal })).users,
        placeholderData: keepPreviousData,
        staleTime: 10_000,
        retry: 1,
    });

/**
 * Query options for a single user's detail, used to reopen the drawer with fresh numbers after
 * someone else changed the account.
 */
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