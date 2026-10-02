import { Link, Navigate, useLocation } from "react-router-dom";
import { useAppContext } from "../contexts/useAppContext";
import { ROUTES } from "../constants/routes";
import { isAdmin } from "../constants/roles";
import { FullScreenLoader, ErrorState } from "./Feedback";

/**
 * Blocks a route until the session is known, then redirects. Without this, the board renders
 * before the token check finishes and the user sees an empty dashboard instead of being asked
 * to sign in.
 */
const RequireAuth = ({ children }) => {
    const { isAuthenticated, isAuthLoading } = useAppContext();
    const location = useLocation();

    if (isAuthLoading) return <FullScreenLoader label="Checking your session..." />;
    if (!isAuthenticated) {
        return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
    }

    return children;
};

/** Keeps signed-in users away from the sign-in and register pages. */
const RequireGuest = ({ children }) => {
    const { isAuthenticated, isAuthLoading } = useAppContext();

    if (isAuthLoading) return <FullScreenLoader label="Loading..." />;
    if (isAuthenticated) return <Navigate to={ROUTES.board} replace />;

    return children;
};

/** The admin area's guard. It waits for the session exactly as `RequireAuth` does. */
const RequireAdmin = ({ children }) => {
    const { user, isAuthenticated, isAuthLoading } = useAppContext();

    if (isAuthLoading) return <FullScreenLoader label="Checking your access..." />;
    if (!isAuthenticated) {
        return <Navigate to={ROUTES.login} replace />;
    }

    if (!isAdmin(user)) {
        return (
            <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-4 py-10 sm:px-6">
                <ErrorState
                    title="Administrators only"
                    message="Your account does not have access to the admin dashboard. If you think that is wrong, ask an administrator to change your role."
                />
                <Link to={ROUTES.board} className="btn btn-primary">
                    Back to my board
                </Link>
            </div>
        );
    }

    return children;
};

export { RequireAuth, RequireGuest, RequireAdmin };