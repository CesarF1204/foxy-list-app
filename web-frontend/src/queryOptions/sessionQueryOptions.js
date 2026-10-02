import { queryOptions } from "@tanstack/react-query";

import { validateToken } from "../api-client/auth";
import { VALIDATE_TOKEN_KEY } from "../constants/queryKeys";

/**
 * The session query. `staleTime: Infinity` because the cookie only changes when the app asks it
 * to - on sign-in, sign-out or a write that touches the account - so nothing here is ever
 * refetched behind the user's back.
 */
const getSessionQueryOptions = () =>
    queryOptions({
        queryKey: VALIDATE_TOKEN_KEY,
        queryFn: validateToken,
        retry: false,
        staleTime: Infinity,
    });

/**
 * The session's copy of an account, rebuilt from the fields the session actually carries.
 *
 * The admin API answers with a wider row (task counts, an aggregated full name), so the row is
 * narrowed here rather than merged wholesale: the session must not grow fields nothing reads.
 */
const toSessionUser = (user) => ({
    _id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
});

/**
 * Writes a just-saved account into the session cache, so the navbar and the greeting follow a
 * rename the moment it is saved instead of on the next reload.
 *
 * Only the account behind the session is written. An admin editing somebody else's row leaves
 * the session untouched, and a row saved before the session was ever read is a no-op: the
 * provider fetches it on its own.
 */
const cacheSessionUser = (queryClient, user) => {
    const session = queryClient.getQueryData(VALIDATE_TOKEN_KEY);

    if (!session?.user || !user?._id) return;
    if (String(session.user._id) !== String(user._id)) return;

    queryClient.setQueryData(VALIDATE_TOKEN_KEY, {
        ...session,
        user: toSessionUser({ ...session.user, ...user }),
    });
};

/**
 * Asks the API who the session belongs to, forcing the request even though the query is
 * otherwise never refetched on its own.
 *
 * This is the step between signing in and moving on. The sign-in answer says the password was
 * right, but it does not prove the browser kept the cookie it was handed: the API can only
 * answer this question by reading that cookie back. A device slow enough to still be storing it
 * when the app navigates would otherwise arrive at a protected route with no session at all.
 * `staleTime: 0` overrides the session query's cache-first rule so the answer comes from the
 * network rather than from a value written a moment ago.
 */
const confirmSession = (queryClient) =>
    queryClient.fetchQuery({ ...getSessionQueryOptions(), staleTime: 0 });

export { getSessionQueryOptions, cacheSessionUser, confirmSession };
