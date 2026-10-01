import { useEffect } from "react";

import {
    TOAST_DEFAULT_TYPE,
    TOAST_DURATIONS_MS,
    TOAST_ICONS,
    TOAST_STYLES,
    TOAST_TYPES,
} from "../constants/toast";
import { Icon, IconButton } from "./icons";

/**
 * DOCU: A transient notification. The API returns validation errors as an array
 * of strings, so the message is normalised to text. Errors stay on screen longer
 * than successes; durations, styles and icons live in `src/constants/toast.js`.
 *
 * The leading mark and the dismiss control are the app's standard ReIcon icons
 * like everything else, so a toast looks the same as the rest of the UI. The
 * status mark is decorative: the toast's own `role` ("alert" for an error,
 * "status" for the rest) is what announces it, and the message text carries
 * the meaning, so a screen reader is not read a glyph as well.
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
            <Icon
                name={TOAST_ICONS[type] ?? TOAST_ICONS[TOAST_DEFAULT_TYPE]}
                size={20}
                className="mt-px"
            />
            <p className="flex-1 leading-5">{text}</p>
            <IconButton
                icon="close"
                label="Dismiss notification"
                onClick={onClose}
                className="pointer-events-auto -mt-0.5 -mr-1 cursor-pointer rounded px-1 text-white/80 transition hover:text-white"
            />
        </div>
    );
};

export default Toast;