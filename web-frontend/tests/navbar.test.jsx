/**
 * Tests for the app navbar's section links.
 *
 * The Dashboard link is responsive: it sits in the navbar from the `md`
 * breakpoint up and drops into the account menu below it. The admin link
 * splits the same way and is gated on the role. jsdom applies no stylesheet,
 * so both copies exist in these tests and the `md:` utilities cannot be
 * observed directly. What the tests can check - and what would actually
 * break - is that each link is rendered once, in one of the two places,
 * gated on the role, and never duplicated.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Navbar from "../src/components/User/Navbar";
import { AppContextProvider } from "../src/contexts/AppContext";
import { ROUTES } from "../src/constants/routes";

const USER = { _id: "u1", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" };
const ADMIN = { ...USER, _id: "u2", firstName: "Alan", lastName: "Turing", role: "admin" };

/** Mounts the real navbar at `path`, signed in as `user` (or signed out). */
const renderNavbar = (path, user) =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <AppContextProvider>
                <MemoryRouter initialEntries={[path]}>
                    <Navbar user={user} />
                </MemoryRouter>
            </AppContextProvider>
        </QueryClientProvider>
    );

/**
 * The primary navigation, or null when the navbar carries none - a guest gets
 * no section links at all. Scoped by landmark rather than by name: the same
 * links are also carried in the account menu on narrow screens, which is the
 * whole point of the responsive split.
 */
const mainNav = () => {
    const nav = screen.queryByRole("navigation", { name: "Main" });
    return nav ? within(nav) : null;
};

/** The Dashboard link in the primary navigation. */
const dashboardLink = () => mainNav()?.queryByRole("link", { name: "Dashboard" }) ?? null;

/** The Admin Overview link in the primary navigation. */
const adminLink = () => mainNav()?.queryByRole("link", { name: "Admin Overview" }) ?? null;

/** The links of the primary navigation, in the order they are rendered. */
const navLinkNames = () => [...mainNav().queryAllByRole("link")].map((link) => link.textContent);

/** Opens the account menu the way the avatar button does. */
const openAccountMenu = () => {
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    return screen.getByRole("menu");
};

/** The links of the open account menu, in the order they are rendered. */
const menuLinkNames = (menu) =>
    within(menu)
        .queryAllByRole("link")
        .map((link) => link.textContent);

afterEach(cleanup);

describe("the navbar's own section links", () => {
    it("carries the Dashboard, for a normal user and for an admin alike", () => {
        renderNavbar(ROUTES.adminOverview, USER);
        expect(dashboardLink()).toHaveAttribute("href", ROUTES.board);

        cleanup();
        renderNavbar(ROUTES.adminOverview, ADMIN);
        expect(dashboardLink()).toHaveAttribute("href", ROUTES.board);
    });

    it("carries no navigation landmark for a guest, who cannot reach the board", () => {
        renderNavbar(ROUTES.login);

        expect(mainNav()).toBeNull();
    });
});

describe("the brand link", () => {
    it("still leads a signed-in user to their board", () => {
        renderNavbar(ROUTES.adminUsers, USER);

        expect(screen.getByRole("link", { name: "Foxy List" })).toHaveAttribute(
            "href",
            ROUTES.board
        );
    });
});

describe("the Admin Overview link in the navbar", () => {
    it("is offered to an admin, beside the Dashboard", () => {
        renderNavbar(ROUTES.board, ADMIN);

        expect(adminLink()).toBeInTheDocument();
        expect(navLinkNames()).toEqual(["Dashboard", "Admin Overview"]);
    });

    it("points at the admin overview's own path", () => {
        renderNavbar(ROUTES.board, ADMIN);

        expect(adminLink()).toHaveAttribute("href", ROUTES.adminOverview);
    });

    it("is not offered to a normal user, who cannot reach the admin area", () => {
        renderNavbar(ROUTES.board, USER);

        expect(adminLink()).not.toBeInTheDocument();
    });

    it("marks itself current only on the overview, not on the sibling screen", () => {
        renderNavbar(ROUTES.adminOverview, ADMIN);
        expect(adminLink()).toHaveAttribute("aria-current", "page");

        cleanup();
        renderNavbar(ROUTES.adminUsers, ADMIN);
        expect(adminLink()).not.toHaveAttribute("aria-current");
    });
});

