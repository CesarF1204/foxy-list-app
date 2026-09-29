import { useEffect } from "react";

/* Shared visual styles per toast type. */
const TOAST_STYLES = {
    SUCCESS: "bg-done-deep",
    ERROR: "bg-red-600",
    INFO: "bg-ink",
};

const ICONS = {
    SUCCESS: "✓",
    ERROR: "!",
    INFO: "i",
};

/**
 * DOCU: A transient notification. <br>
 * The API returns validation errors as an array of strings, so the message is
 * normalised to text before rendering. <br>
 * Errors stay on screen longer than successes because they usually need to be
 * read and acted on.
 */
const Toast = ({ message, type = "INFO", onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, type === "ERROR" ? 6000 : 3000);
        return () => clearTimeout(timer);
    }, [onClose, type, message]);

    const text = Array.isArray(message) ? message.join(". ") : message;
    if (!text) return null;

    return (
        <div
            /*
               Anchored to the bottom of the viewport. The header is the busiest
               region of the app and a top-right toast sat on top of the navbar
               controls, hiding the very action it refers to.
               pointer-events-none keeps the toast from swallowing clicks on
               whatever sits underneath it; only the close button takes clicks.
            */
            className={`animate-pop-in pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex items-start gap-3 rounded-xl border-2 border-ink px-4 py-3 text-sm font-bold text-white shadow-pop sm:left-auto sm:max-w-sm ${TOAST_STYLES[type] ?? TOAST_STYLES.INFO}`}
            /* Errors interrupt, confirmations are announced politely. */
            role={type === "ERROR" ? "alert" : "status"}
            aria-live={type === "ERROR" ? "assertive" : "polite"}
        >
            <span aria-hidden="true" className="leading-5">
                {ICONS[type] ?? ICONS.INFO}
            </span>
            <p className="flex-1 leading-5">{text}</p>
            <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss notification"
                className="pointer-events-auto -mt-0.5 -mr-1 rounded px-1 text-white/80 transition hover:text-white"
            >
                &times;
            </button>
        </div>
    );
};

export default Toast;