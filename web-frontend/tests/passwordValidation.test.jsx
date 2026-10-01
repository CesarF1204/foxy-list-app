import { useState } from "react";
import { useForm } from "react-hook-form";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

import {
    newPasswordRules,
    confirmPasswordRules,
    hasPasswordSpaces,
    VALIDATION_MESSAGES,
} from "../src/constants/validation";

afterEach(cleanup);

/**
 * The password and confirmation fields wired to the real rules, so these tests fail if the
 * rules are ever handed to react-hook-form in a form that reads them backwards. Asserting
 * against `newPasswordRules().validate` directly would pass even while the form rejected
 * every good password, which is exactly the bug these tests exist to catch.
 */
const Probe = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({ defaultValues: { password: "", confirmPassword: "" } });
    /**
     * A valid submit speaks too, so the harness has something to wait on that is not an
     * error message - otherwise an accepted password would look like a hung test.
     */
    const [outcome, setOutcome] = useState("");

    return (
        <form
            onSubmit={handleSubmit(
                () => setOutcome("accepted"),
                () => setOutcome("refused"),
            )}
        >
            <input aria-label="password" {...register("password", newPasswordRules())} />
            <input
                aria-label="confirmPassword"
                {...register("confirmPassword", confirmPasswordRules(() => "admin!!!"))}
            />
            <button type="submit">Submit</button>
            <span data-testid="outcome">{outcome}</span>
            <span data-testid="passwordError">{errors.password?.message ?? ""}</span>
            <span data-testid="confirmError">{errors.confirmPassword?.message ?? ""}</span>
        </form>
    );
};

/** Both field messages, once the form has settled. */
const readErrors = () => ({
    password: screen.getByTestId("passwordError").textContent,
    confirm: screen.getByTestId("confirmError").textContent,
});

/** Types into both password fields, submits, and returns the messages left behind. */
const submitWith = async (password, confirmation = password) => {
    render(<Probe />);
    fireEvent.change(screen.getByLabelText("password"), { target: { value: password } });
    fireEvent.change(screen.getByLabelText("confirmPassword"), {
        target: { value: confirmation },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    /** The submit callbacks speak for a valid form too, so both outcomes settle here. */
    await waitFor(() => expect(screen.getByTestId("outcome").textContent).not.toBe(""));

    return readErrors();
};

/** True when the password field raised no complaint. */
const accepts = async (password, confirmation) =>
    (await submitWith(password, confirmation)).password === "";

describe("new password rules", () => {
    /** Letters, digits and symbols are all ordinary password characters. */
    it.each([
        ["admin!!!", "letters and symbols"],
        ["admin123@$$#!+", "letters, digits and symbols"],
        ["+@$123$#", "symbols and digits, no letters"],
        ["dsd123#@4", "letters, digits and one symbol"],
    ])("accepts %j (%s)", async (password) => {
        expect(await accepts(password)).toBe(true);
    });

    /** Whitespace anywhere disqualifies the password, however good the rest of it is. */
    it.each([
        ["4 @4", "an internal space"],
        ["123   sd!@", "a run of internal spaces"],
        ["  12s!", "leading spaces"],
        ["admin!!! ", "a trailing space"],
        ["   ", "nothing but spaces"],
    ])("refuses %j (%s)", async (password) => {
        expect(await accepts(password)).toBe(false);
    });

    /** Long enough that the length rule is not what reports the space. */
    it("explains the refusal as a space problem", async () => {
        const { password } = await submitWith("4 @4xyz");

        expect(password).toBe(VALIDATION_MESSAGES.passwordHasSpaces);
    });

    /** The length rule is untouched: short is refused even with no space in it. */
    it("still refuses a password under the minimum length", async () => {
        expect(await accepts("a1!")).toBe(false);
    });
});

describe("confirmation rules", () => {
    /** A confirmation carrying whitespace is refused on its own account. */
    it("refuses a confirmation that carries a space", async () => {
        const { confirm } = await submitWith("admin!!!", "admin!!! ");

        expect(confirm).toBe(VALIDATION_MESSAGES.passwordHasSpaces);
    });

    /** A mismatched confirmation still reports the mismatch. */
    it("reports a mismatch", async () => {
        const { confirm } = await submitWith("different!!");

        expect(confirm).toBe(VALIDATION_MESSAGES.passwordsDoNotMatch);
    });

    /** A matching, space-free confirmation passes on both fields. */
    it("accepts a matching special-character password", async () => {
        expect(await accepts("+@$123$#")).toBe(true);
    });
});

describe("hasPasswordSpaces", () => {
    it("is a detector, so it is true exactly for the passwords that must be refused", () => {
        expect(hasPasswordSpaces("admin!!!")).toBe(false);
        expect(hasPasswordSpaces("admin123@$$#!+")).toBe(false);
        expect(hasPasswordSpaces("+@$123$#")).toBe(false);
        expect(hasPasswordSpaces("4 @4")).toBe(true);
        expect(hasPasswordSpaces("   ")).toBe(true);
        expect(hasPasswordSpaces("123   sd!@")).toBe(true);
    });

    /** A missing value is not a password with spaces; it is an empty one. */
    it("treats a missing value as space-free", () => {
        expect(hasPasswordSpaces("")).toBe(false);
        expect(hasPasswordSpaces(undefined)).toBe(false);
    });
});