import Modal from "../Modal";

/** Confirmation dialog shown before removing a task. */
const DeleteTask = ({ task, onConfirm, onClose }) => (
    <Modal
        isOpen
        onClose={onClose}
        title="Delete this task?"
        footer={
            <>
                <button type="button" onClick={onClose} className="btn btn-neutral">
                    Keep it
                </button>
                <button type="button" onClick={onConfirm} className="btn btn-danger">
                    Delete
                </button>
            </>
        }
    >
        <p className="text-sm font-semibold text-ink-soft">
            <span className="font-extrabold text-ink">{task.title}</span> will be removed
            from your board for good. This cannot be undone.
        </p>
    </Modal>
);

export default DeleteTask;