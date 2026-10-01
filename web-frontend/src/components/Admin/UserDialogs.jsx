import { useState } from "react";

import Modal from "../Modal";
import { USER_ROLES, ROLE_META } from "../../constants/roles";
import {
    PASSWORD_MIN_LENGTH,
    PASSWORD_NO_SPACES_PATTERN,
    VALIDATION_MESSAGES,
} from "../../constants/validation";
import PasswordField from "../PasswordField";
import { getFullName } from "../../helpers/globalHelper";

/**
 * DOCU: The dialogs the user drawer raises, kept apart from the drawer itself so
 * each file stays readable. Every one of them confirms something destructive or
 * security-sensitive: a block, an unblock, a delete, a role change and a
 * password reset. None of them decides whether the change is allowed - each posts
 * to its own endpoint, and the API validates the role, the status and the
 * password again before anything is written.
 *
 * The password dialog is the reason this file is worth reading on its own: the
 * value is typed, sent once and never read back, the inputs are cleared the
 * moment the API confirms, and no password is ever displayed or transmitted.
 */

/** DOCU: The shared confirmation shell. Destructive actions use the danger
 *  button, and the confirm button is disabled while the request is in flight, so
 *  a slow mutation cannot be fired twice. */
export const UserConfirmDialog = ({
    title,
    confirmLabel,
    variant = "primary",
    isPending,
    /* Set when the confirmation would do nothing - the role dialog uses it for
     * "you picked the role the account already has". It is a plain boolean rather
     * than logic of the caller's own, so every dialog disables its confirm
     * button the same way: `isPending` while the request is in flight, and
     * whatever else the dialog decides is untrue. */
    isDisabled = false,
    onConfirm,
    onClose,
    children,
}) => (
    <Modal
        isOpen
        onClose={onClose}
        title={title}
        footer={
            <>
                <button type="button" onClick={onClose} disabled={isPending} className="btn btn-neutral">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isPending || isDisabled}
                    className={`btn ${variant === "danger" ? "btn-danger" : "btn-primary"}`}
                >
                    {isPending ? "Working..." : confirmLabel}
                </button>
            </>
        }
    >
        <div className="text-sm font-semibold text-ink-soft">{children}</div>
    </Modal>
);

/**
 * DOCU: Changes a user's role. The options come from `USER_ROLES`, the same list
 * the API validates against, so a role the app does not support is never offered
 * here and would be rejected there.
 *
 * The selection starts on the account's current role, which means the dialog
 * opens in a state where confirming would change nothing. So the button is
 * disabled until a *different* role is picked, and re-enabled the moment one is -
 * the same disabled treatment the profile editor gives an unchanged form. It is
 * derived from `choice` and `role` on every render rather than tracked with extra
 * state, so it cannot disagree with what the radios actually show: picking the
 * original role again disables the button again, and switching back and forth
 * never leaves it stuck on. `isPending` still applies on top, so a slow request
 * cannot be fired twice.
 */
