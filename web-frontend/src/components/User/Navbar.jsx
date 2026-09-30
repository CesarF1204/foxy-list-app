import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Mascot } from "page-mascot";
import {
    getFullName,
    getInitials,
    getTodayLabel,
} from "../../helpers/globalHelper";
import { MASCOT_SHEETS, MASCOT_LABEL } from "../../constants/mascot";
import { CONTROL_ICON } from "../../constants/styles";
import { ROUTES } from "../../constants/routes";
import { isAdmin } from "../../constants/roles";
import LogOut from "./LogOut";

/**
 * The two states of a navigation entry, so the navbar and the account menu
 * highlight the current section identically: the same solid fox fill the
 * navbar and the rest of the app use for a selected control.
 */
const navClass = (isActive) =>
    isActive ? "bg-fox-400 text-white" : "text-ink hover:bg-fox-50";

/**
 * DOCU: The app navbar. Always visible: signed in it carries the brand, mascot,
 * today's date and the account menu; signed out, a sign-in call to action.
 */
const Navbar = ({ user }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const containerRef = useRef(null);

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
            {/* `ml-auto` on the account block, rather than `justify-between`
                across three children, keeps the section links parked beside
                the brand on the left and pushes the date and avatar to the far
                right - `justify-between` would float the links into the middle
                of the bar instead. */}
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
                {/* The mascot is a button of its own: nesting one inside an anchor
                    is invalid HTML and confuses screen readers and keyboards. */}
                <div className="flex shrink-0 items-center gap-2.5 pr-2">
                    <Mascot {...MASCOT_SHEETS} label={MASCOT_LABEL} size={40} />
                    <Link
                        to={ROUTES.board}
                        className="rounded-xl text-xl font-extrabold tracking-tight text-ink transition hover:opacity-80"
                    >
                        Foxy List
                    </Link>
                </div>

                {/* Only shown signed in. The Dashboard sits here from the `md`
                    breakpoint up and drops into the account menu below it,
                    which is the same split the admin link makes, so a narrow
                    screen gets its section links from the avatar and a wide
                    one gets them in the navbar - never both at once, never
                    neither. Hiding them is a courtesy, not the protection:
                    /admin is guarded and every endpoint re-checks the role.
                    `NavLink` marks the current section for sighted users and
                    for assistive tech. */}
                {user && (
                    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
                        <NavLink
                            to={ROUTES.board}
                            end
                            className={({ isActive }) =>
                                `rounded-xl px-3 py-2 text-sm font-bold transition ${navClass(isActive)}`
                            }
                        >
                            Dashboard
                        </NavLink>
                        {isAdmin(user) && (
                            <NavLink
                                to={ROUTES.adminOverview}
                                end
                                className={({ isActive }) =>
                                    `rounded-xl px-3 py-2 text-sm font-bold transition ${navClass(isActive)}`
                                }
                            >
                                Admin Overview
                            </NavLink>
                        )}
                    </nav>
                )}

                {user ? (
                    <div className="ml-auto flex items-center gap-3">
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
                                className="flex h-10 w-10 cursor-pointer shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-fox-400 text-sm font-extrabold text-white transition hover:bg-fox-500"
                            >
                                {getInitials(user)}
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
                                        {/* The Dashboard mirrors the navbar's own
                                            `md` threshold, so a phone carries it
                                            here and a desktop shows it in the
                                            navbar: never both at once, never
                                            neither. The admin link splits the
                                            same way, and is offered only to an
                                            admin. Hiding them is a courtesy, not
                                            the protection: the board and /admin
                                            are both guarded and every endpoint
                                            re-checks the role.

                                            Both are `NavLink`s, not plain
                                            anchors, so the section a phone is
                                            actually on is filled in the same
                                            fox the navbar uses. The active
                                            colour comes from `navClass` alone -
                                            `text-ink` is deliberately left out
                                            of the base, since two same-layer
                                            text utilities would be resolved by
                                            stylesheet order rather than by the
                                            order they are written here. */}
                                        <li className="md:hidden">
                                            <NavLink
                                                to={ROUTES.board}
                                                end
                                                onClick={() => setIsMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `block w-full px-4 py-2 text-left transition ${navClass(isActive)}`
                                                }
                                            >
                                                Dashboard
                                            </NavLink>
                                        </li>
                                        {isAdmin(user) && (
                                            <li className="md:hidden">
                                                <NavLink
                                                    to={ROUTES.adminOverview}
                                                    end
                                                    onClick={() => setIsMenuOpen(false)}
                                                    className={({ isActive }) =>
                                                        `block w-full px-4 py-2 text-left transition ${navClass(isActive)}`
                                                    }
                                                >
                                                    Admin Overview
                                                </NavLink>
                                            </li>
                                        )}
                                        <li aria-hidden="true" className="my-1.5 border-t-2 border-paper-deep" />
                                        <LogOut onDone={() => setIsMenuOpen(false)} />
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <Link to={ROUTES.login} className={`${CONTROL_ICON} ml-auto text-ink!`} aria-label="Sign in">
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