/** The three task boards, in display order. Shared by the schema, the stats and the move endpoint. */
const BOARDS = ['todo', 'ongoing', 'done'];

/** The board a new task lands on. */
const DEFAULT_BOARD = 'todo';

/**
 * DOCU: Checks whether a value is one of the three boards.
 * Last Updated Date: October 1, 2026
 * @function isBoard
 * @param {unknown} status - The value to check
 * @returns {boolean} True if the value is a valid board
 * @author Cesar
 */
const isBoard = (status) => BOARDS.includes(status);

/** A zeroed task count object, so an empty result still carries every key. */
const emptyTaskCounts = () => ({
    total: 0,
    ...Object.fromEntries(BOARDS.map((board) => [board, 0])),
});

export { BOARDS, DEFAULT_BOARD, isBoard, emptyTaskCounts };
