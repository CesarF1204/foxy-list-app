import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Navbar from "../src/components/User/Navbar";
import { AppContextProvider } from "../src/contexts/AppContext";
import { useAppContext } from "../src/contexts/useAppContext";
import { AVATAR_MESSAGES } from "../src/constants/user";

/** The session query is the navbar's only input, so each test decides who is signed in. */
const validateToken = vi.fn();
vi.mock("../src/api-client/auth", () => ({
    validateToken: () => validateToken(),
}));

/** The upload call is mocked so the tests drive progress and failure by hand. */
const uploadAvatar = vi.fn();
vi.mock("../src/api-client/users", () => ({
    updateOwnProfile: vi.fn(),
    updateOwnPassword: vi.fn(),
    logOut: vi.fn(),
    uploadAvatar: (...args) => uploadAvatar(...args),
}));

vi.mock("../src/api-client/admin", () => ({
    updateAdminUser: vi.fn(),
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
    getAllTasks: vi.fn().mockResolvedValue({ tasks: [] }),
}));

const USER = {
    _id: "u1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    role: "user",
    status: "active",
    createdAt: "2024-01-15T00:00:00.000Z",
    avatar: "",
};

const AVATAR_URL = "https://res.cloudinary.com/foxy/image/upload/avatars/u1.png";

/** A file the browser would accept: right extension, under the limit. */
const imageFile = (name = "me.png", size = 1024) =>
    new File(["x".repeat(size)], name, { type: "image/png" });

/** The same, but past the 5 MB limit. */
const oversizedFile = () =>
    new File(["x".repeat(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });

const makeClient = () =>
    new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });

/** The navbar as `Dashboard` mounts it, reading its user from the context. */
const SessionNavbar = () => {
    const { user } = useAppContext();
    return <Navbar user={user} />;
};

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

/** Opens the account menu, then View Profile, and returns the drawer. */
const openDrawer = async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Open account menu" }));
    fireEvent.click(
        within(screen.getByRole("menu")).getByRole("menuitem", { name: "View Profile" })
    );

    return screen.findByRole("dialog");
};

/** The upload control: the whole circle is the button. */
const openPicker = async (drawer) =>
    fireEvent.click(within(drawer).getByRole("button", { name: /profile picture/i }));

/** Hands a file to the hidden input, the way a real file selection would. */
const chooseFile = (drawer, file) =>
    fireEvent.change(within(drawer).getByTestId("avatar-file-input"), {
        target: { files: [file] },
    });

/**
 * The `<img>` inside an avatar, if there is one.
 *
 * Queried from the DOM rather than by role on purpose: `Avatar` renders `alt=""` because the
 * person's name always sits beside the picture, and an image with an empty alt has the
 * `presentation` role - so `getByRole("img")` cannot find it, by design.
 */
const pictureIn = (node) => node.querySelector("img");

beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
});

afterEach(cleanup);
describe("the profile picture in the View Profile drawer", () => {
    it("shows the initials and a camera badge when no picture has been uploaded", async () => {
        renderNavbar(USER);
        const drawer = await openDrawer();

        expect(within(drawer).getByText("AL")).toBeInTheDocument();
        expect(
            within(drawer).getByRole("button", { name: "Change your profile picture" })
        ).toBeInTheDocument();
    });

    it("keeps the ring and the camera badge their resting colours on hover", async () => {
        renderNavbar(USER);
        const drawer = await openDrawer();

        const control = within(drawer).getByRole("button", {
            name: "Change your profile picture"
        });

        /**
         * Neither the ring nor the badge may recolour under the pointer: the picture
         * control looks the same at rest and while it is hovered, matching the
         * account trigger in the navbar.
         */
        expect(control.querySelector("span.relative")).not.toHaveClass("group-hover:ring-fox-400");
        expect(control.querySelector("span.absolute")).not.toHaveClass("group-hover:bg-fox-50");

        /** The resting colours are still the ones the design calls for. */
        expect(control.querySelector("span.relative")).toHaveClass("ring-2", "ring-ink");
        expect(control.querySelector("span.absolute")).toHaveClass(
            "bg-white",
            "border-2",
            "border-ink"
        );
    });

    it("names the control in words as well as in a glyph", async () => {
        renderNavbar(USER);
        const drawer = await openDrawer();

        /**
         * The camera badge is a glyph, so the button also carries a `title`: hovering
         * spells out what clicking it does. It matches `aria-label` exactly, because
         * the same control is being described twice.
         */
        const control = within(drawer).getByRole("button", {
            name: "Change your profile picture"
        });

        expect(control).toHaveAttribute("title", "Change your profile picture");
    });

    it("opens the file picker when the picture itself is clicked", async () => {
        renderNavbar(USER);
        const drawer = await openDrawer();

        const input = within(drawer).getByTestId("avatar-file-input");
        const click = vi.spyOn(input, "click");

        await openPicker(drawer);

        expect(click).toHaveBeenCalled();
        /** Only the three accepted formats are offered, straight from the shared constant. */
        expect(input).toHaveAttribute("accept", ".jpg,.jpeg,.png");
    });

    it("refuses an unsupported file before sending anything", async () => {
        renderNavbar(USER);
        const drawer = await openDrawer();

        chooseFile(drawer, new File(["nope"], "notes.txt", { type: "text/plain" }));

        expect(await screen.findByText(AVATAR_MESSAGES.type)).toBeInTheDocument();
        expect(uploadAvatar).not.toHaveBeenCalled();
    });

    it("refuses a file over 5 MB before sending anything", async () => {
        renderNavbar(USER);
        const drawer = await openDrawer();

        chooseFile(drawer, oversizedFile());

        expect(await screen.findByText(AVATAR_MESSAGES.size)).toBeInTheDocument();
        expect(uploadAvatar).not.toHaveBeenCalled();
    });
});

