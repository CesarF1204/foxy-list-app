import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mascot } from "page-mascot";
import {
    getFullName,
    getInitials,
    getAvatarImage,
    getTodayLabel,
} from "../../helpers/globalHelper";
import { MASCOT_SHEETS, MASCOT_LABEL } from "../../helpers/mascotSheets";
import { CONTROL_ICON } from "../../helpers/controlStyles";
import LogOut from "./LogOut";

/**
 * DOCU: The app navbar. <br>
 * Always visible. When signed in it carries the brand, the mascot, today's
 * date and the account menu; when signed out it shows the sign-in call to
 * action instead, so there is always a way into the account area.
 */
const Navbar = ({ user }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const containerRef = useRef(null);
    /*
     * Remember the URL that failed, not a plain flag: when the signed-in user
     * changes, the new URL no longer matches and the image is tried again, with
     * no effect needed to reset anything.
     */
    const [failedImage, setFailedImage] = useState("");
    /* Demo accounts get a picture; everyone else falls back to the initials. */
    const candidateImage = getAvatarImage(user);
    const avatarImage = candidateImage && candidateImage !== failedImage ? candidateImage : "";

    /* Close the menu on an outside click or Escape. */
    useEffect(() => {
        if (!isMenuOpen) return undefined;

        const onPointerDown = (event) => {
            if (!containerRef.current?.contains(event.target)) setIsMenuOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === "Escape") setIsMenuOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [isMenuOpen]);

    return (
        <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/95 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
                {/*
                  The mascot is a button of its own, so it sits beside the home
                  link rather than inside it. Nesting a button within an anchor is
                  invalid HTML and confuses screen readers and keyboard users.
                */}
                <div className="flex shrink-0 items-center gap-2.5">
                    <Mascot {...MASCOT_SHEETS} label={MASCOT_LABEL} size={40} />
                    <Link
                        to="/"
                        className="rounded-xl text-xl font-extrabold tracking-tight text-ink transition hover:opacity-80"
                    >
                        Foxy List
                    </Link>
                </div>

                {user ? (
                    <div className="flex items-center gap-3">
                        {/* Hidden on the narrowest screens to protect the avatar. */}
                        <p className="hidden text-sm font-bold text-ink-soft md:block">
                            {getTodayLabel()}
                        </p>

                        <div className="relative" ref={containerRef}>
                            <button
                                type="button"
                                onClick={() => setIsMenuOpen((open) => !open)}
                                aria-haspopup="menu"
                                aria-expanded={isMenuOpen}
                                aria-label="Open account menu"
                                className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink text-sm font-extrabold text-white transition ${
                                    /* The image covers the box, so only the
                                       initials fallback needs a coloured fill. */
                                    avatarImage ? "bg-transparent" : "bg-fox-400 hover:bg-fox-500"
                                }`}
                            >
                                {avatarImage ? (
                                    <img
                                        src={avatarImage}
                                        alt={getFullName(user)}
                                        onError={() => setFailedImage(avatarImage)}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    getInitials(user)
                                )}
                            </button>

                            {isMenuOpen && (
                                <div
                                    role="menu"
                                    className="animate-pop-in absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-pop"
                                >
                                    <div className="border-b-2 border-paper-deep px-4 py-3">
                                        <p className="truncate text-sm font-extrabold text-ink">
                                            {getFullName(user)}
                                        </p>
                                        <p className="truncate text-xs font-semibold text-ink-soft">
                                            {user.email}
                                        </p>
                                    </div>
                                    <ul className="py-1.5 text-sm font-bold">
                                        <LogOut onDone={() => setIsMenuOpen(false)} />
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <Link to="/login" className={`${CONTROL_ICON} !text-ink`} aria-label="Sign in">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                                d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </Link>
                )}
            </div>
        </header>
    );
};

export default Navbar;