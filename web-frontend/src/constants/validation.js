/**
 * The auth forms' validation rules, shared by sign-in/register and password
 * recovery. Messages live beside the patterns so rule and wording cannot drift,
 * and the password rules are built here rather than spelled out per screen -
 * `newPasswordRules` and `confirmPasswordRules` are the only description of what
 * the app accepts as a password.
 */

/** DOCU: A pragmatic email shape: something, an @, something, a dot, something. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** DOCU: Names accept letters and spaces only - no digits or punctuation. */
const NAME_PATTERN = /^[A-Za-z\s]+$/;

/** DOCU: The shortest password the app accepts, in characters. */
const PASSWORD_MIN_LENGTH = 6;

/**
 * DOCU: Any whitespace anywhere in a password - leading, trailing or internal.
 *
 * The mirror of `PASSWORD_NO_SPACES_PATTERN` in the API's `constants/validation.js`,
 * and kept identical on purpose: a value this accepts and the API refuses is a
 * password the user was told was fine and then could not save.
 *
 * It is a rejection rather than a trim, never a rewrite. Trimming here would be
 * worse than useless - it would store a different secret from the one the user
 * believes they typed, and "password " against "password" is exactly the sort of
 * difference that only surfaces as a failed sign-in on another device. So the
 * value is refused, with a message saying why, and what the user typed is what
 * they get.
 */
const PASSWORD_NO_SPACES_PATTERN = /\s/;

const VALIDATION_MESSAGES = {
    firstName: { required: "Required", pattern: "Letters only" },
    lastName: { required: "Required", pattern: "Letters only" },
    email: { required: "Email is required", pattern: "Enter a valid email address" },
    password: { required: "Password is required" },
    passwordTooShort: `Must be at least ${PASSWORD_MIN_LENGTH} characters`,
    passwordHasSpaces: "Password cannot contain spaces",
    confirmPassword: { required: "Please confirm your password" },
    passwordsDoNotMatch: "Passwords do not match",
};

/**
 * DOCU: The react-hook-form rules for a new password, built here so that every
 * screen that asks for one applies the same rules with the same wording.
 *
 * Four forms ask for a new password - register, reset, the admin's set-password
 * and the account's own - and they were each spelling out their own `required`
 * and `minLength`. They drift, and the drift is invisible until one screen
 * accepts a password another refuses. One builder, four call sites.
 *
 * The confirmation is a separate builder rather than an option here, because its
 * rules are relative: it is judged against the live value of the password field,
 * so it needs `getPassword` - a `watch` or `getValues` from the form - to read
 * that value at validation time.
 *
 * Neither builder refuses a password equal to the current one. Where a form holds
 * the current password itself it can compare, and where it cannot - an admin
 * setting somebody else's password, a reset link - the API compares against the
 * stored hash and answers `PASSWORD_UNCHANGED_MESSAGE`; see
 * `assertPasswordChanged` in the API's `authService`.
 *
 * @param {object} [options]
 * @param {string} [options.required] - The required message
 * @returns {object} Rules to spread into `register`
 */
const newPasswordRules = ({ required } = {}) => ({
    required: required ?? VALIDATION_MESSAGES.password.required,
    minLength: {
        value: PASSWORD_MIN_LENGTH,
        message: VALIDATION_MESSAGES.passwordTooShort,
    },
    pattern: {
        value: PASSWORD_NO_SPACES_PATTERN,
        message: VALIDATION_MESSAGES.passwordHasSpaces,
    },
});

/**
 * DOCU: The react-hook-form rules for a password's confirmation.
 *
 * The whitespace rule is repeated here on purpose, not inherited: the field is
 * judged on its own before it is compared, so "Password cannot contain spaces"
 * lands on the box that actually has the space rather than "Passwords do not
 * match" on both. A confirmation carrying a space is a mistake worth naming.
 *
 * `getPassword` is read on every validation, which is what re-runs the check as
 * the password field changes - react-hook-form re-validates the fields watching
 * a value this reads, so the two never drift apart mid-form.
 *
 * @param {() => string} getPassword - reads the password field's current value
 * @returns {object} Rules to spread into `register`
 */
const confirmPasswordRules = (getPassword) => ({
    required: VALIDATION_MESSAGES.confirmPassword.required,
    pattern: {
        value: PASSWORD_NO_SPACES_PATTERN,
        message: VALIDATION_MESSAGES.passwordHasSpaces,
    },
    /* watch() reads the live password value for comparison. */
    validate: (value) =>
        value === getPassword() || VALIDATION_MESSAGES.passwordsDoNotMatch,
});

export {
    EMAIL_PATTERN,
    NAME_PATTERN,
    PASSWORD_MIN_LENGTH,
    PASSWORD_NO_SPACES_PATTERN,
    VALIDATION_MESSAGES,
    newPasswordRules,
    confirmPasswordRules,
};