describe("the Dashboard link in the navbar", () => {
    it("marks itself current on the board, nowhere else", () => {
        renderNavbar(ROUTES.board, ADMIN);
        expect(dashboardLink()).toHaveAttribute("aria-current", "page");

        cleanup();
        renderNavbar(ROUTES.adminOverview, ADMIN);
        expect(dashboardLink()).not.toHaveAttribute("aria-current");
    });
});

describe("the section links in the account menu", () => {
    it("carries the Dashboard and the Admin Overview, Dashboard first", () => {
        renderNavbar(ROUTES.board, ADMIN);

        expect(menuLinkNames(openAccountMenu())).toEqual(["Dashboard", "Admin Overview"]);
    });

    it("carries the Admin Overview only for an admin", () => {
        renderNavbar(ROUTES.board, USER);

        expect(menuLinkNames(openAccountMenu())).toEqual(["Dashboard"]);
    });

    it("points both entries at their own paths", () => {
        renderNavbar(ROUTES.board, ADMIN);

        const menu = within(openAccountMenu());
        expect(menu.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
            "href",
            ROUTES.board
        );
        expect(menu.getByRole("link", { name: "Admin Overview" })).toHaveAttribute(
            "href",
            ROUTES.adminOverview
        );
    });

    it("keeps the sign-out action, separated from the section links", () => {
        renderNavbar(ROUTES.board, ADMIN);

        expect(within(openAccountMenu()).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    });

    it("closes once a section link is followed", () => {
        renderNavbar(ROUTES.board, ADMIN);
        const menu = openAccountMenu();

        fireEvent.click(within(menu).getByRole("link", { name: "Admin Overview" }));

        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("renders no Admin Overview for a normal user, in the menu or the navbar", () => {
        renderNavbar(ROUTES.board, USER);
        openAccountMenu();

        expect(screen.queryByRole("link", { name: "Admin Overview" })).not.toBeInTheDocument();
    });

    it("leaves the Dashboard in the menu as a normal user's way back to the board", () => {
        renderNavbar(ROUTES.adminOverview, USER);
        const menu = within(openAccountMenu());

        expect(menu.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
            "href",
            ROUTES.board
        );
    });

    it("fills the entry of the section the phone is actually on, and only that one", () => {
        renderNavbar(ROUTES.adminOverview, ADMIN);
        const menu = within(openAccountMenu());

        // The current section is the filled one; its sibling keeps the plain,
        // unfilled look, so a phone can tell where it is at a glance.
        expect(menu.getByRole("link", { name: "Admin Overview" }).className).toContain(
            "bg-fox-400"
        );
        expect(menu.getByRole("link", { name: "Dashboard" }).className).not.toContain(
            "bg-fox-400"
        );
    });

    it("fills the Dashboard when the board itself is the current section", () => {
        renderNavbar(ROUTES.board, ADMIN);
        const menu = within(openAccountMenu());

        const dashboard = menu.getByRole("link", { name: "Dashboard" });
        expect(dashboard.className).toContain("bg-fox-400");
        expect(dashboard).toHaveAttribute("aria-current", "page");
        expect(menu.getByRole("link", { name: "Admin Overview" }).className).not.toContain(
            "bg-fox-400"
        );
    });

    it("leaves both entries unfilled on a screen that is neither section", () => {
        renderNavbar(ROUTES.adminUsers, ADMIN);
        const menu = within(openAccountMenu());

        expect(menu.getByRole("link", { name: "Dashboard" }).className).not.toContain(
            "bg-fox-400"
        );
        expect(menu.getByRole("link", { name: "Admin Overview" }).className).not.toContain(
            "bg-fox-400"
        );
    });
});
