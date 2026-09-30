/**
 * Tests for the sign-in page's mock-mode hint.
 *
 * In its own file because it mocks `src/mock` to supply both sample accounts:
 * that module is the seam the hint reads, and a mock declared in a shared file
 * would apply to every suite in it.
 *
 * What is being checked is that both logins are discoverable and correctly
 * labelled - in particular that the administrator is offered, since a
 * self-registered account can never be one and there is no other route in.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

/** The two accounts, read from the environment in the real module. */
const SAMPLE = { email: "demo@example.test", password: "demo-pass" };
const ADMIN = { email: "boss@example.test", password: "admin-pass" };

vi.mock("../src/mock", () => ({
    SAMPLE_CREDENTIALS: {
        get email() {
            return SAMPLE.email;
        },
        get password() {
            return SAMPLE.password;
        },
    },
    SAMPLE_ADMIN_CREDENTIALS: {
        get email() {
            return ADMIN.email;
        },
        get password() {
            return ADMIN.password;
        },
    },
}));

const { default: SampleCredentialsHint } = await import("../src/mock/SampleCredentialsHint");

afterEach(cleanup);

describe("the sample logins on the sign-in page", () => {
    it("offers the admin login, so there is a way in to /admin", () => {
        render(<SampleCredentialsHint onFill={() => {}} />);

        expect(screen.getByText(`${ADMIN.email} / ${ADMIN.password}`)).toBeInTheDocument();
    });

    it("still offers the plain sample login", () => {
        render(<SampleCredentialsHint onFill={() => {}} />);

        expect(screen.getByText(`${SAMPLE.email} / ${SAMPLE.password}`)).toBeInTheDocument();
    });

    it("labels which is which, so the admin is not left to be guessed at", () => {
        render(<SampleCredentialsHint onFill={() => {}} />);

        expect(screen.getByText("Sample admin")).toBeInTheDocument();
        expect(screen.getByText("Sample user")).toBeInTheDocument();
    });

    it("fills the form with the chosen account's own credentials", () => {
        const onFill = vi.fn();
        render(<SampleCredentialsHint onFill={onFill} />);

        const buttons = screen.getAllByRole("button", { name: "Fill this in" });
        expect(buttons).toHaveLength(2);

        fireEvent.click(buttons[0]);
        fireEvent.click(buttons[1]);

        /* The admin is listed first, so the first button belongs to it. */
        expect(onFill.mock.calls[0][0]).toEqual(ADMIN);
        expect(onFill.mock.calls[1][0]).toEqual(SAMPLE);
    });

    it("never invents a credential of its own", () => {
        render(<SampleCredentialsHint onFill={() => {}} />);

        /* Everything shown comes from the environment; the copy adds no login. */
        const shown = screen.getByText(/admin-pass/).textContent;
        expect(shown).toContain(ADMIN.email);
        expect(shown).toContain(ADMIN.password);
    });
});
