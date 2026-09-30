import { Suspense, useCallback, useMemo, useState } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { useQuery } from "@tanstack/react-query";

import { getTasksQueryOptions } from "../../queryOptions/tasksQueryOptions";
import { useTasks, getBoardTasks } from "../../hooks/useTasks";
import { DEFAULT_BOARD } from "../../constants/boards";

import TaskCard from "./TaskCard";
import AddTask from "./AddTask";
import DeleteTask from "./DeleteTask";
import { InlineLoader, EmptyState, ErrorState } from "../Feedback";

/** DOCU: Renders the three task boards with drag and drop between them. */
const TaskBoard = () => {
    const { data, isError, error, refetch } = useQuery(getTasksQueryOptions());
    const [pendingDelete, setPendingDelete] = useState(null);

    const { tasks, boards, boardMeta, addTask, renameTask, removeTask, reorderTask } = useTasks(
        data?.tasks
    );

    /** One stable handler for every card, so the memo on TaskCard is not broken
     *  by a fresh closure per row. The card passes its own task in. */
    const handleSave = useCallback(
        (task, title, description) => renameTask(task, title, description),
        [renameTask]
    );

    const handleDelete = useCallback((task) => setPendingDelete(task), []);

    /** Stable identity matters: every board slice is memoised on `tasks`, so
     *  dragging one card must not hand every other card a new array. */
    const boardTasks = useMemo(
        () => Object.fromEntries(boards.map((board) => [board, getBoardTasks(tasks, board)])),
        [boards, tasks]
    );

    const handleDragEnd = useCallback(
        ({ source, destination, draggableId }) => {
            /* Dropped outside any board, or back exactly where it started. */
            if (!destination) return;
            if (
                source.droppableId === destination.droppableId &&
                source.index === destination.index
            ) {
                return;
            }

            reorderTask({
                taskId: draggableId,
                newStatus: destination.droppableId,
                newIndex: destination.index,
            });
        },
        [reorderTask]
    );

    if (isError) {
        return (
            <ErrorState
                title="Could not load your tasks"
                message={error?.message}
                onRetry={refetch}
            />
        );
    }

    return (
        <>
            <DragDropContext onDragEnd={handleDragEnd}>
                {/* Stacks on small screens, three columns from md upwards. */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {boards.map((board) => {
                        const meta = boardMeta[board];
                        const tasksOnBoard = boardTasks[board] ?? [];

                        return (
                            <Droppable key={board} droppableId={board}>
                                {(provided, snapshot) => (
                                    <section
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        aria-label={meta.label}
                                        className={`flex min-h-[18rem] flex-col rounded-3xl border-2 border-ink p-3 ${
                                            snapshot.isDraggingOver
                                                ? "border-fox-400 bg-fox-50"
                                                : "bg-white/70"
                                        }`}
                                    >
                                        <header className="mb-1 flex items-center gap-2 px-1">
                                            <span
                                                className={`h-3 w-3 shrink-0 rounded-full ${meta.accent}`}
                                                aria-hidden="true"
                                            />
                                            <h2
                                                className={`text-xs font-extrabold tracking-wider uppercase ${meta.heading}`}
                                            >
                                                {meta.label}
                                            </h2>
                                            <span
                                                className={`ml-auto rounded-full border px-2 py-0.5 text-xs font-extrabold ${meta.count}`}
                                            >
                                                {tasksOnBoard.length}
                                            </span>
                                        </header>

                                        {/* The hint talks about a card waiting to be
                                            grabbed, so it needs a card to talk about. */}
                                        {!(board === DEFAULT_BOARD && tasksOnBoard.length === 0) && (
                                            <p className="mb-3 px-1 text-[0.7rem] font-bold text-ink-faint">
                                                {meta.hint}
                                            </p>
                                        )}

                                        {board === DEFAULT_BOARD && tasksOnBoard.length === 0 && (
                                            <p
                                                className="mb-3 rounded-2xl border-2 border-dashed border-ink-faint/60 bg-paper/60 px-3 py-4 text-center text-xs font-bold text-ink-soft"
                                                role="status"
                                            >
                                                {meta.emptyHint}
                                            </p>
                                        )}

                                        <div className="flex flex-1 flex-col gap-2">
                                            {tasksOnBoard.map((task, index) => (
                                                <TaskCard
                                                    key={task._id}
                                                    task={task}
                                                    board={board}
                                                    index={index}
                                                    onSave={handleSave}
                                                    onDelete={handleDelete}
                                                />
                                            ))}

                                            {/* The gap the card will drop into. */}
                                            {provided.placeholder}

                                            {tasksOnBoard.length === 0 && board !== DEFAULT_BOARD && (
                                                <EmptyState
                                                    title={`Nothing in ${meta.label.toLowerCase()}`}
                                                    description="Drag a card here when you start or finish it."
                                                />
                                            )}

                                            {board === DEFAULT_BOARD && <AddTask onAdd={addTask} />}
                                        </div>
                                    </section>
                                )}
                            </Droppable>
                        );
                    })}
                </div>
            </DragDropContext>

            {pendingDelete && (
                <DeleteTask
                    task={pendingDelete}
                    onConfirm={() => {
                        removeTask(pendingDelete._id);
                        setPendingDelete(null);
                    }}
                    onClose={() => setPendingDelete(null)}
                />
            )}
        </>
    );
};

/** DOCU: Entry point for the task board. The query lives in a child so the drag
 *  and drop context is not torn down every time the data refreshes. */
const Task = (props) => (
    <Suspense fallback={<InlineLoader label="Loading your tasks..." />}>
        <TaskBoard {...props} />
    </Suspense>
);

export default Task;
