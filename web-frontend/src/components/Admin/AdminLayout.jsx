import { NavLink } from "react-router-dom";

import Navbar from "../User/Navbar";
import { ROUTES } from "../../constants/routes";

/** DOCU: The two admin screens, in the order they appear in the tab bar. */
const TABS = [
    { to: ROUTES.adminOverview, label: "Overview", end: true },
    { to: ROUTES.adminUsers, label: "Users", end: false },
];

/**
 * DOCU: The frame both admin screens share: the app's own navbar, a page title
 * and the two tabs. Deliberately built from the same pieces as the board -
 * `Navbar`, the display font, the `.btn` buttons - so the dashboard reads as
 * part of Foxy List rather than as a separate product dropped inside it.
 *
 * The tab bar is a `nav` of real links, so each screen is linkable, reloadable
 * and reachable with the keyboard, and `NavLink` marks the current one for both
 * sighted users (the fox-orange fill) and assistive tech (aria-current).
 */
const AdminLayout = ({ user, title, subtitle, children }) => (
    <div className="flex-1">
        <Navbar user={user} />

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <div className="animate-rise mb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
                {subtitle && <p className="mt-1 text-sm font-semibold text-ink-soft">{subtitle}</p>}

                <nav aria-label="Admin sections" className="mt-4">
                    <ul className="flex flex-wrap gap-2">
                        {TABS.map((tab) => (
                            <li key={tab.to}>
                                <NavLink
                                    to={tab.to}
                                    end={tab.end}
                                    className={({ isActive }) =>
                                        `btn py-1.5! text-sm! ${
                                            isActive ? "btn-primary" : "btn-neutral"
                                        }`
                                    }
                                >
                                    {tab.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>

            {children}
        </main>
    </div>
);

export default AdminLayout;