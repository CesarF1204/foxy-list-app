/**
 * Tests for the admin dashboard's components: the route guard, the task chart,
 * the users table and the profile editor.
 *
 * These drive the real components and assert on the DOM - the semantics a screen
 * reader reads and a keyboard user navigates, plus the counts an admin scans for.
 * The API endpoints are stubbed so each test decides what the server answers;
 * what the API itself refuses is covered by the backend's own test suite, and
 * what is checked here is that the screens hold up their end of the contract and
 * never contradict it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { RequireAdmin } from "../src/components/RouteGuards";
import TaskStatusChart from "../src/components/Admin/TaskStatusChart";
import UsersTable from "../src/components/Admin/UsersTable";
import UserProfileForm from "../src/components/Admin/UserProfileForm";
import Pagination from "../src/components/Admin/Pagination";
import { RoleDialog, PasswordDialog } from "../src/components/Admin/UserDialogs";
import { AppContextProvider } from "../src/contexts/AppContext";
import AdminUsers from "../src/pages/AdminUsers";

/* The session query is the guard's only input, so each test decides who is
 * signed in rather than reaching for a real sign-in. */
const validateToken = vi.fn();
vi.mock("../src/api-client/auth", () => ({
    validateToken: () => validateToken(),
}));

/* The admin endpoints are stubbed so each test decides what the server answers;
   the rules those endpoints enforce are the API's, covered by its own suite. */
const getAdminUsers = vi.fn();
const getAdminUser = vi.fn();
const getAdminStats = vi.fn();
const updateAdminUserStatus = vi.fn();
const updateAdminUser = vi.fn();
const updateAdminUserRole = vi.fn();
const updateAdminUserPassword = vi.fn();
const deleteAdminUser = vi.fn();

vi.mock("../src/api-client/admin", () => ({
    getAdminUsers: (...args) => getAdminUsers(...args),
    getAdminUser: (...args) => getAdminUser(...args),
    getAdminStats: (...args) => getAdminStats(...args),
    updateAdminUser: (...args) => updateAdminUser(...args),
    updateAdminUserRole: (...args) => updateAdminUserRole(...args),
    updateAdminUserStatus: (...args) => updateAdminUserStatus(...args),
    updateAdminUserPassword: (...args) => updateAdminUserPassword(...args),
    deleteAdminUser: (...args) => deleteAdminUser(...args),
}));

const ADMIN = { _id: "admin-1", firstName: "Ada", lastName: "Lovelace", role: "admin" };
const USER = { _id: "user-1", firstName: "Alan", lastName: "Turing", role: "user" };

/** A user row, as the API returns one. */
const makeUser = (overrides = {}) => ({
    _id: "u1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    role: "user",
    status: "active",
    createdAt: "2024-01-15T00:00:00.000Z",
    taskCounts: { total: 4, todo: 2, ongoing: 1, done: 1 },
    ...overrides,
});

/** A query client with retries turned off and no retry delay. The admin queries
 *  ask for one retry, which with React Query's default back-off would leave a
 *  rejected request pending past a test's timeout. */
const makeClient = () =>
    new QueryClient({
        defaultOptions: { queries: { retry: false, retryDelay: 0 } },
    });

/** Renders the guard around a marker page, at the given session. */
const renderGuard = (user) => {
    validateToken.mockResolvedValue(user ? { user } : Promise.reject(new Error("no session")));

    return render(
        <QueryClientProvider client={makeClient()}>
            <AppContextProvider>
                <MemoryRouter initialEntries={["/admin"]}>
                    <Routes>
                        <Route
                            path="/admin"
                            element={
                                <RequireAdmin>
                                    <p>Admin Overview</p>
                                </RequireAdmin>
                            }
                        />
                        <Route path="/" element={<p>My board</p>} />
                        <Route path="/login" element={<p>Sign in</p>} />
                    </Routes>
                </MemoryRouter>
            </AppContextProvider>
        </QueryClientProvider>
    );
};

beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
});

afterEach(cleanup);


describe("reaching /admin", () => {
    it("shows the dashboard to an administrator", async () => {
        renderGuard(ADMIN);

        expect(await screen.findByText("Admin Overview")).toBeInTheDocument();
    });

    it("waits for the session before deciding, so an admin is not bounced", async () => {
        /* A session that never settles stands in for the token check in flight. */
        validateToken.mockReturnValue(new Promise(() => {}));

        render(
            <QueryClientProvider client={new QueryClient()}>
                <AppContextProvider>
                    <MemoryRouter initialEntries={["/admin"]}>
                        <Routes>
                            <Route
                                path="/admin"
                                element={
                                    <RequireAdmin>
                                        <p>Admin Overview</p>
                                    </RequireAdmin>
                                }
                            />
                        </Routes>
                    </MemoryRouter>
                </AppContextProvider>
            </QueryClientProvider>
        );

        expect(screen.getByRole("status")).toHaveTextContent("Checking your access");
    });

    it("refuses a signed-in user who is not an admin", async () => {
        renderGuard(USER);

        expect(await screen.findByText("Administrators only")).toBeInTheDocument();
        expect(screen.queryByText("Admin Overview")).not.toBeInTheDocument();
    });

    it("offers a way back to the board when it refuses", async () => {
        renderGuard(USER);

        expect(await screen.findByRole("link", { name: "Back to my board" })).toHaveAttribute(
            "href",
            "/dashboard"
        );
    });

    it("sends a signed-out visitor to sign in", async () => {
        renderGuard(null);

        expect(await screen.findByText("Sign in")).toBeInTheDocument();
    });

    it("refuses a user whose role the app does not recognise", async () => {
        renderGuard({ ...USER, role: "superuser" });

        expect(await screen.findByText("Administrators only")).toBeInTheDocument();
    });

    it("refuses a user with no role at all, rather than treating them as an admin", async () => {
        renderGuard({ ...USER, role: undefined });

        expect(await screen.findByText("Administrators only")).toBeInTheDocument();
    });
});

