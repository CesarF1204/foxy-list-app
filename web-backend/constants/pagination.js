/**
 * DOCU: Page size used when the caller does not ask for one.
 *
 * Five, and it is the first option in the users table's page-size picker, so the
 * value a request lands on when it says nothing is a value the UI offers. It also
 * has to match `DEFAULT_PAGE_SIZE` in the frontend's `constants/admin.js`: the
 * picker renders whatever the API reported in `pageSize`, so the two defaults
 * drifting apart would show "5 rows per page" selected while the table held ten.
 */
const DEFAULT_PAGE_SIZE = 5;

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
