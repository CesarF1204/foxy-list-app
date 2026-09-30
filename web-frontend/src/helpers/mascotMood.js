/* See the note in `taskToasts.js`: this module is loaded by a verify script. */
import { TOAST_MOODS } from "../constants/mascot.js";

/**
 * DOCU: The toast a blocked submit should raise, so a field error looks and
 * sounds like a server error. Returns null when there is nothing wrong.
 * @param {object} errors react-hook-form's `errors` object.
 * @returns {?{message: string[], type: string}} A toast payload, or null.
 */
const fieldErrorToast = (errors) => {
    /** Field order, so the first one reported is the first one on screen. */
    const messages = Object.values(errors ?? {})
        .map((error) => error?.message)
        .filter(Boolean);

    if (!messages.length) {
        return null;
    }

    /** An array, because the API reports its own errors that way. */
    return { message: messages, type: "ERROR" };
};

/**
 * DOCU: The mood the fox should be in, given everything the screen knows. <br>
 * Kept pure and away from React because both auth screens need the same answer.
 * `isPending` wins over the rest: a verdict from the previous attempt says
 * nothing about the one now running. Field errors only count once the form has
 * been sent, or the fox would flicker while a field is re-validated.
 * @see src/constants/mascot.js for the moods and their hold times
 */
const resolveAuthMood = ({
    isSuccess = false,
    isError = false,
    toastType = null,
    hasFieldError = false,
    isSubmitted = false,
    isPending = false,
}) => {
    /** A pending request outranks any verdict currently being displayed. */
    if (isPending) return null;

    /** An INFO toast carries no verdict, so TOAST_MOODS maps it to null. */
    const toastMood = TOAST_MOODS[toastType] ?? null;

    if (isSuccess || toastMood === "success") return "success";
    if (isError || toastMood === "error") return "error";

    /** Gated on isSubmitted: react-hook-form also reports errors transiently
     *  while a field is re-validated, and reacting to those flickers the fox. */
    if (isSubmitted && hasFieldError) return "error";

    if (isSubmitted) return "neutral";
    return null;
};

export { resolveAuthMood, fieldErrorToast };