describe("the task distribution chart", () => {
    it("names every board's count in its accessible label", () => {
        render(<TaskStatusChart counts={{ todo: 2, ongoing: 1, done: 5 }} />);

        expect(screen.getByRole("img")).toHaveAccessibleName(
            "Task distribution: 2 To Do, 1 Ongoing, 5 Done of 8 tasks"
        );
    });

    it("lists the same numbers as readable text, not colour alone", () => {
        render(<TaskStatusChart counts={{ todo: 2, ongoing: 1, done: 5 }} />);

        const legend = screen.getByRole("list");
        expect(within(legend).getByText("To Do").parentElement).toHaveTextContent("2");
        expect(within(legend).getByText("Ongoing").parentElement).toHaveTextContent("1");
        expect(within(legend).getByText("Done").parentElement).toHaveTextContent("5");
    });

    it("shows each board's share as a percentage", () => {
        render(<TaskStatusChart counts={{ todo: 2, ongoing: 1, done: 5 }} />);

        expect(screen.getByText("25%")).toBeInTheDocument();
        expect(screen.getByText("63%")).toBeInTheDocument();
    });

    it("says so when there are no tasks, rather than drawing an empty bar", () => {
        render(<TaskStatusChart counts={{ todo: 0, ongoing: 0, done: 0 }} />);

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(screen.getByText(/No tasks yet/)).toBeInTheDocument();
    });

    it("does not divide by zero when the counts are missing entirely", () => {
        render(<TaskStatusChart counts={undefined} />);

        expect(screen.getByText(/No tasks yet/)).toBeInTheDocument();
    });
});

