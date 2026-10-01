import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSessionQueryOptions } from "../queryOptions/sessionQueryOptions";
import { AppContext } from "./appContextObject";
import Toast from "../components/Toast";

const AppContextProvider = ({ children }) => {
    const [toast, setToast] = useState(undefined);
    const queryClient = useQueryClient();

    /**
     * Shows a toast notification. The id lets the toast restart its timer when the same message
     * is shown twice in a row.
     */
    const showToast = useCallback((toastMessage) => {
        setToast({ ...toastMessage, id: Date.now() });
    }, []);

    const closeToast = useCallback(() => setToast(undefined), []);

    /** Check whether the user has a valid session cookie. */
    const { data, isLoading, isError } = useQuery(getSessionQueryOptions());

    /** isError here means there is no usable session. */
    const isAuthenticated = Boolean(data?.user) && !isError;

    /** Clears every cached query so the next user starts clean. */
    const clearSession = useCallback(() => {
        queryClient.clear();
    }, [queryClient]);

    return (
        <AppContext.Provider
            value={{
                showToast,
                toast,
                closeToast,
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