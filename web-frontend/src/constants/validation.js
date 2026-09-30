/**
 * The auth forms' validation rules, shared by sign-in/register and password
 * recovery. Messages live beside the patterns so rule and wording cannot drift.
 */

/** DOCU: A pragmatic email shape: something, an @, something, a dot, something. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** DOCU: Names accept letters and spaces only - no digits or punctuation. */
const NAME_PATTERN = /^[A-Za-z\s]+$/;

/** DOCU: The shortest password the app accepts, in characters. */
const PASSWORD_MIN_LENGTH = 6;

const VALIDATION_MESSAGES = {
    firstName: { required: "Required", pattern: "Letters only" },
    lastName: { required: "Required", pattern: "Letters only" },
    email: { required: "Email is required", pattern: "Enter a valid email address" },
    password: { required: "Password is required" },
    passwordTooShort: `Must be at least ${PASSWORD_MIN_LENGTH} characters`,
    confirmPassword: { required: "Please confirm your password" },
};

export {
    EMAIL_PATTERN,
    NAME_PATTERN,
    PASSWORD_MIN_LENGTH,
    VALIDATION_MESSAGES,
};