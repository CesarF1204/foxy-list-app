import { USER_ROLES, ROLE_META, ACCOUNT_STATUSES, ACCOUNT_STATUS_META } from "../../constants/roles";
import SelectField from "../SelectField";

const FILTER_WRAPPER = "flex min-w-40 flex-1 flex-col gap-1.5";
const FILTER_SELECT = "py-2! text-sm";

/**
 * The search box, the two filters and the clear button above the users table. The search term
 * is debounced by the page before it reaches the API, so typing does not fire a request per
 * keystroke; the filters apply immediately because each one is a deliberate choice.
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

                <SelectField
                    id="admin-filter-role"
                    label="Role"
                    wrapperClassName={FILTER_WRAPPER}
                    className={FILTER_SELECT}
                    value={role}
                    onChange={(event) => onRole(event.target.value)}
                >
                    <option value="">All roles</option>
                    {USER_ROLES.map((value_) => (
                        <option key={value_} value={value_}>
                            {ROLE_META[value_].label}
                        </option>
                    ))}
                </SelectField>

                <SelectField
                    id="admin-filter-status"
                    label="Account status"
                    wrapperClassName={FILTER_WRAPPER}
                    className={FILTER_SELECT}
                    value={status}
                    onChange={(event) => onStatus(event.target.value)}
                >
                    <option value="">Any status</option>
                    {ACCOUNT_STATUSES.map((value_) => (
                        <option key={value_} value={value_}>
                            {ACCOUNT_STATUS_META[value_].label}
                        </option>
                    ))}
                </SelectField>

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