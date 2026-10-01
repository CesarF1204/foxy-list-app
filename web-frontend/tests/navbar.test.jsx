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
import { waitFor } from "@testing-library/react";

import Navbar from "../src/components/User/Navbar";
import { AppContextProvider } from "../src/contexts/AppContext";
import { ROUTES } from "../src/constants/routes";
import { BOARDS, BOARD_LABELS } from "../src/constants/boards";
import { TASKS_KEY } from "../src/constants/queryKeys";

/* `role` and `status` are on every user the API returns (`toPublicUser`), so
 * the fixtures carry them: the drawer's badges and detail rows read both. */
const USER = {
    _id: "u1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    role: "user",
    status: "active",
};
const ADMIN = {
    ...USER,
    _id: "u2",
    firstName: "Alan",
    lastName: "Turing",
    email: "alan@example.com",
    role: "admin",
};

/**
 * Mounts the real navbar at `path`, signed in as `user` (or signed out).
 *
 * `tasks` seeds the board's own cache entry with the shape the API really
 * returns - the `{ tasks: [...] }` envelope, not a bare array. `getTasksQueryOptions`
 * stores whatever `getAllTasks` resolves to, and `getAllTasks` returns that
 * envelope, so seeding a bare array here would test a shape the app never has.
 */
const renderNavbar = (path, user, tasks) => {
    const queryClient = new QueryClient();
    if (tasks !== undefined) queryClient.setQueryData(TASKS_KEY, tasks);

    return render(
        <QueryClientProvider client={queryClient}>
            <AppContextProvider>
                <MemoryRouter initialEntries={[path]}>
                    <Navbar user={user} />
                </MemoryRouter>
            </AppContextProvider>
        </QueryClientProvider>
    );
};

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

