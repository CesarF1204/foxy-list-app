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

/**
 * Any whitespace anywhere in a password - leading, trailing or internal.
 *
 * This is a *detector*, not an accept-shape: it matches what a password must NOT contain, so
 * it reads with `.test()` and is never passed as a react-hook-form `pattern`. A `pattern` rule
 * passes only when the value MATCHES the regex, which would make `pattern: /\s/` mean "must
 * contain a space" - the opposite of the rule. Hence `hasPasswordSpaces` below, and the
 * `validate` rules built on it.
 */
const PASSWORD_NO_SPACES_PATTERN = /\s/;

/** True when the password carries whitespace, and so must be refused. */
const hasPasswordSpaces = (value) => PASSWORD_NO_SPACES_PATTERN.test(value ?? "");

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
 *
 * The whitespace rule is a `validate` rather than a `pattern` on purpose: a `pattern` rule
 * passes when the value MATCHES its regex, so passing the whitespace *detector* as a pattern
 * would accept only passwords that contain a space. `validate` states the rule the way it is
 * meant - "no whitespace" - and cannot be read backwards.
 */
const newPasswordRules = ({ required } = {}) => ({
    required: required ?? VALIDATION_MESSAGES.password.required,
    minLength: {
        value: PASSWORD_MIN_LENGTH,
        message: VALIDATION_MESSAGES.passwordTooShort,
    },
    validate: (value) =>
        !hasPasswordSpaces(value) || VALIDATION_MESSAGES.passwordHasSpaces,
});

/** The react-hook-form rules for a password's confirmation. */
const confirmPasswordRules = (getPassword) => ({
    required: VALIDATION_MESSAGES.confirmPassword.required,
    /** watch() reads the live password value for comparison. */
    validate: (value) => {
        if (hasPasswordSpaces(value)) return VALIDATION_MESSAGES.passwordHasSpaces;
        return value === getPassword() || VALIDATION_MESSAGES.passwordsDoNotMatch;
    },
});

export {
    EMAIL_PATTERN,
    NAME_PATTERN,
    PASSWORD_MIN_LENGTH,
    PASSWORD_NO_SPACES_PATTERN,
    hasPasswordSpaces,
    VALIDATION_MESSAGES,
    newPasswordRules,
    confirmPasswordRules,
};