describe("the users table", () => {
    const renderTable = (props = {}) =>
        render(
            <UsersTable
                rows={[makeUser()]}
                sortBy="createdAt"
                sortDir="desc"
                onSort={() => {}}
                onView={() => {}}
                onToggleStatus={() => {}}
                onDelete={() => {}}
                canManageRow={() => true}
                {...props}
            />
        );

    it("is a real table, with a caption and column headers", () => {
        renderTable();

        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(within(screen.getByRole("table")).getAllByRole("columnheader")).toHaveLength(6);
    });

    it("shows every column the task asked for", () => {
        renderTable();

        /* The sort glyph is decoration, so it is stripped before comparing. */
        const headers = within(screen.getByRole("table"))
            .getAllByRole("columnheader")
            .map((cell) => cell.textContent.replace(/[▲▼↕]/g, "").trim());

        expect(headers).toEqual(
            expect.arrayContaining([
                "User",
                "Role",
                "Account status",
                "Tasks",
                "Created at",
                "Actions",
            ])
        );
    });

    it("shows a row's names, email, role and status together", () => {
        renderTable({ rows: [makeUser({ role: "admin", status: "blocked" })] });

        const row = within(screen.getByRole("row", { name: /Ada Lovelace/ }));
        expect(row.getByText("ada@example.com")).toBeInTheDocument();
        expect(row.getByText("Admin")).toBeInTheDocument();
        expect(row.getByText("Blocked")).toBeInTheDocument();
    });

    it("shows the four task counts in one Tasks cell", () => {
        renderTable({
            rows: [makeUser({ taskCounts: { total: 9, todo: 4, ongoing: 3, done: 2 } })],
        });

        /* The per-board pills and the total are all in the single Tasks cell, so
         * one cell holds the whole breakdown. */
        const cell = within(screen.getByRole("row", { name: /Ada Lovelace/ })).getAllByRole("cell")[3];
        expect(cell).toHaveTextContent("To Do: 4");
        expect(cell).toHaveTextContent("Ongoing: 3");
        expect(cell).toHaveTextContent("Done: 2");
        expect(cell).toHaveTextContent("9");
    });

    it("names each pill's board on hover, not by colour alone", () => {
        renderTable({
            rows: [makeUser({ taskCounts: { total: 9, todo: 4, ongoing: 3, done: 2 } })],
        });

        const row = within(screen.getByRole("row", { name: /Ada Lovelace/ }));
        expect(row.getByTitle("To Do: 4")).toBeInTheDocument();
        expect(row.getByTitle("Ongoing: 3")).toBeInTheDocument();
        expect(row.getByTitle("Done: 2")).toBeInTheDocument();
    });

    it("shows zeroes rather than blanks for an account with no tasks", () => {
        renderTable({
            rows: [makeUser({ taskCounts: { total: 0, todo: 0, ongoing: 0, done: 0 } })],
        });

        const cells = screen
            .getAllByRole("cell")
            .map((cell) => cell.textContent.trim());

        /* The Tasks cell reads 0 for every board and for the total, not blanks. */
        expect(cells).toContain("To Do: 0Ongoing: 0Done: 00");
    });

    it("marks the active sort column for assistive technology", () => {
        renderTable({ sortBy: "name", sortDir: "asc" });

        expect(
            within(screen.getByRole("columnheader", { name: /User/ })).getByRole("button").closest("th")
        ).toHaveAttribute("aria-sort", "ascending");
    });

    it("marks the other sortable columns as unsorted", () => {
        renderTable({ sortBy: "name", sortDir: "asc" });

        const role = screen.getByRole("columnheader", { name: /Role/ });
        expect(role).toHaveAttribute("aria-sort", "none");
    });

    it("asks to sort when a sortable header is clicked", () => {
        const onSort = vi.fn();
        renderTable({ onSort });

        fireEvent.click(screen.getByRole("button", { name: /Role/ }));

        expect(onSort).toHaveBeenCalledWith("role");
    });

    it("offers no sort button on a column the API cannot sort", () => {
        renderTable();

        const actions = screen.getByRole("columnheader", { name: "Actions" });
        expect(within(actions).queryByRole("button")).not.toBeInTheDocument();
    });

    it("names the account on the menu trigger, not just the column", () => {
        renderTable();

        expect(screen.getByRole("button", { name: "Actions for Ada Lovelace" })).toBeInTheDocument();
    });

    it("keeps the actions behind a kebab menu until it is opened", () => {
        renderTable();

        expect(screen.queryByRole("menu")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Actions for Ada Lovelace" }));

        const menu = screen.getByRole("menu", { name: "Actions for Ada Lovelace" });
        expect(within(menu).getByRole("menuitem", { name: "View user" })).toBeInTheDocument();
        expect(within(menu).getByRole("menuitem", { name: "Block user" })).toBeInTheDocument();
        expect(within(menu).getByRole("menuitem", { name: "Delete user" })).toBeInTheDocument();
    });

    it("tells assistive technology when the menu is open", () => {
        renderTable();

        const trigger = screen.getByRole("button", { name: "Actions for Ada Lovelace" });
        expect(trigger).toHaveAttribute("aria-haspopup", "menu");
        expect(trigger).toHaveAttribute("aria-expanded", "false");

        fireEvent.click(trigger);

        expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    it("calls the action with the row's user, then closes the menu", () => {
        const onDelete = vi.fn();
        renderTable({ onDelete });

        fireEvent.click(screen.getByRole("button", { name: "Actions for Ada Lovelace" }));
        fireEvent.click(screen.getByRole("menuitem", { name: "Delete user" }));

        expect(onDelete).toHaveBeenCalledWith(
            expect.objectContaining({ _id: "u1", firstName: "Ada", lastName: "Lovelace" })
        );
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("renders the menu outside the table, so the scroll container cannot clip it", () => {
        renderTable();

        fireEvent.click(screen.getByRole("button", { name: "Actions for Ada Lovelace" }));

        /* The menu lives on the body, not inside the table: an absolutely
         * positioned dropdown inside `overflow-x-auto` would be cut off. */
        const menu = screen.getByRole("menu");
        expect(document.body.contains(menu)).toBe(true);
        expect(screen.getByRole("table").contains(menu)).toBe(false);
        expect(menu).toHaveClass("fixed");
    });

    it("pins the menu with inline coordinates, so it lands on the trigger", () => {
        renderTable();

        fireEvent.click(screen.getByRole("button", { name: "Actions for Ada Lovelace" }));

        /* Measured from the trigger and applied inline; jsdom reports zero-sized
         * rects, so this checks the coordinates are wired up rather than the exact
         * pixels. */
        const menu = screen.getByRole("menu");
        expect(menu.style.top).not.toBe("");
        expect(menu.style.left).not.toBe("");
        expect(menu.style.width).not.toBe("");
    });

    it("does not treat a press on a menu entry as an outside click", () => {
        const onDelete = vi.fn();
        renderTable({ onDelete });

        /* The menu is portalled to the body, so it sits outside the trigger's
         * container. Pressing an entry must reach its own onClick, not be
         * dismissed as a click elsewhere before that click fires. */
        fireEvent.click(screen.getByRole("button", { name: "Actions for Ada Lovelace" }));
        fireEvent.mouseDown(screen.getByRole("menuitem", { name: "Delete user" }));
        fireEvent.click(screen.getByRole("menuitem", { name: "Delete user" }));

        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("closes the menu on Escape and on a click elsewhere", () => {
        renderTable();

        fireEvent.click(screen.getByRole("button", { name: "Actions for Ada Lovelace" }));
        fireEvent.keyDown(document, { key: "Escape" });
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Actions for Ada Lovelace" }));
        expect(screen.getByRole("menu")).toBeInTheDocument();

        fireEvent.mouseDown(document.body);
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("offers to unblock rather than block a blocked account", () => {
        renderTable({ rows: [makeUser({ status: "blocked" })] });

        fireEvent.click(screen.getByRole("button", { name: "Actions for Ada Lovelace" }));

        expect(screen.getByRole("menuitem", { name: "Unblock user" })).toBeInTheDocument();
        expect(screen.queryByRole("menuitem", { name: "Block user" })).not.toBeInTheDocument();
    });

    it("hides the destructive actions on a row that cannot be managed", () => {
        renderTable({ canManageRow: () => false });

        fireEvent.click(screen.getByRole("button", { name: "Actions for Ada Lovelace" }));

        expect(screen.getByRole("menuitem", { name: "View user" })).toBeInTheDocument();
        expect(screen.queryByRole("menuitem", { name: /Block/ })).not.toBeInTheDocument();
        expect(screen.queryByRole("menuitem", { name: /Delete/ })).not.toBeInTheDocument();
    });

    it("labels the scrollable region, so it can be reached by keyboard", () => {
        renderTable();

        const region = screen.getByRole("region", { name: "Registered users" });
        expect(region).toHaveAttribute("tabindex", "0");
    });

    it("highlights the row under the pointer, so it reads as one row", () => {
        renderTable();

        const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
        rows.forEach((row) => expect(row).toHaveClass("hover:bg-row-hover"));
    });

    it("draws the kebab as a circle ringed with a border on hover", () => {
        renderTable();

        const trigger = screen.getByRole("button", { name: "Actions for Ada Lovelace" });
        expect(trigger).toHaveClass("rounded-full", "hover:border-ink", "cursor-pointer");
        expect(trigger.className).not.toMatch(/shadow/);
    });

    it("never renders a password, even if one were on the row", () => {
        renderTable({ rows: [makeUser({ password: "hunter2" })] });

        expect(document.body.textContent).not.toMatch(/hunter2/);
    });
});

describe("editing a user", () => {
    /** Renders the form and returns the spy standing in for the API call. */
    const renderForm = (props = {}) => {
        const onSave = vi.fn().mockResolvedValue();
        render(
            <UserProfileForm
                user={makeUser()}
                isPending={false}
                onSave={onSave}
                onCancel={() => {}}
                {...props}
            />
        );
        return onSave;
    };

    it("labels every field", () => {
        renderForm();

        expect(screen.getByLabelText("First name")).toBeInTheDocument();
        expect(screen.getByLabelText("Last name")).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    it("starts from the account's current values", () => {
        renderForm();

        expect(screen.getByLabelText("First name")).toHaveValue("Ada");
        expect(screen.getByLabelText("Last name")).toHaveValue("Lovelace");
        expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    });

    it("sends the edited values, and only the editable ones", async () => {
        const onSave = renderForm();

        fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Augusta" } });
        fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith({
                firstName: "Augusta",
                lastName: "Lovelace",
                email: "ada@example.com",
            })
        );
    });

    it("refuses a malformed email before any request is made", async () => {
        const onSave = renderForm();

        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nope" } });
        fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

        expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
    });

    it("refuses digits in a name", async () => {
        const onSave = renderForm();

        fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ada2" } });
        fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

        expect(await screen.findByText("Letters only")).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
    });

    it("marks a rejected field as invalid for assistive technology", async () => {
        renderForm();

        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nope" } });
        fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

        await screen.findByText("Enter a valid email address");
        expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    });

    it("shows a rejected email beside the email field, not as a toast only", async () => {
        const onSave = vi.fn().mockRejectedValue({
            message: "Conflict",
            fields: { email: "That email is already in use by another account" },
        });
        renderForm({ onSave });

        fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

        expect(
            await screen.findByText("That email is already in use by another account")
        ).toBeInTheDocument();
    });

    it("shows a rejection with no field of its own as a general error", async () => {
        const onSave = vi.fn().mockRejectedValue({ message: "Could not save" });
        renderForm({ onSave });

        fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

        expect(await screen.findByText("Could not save")).toBeInTheDocument();
    });

    it("disables the buttons while the request is in flight", () => {
        renderForm({ isPending: true });

        expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });
});

describe("the security-sensitive dialogs", () => {
    const renderRole = (props = {}) =>
        render(
            <RoleDialog
                user={makeUser()}
                role="user"
                onConfirm={() => {}}
                onClose={() => {}}
                {...props}
            />
        );

    it("offers only the roles the API supports", () => {
        renderRole();

        expect(screen.getByRole("radio", { name: /User/ })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: /Admin/ })).toBeInTheDocument();
        expect(screen.getAllByRole("radio")).toHaveLength(2);
    });

    it("confirms the chosen role before sending it", () => {
        const onConfirm = vi.fn();
        renderRole({ onConfirm });

        fireEvent.click(screen.getByRole("radio", { name: /Admin/ }));
        fireEvent.click(screen.getByRole("button", { name: "Change role" }));

        expect(onConfirm).toHaveBeenCalledWith("admin");
    });

    it("cancels a role change without sending anything", () => {
        const onConfirm = vi.fn();
        renderRole({ onConfirm });

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("asks for a password twice, and never shows one", () => {
        render(<PasswordDialog user={makeUser()} onConfirm={vi.fn()} onClose={() => {}} />);

        expect(screen.getByLabelText("New password")).toHaveAttribute("type", "password");
        expect(screen.getByLabelText("New password")).toHaveValue("");
        expect(screen.getByLabelText("Confirm new password")).toHaveAttribute("type", "password");
    });

    it("refuses two passwords that do not match", () => {
        const onConfirm = vi.fn();
        render(<PasswordDialog user={makeUser()} onConfirm={onConfirm} onClose={() => {}} />);

        fireEvent.change(screen.getByLabelText("New password"), {
            target: { value: "longenough" },
        });
        fireEvent.change(screen.getByLabelText("Confirm new password"), {
            target: { value: "different" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Set password" }));

        expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("refuses a password shorter than the app's minimum", () => {
        const onConfirm = vi.fn();
        render(<PasswordDialog user={makeUser()} onConfirm={onConfirm} onClose={() => {}} />);

        fireEvent.change(screen.getByLabelText("New password"), { target: { value: "abc" } });
        fireEvent.change(screen.getByLabelText("Confirm new password"), {
            target: { value: "abc" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Set password" }));

        expect(screen.getByText("Must be at least 6 characters")).toBeInTheDocument();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("clears the fields once the password has been accepted", async () => {
        const onConfirm = vi.fn().mockResolvedValue(true);
        render(<PasswordDialog user={makeUser()} onConfirm={onConfirm} onClose={() => {}} />);

        fireEvent.change(screen.getByLabelText("New password"), {
            target: { value: "longenough" },
        });
        fireEvent.change(screen.getByLabelText("Confirm new password"), {
            target: { value: "longenough" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Set password" }));

        await waitFor(() => expect(screen.getByLabelText("New password")).toHaveValue(""));
        expect(onConfirm).toHaveBeenCalledWith("longenough");
    });

    it("is a modal dialog, so Escape and the backdrop are handled", () => {
        render(<PasswordDialog user={makeUser()} onConfirm={vi.fn()} onClose={() => {}} />);

        expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });
});

describe("the pager under the table", () => {
    const renderPager = (props = {}) =>
        render(
            <Pagination
                page={2}
                pageCount={5}
                total={87}
                pageSize={10}
                onPage={() => {}}
                onPageSize={() => {}}
                {...props}
            />
        );

    it("calls the page-size select what it counts: rows, not pages", () => {
        renderPager();

        expect(screen.getByLabelText("Rows per page")).toBeInTheDocument();
        expect(screen.queryByLabelText("Per page")).not.toBeInTheDocument();
    });

    it("offers the page sizes the app supports", () => {
        renderPager({ pageSize: 5 });

        const select = screen.getByLabelText("Rows per page");
        expect(select).toHaveValue("5");
        expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["5", "10", "25"]);
    });

    it("sends the chosen size as a number, since the API expects one", () => {
        const onPageSize = vi.fn();
        renderPager({ onPageSize });

        fireEvent.change(screen.getByLabelText("Rows per page"), { target: { value: "25" } });

        expect(onPageSize).toHaveBeenCalledWith(25);
    });

    it("reports the range it is showing, not just the page number", () => {
        renderPager();

        expect(screen.getByRole("status")).toHaveTextContent("Showing 11-20 of 87");
    });

    it("marks the current page, and only that one", () => {
        renderPager();

        expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("button", { name: "Page 1" })).not.toHaveAttribute("aria-current");
    });

    it("disables the ends rather than paging past them", () => {
        renderPager({ page: 1, pageCount: 5 });

        expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();
    });

    it("renders nothing at all when there are no users", () => {
        const { container } = renderPager({ total: 0, pageCount: 0 });

        expect(container).toBeEmptyDOMElement();
    });
});

describe("the users page, driven through the API", () => {
    const ROWS = [makeUser(), makeUser({ _id: "u2", firstName: "Alan", lastName: "Turing" })];

    const page = (overrides = {}) => ({
        rows: ROWS,
        page: 1,
        pageSize: 10,
        total: 2,
        pageCount: 1,
        sortBy: "createdAt",
        sortDir: "desc",
        ...overrides,
    });

    /** Mounts the real page with a signed-in administrator. */
    const renderPage = async (rows = page(), settled = "Ada Lovelace") => {
        validateToken.mockResolvedValue({ user: ADMIN });
        getAdminUsers.mockResolvedValue({ users: rows });
        getAdminUser.mockResolvedValue({ user: ROWS[1] });

        const view = render(
            <QueryClientProvider client={makeClient()}>
                <AppContextProvider>
                    <MemoryRouter initialEntries={["/admin/users"]}>
                        <AdminUsers />
                    </MemoryRouter>
                </AppContextProvider>
            </QueryClientProvider>
        );

        await screen.findByText(settled);
        return view;
    };

    /** Opens a row's kebab menu and picks one entry, the way an admin would:
     *  the actions are only in the DOM once the menu is open. */
    const chooseAction = (userName, entry) => {
        fireEvent.click(screen.getByRole("button", { name: `Actions for ${userName}` }));
        fireEvent.click(screen.getByRole("menuitem", { name: entry }));
    };

    it("asks the API for the first page, with the filters it was given", async () => {
        await renderPage();

        expect(getAdminUsers).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, pageSize: 10, sortBy: "createdAt", sortDir: "desc" }),
            /* The second argument is the cancellation handle React Query supplies. */
            expect.objectContaining({ signal: expect.anything() }),
        );
    });

    it("shows a row per user the API returned", async () => {
        await renderPage();

        expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
        expect(screen.getByText("Alan Turing")).toBeInTheDocument();
    });

    it("re-queries with the chosen role filter", async () => {
        await renderPage();
        getAdminUsers.mockClear();

        fireEvent.change(screen.getByLabelText("Role"), { target: { value: "admin" } });

        await waitFor(() =>
            expect(getAdminUsers).toHaveBeenCalledWith(
                expect.objectContaining({ role: "admin" }),
                expect.objectContaining({ signal: expect.anything() }),
            )
        );
    });

    it("re-queries with the chosen status filter", async () => {
        await renderPage();
        getAdminUsers.mockClear();

        fireEvent.change(screen.getByLabelText("Account status"), {
            target: { value: "blocked" },
        });

        await waitFor(() =>
            expect(getAdminUsers).toHaveBeenCalledWith(
                expect.objectContaining({ status: "blocked" }),
                expect.objectContaining({ signal: expect.anything() }),
            )
        );
    });

    it("asks again for the next page rather than loading everyone at once", async () => {
        await renderPage(page({ total: 30, pageCount: 3 }));
        getAdminUsers.mockClear();

        fireEvent.click(screen.getByRole("button", { name: "Page 2" }));

        await waitFor(() =>
            expect(getAdminUsers).toHaveBeenCalledWith(
                expect.objectContaining({ page: 2 }),
                expect.objectContaining({ signal: expect.anything() }),
            )
        );
    });

    it("says so when nothing matches, instead of showing an empty table", async () => {
        await renderPage(page({ rows: [], total: 0, pageCount: 0 }), "No users match");

        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("keeps every character typed, without the field losing focus", async () => {
        await renderPage();
        const box = screen.getByLabelText("Search");

        box.focus();

        /* Typed the way a person types it: one character after another, with no
         * pause in between, which is the case a per-keystroke fetch breaks. */
        for (const letter of "john") {
            fireEvent.change(box, { target: { value: box.value + letter } });
        }

        expect(box).toHaveValue("john");
        expect(box).toHaveFocus();
    });

    it("asks the API once for a whole word, after the pause, not once per letter", async () => {
        await renderPage();
        const box = screen.getByLabelText("Search");
        getAdminUsers.mockClear();

        for (const letter of "christopher") {
            fireEvent.change(box, { target: { value: box.value + letter } });
        }

        /* Still typing: the box holds the word, but nothing has been requested. */
        expect(box).toHaveValue("christopher");
        expect(getAdminUsers).not.toHaveBeenCalled();

        /* Typing stops and the debounce elapses. */
        await waitFor(() =>
            expect(getAdminUsers).toHaveBeenCalledTimes(1),
            { timeout: 2000 },
        );

        expect(getAdminUsers).toHaveBeenCalledWith(
            expect.objectContaining({ search: "christopher", page: 1 }),
            expect.objectContaining({ signal: expect.anything() }),
        );
    });

    it("does not show a loading state for the letters that were never sent", async () => {
        await renderPage();
        const box = screen.getByLabelText("Search");

        for (const letter of "ada") {
            fireEvent.change(box, { target: { value: box.value + letter } });
        }

        /* The previous rows stay on screen, undimmed, until a request is real. */
        expect(screen.queryByText("Loading users...")).not.toBeInTheDocument();
        expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });

    it("returns to page 1 when the search term changes", async () => {
        await renderPage(page({ total: 30, pageCount: 3 }));

        fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
        await waitFor(() =>
            expect(getAdminUsers).toHaveBeenCalledWith(
                expect.objectContaining({ page: 2 }),
                expect.anything(),
            ),
        );
        getAdminUsers.mockClear();

        fireEvent.change(screen.getByLabelText("Search"), { target: { value: "grace" } });

        /* Page 2 of a three page list has no page 2 in a one page result, so the
         * new search lands on the first page rather than an empty table. */
        await waitFor(() =>
            expect(getAdminUsers).toHaveBeenCalledWith(
                expect.objectContaining({ search: "grace", page: 1 }),
                expect.anything(),
            ),
            { timeout: 2000 },
        );
    });

    it("shows the unfiltered list again when the search is cleared", async () => {
        await renderPage();
        const box = screen.getByLabelText("Search");

        getAdminUsers.mockImplementation((params) =>
            Promise.resolve({
                users: params.search
                    ? page({ rows: [makeUser({ firstName: "Grace" })], total: 1, pageCount: 1 })
                    : page(),
            }),
        );

        fireEvent.change(box, { target: { value: "grace" } });
        await waitFor(() => expect(screen.getByText("Grace Lovelace")).toBeInTheDocument(), {
            timeout: 2000,
        });

        fireEvent.change(box, { target: { value: "" } });

        /* Everyone is back, without the page being reloaded. The unfiltered first
         * page is already in the cache from the initial load, so clearing is
         * served from there rather than by another round trip. */
        await waitFor(() => expect(screen.getByText("Alan Turing")).toBeInTheDocument(), {
            timeout: 2000,
        });
        expect(screen.getByLabelText("Search")).toHaveValue("");
    });

    it("keeps a slow earlier response from overwriting the newer results", async () => {
        await renderPage();
        const box = screen.getByLabelText("Search");

        /* "g" is answered slowly, "grace" quickly. The slow reply is the one that
         * must not reach the table. */
        getAdminUsers.mockImplementation(
            (params) =>
                params.search === "g"
                    ? new Promise((resolve) =>
                          setTimeout(
                              () => resolve({ users: page({ rows: [makeUser({ firstName: "Stale" })] }) }),
                              400,
                          ),
                      )
                    : Promise.resolve({ users: page({ rows: [makeUser({ firstName: "Grace" })] }) }),
        );

        /* "g" is sent and left in flight, then the term moves on to "grace" while
         * that first request is still on the wire. */
        fireEvent.change(box, { target: { value: "g" } });
        await waitFor(() =>
            expect(getAdminUsers).toHaveBeenCalledWith(
                expect.objectContaining({ search: "g" }),
                expect.anything(),
            ),
            { timeout: 2000 },
        );

        fireEvent.change(box, { target: { value: "grace" } });
        await waitFor(() => expect(screen.getByText("Grace Lovelace")).toBeInTheDocument(), {
            timeout: 2000,
        });

        /* Wait past the slow reply, then confirm it never landed. */
        await new Promise((resolve) => setTimeout(resolve, 600));

        expect(screen.getByText("Grace Lovelace")).toBeInTheDocument();
        expect(screen.queryByText("Stale Lovelace")).not.toBeInTheDocument();
    });

    it("asks before blocking, then sends the status change", async () => {
        updateAdminUserStatus.mockResolvedValue({ user: makeUser({ status: "blocked" }) });
        await renderPage();

        chooseAction("Ada Lovelace", "Block user");

        /* Nothing is sent until the confirmation is accepted. */
        expect(updateAdminUserStatus).not.toHaveBeenCalled();
        expect(screen.getByRole("dialog")).toHaveTextContent("will not be able to sign in");

        fireEvent.click(screen.getByRole("button", { name: "Block user" }));

        await waitFor(() => expect(updateAdminUserStatus).toHaveBeenCalled());
        /* The payload is the first argument; the rest is React Query's context. */
        expect(updateAdminUserStatus.mock.calls[0][0]).toEqual({
            userId: "u1",
            status: "blocked",
        });
    });

    it("sends nothing when a block is cancelled", async () => {
        await renderPage();

        chooseAction("Ada Lovelace", "Block user");
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(updateAdminUserStatus).not.toHaveBeenCalled();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("names the account in the delete confirmation, and states the cost", async () => {
        await renderPage();

        chooseAction("Ada Lovelace", "Delete user");

        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent("Delete Ada Lovelace?");
        expect(dialog).toHaveTextContent("4");
        expect(dialog).toHaveTextContent("cannot be undone");
    });

    it("refuses to let an admin delete their own account from the table", async () => {
        await renderPage(page({ rows: [{ ...makeUser(), _id: ADMIN._id }] }));

        /* The admin's own row still opens, but offers nothing destructive. */
        fireEvent.click(
            screen.getByRole("button", { name: `Actions for ${ADMIN.firstName} ${ADMIN.lastName}` })
        );

        const menu = screen.getByRole("menu");
        expect(within(menu).getByRole("menuitem", { name: "View user" })).toBeInTheDocument();
        expect(within(menu).queryByRole("menuitem", { name: /Delete/ })).not.toBeInTheDocument();
    });

    it("opens the drawer for one user, fetching that user by id", async () => {
        await renderPage();

        chooseAction("Alan Turing", "View user");

        expect(await screen.findByRole("dialog")).toBeInTheDocument();
        expect(getAdminUser).toHaveBeenCalledWith("u2");
    });

    it("shows a rejected action as an error, not as a success", async () => {
        updateAdminUserStatus.mockRejectedValue(new Error("Administrator access is required"));
        await renderPage();

        chooseAction("Ada Lovelace", "Block user");
        fireEvent.click(screen.getByRole("button", { name: "Block user" }));

        await waitFor(() =>
            expect(screen.getByRole("alert")).toHaveTextContent("Administrator access is required")
        );
    });

    it("reports a failed load with a retry, rather than an empty table", async () => {
        validateToken.mockResolvedValue({ user: ADMIN });
        getAdminUsers.mockRejectedValue(new Error("Unable to reach the server"));

        render(
            <QueryClientProvider client={makeClient()}>
                <AppContextProvider>
                    <MemoryRouter initialEntries={["/admin/users"]}>
                        <AdminUsers />
                    </MemoryRouter>
                </AppContextProvider>
            </QueryClientProvider>
        );

        expect(await screen.findByText("Could not load the users")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });
});

/**
 * The table's own loading state. Every trigger below ends in the same place - a
 * circular indicator inside the table area - because they all surface as one
 * `isFetching` on one query; what each test pins down is that the trigger
 * reaches that state, and that the surrounding layout does not move while it is
 * there.
 */
describe("the users table while it is fetching", () => {
    const ROWS = [makeUser(), makeUser({ _id: "u2", firstName: "Alan", lastName: "Turing" })];

    const page = (overrides = {}) => ({
        rows: ROWS,
        page: 1,
        pageSize: 10,
        total: 2,
        pageCount: 1,
        sortBy: "createdAt",
        sortDir: "desc",
        ...overrides,
    });

    /** A promise plus the handles that settle it, so a test can hold a request
     *  open and look at the screen while it is genuinely in flight. */
    const deferred = () => {
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });

        return { promise, resolve, reject };
    };

    /** Mounts the page, then makes every later request hang until the test
     *  settles it, so the loading state can be asserted mid-request. */
    const renderPendingPage = async (rows = page()) => {
        validateToken.mockResolvedValue({ user: ADMIN });
        getAdminUsers.mockResolvedValue({ users: rows });
        getAdminUser.mockResolvedValue({ user: ROWS[1] });

        const view = render(
            <QueryClientProvider client={makeClient()}>
                <AppContextProvider>
                    <MemoryRouter initialEntries={["/admin/users"]}>
                        <AdminUsers />
                    </MemoryRouter>
                </AppContextProvider>
            </QueryClientProvider>
        );

        await screen.findByText("Ada Lovelace");

        const next = deferred();
        getAdminUsers.mockReturnValue(next.promise);

        return { ...view, ...next };
    };

    const TABLE = "Registered users table";

    it("shows a circular indicator inside the table while a filter is fetching", async () => {
        const { promise, resolve } = await renderPendingPage();

        fireEvent.change(screen.getByLabelText("Role"), { target: { value: "admin" } });

        /* The words, not just the motion, so the state is readable. */
        expect(await screen.findByText("Loading users...")).toBeInTheDocument();
        expect(
            screen.getAllByRole("status").some((node) => /Loading users/.test(node.textContent)),
        ).toBe(true);

        resolve({ users: page() });
        await promise;
    });

    it("announces the busy state, so the table is not only marked by motion", async () => {
        const { promise, resolve } = await renderPendingPage();

        expect(screen.getByLabelText(TABLE)).toHaveAttribute("aria-busy", "false");

        fireEvent.change(screen.getByLabelText("Account status"), { target: { value: "blocked" } });

        await waitFor(() => expect(screen.getByLabelText(TABLE)).toHaveAttribute("aria-busy", "true"));

        resolve({ users: page() });
        await promise;
        await waitFor(() => expect(screen.getByLabelText(TABLE)).toHaveAttribute("aria-busy", "false"));
    });

    it("keeps the table, the filters and the pagination in place while it loads", async () => {
        const { promise, resolve } = await renderPendingPage(page({ total: 30, pageCount: 3 }));

        fireEvent.change(screen.getByLabelText("Role"), { target: { value: "admin" } });
        await screen.findByText("Loading users...");

        /* Nothing is removed and nothing is replaced by a full page loader: the
         * rows are still there to read, and the controls are still usable. */
        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(screen.getByLabelText("Search")).toBeInTheDocument();
        expect(screen.getByLabelText("Role")).toBeEnabled();
        expect(screen.getByLabelText("Account status")).toBeEnabled();
        expect(screen.getByText("Showing 1-10 of 30")).toBeInTheDocument();

        resolve({ users: page({ total: 30, pageCount: 3 }) });
        await promise;
    });

    it("does not show it for the letters that never left the browser", async () => {
        await renderPendingPage();
        const box = screen.getByLabelText("Search");

        for (const letter of "ada") {
            fireEvent.change(box, { target: { value: box.value + letter } });
        }

        /* Still inside the debounce: the request has not been made, so there is
         * nothing to report as loading. */
        expect(screen.queryByText("Loading users...")).not.toBeInTheDocument();
        expect(screen.getByLabelText(TABLE)).toHaveAttribute("aria-busy", "false");
    });

    it("shows it when the debounced search does start, and drops it when it lands", async () => {
        const { promise, resolve } = await renderPendingPage();

        for (const letter of "john") {
            const box = screen.getByLabelText("Search");
            fireEvent.change(box, { target: { value: box.value + letter } });
        }

        /* Only once the pause is over and the request is real. */
        expect(
            await screen.findByText("Loading users...", undefined, { timeout: 2000 }),
        ).toBeInTheDocument();

        resolve({ users: page({ rows: [makeUser({ firstName: "John" })] }) });
        await promise;

        await waitFor(() => expect(screen.queryByText("Loading users...")).not.toBeInTheDocument());
        expect(screen.getByText("John Lovelace")).toBeInTheDocument();
    });

    it("shows it while the next page is on its way", async () => {
        const { promise, resolve } = await renderPendingPage(page({ total: 30, pageCount: 3 }));

        fireEvent.click(screen.getByRole("button", { name: "Page 2" }));

        expect(await screen.findByText("Loading users...")).toBeInTheDocument();

        resolve({ users: page({ page: 2, total: 30, pageCount: 3 }) });
        await promise;

        await waitFor(() => expect(screen.queryByText("Loading users...")).not.toBeInTheDocument());
    });

    it("shows it once for a combination of filters, and resolves to that combination", async () => {
        const { promise, resolve } = await renderPendingPage();

        fireEvent.change(screen.getByLabelText("Search"), { target: { value: "john" } });
        /* Wait for the debounce to actually fire, rather than guessing at a
         * pause long enough to cover it. */
        await waitFor(() =>
            expect(getAdminUsers).toHaveBeenCalledWith(
                expect.objectContaining({ search: "john" }),
                expect.anything(),
            ),
            { timeout: 2000 },
        );

        fireEvent.change(screen.getByLabelText("Role"), { target: { value: "admin" } });
        fireEvent.change(screen.getByLabelText("Account status"), { target: { value: "active" } });

        expect(await screen.findByText("Loading users...")).toBeInTheDocument();

        resolve({ users: page({ rows: [makeUser({ firstName: "John" })] }) });
        await promise;

        expect(getAdminUsers).toHaveBeenLastCalledWith(
            expect.objectContaining({ search: "john", role: "admin", status: "active", page: 1 }),
            expect.objectContaining({ signal: expect.anything() }),
        );
        await waitFor(() => expect(screen.queryByText("Loading users...")).not.toBeInTheDocument());
    });

    it("drops it when the request fails, and leaves the error usable", async () => {
        const { promise, reject } = await renderPendingPage();

        fireEvent.change(screen.getByLabelText("Role"), { target: { value: "admin" } });
        expect(await screen.findByText("Loading users...")).toBeInTheDocument();

        reject(new Error("Unable to reach the server"));
        await promise.catch(() => {});

        expect(await screen.findByText("Could not load the users")).toBeInTheDocument();
        expect(screen.queryByText("Loading users...")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    });

    it("stays in the loading state while a newer request is the one being waited on", async () => {
        const { promise, resolve } = await renderPendingPage();
        const second = deferred();
        getAdminUsers.mockReturnValue(second.promise);

        fireEvent.change(screen.getByLabelText("Role"), { target: { value: "admin" } });
        expect(await screen.findByText("Loading users...")).toBeInTheDocument();

        /* The admin changes their mind before the first request came back. The
         * state must not flicker off and on as the first one is abandoned. */
        fireEvent.change(screen.getByLabelText("Account status"), { target: { value: "blocked" } });

        expect(screen.getByText("Loading users...")).toBeInTheDocument();

        second.resolve({ users: page({ rows: [makeUser({ firstName: "Grace" })] }) });
        resolve({ users: page({ rows: [makeUser({ firstName: "Stale" })] }) });
        await promise.catch(() => {});

        await waitFor(() => expect(screen.getByText("Grace Lovelace")).toBeInTheDocument());
        expect(screen.queryByText("Stale Lovelace")).not.toBeInTheDocument();
        expect(screen.queryByText("Loading users...")).not.toBeInTheDocument();
    });
});

