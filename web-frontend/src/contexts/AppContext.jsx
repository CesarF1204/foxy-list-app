import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { validateToken } from "../api-client/auth";
import { VALIDATE_TOKEN_KEY } from "../constants/queryKeys";
import { AppContext } from "./appContextObject";
import Toast from "../components/Toast";

const AppContextProvider = ({ children }) => {
    const [toast, setToast] = useState(undefined);
    const queryClient = useQueryClient();

    /**
     * DOCU: Shows a toast notification. The id lets the toast restart its
     * timer when the same message is shown twice in a row.
     */
    const showToast = useCallback((toastMessage) => {
        setToast({ ...toastMessage, id: Date.now() });
    }, []);

    const closeToast = useCallback(() => setToast(undefined), []);

    /* Check whether the user has a valid session cookie. */
    const { data, isLoading, isError } = useQuery({
        queryKey: VALIDATE_TOKEN_KEY,
        queryFn: validateToken,
        retry: false,
        staleTime: Infinity,
    });

    /* isError here means there is no usable session. */
    const isAuthenticated = Boolean(data?.user) && !isError;

    /** DOCU: Clears every cached query so the next user starts clean. */
    const clearSession = useCallback(() => {
        queryClient.clear();
    }, [queryClient]);

    return (
        <AppContext.Provider
            value={{
                showToast,
                /** The toast on screen, or undefined. Exposed so anything reacting
                 *  to app state (the auth mascot) reads one source rather than
                 *  re-deriving it. A snapshot of right now, not a log. */
                toast,
                user: data?.user,
                isAuthenticated,
                isAuthLoading: isLoading,
                clearSession,
            }}
        >
            {toast && (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={closeToast}
                />
            )}
            {children}
        </AppContext.Provider>
    );
};

export { AppContextProvider };