import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getInitials, getFullName } from "../../helpers/globalHelper";
import { USER_COLUMNS, SORT_DIRECTIONS } from "../../constants/admin";
import { BOARD_META, BOARDS, BOARD_LABELS } from "../../constants/boards";
import useMediaQuery from "../../hooks/useMediaQuery";
import { RoleBadge, StatusBadge } from "./Badges";
import { Icon, KebabButton } from "../icons";

/** Width at which the table has room for six columns. */
const DESKTOP_TABLE = "(min-width: 48rem)";

/** Short date, with the full timestamp on hover. */
const formatDate = (value) => {
    if (!value) return "Unknown";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";

    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

/** Initials avatar. Decorative: the name sits beside it. */
const UserAvatar = ({ user }) => (
    <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-fox-400 text-xs font-extrabold text-white"
        aria-hidden="true"
    >
        {getInitials(user)}
    </span>
);

/** One board's task count. Labelled for a pointer and for screen readers. */
const TaskCountPill = ({ board, value }) => (
    <span
        className={`rounded-lg border-2 bg-white px-1.5 py-0.5 text-xs font-extrabold tabular-nums ${BOARD_META[board].pill}`}
        title={`${BOARD_LABELS[board]}: ${value}`}
    >
        <span className="sr-only">{BOARD_LABELS[board]}: </span>
        {value}
    </span>
);

/** The three board counts in board order, then the total. */
const TaskCountsCell = ({ counts }) => (
    <span className="flex items-center justify-start gap-1.5">
        {BOARDS.map((board) => (
            <TaskCountPill key={board} board={board} value={counts?.[board] ?? 0} />
        ))}
        <span className="font-extrabold text-ink tabular-nums">{counts?.total ?? 0}</span>
    </span>
);

/** Ascending, descending or inactive sort icon. */
const SortIndicator = ({ isActive, isAscending }) =>
    isActive ? (
        <Icon
            name={isAscending ? "sortAscending" : "sortDescending"}
            size={16}
            className="text-fox-500"
        />
    ) : (
        <Icon
            name="sortNone"
            size={16}
            className="text-ink-faint"
        />
    );

/**
 * A sortable column header. Only columns the API can sort are buttons, and `aria-sort` announces
 * the current order.
 */
const SortHeader = ({ column, sortBy, sortDir, onSort }) => {
    if (!column.sort) {
        return (
            <th scope="col" className="px-3 py-3 text-left text-xs font-extrabold tracking-wide text-ink-soft uppercase">
                {column.label}
            </th>
        );
    }

    const isActive = sortBy === column.sort;
    const isAscending = sortDir === SORT_DIRECTIONS.asc;
    const ariaSort = isActive ? (isAscending ? "ascending" : "descending") : "none";

    /** Sort state, named for a pointer hover and kept out of the visible text. */
    const stateLabel = isActive
        ? `, sorted ${isAscending ? "ascending" : "descending"}`
        : ", not sorted. Activate to sort";

    return (
        <th
            scope="col"
            aria-sort={ariaSort}
            className="px-3 py-3 text-left text-xs font-extrabold tracking-wide text-ink-soft uppercase"
        >
            <button
                type="button"
                onClick={() => onSort(column.sort)}
                title={`${column.label}${stateLabel}`}
                aria-label={`${column.label}${stateLabel}`}
                className="group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-2 border-transparent px-1.5 py-1 text-ink-soft transition hover:border-ink/15 hover:bg-white hover:text-ink"
            >
                {column.label}
                <SortIndicator isActive={isActive} isAscending={isAscending} />
            </button>
        </th>
    );
};

const MENU_WIDTH = 192;
const MENU_ITEM_HEIGHT = 40;
const MENU_ITEMS = 3;
const MENU_HEIGHT = MENU_ITEM_HEIGHT * MENU_ITEMS;
const GAP = 4;

/** The row's actions, collapsed into a kebab menu. */
const RowActions = ({ user, canManage, onView, onToggleStatus, onDelete }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    /** Menu position, measured from the trigger once it opens. */
    const [position, setPosition] = useState(null);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);

    const menuRef = useRef(null);
    const name = getFullName(user);
    const isBlocked = user.status === "blocked";

    /**
     * The menu is portalled to the body and positioned from the trigger's rectangle, since the
     * table sits in a scrollable container that would clip an absolutely positioned menu.
     */
    useLayoutEffect(() => {
        if (!isMenuOpen) return undefined;

        const place = () => {
            const trigger = triggerRef.current;
            if (!trigger) return;

            const rect = trigger.getBoundingClientRect();
            const fitsBelow = rect.bottom + GAP + MENU_HEIGHT <= window.innerHeight;

            setPosition({
                top: fitsBelow ? rect.bottom + GAP : Math.max(GAP, rect.top - GAP - MENU_HEIGHT),
                left: Math.min(rect.left, window.innerWidth - MENU_WIDTH - GAP),
            });
        };

        place();

        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);

        return () => {
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
        };
    }, [isMenuOpen]);

    /** Closes on outside click or Escape, matching the account menu. */
    useEffect(() => {
        if (!isMenuOpen) return undefined;

        const onPointerDown = (event) => {
            const target = event.target;
            const inTrigger = containerRef.current?.contains(target);
            const inMenu = menuRef.current?.contains(target);

            if (!inTrigger && !inMenu) setIsMenuOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === "Escape") setIsMenuOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [isMenuOpen]);

    /** Runs an action and closes the menu, so it never hangs open behind the dialog it opens. */
    const choose = (action) => {
        setIsMenuOpen(false);
        action(user);
    };

    return (
        <div className="relative" ref={containerRef}>
            <KebabButton
                ref={triggerRef}
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                label={`Actions for ${name}`}
                title="Row actions"
            />

            {isMenuOpen &&
                position &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        aria-label={`Actions for ${name}`}
                        style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
                        className="animate-pop-in fixed z-overlay overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-pop"
                    >
                        <ul className="py-1.5">
                            <MenuItem onClick={() => choose(onView)}>
                                <Icon name="view" size={16} />
                                View user
                            </MenuItem>

                            {canManage && (
                                <MenuItem onClick={() => choose(onToggleStatus)}>
                                    <Icon name={isBlocked ? "unblock" : "block"} size={16} />
                                    {isBlocked ? "Unblock" : "Block"} user
                                </MenuItem>
                            )}

                            {canManage && (
                                <MenuItem tone="danger" onClick={() => choose(onDelete)}>
                                    <Icon name="remove" size={16} />
                                    Delete user
                                </MenuItem>
                            )}
                        </ul>
                    </div>,
                    document.body
                )}
        </div>
    );
};

