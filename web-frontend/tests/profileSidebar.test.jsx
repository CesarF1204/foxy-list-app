import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Navbar from "../src/components/User/Navbar";
import { AppContextProvider } from "../src/contexts/AppContext";
import { useAppContext } from "../src/contexts/useAppContext";

/** The session query is the navbar's only input, so each test decides who is signed in. */
const validateToken = vi.fn();
vi.mock("../src/api-client/auth", () => ({
    validateToken: () => validateToken(),
}));

/** The two profile endpoints, one per account type, plus the board the drawer counts. */
const updateOwnProfile = vi.fn();
const updateAdminUser = vi.fn();
const getAllTasks = vi.fn();

vi.mock("../src/api-client/users", () => ({
    updateOwnProfile: (...args) => updateOwnProfile(...args),
    updateOwnPassword: vi.fn(),
    logOut: vi.fn(),
}));

vi.mock("../src/api-client/admin", () => ({
    updateAdminUser: (...args) => updateAdminUser(...args),
    updateAdminUserRole: vi.fn(),
    updateAdminUserStatus: vi.fn(),
    updateAdminUserPassword: vi.fn(),
    deleteAdminUser: vi.fn(),
    updateAdminUserAvatar: vi.fn(),
    getAdminUsers: vi.fn(),
    getAdminUser: vi.fn(),
    getAdminStats: vi.fn(),
}));

vi.mock("../src/api-client/tasks", () => ({
    getAllTasks: () => getAllTasks(),
}));

const USER = {
    _id: "u1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    role: "user",
    status: "active",
    createdAt: "2024-01-15T00:00:00.000Z",
};

const ADMIN = { ...USER, _id: "u2", firstName: "Alan", lastName: "Turing", role: "admin" };

/** The rename every test that succeeds applies. */
const RENAMED = { firstName: "Grace", lastName: "Hopper", email: "grace@example.com" };

const makeClient = () =>
    new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });

/**
 * The navbar as `Dashboard` mounts it: taking its user from the context rather than from a prop.
 * That distinction is the whole point - a prop would keep showing the value it was handed, and
 * the bug under test is precisely a screen that never learns the new name.
 */
const SessionNavbar = () => {
    const { user } = useAppContext();
    return <Navbar user={user} />;
};

/**
 * The real navbar over the real context - the wiring the bug lived in.
 */
const renderNavbar = (user) => {
    validateToken.mockResolvedValue({ user });

    return render(
        <QueryClientProvider client={makeClient()}>
            <AppContextProvider>
                <MemoryRouter initialEntries={["/"]}>
                    <SessionNavbar />
                </MemoryRouter>
            </AppContextProvider>
        </QueryClientProvider>
    );
};

/** The account menu, the panel the name and email are read from. */
const readAccountMenu = async () => {
    const button = await screen.findByRole("button", { name: "Open account menu" });
    fireEvent.click(button);
    return screen.getByRole("menu");
};

/** Opens View Profile from the account menu, then the name and email editor. */
const openProfileEditor = async (menu) => {
    fireEvent.click(within(menu).getByRole("menuitem", { name: "View Profile" }));

    const drawer = await screen.findByRole("dialog");
    fireEvent.click(within(drawer).getByRole("button", { name: "Edit name and email" }));
    return screen.getByRole("button", { name: "Save changes" });
};

/** Fills the three fields and saves. */
const saveProfile = ({ firstName, lastName, email }) => {
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: firstName } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: lastName } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
};

beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    getAllTasks.mockResolvedValue({ tasks: [] });
});

afterEach(cleanup);


describe("saving your own name and email from the View Profile drawer", () => {
    it("updates the account menu for a plain user, without a reload", async () => {
        updateOwnProfile.mockResolvedValue({ user: { ...USER, ...RENAMED } });

        renderNavbar(USER);
        await openProfileEditor(await readAccountMenu());
        saveProfile(RENAMED);

        await waitFor(() => expect(updateOwnProfile).toHaveBeenCalledTimes(1));

        /** The session is re-read here, so this is the assertion that used to fail. */
        const menu = await readAccountMenu();
        expect(within(menu).getByText("Grace Hopper")).toBeInTheDocument();
        expect(within(menu).getByText("grace@example.com")).toBeInTheDocument();
    });

    it("updates the account menu for an admin editing their own account", async () => {
        updateAdminUser.mockResolvedValue({ user: { ...ADMIN, ...RENAMED } });

        renderNavbar(ADMIN);
        await openProfileEditor(await readAccountMenu());
        saveProfile(RENAMED);

        await waitFor(() => expect(updateAdminUser).toHaveBeenCalledTimes(1));

        const menu = await readAccountMenu();
        expect(within(menu).getByText("Grace Hopper")).toBeInTheDocument();
        expect(within(menu).getByText("grace@example.com")).toBeInTheDocument();
    });

    it("moves the avatar initials with the name", async () => {
        updateOwnProfile.mockResolvedValue({ user: { ...USER, ...RENAMED } });

        renderNavbar(USER);
        await openProfileEditor(await readAccountMenu());
        saveProfile(RENAMED);

        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Open account menu" })).toHaveTextContent(
                "GH",
            ),
        );
    });

    it("leaves the account menu alone when an admin edits somebody else", async () => {
        updateAdminUser.mockResolvedValue({
            user: {
                _id: "u9",
                firstName: "Someone",
                lastName: "Else",
                email: "someone@example.com",
                role: "user",
                status: "active",
            },
        });

        renderNavbar(ADMIN);
        await openProfileEditor(await readAccountMenu());
        saveProfile({ firstName: "Someone", lastName: "Else", email: "someone@example.com" });

        await waitFor(() => expect(updateAdminUser).toHaveBeenCalledTimes(1));

        /** Another account's rename is not this session's business. */
        const menu = await readAccountMenu();
        expect(within(menu).getByText("Alan Turing")).toBeInTheDocument();
        expect(within(menu).queryByText("someone@example.com")).not.toBeInTheDocument();
    });

    it("keeps the old name on screen when the save is rejected", async () => {
        updateOwnProfile.mockRejectedValue(new Error("Email is already registered."));

        renderNavbar(USER);
        await openProfileEditor(await readAccountMenu());
        saveProfile({ ...RENAMED, email: "taken@example.com" });

        expect(await screen.findByText("Email is already registered.")).toBeInTheDocument();

        const menu = await readAccountMenu();
        expect(within(menu).getByText("Ada Lovelace")).toBeInTheDocument();
    });
});
