import { PAGE_SIZE_OPTIONS } from "../../constants/admin";

/** DOCU: How many page numbers the pager shows at once. Three keeps the row of
 * buttons the same length whether there are four pages or four hundred, which is
 * what lets the controls sit still instead of reflowing as the admin pages. */
const PAGE_WINDOW = 3;

/**
 * DOCU: The pager under the table. It reports the range it is showing, not just
 * the page number, so "showing 11-20 of 87" is legible without counting rows.
 *
 * Page numbers slide: only three consecutive pages are ever drawn, starting at
 * the current one, and the row stops moving once it reaches the end so the last
 * page is always on screen. Page 1 of 10 reads 1 2 3, page 5 reads 5 6 7, and
 * pages 8, 9 and 10 all read 8 9 10. A short list is not padded - one page shows
 * one button - and no number above `pageCount` is ever rendered.
 */
const Pagination = ({ page, pageCount, total, pageSize, onPage, onPageSize, isDisabled }) => {
    if (total === 0) return null;

    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, total);

    /** The pages offered: a window of three that slides with the current page and
     *  is pushed back to the end of the list so it never overflows `pageCount`. */
    const windowStart = Math.min(page, Math.max(pageCount - PAGE_WINDOW + 1, 1));
    const pages = Array.from(
        { length: Math.min(PAGE_WINDOW, pageCount) },
        (_, index) => windowStart + index,
    ).filter((value) => value >= 1 && value <= pageCount);

    const goTo = (value) => {
        if (value >= 1 && value <= pageCount && value !== page) onPage(value);
    };

    /* `cursor-pointer` on the control itself and `disabled:cursor-not-allowed` on
     * the way out, so a button that cannot do anything does not invite the click. */
    const buttonClass =
        "flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-xl border-2 border-ink bg-white px-2.5 text-sm font-extrabold text-ink transition hover:bg-fox-50 disabled:cursor-not-allowed disabled:opacity-40";

    return (
        <nav
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Users table pagination"
        >
            <p className="text-xs font-semibold text-ink-soft" role="status" aria-live="polite">
                Showing {first}-{last} of {total}
            </p>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex shrink-0 items-center gap-2">
                    <label
                        htmlFor="admin-page-size"
                        className="text-xs font-extrabold tracking-wide whitespace-nowrap text-ink-soft uppercase"
                    >
                        Rows per page
                    </label>
                    <select
                        id="admin-page-size"
                        value={pageSize}
                        disabled={isDisabled}
                        onChange={(event) => onPageSize(Number(event.target.value))}
                        /* `w-auto`, not the `.field` full width: beside its label the
                         * select should be as wide as the largest option, not stretch.
                         * The pointer is scoped to this select rather than added to
                         * `.field`, which every text input in the app also uses and
                         * which must keep the text caret. `disabled:` covers the
                         * fetch in flight, matching the pager's own buttons. */
                        className="field w-auto cursor-pointer py-1.5! text-xs disabled:cursor-not-allowed"
                    >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    className={buttonClass}
                    onClick={() => goTo(page - 1)}
                    disabled={isDisabled || page === 1}
                    aria-label="Previous page"
                >
                    &larr;
                </button>

                {pages.map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => goTo(value)}
                        disabled={isDisabled}
                        aria-current={value === page ? "page" : undefined}
                        aria-label={`Page ${value}`}
                        className={`${buttonClass} ${
                            value === page ? "bg-fox-400! text-white!" : ""
                        }`}
                    >
                        {value}
                    </button>
                ))}

                <button
                    type="button"
                    className={buttonClass}
                    onClick={() => goTo(page + 1)}
                    disabled={isDisabled || page === pageCount}
                    aria-label="Next page"
                >
                    &rarr;
                </button>
            </div>
        </nav>
    );
};

export default Pagination;