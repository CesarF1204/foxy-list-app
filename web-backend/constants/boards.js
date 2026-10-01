const BOARDS = ['todo', 'ongoing', 'done'];
const DEFAULT_BOARD = 'todo';

/** Checks whether a value is one of the three boards. */
const isBoard = (status) => BOARDS.includes(status);

/** A zeroed task count object, so an empty result still carries every key. */
const emptyTaskCounts = () => ({
    total: 0,
    ...Object.fromEntries(BOARDS.map((board) => [board, 0])),
});

export { BOARDS, DEFAULT_BOARD, isBoard, emptyTaskCounts };
