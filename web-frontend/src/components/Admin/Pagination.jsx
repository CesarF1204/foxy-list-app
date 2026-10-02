import { PAGE_SIZE_OPTIONS } from "../../constants/admin";
import { IconButton } from "../icons";
import SelectField from "../SelectField";

const PAGE_WINDOW = 3;

/**
 * The pager under the table. It reports the range it is showing, not just the page number, so
 * "showing 11-20 of 87" is legible without counting rows.
 */
const Pagination = ({ page, pageCount, total, pageSize, onPage, onPageSize, isDisabled }) => {
    if (total === 0) return null;

    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, total);

    /**
     * The pages offered: a window of three that slides with the current page and is pushed back
     * to the end of the list so it never overflows `pageCount`.
     */
    const windowStart = Math.min(page, Math.max(pageCount - PAGE_WINDOW + 1, 1));
    const pages = Array.from(
        { length: Math.min(PAGE_WINDOW, pageCount) },
        (_, index) => windowStart + index,
    ).filter((value) => value >= 1 && value <= pageCount);

    const goTo = (value) => {
        if (value >= 1 && value <= pageCount && value !== page) onPage(value);
    };

    const buttonClass =
        "flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border-2 border-ink bg-white px-3 text-sm font-extrabold text-ink transition hover:bg-fox-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:min-w-9 sm:px-2.5";

    return (
        <nav
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Users table pagination"
        >
            <p className="text-sm font-semibold text-ink-soft sm:text-xs" role="status" aria-live="polite">
                Showing {first}-{last} of {total}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                <div className="flex shrink-0 items-center gap-2">
                    <SelectField
                        id="admin-page-size"
                        label="Rows per page"
                        wrapperClassName="flex shrink-0 items-center gap-2"
                        labelClassName="whitespace-nowrap"
                        className="w-auto cursor-pointer py-1.5! text-xs disabled:cursor-not-allowed"
                        value={pageSize}
                        disabled={isDisabled}
                        onChange={(event) => onPageSize(Number(event.target.value))}
                    >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </SelectField>
                </div>

                <IconButton
                    icon="previous"
                    label="Previous page"
                    size={16}
                    onClick={() => goTo(page - 1)}
                    disabled={isDisabled || page === 1}
                    className={buttonClass}
                />

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

                <IconButton
                    icon="next"
                    label="Next page"
                    size={16}
                    onClick={() => goTo(page + 1)}
                    disabled={isDisabled || page === pageCount}
                    className={buttonClass}
                />
            </div>
        </nav>
    );
};

export default Pagination;