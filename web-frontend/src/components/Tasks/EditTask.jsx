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

    /**
     * The editor's own inputs, not the shared `.field`, because it renders
     * inside a card rather than on a panel and has to inherit the card's
     * compact metrics. They still respect the two things that matter on a
     * phone: `text-base sm:text-sm`, so the fields never drop under the 16px
     * that stops Mobile Safari zooming the viewport on focus, and a 44px
     * action row, so Save and Cancel can be hit without aiming.
     */
    const inputClass =
        "w-full rounded-lg border-2 border-ink bg-white px-3 py-2 text-base outline-none " +
        "focus:border-fox-400 sm:px-2 sm:py-1 sm:text-sm";

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
                className={`${inputClass} font-bold text-ink`}
            />

            <textarea
                value={description}
                rows={2}
                aria-label="Task description"
                placeholder="Add a note (optional)"
                onChange={(event) => setDescription(event.target.value)}
                className={`${inputClass} resize-none font-semibold text-ink-soft`}
            />

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={commit}
                    disabled={!title.trim()}
                    className="btn btn-primary flex-1 px-3! py-2! text-sm! sm:flex-none sm:py-1! sm:text-xs!"
                >
                    Save
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-neutral flex-1 px-3! py-2! text-sm! sm:flex-none sm:py-1! sm:text-xs!"
                >
                    Cancel
                </button>
            </div>

            {/**
                 * A keyboard shortcut, so it is deliberately the quietest line
                 * in the editor - but `text-[0.65rem]` is 10.4px, which is
                 * unreadable on a phone and smaller than any other text in the
                 * app. `text-xs` with the faint colour carries the same
                 * "this is a footnote" weight.
                 */}
            <p className="text-xs font-bold text-ink-faint">
                Tip: Esc to cancel, Ctrl+Enter to save.
            </p>
        </div>
    );
};

export default EditTask;