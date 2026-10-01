/**
 * The auth forms' validation rules, shared by sign-in/register and password recovery. Messages
 * live beside the patterns so rule and wording cannot drift, and the password rules are built
 * here rather than spelled out per screen.
 */

/** A pragmatic email shape: something, an @, something, a dot, something. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Names accept letters and spaces only - no digits or punctuation. */
const NAME_PATTERN = /^[A-Za-z\s]+$/;

/** The shortest password the app accepts, in characters. */
const PASSWORD_MIN_LENGTH = 6;

/** Any whitespace anywhere in a password - leading, trailing or internal. */
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
 * The react-hook-form rules for a new password, built here so that every screen that asks for
 * one applies the same rules with the same wording.
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

/** The react-hook-form rules for a password's confirmation. */
const confirmPasswordRules = (getPassword) => ({
    required: VALIDATION_MESSAGES.confirmPassword.required,
    pattern: {
        value: PASSWORD_NO_SPACES_PATTERN,
        message: VALIDATION_MESSAGES.passwordHasSpaces,
    },
    /** watch() reads the live password value for comparison. */
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