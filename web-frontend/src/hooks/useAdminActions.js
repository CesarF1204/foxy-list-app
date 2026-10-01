import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
    updateAdminUser,
    updateAdminUserRole,
    updateAdminUserStatus,
    updateAdminUserPassword,
    deleteAdminUser,
} from "../api-client/admin";
import { ADMIN_STATS_KEY, ADMIN_USERS_KEY, adminUserKey } from "../constants/queryKeys";
import { cacheSessionUser } from "../queryOptions/sessionQueryOptions";
import { TOAST_TYPES } from "../constants/toast";
import { getFullName } from "../helpers/globalHelper";

/**
 * The one success toast shape, so every admin action reports itself the same way. Errors are
 * raised as toasts by the caller, which has the context.
 */
const adminActionToast = (message) => ({ message, type: TOAST_TYPES.success });

/**
 * Every admin write, in one hook, so no screen can forget to refresh the dashboard. After a
 * confirmed change it does three things: it invalidates the users family and the stats, because
 * a rename, a role change, a block and a delete each change what both admin screens show; it
 * drops the returned row into the single-user cache so a drawer left open updates immediately;
 * and it offers the row to the session cache, because an admin editing *their own* account from
 * the users table is also the person behind the navbar - without that, their own rename would
 * leave the navbar and the greeting showing the old name until the next reload.
 */
const useAdminActions = () => {
    const queryClient = useQueryClient();

    /** Refetches the table and the totals after any change. */
    const refresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
        queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
    }, [queryClient]);

    /** Seeds the single-user cache with a row the API has just confirmed. */
    const cacheUser = useCallback(
        (user) => {
            if (user?._id) queryClient.setQueryData(adminUserKey(user._id), user);
        },
        [queryClient]
    );

    /** The shared post-success routine: cache the row, then refresh the screens. */
    const onUserSaved = ({ user }) => {
        cacheUser(user);
        /* A no-op unless the saved row is the account behind the session. */
        cacheSessionUser(queryClient, user);
        refresh();
    };

    /** The three mutations that answer with the updated user all behave alike. */
    const profileMutation = useMutation({
        mutationFn: updateAdminUser,
        onSuccess: onUserSaved,
    });

    const roleMutation = useMutation({
        mutationFn: updateAdminUserRole,
        onSuccess: onUserSaved,
    });

    const statusMutation = useMutation({
        mutationFn: updateAdminUserStatus,
        onSuccess: onUserSaved,
    });

    /**
     * The password endpoint returns only a message: the value is written once, never read back
     * and never returned, so there is no user to cache.
     */
    const passwordMutation = useMutation({
        mutationFn: updateAdminUserPassword,
        onSuccess: refresh,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteAdminUser,
        onSuccess: refresh,
    });

    return {
        /**
         * True while any admin write is in flight, so a dialog can disable its own buttons and
         * a second change cannot race the first.
         */
        isMutating:
            profileMutation.isPending ||
            roleMutation.isPending ||
            statusMutation.isPending ||
            passwordMutation.isPending ||
            deleteMutation.isPending,

        saveProfile: (payload) => profileMutation.mutateAsync(payload),
        changeRole: (payload) => roleMutation.mutateAsync(payload),
        changeStatus: (payload) => statusMutation.mutateAsync(payload),
        changePassword: (payload) => passwordMutation.mutateAsync(payload),
        deleteUser: (userId) => deleteMutation.mutateAsync(userId),

        /**
         * The wording for each success, kept beside the action it reports so a toast can never
         * name a task or a user the API did not touch.
         */
        toasts: {
            profileSaved: (user) => adminActionToast(`${getFullName(user)} updated`),
            roleChanged: (user, role) =>
                adminActionToast(
                    `${getFullName(user)} is now ${role === "admin" ? "an admin" : "a user"}`
                ),
            blocked: (user) => adminActionToast(`${getFullName(user)} has been blocked`),
            unblocked: (user) => adminActionToast(`${getFullName(user)} can sign in again`),
            passwordChanged: (user) => adminActionToast(`New password set for ${getFullName(user)}`),
            deleted: (user) =>
                adminActionToast(`${getFullName(user)} and their tasks were deleted`),
        },
    };
};

export { useAdminActions, adminActionToast };