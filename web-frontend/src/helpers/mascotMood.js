import { TOAST_MOODS } from "../constants/mascot.js";

/**
 * The toast a blocked submit should raise, so a field error looks and sounds like a server
 * error. Returns null when there is nothing wrong.
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

/** The mood the fox should be in, given everything the screen knows. */
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

    /**
     * Gated on isSubmitted: react-hook-form also reports errors transiently while a field is
     * re-validated, and reacting to those flickers the fox.
     */
    if (isSubmitted && hasFieldError) return "error";

    if (isSubmitted) return "neutral";
    return null;
};

export { resolveAuthMood, fieldErrorToast };