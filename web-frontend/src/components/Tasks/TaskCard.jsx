import { memo, useState } from "react";
import { Draggable } from "@hello-pangea/dnd";

import { CARD_BOARD_META } from "../../constants/boards";
import { TEMP_ID_PREFIX } from "../../constants/tasks";
import EditTask from "./EditTask";

/** DOCU: The two actions available on a task: edit and delete. */
const CardActions = ({ task, onEdit, onDelete }) => {
    const buttonClass =
        "flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition " +
        "hover:bg-ink/10 hover:text-ink focus-visible:ring-4 focus-visible:ring-ink/20";

    /** A button press must never start a drag: stopping pointerdown propagation
     *  means the library never sees the gesture begin. */
    const stopDragStart = (event) => event.stopPropagation();

    return (
        <div className="absolute right-1.5 top-1.5 flex gap-0.5">
            <button
                type="button"
                onPointerDown={stopDragStart}
                onClick={onEdit}
                aria-label={`Edit ${task.title}`}
                title="Edit task"
                className={buttonClass}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                        d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            <button
                type="button"
                onPointerDown={stopDragStart}
                onClick={onDelete}
                aria-label={`Delete ${task.title}`}
                title="Delete task"
                className={`${buttonClass} hover:bg-red-500/15 hover:text-red-600`}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                        d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
        </div>
    );
};

/**
 * DOCU: A single task. The whole card is the drag handle, so there is no grip to
 * find. Wrapped in `memo` so a drag only re-renders the cards whose props
 * actually changed.
 */
const TaskCard = ({ task, board, index, onSave, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);

    const meta = CARD_BOARD_META[board];

    /* A task created locally has a temporary id until the server replies. */
    const isPending = task._id.startsWith(TEMP_ID_PREFIX);

    return (
        <Draggable draggableId={task._id} index={index} isDragDisabled={isEditing}>
            {(provided, snapshot) => (
                <article
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    ref={provided.innerRef}
                    /** The element the library transforms on every pointer move, so
                     *  it must stay free of any CSS animation or transitioned
                     *  transform. The entrance animation is on the wrapper below. */
                    data-dragging={snapshot.isDragging ? "true" : "false"}
                    className={`task-card relative rounded-2xl border-2 border-ink bg-white pl-4 pr-9 ${
                        snapshot.isDragging
                            ? "shadow-pop-lg"
                            : isPending
                              ? "shadow-card opacity-60"
                              : "shadow-card hover:shadow-pop"
                    }`}
                >
                    {/* Coloured spine identifying the board. */}
                    <span
                        className={`absolute left-0 top-2 bottom-2 w-1.5 rounded-full ${meta.spine}`}
                        aria-hidden="true"
                    />

                    <div className={snapshot.isDragging ? "" : "animate-rise"}>
                        {isEditing ? (
                            <div className="py-2.5">
                                <EditTask
                                    task={task}
                                    onSave={(title, description) => {
                                        onSave(task, title, description);
                                        setIsEditing(false);
                                    }}
                                    onCancel={() => {
                                        setIsEditing(false);
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="py-2.5">
                                <div className="flex items-start gap-1.5">
                                    {meta.check && (
                                        <span
                                            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-done text-[0.6rem] font-extrabold text-white"
                                            aria-hidden="true"
                                        >
                                            ✓
                                        </span>
                                    )}
                                    <p
                                        className={`break-anywhere text-sm leading-snug font-extrabold ${
                                            meta.check ? "text-ink-soft line-through" : "text-ink"
                                        }`}
                                    >
                                        {task.title}
                                    </p>
                                </div>

                                {task.description && (
                                    <p className="break-anywhere mt-1 text-xs leading-relaxed font-semibold text-ink-soft">
                                        {task.description}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {!isEditing && (
                        <CardActions
                            task={task}
                            onEdit={() => setIsEditing(true)}
                            onDelete={() => onDelete(task)}
                        />
                    )}
                </article>
            )}
        </Draggable>
    );
};

export default memo(TaskCard);