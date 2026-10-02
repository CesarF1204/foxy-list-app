import { Link } from "react-router-dom";
import { Mascot } from "page-mascot";
import { useAppContext } from "../contexts/useAppContext";
import { BUILDER_SHEETS, BUILDER_LABEL } from "../constants/mascot";
import { ROUTES } from "../constants/routes";
import useMediaQuery from "../hooks/useMediaQuery";

/** The `sm` boundary, named once so the breakpoint lives in a single place. */
const WIDE_ENOUGH = "(min-width: 40rem)";

/**
 * Shown for any URL that does not match a route. The builder stands in rather than the app's
 * own fox, so a dead end does not look like the product.
 *
 * The mascot is sized from the viewport rather than declared twice with a `sm:hidden` pair.
 * It is a live button - clicking it changes its face - so two copies in the document would
 * leave a screen reader with two identically-labelled buttons, and a page find for "boop the
 * builder" with two matches. One element, one size.
 */
const NotFound = () => {
    const { isAuthenticated } = useAppContext();
    const isWide = useMediaQuery(WIDE_ENOUGH);

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 text-center sm:px-6">
            {/**
             * 140px on a phone, 180px from `sm` up. The builder is the whole
             * message here, and the shorter of the two keeps the button below it -
             * the one control on the page, on the page a dead end sends you to -
             * above the fold on a short viewport.
             */}
            <Mascot
                {...BUILDER_SHEETS}
                label={BUILDER_LABEL}
                size={isWide ? 180 : 140}
            />

            {/**
             * `text-5xl` on a phone, `text-6xl` from `sm`. "404" at 60px is about
             * 130px wide and fits either way; the step down is about the height of
             * the stack around it, not the digits.
             */}
            <p className="text-5xl font-extrabold text-fox-400 sm:text-6xl">404</p>

            <div>
                <h1 className="text-xl font-extrabold break-words text-ink sm:text-2xl">
                    This page wandered off
                </h1>
                <p className="mt-1.5 max-w-sm text-sm font-semibold text-ink-soft">
                    The link may be old or mistyped. Your tasks are still safe and sound.
                </p>
            </div>

            <Link
                to={isAuthenticated ? ROUTES.board : ROUTES.login}
                className="btn btn-primary w-full max-w-xs sm:w-auto"
            >
                {isAuthenticated ? "Back to my board" : "Go to sign in"}
            </Link>
        </div>
    );
};

export default NotFound;