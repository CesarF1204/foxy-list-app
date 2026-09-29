import { useContext } from "react";
import { AppContext } from "./appContextObject";

/**
 * DOCU: Accesses the app context. <br>
 * Throws a clear error when used outside the provider, rather than returning
 * undefined and failing later somewhere unrelated.
 * @returns {object} { showToast, toast, user, isAuthenticated, isAuthLoading, clearSession }
 */
const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppContext must be used within an AppContextProvider");
    }
    return context;
};

export { useAppContext };