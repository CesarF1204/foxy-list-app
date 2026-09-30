import { PAGE_SIZE_OPTIONS } from "../../constants/admin";

/**
 * DOCU: The pager under the table. It reports the range it is showing, not just
 * the page number, so "showing 11-20 of 87" is legible without counting rows.
 *
 * Page numbers are not listed individually - a thousand users would render a
 * thousand buttons - so it steps by pages either side of the current one and
 * always offers the first and last, which is enough to reach any page in a
 * couple of clicks.
 */
const Pagination = ({ page, pageCount, total, pageSize, onPage, onPageSize, isDisabled }) => {
    if (total === 0) return null;

    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, total);

    /** The pages offered: the ends, plus a window around where we are. */
    const pages = [...new Set([1, pageCount, page - 1, page, page + 1])]
        .filter((value) => value >= 1 && value <= pageCount)
        .sort((a, b) => a - b);

    const goTo = (value) => {
        if (value >= 1 && value <= pageCount && value !== page) onPage(value);
    };

    const buttonClass =
        "flex h-9 min-w-9 items-center justify-center rounded-xl border-2 border-ink bg-white px-2.5 text-sm font-extrabold text-ink transition hover:bg-fox-50 disabled:cursor-not-allowed disabled:opacity-40";

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
                         * select should be as wide as the largest option, not stretch. */
                        className="field w-auto py-1.5! text-xs"
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

                {pages.map((value, index) => (
                    <span key={value} className="flex items-center gap-2">
                        {/* A gap marker, so the ellipsis is not read as a page. */}
                        {index > 0 && value - pages[index - 1] > 1 && (
                            <span aria-hidden="true" className="px-1 font-bold text-ink-faint">
                                &hellip;
                            </span>
                        )}
                        <button
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
                    </span>
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