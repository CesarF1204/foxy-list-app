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
                /**
                 * Full width and edge to edge on a phone - a side panel has
                 * nowhere to sit at 360px - and capped at `lg` from `sm` up,
                 * where it becomes the drawer it was designed as. `overscroll`
                 * keeps a scroll that reaches the end of the panel from then
                 * scrolling the page behind it.
                 */
                className="animate-pop-in flex h-full max-h-[100dvh] w-full flex-col overflow-y-auto overscroll-contain border-ink bg-paper p-4 outline-none sm:max-h-none sm:max-w-lg sm:border-l-2 sm:p-6"
            >
                <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
                    {/* `min-w-0` so a long name wraps inside the panel rather
                        than shoving the close control past the right edge. */}
                    <h2 className="min-w-0 flex-1 text-lg font-extrabold break-words text-ink">
                        {title}
                    </h2>
                    {/* The same shared icon button `Modal` uses, so "close" is
                        one control in one shape across the whole app, and the
                        same 44px touch target. */}
                    <IconButton
                        icon="close"
                        label="Close panel"
                        onClick={onClose}
                        className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-faint transition hover:bg-paper-deep hover:text-ink sm:h-8 sm:w-8"
                    />
                </div>

                <div className="flex flex-1 flex-col gap-5">{children}</div>

                {footer && <div className="drawer-footer shrink-0">{footer}</div>}
            </div>
        </div>
    );
};

export default Drawer;