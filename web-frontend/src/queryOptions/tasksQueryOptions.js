import { queryOptions } from "@tanstack/react-query";
import { getAllTasks } from "../api-client/tasks";
import { TASKS_KEY } from "../constants/queryKeys";

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