import Modal from "../Modal";

/**
 * The confirmation every destructive or security-sensitive admin action goes through. The body
 * names the exact account and says plainly what will happen.
 */
const ConfirmDialog = ({
    title,
    children,
    confirmLabel = "Confirm",
    variant = "primary",
    isPending = false,
    onConfirm,
    onClose,
}) => (
    <Modal
        isOpen
        onClose={onClose}
        title={title}
        footer={
            <>
                <button type="button" onClick={onClose} disabled={isPending} className="btn btn-neutral">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isPending}
                    className={`btn ${variant === "danger" ? "btn-danger" : "btn-primary"}`}
                >
                    {isPending ? "Working..." : confirmLabel}
                </button>
            </>
        }
    >
        <div className="text-sm font-semibold text-ink-soft">{children}</div>
    </Modal>
);

export default ConfirmDialog;