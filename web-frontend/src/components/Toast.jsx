import { useEffect } from "react";

import {
    TOAST_DEFAULT_TYPE,
    TOAST_DURATIONS_MS,
    TOAST_ICONS,
    TOAST_STYLES,
    TOAST_TYPES,
} from "../constants/toast";

/**
 * DOCU: A transient notification. The API returns validation errors as an array
 * of strings, so the message is normalised to text. Errors stay on screen longer
 * than successes; durations, styles and icons live in `src/constants/toast.js`.
 */
const Toast = ({ message, type = TOAST_DEFAULT_TYPE, onClose }) => {
    const isError = type === TOAST_TYPES.error;

    useEffect(() => {
        const timer = setTimeout(
            onClose,
            isError ? TOAST_DURATIONS_MS.ERROR : TOAST_DURATIONS_MS.DEFAULT
        );
        return () => clearTimeout(timer);
    }, [onClose, type, isError, message]);

    const text = Array.isArray(message) ? message.join(". ") : message;
    if (!text) return null;

    return (
        <div
            /** Anchored to the bottom: a top-right toast sat on top of the navbar
             *  controls, hiding the action it referred to. pointer-events-none
             *  keeps it from swallowing clicks underneath. */
            className={`animate-pop-in pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex items-start gap-3 rounded-xl border-2 border-ink px-4 py-3 text-sm font-bold text-white shadow-pop sm:left-auto sm:max-w-sm ${TOAST_STYLES[type] ?? TOAST_STYLES[TOAST_DEFAULT_TYPE]}`}
            /* Errors interrupt, confirmations are announced politely. */
            role={isError ? "alert" : "status"}
            aria-live={isError ? "assertive" : "polite"}
        >
            <span aria-hidden="true" className="leading-5">
                {TOAST_ICONS[type] ?? TOAST_ICONS[TOAST_DEFAULT_TYPE]}
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