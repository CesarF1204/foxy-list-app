import { Navigate, useLocation } from "react-router-dom";
import { useAppContext } from "../contexts/useAppContext";
import { FullScreenLoader } from "./Feedback";

/**
 * DOCU: Blocks a route until the session is known, then redirects
 * unauthenticated users to the sign-in page. <br>
 * Without this, the board renders before the token check finishes and the user
 * sees an empty dashboard instead of being asked to sign in.
 */
const RequireAuth = ({ children }) => {
    const { isAuthenticated, isAuthLoading } = useAppContext();
    const location = useLocation();

    if (isAuthLoading) return <FullScreenLoader label="Checking your session..." />;
    if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;

    return children;
};

/** DOCU: Keeps signed-in users away from the sign-in and register pages. */
const RequireGuest = ({ children }) => {
    const { isAuthenticated, isAuthLoading } = useAppContext();

    if (isAuthLoading) return <FullScreenLoader label="Loading..." />;
    if (isAuthenticated) return <Navigate to="/" replace />;

    return children;
};

export { RequireAuth, RequireGuest };