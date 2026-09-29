import { useEffect, useRef } from "react";

/**
 * DOCU: An accessible modal dialog. <br>
 * Handles the pieces every dialog needs: centring, backdrop dismissal, the
 * Escape key, body scroll locking and moving focus into the panel on open.
 */
const Modal = ({ isOpen, onClose, title, children, footer }) => {
    const panelRef = useRef(null);

    /*
      onClose is almost always an inline arrow, so it changes identity on every
      render of the parent. Keeping it in a ref means the effect below depends
      only on isOpen. Without this, the effect re-ran on each render and called
      panelRef.focus(), which stole focus away from whatever the user was typing
      into (reproduced as "typing one character loses focus").
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

        /* Prevent the page behind the modal from scrolling. */
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        /* Move focus into the dialog, preferring the first real control so the
           user can start typing straight away. */
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
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                /* Clicks inside the panel must not reach the backdrop. */
                onClick={(event) => event.stopPropagation()}
                className="surface animate-pop-in w-full max-w-md p-6 outline-none"
            >
                <div className="mb-4 flex items-start justify-between gap-4">
                    <h2 className="text-lg font-extrabold text-ink">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-ink-faint transition hover:bg-paper hover:text-ink"
                    >
                        &times;
                    </button>
                </div>

                {children}

                {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
            </div>
        </div>
    );
};

export default Modal;