/** One entry in the kebab menu. `tone` tints a destructive entry red. */
const MenuItem = ({ children, tone = "default", onClick }) => (
    <li>
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-bold transition hover:bg-fox-50 ${
                tone === "danger" ? "text-red-600" : "text-ink"
            }`}
        >
            {children}
        </button>
    </li>
);

/**
 * One user, as a card, for narrow screens.
 *
 * Both layouts read the same `rows` prop and only one is ever in the document.
 */
const UserCard = ({ user, onView, onToggleStatus, onDelete, canManage }) => (
    <li className="surface animate-rise flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2.5">
            <UserAvatar user={user} />

            <div className="min-w-0 flex-1">
                <p className="font-extrabold wrap-break-word text-ink">{getFullName(user)}</p>
                <p className="break-anywhere text-sm font-semibold text-ink-soft">
                    {user.email}
                </p>
            </div>

            <RowActions
                user={user}
                canManage={canManage}
                onView={onView}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
            />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
            <TaskCountsCell counts={user.taskCounts} />
        </div>

        <p className="text-xs font-semibold text-ink-faint">
            Joined {formatDate(user.createdAt)}
        </p>
    </li>
);

/**
 * The users list, as cards on narrow screens or as a table on wide ones.
 *
 * `useMediaQuery` instead of a `hidden md:block` / `md:hidden` pair, which would leave the hidden
 * layout in the DOM and hand a screen reader every row twice.
 *
 * @param {object} props
 * @param {object[]} props.rows - One entry per registered account
 * @returns {JSX.Element} The users list, as cards or as a table
 */
const UsersTable = ({ rows, sortBy, sortDir, onSort, onView, onToggleStatus, onDelete, canManageRow }) => {
    const isWide = useMediaQuery(DESKTOP_TABLE);

    /** Shared row props, so both layouts stay in step. */
    const rowProps = (user) => ({
        user,
        canManage: canManageRow(user),
        onView,
        onToggleStatus,
        onDelete,
    });

    if (!isWide) {
        return (
            <ul className="flex flex-col gap-3 p-3">
                {rows.map((user) => (
                    <UserCard key={user._id} {...rowProps(user)} />
                ))}
            </ul>
        );
    }

    return (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Registered users">
            <table className="w-full min-w-176 border-collapse text-sm">
            <caption className="sr-only">
                Registered users with their role, account status and task counts. The Tasks column
                shows the To Do, Ongoing and Done counts as coloured pills, followed by
                their total.
            </caption>

            <thead className="border-b-2 border-ink bg-paper">
                <tr>
                    {USER_COLUMNS.map((column) => (
                        <SortHeader
                            key={column.key}
                            column={column}
                            sortBy={sortBy}
                            sortDir={sortDir}
                            onSort={onSort}
                        />
                    ))}
                </tr>
            </thead>

            <tbody>
                {rows.map((user) => (
                    <tr
                        key={user._id}
                        className="border-b border-paper-deep transition-colors last:border-b-0 hover:bg-row-hover"
                    >
                        <td className="px-3 py-3">
                            <span className="flex items-center gap-2.5">
                                <UserAvatar user={user} />
                                <span className="min-w-0">
                                    <span className="block font-extrabold text-ink">{getFullName(user)}</span>
                                    <span className="block break-anywhere text-xs font-semibold text-ink-soft">
                                        {user.email}
                                    </span>
                                </span>
                            </span>
                        </td>
                        <td className="px-3 py-3">
                            <RoleBadge role={user.role} />
                        </td>
                        <td className="px-3 py-3">
                            <StatusBadge status={user.status} />
                        </td>
                        <td className="px-3 py-3">
                            <TaskCountsCell counts={user.taskCounts} />
                        </td>
                        <td className="px-3 py-3 text-left text-xs font-semibold text-ink-soft">
                            {formatDate(user.createdAt)}
                        </td>
                        <td className="px-3 py-3">
                            <RowActions
                                user={user}
                                canManage={canManageRow(user)}
                                onView={onView}
                                onToggleStatus={onToggleStatus}
                                onDelete={onDelete}
                            />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
    );
};

export default UsersTable;
