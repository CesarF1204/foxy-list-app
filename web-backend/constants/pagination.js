/** Page size used when the caller does not ask for one. */
const DEFAULT_PAGE_SIZE = 10;

/** Largest page a caller may ask for, so one request cannot pull the whole table. */
const MAX_PAGE_SIZE = 100;

/** The first page number. Pages are 1-based. */
const FIRST_PAGE = 1;

/** The sort used when the caller does not ask for one. */
const DEFAULT_USER_SORT_FIELD = 'createdAt';

/** Newest first. */
const DEFAULT_USER_SORT_DIRECTION = 'desc';

export {
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    FIRST_PAGE,
    DEFAULT_USER_SORT_FIELD,
    DEFAULT_USER_SORT_DIRECTION,
};