describe("while an upload is in flight", () => {
    it("shows 0% over the picture that is still there, then clears on success", async () => {
        /** A request the test finishes by hand, so the progress can be observed in between. */
        let finish;
        uploadAvatar.mockImplementation(
            (_file, onProgress) =>
                new Promise((resolve) => {
                    onProgress(0);
                    finish = () =>
                        resolve({
                            message: "Profile picture updated",
                            avatar: AVATAR_URL,
                            user: { ...USER, avatar: AVATAR_URL },
                        });
                })
        );

        renderNavbar(USER);
        const drawer = await openDrawer();
        chooseFile(drawer, imageFile());

        await waitFor(() => expect(uploadAvatar).toHaveBeenCalledTimes(1));

        expect(within(drawer).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

        /** The old picture is still readable underneath the ring: nothing has been replaced. */
        expect(within(drawer).getByText("AL")).toBeInTheDocument();

        finish();
        await waitFor(() =>
            expect(within(drawer).queryByRole("progressbar")).not.toBeInTheDocument()
        );
    });

    it("says so in the tooltip too, so the two never disagree", async () => {
        uploadAvatar.mockImplementation(() => new Promise(() => {}));

        renderNavbar(USER);
        const drawer = await openDrawer();

        /** At rest the tooltip is the invitation. */
        expect(
            within(drawer).getByRole("button", { name: "Change your profile picture" })
        ).toHaveAttribute("title", "Change your profile picture");

        chooseFile(drawer, imageFile());
        await waitFor(() => expect(uploadAvatar).toHaveBeenCalledTimes(1));

        /** Mid-upload the button is disabled, so the tooltip follows it rather than promising a click. */
        const busy = within(drawer).getByRole("button", {
            name: "Uploading your new profile picture"
        });
        expect(busy).toHaveAttribute("title", "Uploading your new profile picture");
    });

    it("cannot be started a second time while one is running", async () => {
        uploadAvatar.mockImplementation(() => new Promise(() => {}));

        renderNavbar(USER);
        const drawer = await openDrawer();
        chooseFile(drawer, imageFile());

        await waitFor(() => expect(uploadAvatar).toHaveBeenCalledTimes(1));

        expect(within(drawer).getByRole("button", { name: /uploading/i })).toBeDisabled();
    });
});

describe("after the upload finishes", () => {
    it("shows the new picture in the drawer and the navbar, with no reload", async () => {
        uploadAvatar.mockResolvedValue({
            message: "Profile picture updated",
            avatar: AVATAR_URL,
            user: { ...USER, avatar: AVATAR_URL },
        });

        renderNavbar(USER);
        const drawer = await openDrawer();
        chooseFile(drawer, imageFile());

        expect(await screen.findByText("Profile picture updated")).toBeInTheDocument();

        /** The drawer now shows the image rather than the initials. */
        await waitFor(() => expect(pictureIn(drawer)).toHaveAttribute("src", AVATAR_URL));

        /** And the navbar followed it, because both read the same session cache. */
        const navbarAvatar = screen.getByRole("button", { name: "Open account menu" });
        await waitFor(() => expect(pictureIn(navbarAvatar)).toHaveAttribute("src", AVATAR_URL));

        /** The ring is gone and the control is live again. */
        expect(within(drawer).queryByRole("progressbar")).not.toBeInTheDocument();
        expect(
            within(drawer).getByRole("button", { name: "Change your profile picture" })
        ).toBeEnabled();
    });

    it("keeps the old picture and reports the failure when the upload is rejected", async () => {
        uploadAvatar.mockRejectedValue(new Error("The image could not be uploaded."));

        renderNavbar(USER);
        const drawer = await openDrawer();
        chooseFile(drawer, imageFile());

        expect(await screen.findByText("The image could not be uploaded.")).toBeInTheDocument();

        /** Unchanged: still the initials, no image anywhere, and no ring left spinning. */
        expect(within(drawer).getByText("AL")).toBeInTheDocument();
        expect(pictureIn(drawer)).toBeNull();
        expect(within(drawer).queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("leaves an existing picture in place when a second upload fails", async () => {
        uploadAvatar.mockRejectedValue(new Error("The image could not be uploaded."));

        renderNavbar({ ...USER, avatar: AVATAR_URL });
        const drawer = await openDrawer();
        chooseFile(drawer, imageFile());

        await screen.findByText("The image could not be uploaded.");

        expect(pictureIn(drawer)).toHaveAttribute("src", AVATAR_URL);
    });
});
