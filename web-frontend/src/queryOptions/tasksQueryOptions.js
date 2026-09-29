import { queryOptions } from "@tanstack/react-query";
import { getAllTasks } from "../api-client/tasks";

/** The query key holding the signed-in user's tasks. */
export const TASKS_KEY = ["tasks"];

/**
 * DOCU: Query options for the signed-in user's task board. <br>
 * Mutations update the cache directly, so no refetch is needed.
 */
const getTasksQueryOptions = () =>
    queryOptions({
        queryKey: TASKS_KEY,
        queryFn: getAllTasks,
        staleTime: Infinity,
        retry: 1,
    });

export { getTasksQueryOptions };