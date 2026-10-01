import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import PasswordField from "../src/components/PasswordField";

afterEach(cleanup);

/** The eye, found by the action it currently advertises. */
const eye = (name) => screen.getByRole("button", { name });

const type = (input, value) => fireEvent.change(input, { target: { value } });

describe("PasswordField", () => {
    it("masks the value by default and carries the eye", () => {
        render(<PasswordField id="p" label="Password" />);
        expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
        expect(eye("Show password")).toBeInTheDocument();
    });

    it("reveals on click and hides again, with the value untouched", () => {
        render(<PasswordField id="p" label="Password" />);
        const input = screen.getByLabelText("Password");
        type(input, "MyPassword123");

        fireEvent.click(eye("Show password"));
        /** The type swaps; the value is the password, never asterisks. */
        expect(input).toHaveAttribute("type", "text");
        expect(input).toHaveValue("MyPassword123");

        fireEvent.click(eye("Hide password"));
        expect(input).toHaveAttribute("type", "password");
        expect(input).toHaveValue("MyPassword123");
    });

    it("labels the eye for its current action and reports the pressed state", () => {
        render(<PasswordField id="p" label="Password" />);
        expect(eye("Show password")).toHaveAttribute("aria-pressed", "false");
        fireEvent.click(eye("Show password"));
        expect(eye("Hide password")).toHaveAttribute("aria-pressed", "true");
    });

    it("is keyboard focusable and toggles from the keyboard", () => {
        render(<PasswordField id="p" label="Password" />);
        const input = screen.getByLabelText("Password");
        type(input, "MyPassword123");

        const button = eye("Show password");
        expect(button).toHaveAttribute("type", "button");
        button.focus();
        expect(button).toHaveFocus();

        fireEvent.click(button);
        expect(input).toHaveAttribute("type", "text");
        expect(input).toHaveValue("MyPassword123");
    });

    it("never submits the form the toggle sits in", () => {
        const onSubmit = vi.fn((event) => event.preventDefault());
        render(
            <form onSubmit={onSubmit}>
                <PasswordField id="p" label="Password" />
                <button type="submit">Sign in</button>
            </form>,
        );

        fireEvent.click(eye("Show password"));
        expect(onSubmit).not.toHaveBeenCalled();

        /** The real submit button still submits. */
        fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("passes the error message and invalid state through", () => {
        render(
            <PasswordField
                id="p"
                label="Password"
                error={{ message: "Passwords do not match" }}
                aria-invalid
            />,
        );
        const input = screen.getByLabelText("Password");
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAccessibleDescription("Passwords do not match");
    });
});

/**
 * A new password and its confirmation side by side, which is the one case where a shared toggle
 * would be wrong: the user has to compare the two values, so each eye must move on its own and
 * neither may disturb the other's value.
 */
describe("a password and its confirmation", () => {
    const renderPair = () =>
        render(
            <form>
                <PasswordField id="password" label="New password" />
                <PasswordField id="confirmPassword" label="Confirm new password" />
            </form>,
        );

    it("gives each field its own eye", () => {
        renderPair();
        const eyes = screen.getAllByRole("button", { name: "Show password" });
        expect(eyes).toHaveLength(2);
    });

    it("shows the new password while the confirmation stays hidden", () => {
        renderPair();
        const password = screen.getByLabelText("New password");
        const confirm = screen.getByLabelText("Confirm new password");
        type(password, "MyPassword123");
        type(confirm, "MyPassword123");

        const [passwordEye] = screen.getAllByRole("button", { name: "Show password" });
        fireEvent.click(passwordEye);

        expect(password).toHaveAttribute("type", "text");
        expect(confirm).toHaveAttribute("type", "password");
        /** Both values survive, so the pair can still be compared and submitted. */
        expect(password).toHaveValue("MyPassword123");
        expect(confirm).toHaveValue("MyPassword123");
    });

    it("shows the confirmation on its own, and re-hides it alone", () => {
        renderPair();
        const password = screen.getByLabelText("New password");
        const confirm = screen.getByLabelText("Confirm new password");
        type(password, "MyPassword123");
        type(confirm, "MyPassword123");

        /**
         * The two eyes share a name while both read the same, so the confirmation's is the
         * second one in DOM order.
         */
        const eyes = screen.getAllByRole("button", { name: "Show password" });
        fireEvent.click(eyes[1]);
        expect(confirm).toHaveAttribute("type", "text");
        expect(password).toHaveAttribute("type", "password");

        /** Now only one eye reads "Hide password"; it belongs to the confirmation. */
        const [confirmEye] = screen.getAllByRole("button", { name: "Hide password" });
        fireEvent.click(confirmEye);
        expect(confirm).toHaveAttribute("type", "password");
        expect(password).toHaveAttribute("type", "password");
        expect(confirm).toHaveValue("MyPassword123");
    });
});
