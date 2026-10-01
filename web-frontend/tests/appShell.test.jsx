import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AppShell from "../src/components/AppShell";
import { FOOTER_PATHS, ROUTES } from "../src/constants/routes";

/** Mounts the real shell at `path`, with a stand-in for the routed page. */
const renderAt = (path) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <AppShell>
                <p>Page content</p>
            </AppShell>
        </MemoryRouter>
    );

/** The footer's copyright line, or null when the footer is not on the page. */
const footer = () => screen.queryByRole("contentinfo");

afterEach(() => {
    cleanup();
});

describe("the footer on the guest auth screens", () => {
    it.each([ROUTES.login, ROUTES.register, ROUTES.recoverPassword])(
        "is not rendered on %s",
        (path) => {
            renderAt(path);

            expect(footer()).not.toBeInTheDocument();
        }
    );

    it("does not treat a lookalike path as the board", () => {
        renderAt("/login-history");

        expect(footer()).not.toBeInTheDocument();
    });
});

describe("the footer on the not-found pages", () => {
    it("is not rendered on the explicit /404 route", () => {
        renderAt(ROUTES.notFound);

        expect(footer()).not.toBeInTheDocument();
    });

    /**
     * The `*` catch-all renders NotFound for every unmatched URL, so the footer has to be gone
     * on all of them, not just the paths someone enumerated.
     */
    it.each(["/nope", "/some/deep/unknown/path", "/task/999", "/settings/profile"])(
        "is not rendered on the unknown path %s",
        (path) => {
            renderAt(path);

            expect(footer()).not.toBeInTheDocument();
        }
    );
});

describe("the footer on the board", () => {
    it.each(FOOTER_PATHS)("is rendered on %s", (path) => {
        renderAt(path);

        expect(footer()).toBeInTheDocument();
    });

    it("keeps the signed-in pages as the only footer-bearing routes", () => {
        expect(FOOTER_PATHS).toEqual([ROUTES.board, ROUTES.adminOverview, ROUTES.adminUsers]);
    });

    it("still shows the footer with a trailing slash, as the router treats it", () => {
        renderAt(ROUTES.board);

        expect(footer()).toBeInTheDocument();
    });

    it("shows the current year, so the notice never goes stale", () => {
        renderAt(ROUTES.board);

        expect(footer()).toHaveTextContent(`${new Date().getFullYear()} All Rights Reserved.`);
    });
});

describe("the shell frame", () => {
    it.each([ROUTES.board, ROUTES.login, ROUTES.register, ROUTES.recoverPassword])(
        "still renders the page itself on %s",
        (path) => {
            renderAt(path);

            expect(screen.getByText("Page content")).toBeInTheDocument();
        }
    );

    it("keeps the page above the footer on a footer-bearing route", () => {
        const { container } = renderAt(ROUTES.board);

        /** flex-1 on the content wrapper is what pushes the footer to the bottom. */
        const column = container.firstChild;
        expect(column).toHaveClass("min-h-screen", "flex-col");
        expect(column.lastElementChild.tagName).toBe("FOOTER");
    });

    it("leaves no trailing element where the footer would be, on a bare page", () => {
        const { container } = renderAt(ROUTES.login);

        expect(container.firstChild.lastElementChild.tagName).toBe("P");
    });
});
