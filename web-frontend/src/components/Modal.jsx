import { useEffect, useRef } from "react";

import { IconButton } from "./icons";

/**
 * An accessible modal: backdrop dismissal, Escape, scroll locking and focus moved into the
 * panel on open.
 */
const Modal = ({ isOpen, onClose, title, children, footer }) => {
    const panelRef = useRef(null);

    /**
     * In a ref, so the effect below depends only on isOpen. `onClose` is usually an inline
     * arrow with a new identity each render, and re-running would refocus the panel and steal
     * focus from whatever the user was typing into.
     */
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const onKeyDown = (event) => {
            if (event.key === "Escape") onCloseRef.current?.();
        };

        document.addEventListener("keydown", onKeyDown);

        /** Prevent the page behind the modal from scrolling. */
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        /** Prefer the first real control, so the user can start typing. */
        const firstField = panelRef.current?.querySelector(
            "input:not([type='hidden']), textarea, select, button"
        );
        (firstField ?? panelRef.current)?.focus();

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-overlay flex items-end justify-center overflow-y-auto bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={onClose}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                /** Clicks inside the panel must not reach the backdrop. */
                onClick={(event) => event.stopPropagation()}
                /**
                 * `items-end` below `sm` so the panel rises from the bottom edge
                 * like a sheet on a phone, where there is no room to centre a
                 * tall dialog without clipping its top. `max-h` in `dvh` rather
                 * than `vh` because the mobile browser's address bar is part of
                 * the visual viewport but not of `vh`, and a dialog sized
                 * against `vh` is taller than the screen it has to fit in.
                 */
                className="surface animate-pop-in flex max-h-[92dvh] w-full flex-col overflow-y-auto rounded-b-none p-5 outline-none sm:max-h-[85dvh] sm:max-w-md sm:rounded-[1.25rem] sm:p-6"
            >
                <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
                    {/* `min-w-0` so a long title wraps inside the panel rather
                        than pushing the close control off its right edge. */}
                    <h2 className="min-w-0 flex-1 text-lg font-extrabold break-words text-ink">
                        {title}
                    </h2>
                    {/* The shared icon button, so the close control is the same
                        size, icon and label in every dialog and drawer. 44px on
                        touch screens, where a 32px target in the corner is the
                        hardest thing on the page to hit. */}
                    <IconButton
                        icon="close"
                        label="Close dialog"
                        onClick={onClose}
                        className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-faint transition hover:bg-paper hover:text-ink sm:h-8 sm:w-8"
                    />
                </div>

                {children}

                {footer && <div className="modal-footer shrink-0">{footer}</div>}
            </div>
        </div>
    );
};

export default Modal;