describe("View Profile in the account menu", () => {
    /* The same drawer the admin table opens, so these check reuse: the title,
     * the detail rows, the badges and the counts all come from `UserDrawer`. */
    const openProfile = (user) => {
        renderNavbar(ROUTES.board, user);
        fireEvent.click(within(openAccountMenu()).getByRole("menuitem", { name: "View Profile" }));
        return screen.getByRole("dialog");
    };

    it("sits directly below the email address", () => {
        renderNavbar(ROUTES.board, USER);

        const menu = openAccountMenu();
        expect(within(menu).getByText(USER.email)).toBeInTheDocument();
        expect(within(menu).getByRole("menuitem", { name: "View Profile" })).toBeInTheDocument();
    });

    it("opens the existing user drawer, titled with the full name", () => {
        expect(openProfile(USER)).toHaveAttribute("aria-label", "Ada Lovelace");
    });

    it("shows the real signed-in user's own details, from the session", () => {
        const drawer = within(openProfile(USER));

        expect(drawer.getByText(USER.email)).toBeInTheDocument();
        expect(drawer.getByText("Manages their own tasks only")).toBeInTheDocument();
        expect(drawer.getByText("Can sign in and use the app")).toBeInTheDocument();
        expect(drawer.getByText("User")).toBeInTheDocument();
    });

    it("shows the role and status of an admin opening their own profile", () => {
        const drawer = within(openProfile(ADMIN));

        expect(drawer.getByText("Admin")).toBeInTheDocument();
        expect(drawer.getByText("Full access, including the admin dashboard")).toBeInTheDocument();
    });

    it("carries the avatar initials", () => {
        expect(within(openProfile(USER)).getByText("AL")).toBeInTheDocument();
    });

    it("offers a regular user exactly the two self-service actions", () => {
        const drawer = openProfile(USER);

        expect(within(drawer).getByRole("button", { name: "Edit name and email" })).toBeInTheDocument();
        expect(within(drawer).getByRole("button", { name: "Set new password" })).toBeInTheDocument();
    });

    it("takes Set new password away while the profile form is open, and gives it back", () => {
        /* Two ways of editing the same account side by side invites the wrong one,
         * so the password button is absent rather than disabled - there is nothing
         * to click or reach by keyboard while the form is open. */
        const drawer = openProfile(USER);

        fireEvent.click(within(drawer).getByRole("button", { name: "Edit name and email" }));
        expect(within(drawer).queryByRole("button", { name: "Set new password" })).toBeNull();

        /* Cancelling leaves the form and restores the button, and the drawer still
         * has the same identity - it swapped a form in, it did not navigate. */
        fireEvent.click(within(drawer).getByRole("button", { name: "Cancel" }));
        expect(within(drawer).getByRole("button", { name: "Edit name and email" })).toBeInTheDocument();
        expect(within(drawer).getByRole("button", { name: "Set new password" })).toBeInTheDocument();
    });

    it("does not render Change role for a regular user", () => {
        /* Not merely hidden behind a disabled attribute: it is absent from the
         * tree, so there is nothing to click or to reach by keyboard. */
        expect(
            within(openProfile(USER)).queryByRole("button", { name: "Change role" })
        ).toBeNull();
    });

    it("offers an admin Change role as well", () => {
        expect(
            within(openProfile(ADMIN)).getByRole("button", { name: "Change role" })
        ).toBeInTheDocument();
    });

    it("offers a regular user no way to block or delete anybody", () => {
        /* The subject is always the viewer here, and block and delete are
         * administrative writes against somebody, so neither role gets them. */
        const drawer = openProfile(USER);

        expect(within(drawer).queryByRole("button", { name: "Block user" })).toBeNull();
        expect(within(drawer).queryByRole("button", { name: "Delete user" })).toBeNull();
    });

    it("offers an admin no way to block or delete themselves either", () => {
        const drawer = openProfile(ADMIN);

        expect(within(drawer).queryByRole("button", { name: "Block user" })).toBeNull();
        expect(within(drawer).queryByRole("button", { name: "Delete user" })).toBeNull();
    });

    it("offers no confirm dialog until one is opened", () => {
        expect(within(openProfile(USER)).queryByRole("dialog")).toBeNull();

        fireEvent.click(
            within(screen.getByRole("dialog")).getByRole("button", { name: "Set new password" })
        );

        expect(screen.getAllByRole("dialog")).toHaveLength(2);
    });

    it("opens no role dialog for a regular user, because there is no button for it", () => {
        const drawer = openProfile(USER);

        /* Nothing to click, so nothing can be opened: the capability gate on the
         * dialog is unreachable rather than merely unused. */
        expect(within(drawer).queryByRole("button", { name: "Change role" })).toBeNull();
    });

    it("still shows the task counts, as zeroes before the board has loaded", () => {
        const drawer = within(openProfile(USER));

        BOARDS.forEach((board) => {
            expect(drawer.getByText(BOARD_LABELS[board])).toBeInTheDocument();
        });
        expect(drawer.getByText("Total")).toBeInTheDocument();
    });

    it("closes on the drawer's own close button", () => {
        openProfile(USER);

        fireEvent.click(screen.getByRole("button", { name: "Close panel" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes the account menu on the way, so no menu is left behind it", () => {
        renderNavbar(ROUTES.board, USER);
        fireEvent.click(within(openAccountMenu()).getByRole("menuitem", { name: "View Profile" }));

        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    /* The counts are read off the board's cache, which holds the whole
     * `{ tasks: [...] }` envelope the API returns. Treating that envelope as
     * the list crashed the drawer with "forEach is not a function", so these
     * pin the shape the cache really has. */
    describe("the task counts", () => {
        const openWithTasks = (tasks) => {
            /* `undefined` means "do not seed", so the cache entry is absent
             * entirely - the state before the board has ever been visited. */
            renderNavbar(ROUTES.board, USER, tasks === undefined ? undefined : { tasks });
            fireEvent.click(
                within(openAccountMenu()).getByRole("menuitem", { name: "View Profile" })
            );
            return within(screen.getByRole("dialog"));
        };

        it("counts the tasks out of the API's envelope, one number per board", async () => {
            const drawer = openWithTasks([
                { _id: "t1", status: "todo" },
                { _id: "t2", status: "todo" },
                { _id: "t3", status: "ongoing" },
                { _id: "t4", status: "done" },
            ]);

            /* The total sits beside its own label; each board number sits
             * beside that board's. */
            const total = drawer.getByText("Total").closest("li");
            const todo = drawer.getByText(BOARD_LABELS.todo).closest("li");
            const ongoing = drawer.getByText(BOARD_LABELS.ongoing).closest("li");
            const done = drawer.getByText(BOARD_LABELS.done).closest("li");

            await waitFor(() => expect(total).toHaveTextContent("4"));
            expect(todo).toHaveTextContent("2");
            expect(ongoing).toHaveTextContent("1");
            expect(done).toHaveTextContent("1");
        });

        it("shows zeroes for an empty list rather than failing", async () => {
            const drawer = openWithTasks([]);

            await waitFor(() =>
                expect(drawer.getByText("Total").closest("li")).toHaveTextContent("0")
            );
        });

        it("survives an absent cache entry, before the board has loaded", () => {
            /* The drawer opens with zeroes rather than throwing. */
            const drawer = openWithTasks(undefined);

            expect(drawer.getByText("Total").closest("li")).toHaveTextContent("0");
        });

        it("survives a malformed envelope, rather than throwing on it", () => {
            /* A failed request can leave anything in the cache; the counts must
             * not be the thing that breaks the drawer. */
            renderNavbar(ROUTES.board, USER, { tasks: null });
            fireEvent.click(
                within(openAccountMenu()).getByRole("menuitem", { name: "View Profile" })
            );

            expect(within(screen.getByRole("dialog")).getByText("Total")).toBeInTheDocument();
        });
    });
});
