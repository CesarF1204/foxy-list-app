import { useRef, useState } from "react";

import Icon from "../icons/Icon";

/**
 * The "add a task" composer at the foot of the To Do column. Collapsed to a single button until
 * clicked. Submits on Enter from the title and Cmd/Ctrl
 */
const AddTask = ({ onAdd }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    /** Read and cleared synchronously by submit, so it always holds the truth. */
    const draft = useRef({ title: "", description: "" });

    const submit = () => {
        const { title: currentTitle, description: currentDescription } = draft.current;

        if (!currentTitle.trim()) return;

        /** Clear first: anything reading the draft from now on sees it empty. */
        draft.current = { title: "", description: "" };
        setTitle("");
        setDescription("");

        onAdd({ title: currentTitle, description: currentDescription });

        /** Stays open so several tasks can be added in a row. */
    };

    const handleTitleChange = (value) => {
        draft.current = { ...draft.current, title: value };
        setTitle(value);
    };

    const handleDescriptionChange = (value) => {
        draft.current = { ...draft.current, description: value };
        setDescription(value);
    };

    const close = () => {
        draft.current = { title: "", description: "" };
        setIsOpen(false);
        setTitle("");
        setDescription("");
    };

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="btn btn-primary mt-auto w-full"
            >
                <Icon name="add" size={18} />
                Add a task
            </button>
        );
    }

    return (
        <div className="animate-pop-in mt-auto flex flex-col gap-2 rounded-2xl border-2 border-ink bg-white p-3 shadow-card">
            <input
                type="text"
                autoFocus
                value={title}
                aria-label="New task title"
                placeholder="What needs doing?"
                onChange={(event) => handleTitleChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        submit();
                    }
                }}
                className="field py-2!"
            />

            <textarea
                value={description}
                rows={2}
                aria-label="New task note"
                placeholder="Add a note (optional)"
                onChange={(event) => handleDescriptionChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        submit();
                    }
                }}
                className="field resize-none py-2! text-sm"
            />

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={submit}
                    disabled={!title.trim()}
                    className="btn btn-primary flex-1 py-2! text-sm!"
                >
                    Add task
                </button>
                <button
                    type="button"
                    onClick={close}
                    className="btn btn-neutral py-2! text-sm!"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default AddTask;