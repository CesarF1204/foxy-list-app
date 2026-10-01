import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
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
import ProfileDrawer from "./ProfileDrawer";
import Icon from "../icons/Icon";

/**
 * The two states of a navigation entry, so the navbar and the account menu highlight the
 * current section identically: the same solid fox fill the navbar and the rest of the app use
 * for a selected control.
 */
const navClass = (isActive) =>
    isActive ? "bg-fox-400 text-white" : "text-ink hover:bg-fox-50";

/** The Admin Overview entry names the admin *section*, not the single screen at */
const isAdminSection = (pathname) =>
    pathname === ROUTES.admin || pathname.startsWith(`${ROUTES.admin}/`);

/**
 * The app navbar. Always visible: signed in it carries the brand, mascot, today's date and the
 * account menu; signed out, a sign-in call to action.
 */
const Navbar = ({ user }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const containerRef = useRef(null);

    /**
     * The admin entry follows the section, not the path it points at, so both the navbar link
     * and the account menu's copy read this one flag.
     */
    const { pathname } = useLocation();
    const inAdminSection = isAdminSection(pathname);

    /** Close the menu on an outside click or Escape. */
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
        <>
            <header className="sticky top-0 z-header border-b-2 border-ink bg-paper/95 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">

                <div className="flex shrink-0 items-center gap-2.5 pr-2">
                    <Mascot {...MASCOT_SHEETS} label={MASCOT_LABEL} size={40} />
                    <Link
                        to={ROUTES.board}
                        className="rounded-xl text-xl font-extrabold tracking-tight text-ink transition hover:opacity-80"
                    >
                        Foxy List
                    </Link>
                </div>

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
                            <Link
                                to={ROUTES.adminOverview}
                                aria-current={inAdminSection ? "page" : undefined}
                                className={`rounded-xl px-3 py-2 text-sm font-bold transition ${navClass(inAdminSection)}`}
                            >
                                Admin Overview
                            </Link>
                        )}
                        {/* The API reference. Offered to every signed-in user, not just an
                            admin: reading what the API is does not require administering it,
                            and the page itself is public. */}
                        <NavLink
                            to={ROUTES.apiDocs}
                            className={({ isActive }) =>
                                `rounded-xl px-3 py-2 text-sm font-bold transition ${navClass(isActive)}`
                            }
                        >
                            API Docs
                        </NavLink>
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
                                    className="animate-pop-in absolute right-0 z-header mt-2 w-60 overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-pop"
                                >
                                    <div className="border-b-2 border-paper-deep px-4 py-3">
                                        <p className="truncate text-sm font-extrabold text-ink">
                                            {getFullName(user)}
                                        </p>
                                        <p className="truncate text-xs font-semibold text-ink-soft">
                                            {user.email}
                                        </p>

                                        <button
                                            type="button"
                                            role="menuitem"
                                            aria-haspopup="dialog"
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                setIsProfileOpen(true);
                                            }}
                                            className="mt-1 w-fit cursor-pointer truncate text-sm font-extrabold text-fox-600 underline decoration-2 underline-offset-2 transition hover:text-fox-700"
                                        >
                                            View Profile
                                        </button>
                                    </div>
                                    <ul className="py-1.5 text-sm font-bold">

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
                                                <Link
                                                    to={ROUTES.adminOverview}
                                                    onClick={() => setIsMenuOpen(false)}
                                                    aria-current={
                                                        inAdminSection ? "page" : undefined
                                                    }
                                                    className={`block w-full px-4 py-2 text-left transition ${navClass(inAdminSection)}`}
                                                >
                                                    Admin Overview
                                                </Link>
                                            </li>
                                        )}

                                        <li className="md:hidden">
                                            <NavLink
                                                to={ROUTES.apiDocs}
                                                onClick={() => setIsMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `block w-full px-4 py-2 text-left transition ${navClass(isActive)}`
                                                }
                                            >
                                                API Docs
                                            </NavLink>
                                        </li>

                                        <li aria-hidden="true" className="my-1.5 border-t-2 border-paper-deep md:hidden" />
                                        <LogOut onDone={() => setIsMenuOpen(false)} />
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <Link to={ROUTES.login} className={`${CONTROL_ICON} ml-auto text-ink!`} aria-label="Sign in">
                        <Icon name="signIn" size={18} />
                    </Link>
                )}
                </div>
            </header>

            <ProfileDrawer
                user={user}
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
        </>
    );
};

export default Navbar;