export const RoleDialog = ({ user, role, isPending, onConfirm, onClose }) => {
    const [choice, setChoice] = useState(role);

    /** Nothing to confirm while the chosen role is the one already in force. */
    const isUnchanged = choice === role;

    return (
        <UserConfirmDialog
            title={`Make ${getFullName(user)} ${ROLE_META[choice]?.label.toLowerCase()}?`}
            confirmLabel="Change role"
            isPending={isPending}
            isDisabled={isUnchanged}
            onClose={onClose}
            onConfirm={() => onConfirm(choice)}
        >
            <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">New role for {getFullName(user)}</legend>
                {USER_ROLES.map((value) => (
                    <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 border-ink px-3 py-2 text-sm font-extrabold transition ${
                            choice === value ? "bg-fox-100" : "bg-white hover:bg-fox-50"
                        }`}
                    >
                        <input
                            type="radio"
                            name="admin-role-choice"
                            value={value}
                            checked={choice === value}
                            onChange={() => setChoice(value)}
                            className="accent-fox-500"
                        />
                        <span>{ROLE_META[value].label}</span>
                        <span className="ml-auto text-xs font-semibold text-ink-soft">
                            {ROLE_META[value].hint}
                        </span>
                    </label>
                ))}
            </fieldset>
            <p className="mt-3">
                The change takes effect on their next request, and they keep all of their tasks.
            </p>
        </UserConfirmDialog>
    );
};

/** DOCU: Sets a new password. The field is a password input, is never pre-filled
 *  with anything, and the API answers with a message rather than the user, so
 *  there is nothing to show afterwards. The inputs are cleared on success, so a
 *  closed dialog never leaves a password in the DOM.
 *
 *  Two rules need the server rather than the browser. The no-whitespace rule is
 *  checked here as well, so the user hears about it before a round trip - but the
 *  API checks it too, because a request made outside this UI reaches the same
 *  endpoint. And the "must differ from the current password" rule cannot be
 *  checked here at all: nobody typing into this dialog knows the account's
 *  existing password, least of all an admin setting somebody else's. The API
 *  compares against the stored hash and refuses, and `serverError` is how that
 *  refusal is shown beside the field rather than as a toast that does not say
 *  which box to fix. */
export const PasswordDialog = ({ user, isPending, serverError, onConfirm, onClose }) => {
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [error, setError] = useState("");
    /** Which field the message belongs to, so it lands beside the right input. */
    const [errorField, setErrorField] = useState("password");

    /* The same rules the sign-up form applies, so an admin cannot set a password
     * the app would then refuse at sign-in. The rules themselves live in
     * `constants/validation.js`, shared with the auth forms - including the
     * no-whitespace rule, which is checked on the confirmation as well as on the
     * password so a stray space is named on the box that has it rather than
     * showing up as a mismatch between two values that look identical. */
    const validate = () => {
        if (!password) return [VALIDATION_MESSAGES.password.required, "password"];
        if (password.length < PASSWORD_MIN_LENGTH) {
            return [VALIDATION_MESSAGES.passwordTooShort, "password"];
        }
        if (PASSWORD_NO_SPACES_PATTERN.test(password)) {
            return [VALIDATION_MESSAGES.passwordHasSpaces, "password"];
        }
        if (!confirmation) return [VALIDATION_MESSAGES.confirmPassword.required, "confirmation"];
        if (PASSWORD_NO_SPACES_PATTERN.test(confirmation)) {
            return [VALIDATION_MESSAGES.passwordHasSpaces, "confirmation"];
        }
        if (password !== confirmation) {
            return [VALIDATION_MESSAGES.passwordsDoNotMatch, "confirmation"];
        }
        return ["", ""];
    };

    /**
     * DOCU: Submits the new password.
     *
     * The typed values are left alone unless the API accepted them, so a refusal
     * - the password already in force, say - leaves the dialog as the user filled
     * it in and they can correct one character rather than start again. The
     * password itself never appears in a message and is never logged.
     */
    const submit = async () => {
        const [problem, field] = validate();
        setError(problem);
        setErrorField(field);
        if (problem) return;

        const sent = await onConfirm(password);
        if (sent) {
            setPassword("");
            setConfirmation("");
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`New password for ${getFullName(user)}`}
            footer={
                <>
                    <button type="button" onClick={onClose} disabled={isPending} className="btn btn-neutral">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={isPending}
                        className="btn btn-primary"
                    >
                        {isPending ? "Saving..." : "Set password"}
                    </button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold text-ink-soft">
                    The new password replaces the current one immediately, so the user will need
                    it at their next sign-in. It is never displayed again after this.
                </p>

                <PasswordField
                    id="admin-new-password"
                    label="New password"
                    autoComplete="new-password"
                    placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                    value={password}
                    error={errorField === "password" ? error : undefined}
                    onChange={(event) => {
                        setPassword(event.target.value);
                        setError("");
                    }}
                />

                <PasswordField
                    id="admin-confirm-password"
                    label="Confirm new password"
                    autoComplete="new-password"
                    placeholder="Re-enter the new password"
                    value={confirmation}
                    error={errorField === "confirmation" ? error : undefined}
                    onChange={(event) => {
                        setConfirmation(event.target.value);
                        setError("");
                    }}
                />

                {/* The API's refusal, announced and pinned to the password box -
                    * the same treatment `UserProfileForm` gives a rejected email.
                    *  It sits here rather than on a field's `error` so that a
                    *  message arriving before the first submit is not overwritten by
                    *  the next keystroke, which clears the local errors. */}
                {serverError && (
                    <span className="text-xs font-bold text-red-600" role="alert">
                        {serverError}
                    </span>
                )}
            </div>
        </Modal>
    );
};
