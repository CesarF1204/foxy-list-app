import { Link } from "react-router-dom";
import { Mascot } from "page-mascot";
import { useAppContext } from "../contexts/useAppContext";
import { BUILDER_SHEETS, BUILDER_LABEL } from "../helpers/mascotSheets";

/**
 * DOCU: Shown for any URL that does not match a route. <br>
 * The builder stands in rather than the app's own fox: a hard hat suits a page
 * about something not being built, and it keeps a dead end from looking like
 * part of the product. The call to action points somewhere sensible whether or
 * not the visitor is signed in.
 */
const NotFound = () => {
    const { isAuthenticated } = useAppContext();

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            <Mascot {...BUILDER_SHEETS} label={BUILDER_LABEL} size={140} />

            <p className="text-6xl font-extrabold text-fox-400">404</p>

            <div>
                <h1 className="text-2xl font-extrabold text-ink">This page wandered off</h1>
                <p className="mt-1.5 max-w-sm text-sm font-semibold text-ink-soft">
                    The link may be old or mistyped. Your tasks are still safe and sound.
                </p>
            </div>

            <Link to={isAuthenticated ? "/" : "/login"} className="btn btn-primary">
                {isAuthenticated ? "Back to my board" : "Go to sign in"}
            </Link>
        </div>
    );
};

export default NotFound;