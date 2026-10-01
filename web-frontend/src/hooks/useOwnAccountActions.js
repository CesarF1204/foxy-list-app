import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateOwnProfile, updateOwnPassword } from "../api-client/users";
import { VALIDATE_TOKEN_KEY } from "../constants/queryKeys";
import { TOAST_TYPES } from "../constants/toast";
import { getFullName } from "../helpers/globalHelper";

/**
 * DOCU: The self-service counterpart to `useAdminActions`, for the View Profile
 * drawer.
 *
 * It presents the same shape `UserDrawer` already consumes - `saveProfile`,
 * `changePassword`, `isMutating`, and the `toasts` wording - so the drawer needs
 * no branching to tell the two contexts apart. Only the keys differ: a plain
 * user cannot change a role, a status or delete anybody, so those are absent
 * from this object rather than present and refused.
 *
 * A successful profile edit invalidates the session query. That is what makes
 * the navbar's own name and email update without a reload, and it is why this
 * is not simply the admin hook aimed at a different endpoint.
 *
 * Nothing here decides what is allowed. Both self-service routes take no id, so
 * they can only ever act on the caller's own account, and the role, status and
 * delete endpoints stay behind `requireAdmin` where they already were.
 */
const useOwnAccountActions = () => {
    const queryClient = useQueryClient();

    /* The saved row *is* the new session, so the session cache is the place
     * that has to learn about it. */
    const profileMutation = useMutation({
        mutationFn: updateOwnProfile,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: VALIDATE_TOKEN_KEY }),
    });

    /* The password endpoint answers with only a message: there is no row to
     * write back and nothing on screen changes. */
    const passwordMutation = useMutation({
        mutationFn: updateOwnPassword,
    });

    return {
        /** DOCU: True while either write is in flight, so a form or a dialog can
         *  disable its own controls and a second change cannot race the first. */
        isMutating: profileMutation.isPending || passwordMutation.isPending,

        /* No `userId` on either: these act on the account behind the session. */
        saveProfile: (profile) => profileMutation.mutateAsync(profile),
        changePassword: (payload) => passwordMutation.mutateAsync(payload),

        /** DOCU: The same wording the admin drawer uses, so a rename reports
         *  itself identically wherever it was made. */
        toasts: {
            profileSaved: (user) => ({
                message: `${getFullName(user)} updated`,
                type: TOAST_TYPES.success,
            }),
            passwordChanged: (user) => ({
                message: `New password set for ${getFullName(user)}`,
                type: TOAST_TYPES.success,
            }),
        },
    };
};

export { useOwnAccountActions };