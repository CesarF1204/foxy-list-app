import { USER_ROLES, ROLE_META, ACCOUNT_STATUSES, ACCOUNT_STATUS_META } from "../../constants/roles";

/** DOCU: The label on a select, and the "no filter" option above it. */
const SelectLabel = ({ htmlFor, label, children, value, onChange }) => (
    <div className="flex min-w-40 flex-1 flex-col gap-1.5">
        <label
            htmlFor={htmlFor}
            className="text-xs font-extrabold tracking-wide text-ink-soft uppercase"
        >
            {label}
        </label>
        <select
            id={htmlFor}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="field py-2! text-sm"
        >
            {children}
        </select>
    </div>
);

/**
 * DOCU: The search box, the two filters and the clear button above the users
 * table. The search term is debounced by the page before it reaches the API, so
 * typing does not fire a request per keystroke; the filters apply immediately
 * because each one is a deliberate choice.
 *
 * Every control is a labelled form field, so the whole bar is reachable and
 * announced by keyboard and screen reader without any extra wiring.
 */
const UserFilters = ({ search, role, status, onSearch, onRole, onStatus, onClear, resultCount }) => {
    const hasFilters = Boolean(search || role || status);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                    <label
                        htmlFor="admin-user-search"
                        className="text-xs font-extrabold tracking-wide text-ink-soft uppercase"
                    >
                        Search
                    </label>
                    <input
                        id="admin-user-search"
                        type="search"
                        value={search}
                        placeholder="Name or email"
                        onChange={(event) => onSearch(event.target.value)}
                        className="field py-2!"
                    />
                </div>

                <SelectLabel htmlFor="admin-filter-role" label="Role" value={role} onChange={onRole}>
                    <option value="">All roles</option>
                    {USER_ROLES.map((value_) => (
                        <option key={value_} value={value_}>
                            {ROLE_META[value_].label}
                        </option>
                    ))}
                </SelectLabel>

                <SelectLabel
                    htmlFor="admin-filter-status"
                    label="Account status"
                    value={status}
                    onChange={onStatus}
                >
                    <option value="">Any status</option>
                    {ACCOUNT_STATUSES.map((value_) => (
                        <option key={value_} value={value_}>
                            {ACCOUNT_STATUS_META[value_].label}
                        </option>
                    ))}
                </SelectLabel>

                <button
                    type="button"
                    onClick={onClear}
                    disabled={!hasFilters}
                    className="btn btn-neutral sm:mb-0.5"
                >
                    Clear
                </button>
            </div>

            {/* The live result count, so a filter that matched nothing says so. */}
            <p className="text-xs font-semibold text-ink-faint" role="status" aria-live="polite">
                {resultCount === undefined
                    ? "Filtering and paging happen on the server."
                    : `${resultCount} ${resultCount === 1 ? "user" : "users"} match`}
            </p>
        </div>
    );
};

export default UserFilters;