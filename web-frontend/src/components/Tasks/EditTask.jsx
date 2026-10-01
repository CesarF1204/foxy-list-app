import { useEffect, useRef, useState } from "react";

/**
 * The inline editor for a task. Saves on the Save button or Cmd/Ctrl Enter, cancels on Escape,
 * and refuses to save an empty title.
 */
const EditTask = ({ task, onSave, onCancel }) => {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? "");
    const titleRef = useRef(null);

    /** Put the caret in the title as soon as the editor opens. */
    useEffect(() => {
        titleRef.current?.focus();
        titleRef.current?.select();
    }, []);

    const commit = () => {
        if (!title.trim()) return;
        onSave(title.trim(), description.trim());
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
        }
        /** Cmd/Ctrl + Enter saves, matching the shortcut on Mac and PC. */
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            commit();
        }
    };

    return (
        <div
            className="animate-pop-in flex flex-col gap-2"
            onKeyDown={handleKeyDown}
        >
            <input
                ref={titleRef}
                type="text"
                value={title}
                aria-label="Task title"
                placeholder="Task title"
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border-2 border-ink bg-white px-2 py-1 text-sm font-bold text-ink outline-none focus:border-fox-400"
            />

            <textarea
                value={description}
                rows={2}
                aria-label="Task description"
                placeholder="Add a note (optional)"
                onChange={(event) => setDescription(event.target.value)}
                className="w-full resize-none rounded-lg border-2 border-ink bg-white px-2 py-1 text-xs font-semibold text-ink-soft outline-none focus:border-fox-400"
            />

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={commit}
                    disabled={!title.trim()}
                    className="btn btn-primary px-3! py-1! text-xs!"
                >
                    Save
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-neutral px-3! py-1! text-xs!"
                >
                    Cancel
                </button>
            </div>

            <p className="text-[0.65rem] font-bold text-ink-faint">
                Tip: Esc to cancel, Ctrl+Enter to save.
            </p>
        </div>
    );
};

export default EditTask;