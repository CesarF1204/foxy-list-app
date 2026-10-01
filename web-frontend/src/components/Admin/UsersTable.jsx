import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getInitials, getFullName } from "../../helpers/globalHelper";
import { USER_COLUMNS, SORT_DIRECTIONS } from "../../constants/admin";
import { BOARD_META, BOARDS, BOARD_LABELS } from "../../constants/boards";
import { RoleBadge, StatusBadge } from "./Badges";
import { Icon, KebabButton } from "../icons";

/** A date as a short value, with the full timestamp available on hover. */
const formatDate = (value) => {
    if (!value) return "Unknown";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";

    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

/**
 * The avatar: the same initials the navbar uses, so a row and the account menu look like the
 * same person. Decorative, since the name is beside it.
 */
const UserAvatar = ({ user }) => (
    <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-fox-400 text-xs font-extrabold text-white"
        aria-hidden="true"
    >
        {getInitials(user)}
    </span>
);

/**
 * One board task count as an outlined pill. The border and text colours come from `BOARD_META`,
 * so a board count looks the same here as on the board itself. The board is named twice over:
 * the `title` for a pointer, and a screen-reader only label for anyone who cannot use colour,
 * so a row reads "4 To Do, 3 Ongoing, 2 Done" rather than three bare numbers.
 */
const TaskCountPill = ({ board, value }) => (
    <span
        className={`rounded-lg border-2 bg-white px-1.5 py-0.5 text-xs font-extrabold tabular-nums ${BOARD_META[board].pill}`}
        title={`${BOARD_LABELS[board]}: ${value}`}
    >
        <span className="sr-only">{BOARD_LABELS[board]}: </span>
        {value}
    </span>
);

/**
 * The whole tasks cell: the three board counts in board order, then the total as plain bold
 * text, so the total is the number the eye lands on.
 */
const TaskCountsCell = ({ counts }) => (
    <span className="flex items-center justify-start gap-1.5">
        {BOARDS.map((board) => (
            <TaskCountPill key={board} board={board} value={counts?.[board] ?? 0} />
        ))}
        <span className="font-extrabold text-ink tabular-nums">{counts?.total ?? 0}</span>
    </span>
);

/**
 * The sort state of a column header, as one of the app's standard icons rather than a
 * character.
 */
const SortIndicator = ({ isActive, isAscending }) =>
    isActive ? (
        <Icon
            name={isAscending ? "sortAscending" : "sortDescending"}
            size={16}
            /** The active column is the one the eye should land on first. */
            className="text-fox-500"
        />
    ) : (
        <Icon
            name="sortNone"
            size={16}
            /** Faint, because an unsorted column is an offer, not the state. */
            className="text-ink-faint"
        />
    );

/**
 * A sortable column header. Only the columns the API can sort are buttons, and the header cell
 * carries `aria-sort`, so the table's order is announced rather than only seen.
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

    /**
     * Named for a pointer hover as well, and kept out of the text so the header still reads as
     * just the column's name.
     */
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

/**
 * The row's actions, collapsed into a kebab menu. Three icon buttons per row crowded the table
 * and left a destructive Delete one mis-click from Block, so only the kebab shows until an
 * admin asks for the menu.
 */
const RowActions = ({ user, canManage, onView, onToggleStatus, onDelete }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    /** Where the menu should sit, measured from the trigger once it opens. */
    const [position, setPosition] = useState(null);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);

    const menuRef = useRef(null);
    const name = getFullName(user);
    const isBlocked = user.status === "blocked";

    /**
     * The menu is portalled to the document body and positioned from the trigger's own
     * rectangle, because the table sits inside a horizontally scrollable container: an
     * absolutely positioned menu would be clipped by it, and widening the table so a dropdown
     * fits is a bad trade. `position: fixed` escapes both that container and the card's
     * `overflow-hidden` above it.
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

    /**
     * Close on an outside click or Escape, the same two ways the account menu closes, so both
     * menus in the app behave identically.
     */
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

    /**
     * Runs an action and closes the menu, so it never hangs open behind the dialog or drawer
     * the action opens.
     */
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

            {/* Portalled to the body so the table's scroll container cannot clip
                it; `position` is null only on the frame before measurement. */}
            {isMenuOpen &&
                position &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        aria-label={`Actions for ${name}`}
                        style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
                        className="animate-pop-in fixed z-50 overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-pop"
                    >
                        <ul className="py-1.5">
                            {/* Each entry pairs the app's standard icon for the
                                action with its name in words, so the mark is a
                                recognition aid and never the only label. */}
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

/**
 * One entry in the kebab menu. A `<button>` inside a `role="menu"`, so it is reachable by
 * keyboard and announced as a menu item. The label is text, not an icon, so the action is
 * readable at a glance; `tone` tints a destructive entry red.
 */
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
 * The users table. A real `<table>` with a caption, `<th scope="col">` headers and `aria-sort`
 * on the sortable ones, so the structure a screen reader walks is the structure an admin sees.
 */
const UsersTable = ({ rows, sortBy, sortDir, onSort, onView, onToggleStatus, onDelete, canManageRow }) => (
    <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Registered users"
    >
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

export default UsersTable;
