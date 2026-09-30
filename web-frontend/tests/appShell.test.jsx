/**
 * Tests for the app shell's footer rule.
 *
 * The rule lives in one place - `AppShell` - because the footer is rendered by
 * the shell rather than by each page. These tests drive the real `AppShell` and
 * the real `Footer` through a memory router at each route and assert on the
 * DOM, which is the only form of the check that would catch a page quietly
 * keeping (or losing) the footer.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AppShell from "../src/components/AppShell";
import { FOOTER_PATHS } from "../src/helpers/footerRoutes";

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
    it.each(["/login", "/register", "/recover-password"])("is not rendered on %s", (path) => {
        renderAt(path);

        expect(footer()).not.toBeInTheDocument();
    });

    it("does not treat a lookalike path as the board", () => {
        renderAt("/login-history");

        expect(footer()).not.toBeInTheDocument();
    });
});

describe("the footer on the not-found pages", () => {
    it("is not rendered on the explicit /404 route", () => {
        renderAt("/404");

        expect(footer()).not.toBeInTheDocument();
    });

    /*
     * The `*` catch-all in App renders the same NotFound page for every URL
     * that matches no route, so the footer has to be gone on all of them - not
     * just on the one path someone thought to enumerate.
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

    it("keeps the board as the only footer-bearing route", () => {
        expect(FOOTER_PATHS).toEqual(["/"]);
    });

    it("still shows the footer with a trailing slash, as the router treats it", () => {
        renderAt("/");

        expect(footer()).toBeInTheDocument();
    });

    it("shows the current year, so the notice never goes stale", () => {
        renderAt("/");

        expect(footer()).toHaveTextContent(`${new Date().getFullYear()} All Rights Reserved.`);
    });
});

describe("the shell frame", () => {
    it.each(["/", "/login", "/register", "/recover-password", "/404", "/nope"])(
        "still renders the page itself on %s",
        (path) => {
            renderAt(path);

            expect(screen.getByText("Page content")).toBeInTheDocument();
        }
    );

    it("keeps the page above the footer on a footer-bearing route", () => {
        const { container } = renderAt("/");

        /* flex-1 on the content wrapper is what pushes the footer to the bottom. */
        const column = container.firstChild;
        expect(column).toHaveClass("min-h-screen", "flex-col");
        expect(column.lastElementChild.tagName).toBe("FOOTER");
    });

    it("leaves no trailing element where the footer would be, on a bare page", () => {
        const { container } = renderAt("/login");

        expect(container.firstChild.lastElementChild.tagName).toBe("P");
    });
});
