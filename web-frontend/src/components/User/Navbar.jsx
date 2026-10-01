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

/**
 * The two states of a navigation entry, so the navbar and the account menu
 * highlight the current section identically: the same solid fox fill the
 * navbar and the rest of the app use for a selected control.
 */
const navClass = (isActive) =>
    isActive ? "bg-fox-400 text-white" : "text-ink hover:bg-fox-50";

/**
 * The Admin Overview entry names the admin *section*, not the single screen at
 * `/admin/overview`: the users table is a sibling screen, not a child of that
 * path, so `NavLink`'s own matching - exact or prefix of `/admin/overview` -
 * can never cover it. The section is decided here instead, from the `/admin`
 * prefix, so the entry stays filled and `aria-current` on both screens while
 * the Overview/Users tabs below it do the moving within the section.
 */
const isAdminSection = (pathname) =>
    pathname === ROUTES.admin || pathname.startsWith(`${ROUTES.admin}/`);

/**
 * DOCU: The app navbar. Always visible: signed in it carries the brand, mascot,
 * today's date and the account menu; signed out, a sign-in call to action.
 */
const Navbar = ({ user }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    /* The profile drawer is the same component the admin table opens, driven
     * read-only. It is owned here rather than inside the account menu so it
     * outlives the menu: clicking "View Profile" closes the menu, and the
     * drawer has to survive that. */
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const containerRef = useRef(null);

    /* The admin entry follows the section, not the path it points at, so both
     * the navbar link and the account menu's copy read this one flag. */
    const { pathname } = useLocation();
    const inAdminSection = isAdminSection(pathname);

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

    /* A fragment, not a bare `<header>`: the header carries `backdrop-blur`,
     * which makes it a containing block for `position: fixed` descendants. The
     * drawer overlay is `fixed inset-0`, so rendered inside the header it would
     * be confined to the 4rem-tall bar instead of covering the page. As a
     * sibling it escapes that, and the admin drawer - mounted in a page with no
     * such ancestor - behaves identically. */
    return (
        <>
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
                            /* A plain `Link`, not a `NavLink`: `NavLink` decides
                             * `aria-current` from its own path match, and it
                             * drops any `aria-current` handed to it - so with
                             * the users table being a sibling of
                             * `/admin/overview`, not a child, there is no way
                             * to keep it lit from inside a `NavLink`. This one
                             * is lit from `inAdminSection` instead, which reads
                             * the whole `/admin` prefix. */
                            <Link
                                to={ROUTES.adminOverview}
                                aria-current={inAdminSection ? "page" : undefined}
                                className={`rounded-xl px-3 py-2 text-sm font-bold transition ${navClass(inAdminSection)}`}
                            >
                                Admin Overview
                            </Link>
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
                                        {/* Not a link: it opens the shared user
                                            drawer over the page rather than
                                            navigating, so it is a button and it
                                            carries `aria-haspopup="dialog"`.
                                            The menu is closed on the way, so the
                                            drawer is not left sitting on top of
                                            an open menu.

                                            It wears the name's size and weight,
                                            underlined and in `text-fox-600` the
                                            way the second reference shot shows -
                                            the same fox orange the "Register
                                            now" action on the auth page wears,
                                            so every underlined action in the app
                                            reads as the same kind of thing.
                                            `w-fit` keeps the underline and the
                                            hit area on the words instead of the
                                            whole row. */}
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

                                            Both are router links, not plain
                                            anchors, so the section a phone is
                                            actually on is filled in the same
                                            fox the navbar uses. The active
                                            colour comes from `navClass` alone -
                                            `text-ink` is deliberately left out
                                            of the base, since two same-layer
                                            text utilities would be resolved by
                                            stylesheet order rather than by the
                                            order they are written here.

                                            The Dashboard is a `NavLink`, its
                                            own match being the whole of the
                                            board. The admin link is a plain
                                            `Link`, lit from `inAdminSection`
                                            instead - see the navbar's copy -
                                            so both admin screens fill this one
                                            entry. */}
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
                                        {/* `md:hidden` travels with the links above:
                                            the divider only makes sense on the
                                            screens where it separates something.
                                            Left visible on a desktop it stacks up
                                            against the user block's own bottom
                                            border, and the two together read as a
                                            double rule above Sign out. */}
                                        <li aria-hidden="true" className="my-1.5 border-t-2 border-paper-deep md:hidden" />
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

            {/* A sibling of the header rather than a child of it, so the
                drawer's `fixed inset-0` overlay is not trapped by the header's
                `backdrop-blur` containing block - see the note at the return.
                It is only mounted while open, so an untouched navbar renders
                nothing here. */}
            <ProfileDrawer
                user={user}
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
        </>
    );
};

export default Navbar;