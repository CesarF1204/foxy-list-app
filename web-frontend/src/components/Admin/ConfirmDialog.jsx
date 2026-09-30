import Modal from "../Modal";

/**
 * DOCU: The confirmation every destructive or security-sensitive admin action
 * goes through: blocking, unblocking, changing a role, resetting a password and
 * deleting. It follows the task delete dialog's pattern, and adds the one thing
 * a security action needs: the body names the exact account and says plainly
 * what will happen, so nobody confirms a destructive click on the wrong row.
 *
 * The confirm button is disabled while the request is in flight, so a slow
 * mutation cannot be fired twice, and its label changes to say so.
 *
 * @param {object} props
 * @param {string} props.title - the question being asked
 * @param {string} props.children - what will happen, in plain words
 * @param {string} props.confirmLabel - the button's resting label
 * @param {string} props.variant - "primary" or "danger"
 * @param {boolean} props.isPending - true while the mutation is running
 * @param {Function} props.onConfirm
 * @param {Function} props.onClose
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