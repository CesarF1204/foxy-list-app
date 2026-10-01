import { useEffect, useRef } from "react";

import { IconButton } from "./icons";

/**
 * A side panel, used by the admin user drawer. It follows the same rules as `Modal` - Escape
 * closes it, the page behind cannot scroll, focus moves in on open - and adds one thing a
 * drawer needs: focus returns to whatever opened it on close, so keyboard users are not dropped
 * at the top of the page.
 */
const Drawer = ({ isOpen, onClose, title, children, footer }) => {
    const panelRef = useRef(null);
    const openerRef = useRef(null);

    /**
     * Kept in a ref so the effect below depends only on `isOpen`: an inline `onClose` would
     * otherwise re-run it and steal focus mid-typing.
     */
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;

        /** Remembered so focus can go back where it came from. */
        openerRef.current = document.activeElement;

        const onKeyDown = (event) => {
            if (event.key === "Escape") onCloseRef.current?.();
        };

        document.addEventListener("keydown", onKeyDown);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const firstField = panelRef.current?.querySelector(
            "input:not([type='hidden']), textarea, select, button"
        );
        (firstField ?? panelRef.current)?.focus();

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
            /** Only if the opener is still on screen: it may have been removed. */
            openerRef.current?.focus?.();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-overlay flex justify-end bg-ink/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
                className="animate-pop-in flex h-full w-full max-w-lg flex-col overflow-y-auto border-l-2 border-ink bg-paper p-4 outline-none sm:p-6"
            >
                <div className="mb-4 flex items-start justify-between gap-4">
                    <h2 className="text-lg font-extrabold text-ink">{title}</h2>
                    {/* The same shared icon button `Modal` uses, so "close" is
                        one control in one shape across the whole app. */}
                    <IconButton
                        icon="close"
                        label="Close panel"
                        onClick={onClose}
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-faint transition hover:bg-paper-deep hover:text-ink"
                    />
                </div>

                <div className="flex flex-1 flex-col gap-5">{children}</div>

                {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
            </div>
        </div>
    );
};

export default Drawer;