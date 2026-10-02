import { useCallback, useRef, useState } from "react";

import { uploadAvatar } from "../api-client/users";
import { cacheSessionUser } from "../queryOptions/sessionQueryOptions";
import { AVATAR_MESSAGES, validateAvatarFile } from "../constants/user";
import { TOAST_TYPES } from "../constants/toast";
import { useAppContext } from "../contexts/useAppContext";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Owns one profile-picture upload: the file input, the progress of the request in flight, and
 * the toast that reports how it ended.
 *
 * Progress is local state rather than mutation state: it changes dozens of times a second, and
 * routing that through the query cache would re-render every subscriber on every byte.
 *
 * @param {object} [options] - Who the picture is being set for
 * @param {(file: File, onProgress: Function) => Promise<object>} [options.upload] - The endpoint
 *   to call. Left off, it is self-service: the account behind the session is the one that
 *   changes, and the answer is written back into the session cache so the navbar follows. An
 *   admin acting on another account supplies the admin endpoint, which is the only way to name
 *   a different account - and then the session is left alone, because the answer describes the
 *   row on screen rather than the person behind the cookie.
 * @returns {object} The input ref, the progress, and the handler that opens the picker
 */
const useAvatarUpload = ({ upload } = {}) => {
    const inputRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const queryClient = useQueryClient();
    const { showToast } = useAppContext();

    /** Opens the system file picker. The input itself is invisible. */
    const openFilePicker = useCallback(() => {
        /** Also guards the keyboard path, which a disabled button would not. */
        if (isUploading) return;

        inputRef.current?.click();
    }, [isUploading]);

    const handleFileChange = useCallback(
        async (event) => {
            const file = event.target.files?.[0];

            /** Cleared first, so the same file can be chosen again after a failure. */
            event.target.value = "";

            if (!file) return;

            /** The client's own check. The server enforces the same rules independently. */
            const problem = validateAvatarFile(file);
            if (problem) {
                showToast({ message: problem, type: TOAST_TYPES.error });
                return;
            }

            setIsUploading(true);
            setProgress(0);

            try {
                /**
                 * The endpoint is chosen here, not as a default parameter: the self-service
                 * one is read only when a file is actually sent, so a screen that merely
                 * renders this control never depends on it.
                 */
                const send = upload ?? uploadAvatar;

                const saved = await send(file, setProgress);

                /**
                 * Only self-service writes the answer into the session cache, because only
                 * self-service answers about the account behind it. An admin's answer describes
                 * the row in the drawer, and seeding the session with that would put the wrong
                 * person behind the navbar - so those caches are the caller's mutation's job.
                 */
                if (!upload) cacheSessionUser(queryClient, saved?.user);

                showToast({ message: saved?.message ?? "Profile picture updated", type: TOAST_TYPES.success });
            } catch (error) {
                /** Nothing was written, so the picture on screen is still the account's. */
                showToast({
                    message: error?.message ?? AVATAR_MESSAGES.type,
                    type: TOAST_TYPES.error,
                });
            } finally {
                /** Always cleared: the ring is gone and the avatar is clickable again. */
                setIsUploading(false);
                setProgress(0);
            }
        },
        [queryClient, showToast, upload]
    );

    return { inputRef, progress, isUploading, openFilePicker, handleFileChange };
};

export { useAvatarUpload };