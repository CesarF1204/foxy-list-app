import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateOwnProfile, updateOwnPassword } from "../api-client/users";
import { VALIDATE_TOKEN_KEY } from "../constants/queryKeys";
import { TOAST_TYPES } from "../constants/toast";
import { getFullName } from "../helpers/globalHelper";

/** The self-service counterpart to `useAdminActions`, for the View Profile drawer. */
const useOwnAccountActions = () => {
    const queryClient = useQueryClient();

    /**
     * The saved row *is* the new session, so the session cache is the place that has to learn
     * about it.
     */
    const profileMutation = useMutation({
        mutationFn: updateOwnProfile,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: VALIDATE_TOKEN_KEY }),
    });

    /**
     * The password endpoint answers with only a message: there is no row to write back and
     * nothing on screen changes.
     */
    const passwordMutation = useMutation({
        mutationFn: updateOwnPassword,
    });

    return {
        /**
         * True while either write is in flight, so a form or a dialog can disable its own
         * controls and a second change cannot race the first.
         */
        isMutating: profileMutation.isPending || passwordMutation.isPending,

        /** No `userId` on either: these act on the account behind the session. */
        saveProfile: (profile) => profileMutation.mutateAsync(profile),
        changePassword: (payload) => passwordMutation.mutateAsync(payload),

        /**
         * The same wording the admin drawer uses, so a rename reports itself identically
         * wherever it was made.
         */
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