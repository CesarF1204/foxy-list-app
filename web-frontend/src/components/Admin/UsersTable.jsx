import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getInitials, getFullName } from "../../helpers/globalHelper";
import { USER_COLUMNS, SORT_DIRECTIONS } from "../../constants/admin";
import { BOARD_META, BOARDS, BOARD_LABELS } from "../../constants/boards";
import { RoleBadge, StatusBadge } from "./Badges";

/** DOCU: A date as a short value, with the full timestamp available on hover. */
const formatDate = (value) => {
    if (!value) return "Unknown";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";

    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

/** DOCU: The avatar: the same initials the navbar uses, so a row and the account
 *  menu look like the same person. Decorative, since the name is beside it. */
const UserAvatar = ({ user }) => (
    <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-fox-400 text-xs font-extrabold text-white"
        aria-hidden="true"
    >
        {getInitials(user)}
    </span>
);

/**
 * DOCU: One board task count as an outlined pill. The border and text colours
 * come from `BOARD_META`, so a board count looks the same here as on the board
 * itself. The board is named twice over: the `title` for a pointer, and a
 * screen-reader only label for anyone who cannot use colour, so a row reads
 * "4 To Do, 3 Ongoing, 2 Done" rather than three bare numbers. */
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
 * DOCU: The whole tasks cell: the three board counts in board order, then the
 * total as plain bold text, so the total is the number the eye lands on.
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
 * DOCU: The sort state of a column header, as a drawn icon rather than a
 * character.
 *
 * The header is `text-xs` uppercase, and a text glyph at a fraction of that
 * landed at roughly 8px - at that size the arrows are a hairline, and `↕`
 * (U+2195) is missing outright in plenty of system font stacks, so on a wide
 * screen the control that says "you can sort this" is the one thing you cannot
 * see. Drawn at a fixed 16px in the same 24-unit grid as every other icon in the
 * app, it stays legible at any table width and any zoom level.
 *
 * Three states, each distinguishable without colour: both chevrons when the
 * column is unsorted, one filled chevron pointing the way the column is sorted
 * when it is the active one. The icon is decorative - `aria-sort` on the
 * `<th>` is what actually carries the order to a screen reader - but the button
 * names the state in its `title` so it is also a pointer user can read.
 */
const SortIndicator = ({ isActive, isAscending }) => {
    const strokeProps = {
        stroke: "currentColor",
        strokeWidth: 2.6,
        strokeLinecap: "round",
        strokeLinejoin: "round",
    };

    if (!isActive) {
        return (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                /* Faint, because an unsorted column is an offer, not the state. */
                className="shrink-0 text-ink-faint"
                focusable="false"
            >
                <path d="M7 10.5 12 5.5l5 5" {...strokeProps} />
                <path d="M7 13.5 12 18.5l5-5" {...strokeProps} />
            </svg>
        );
    }

    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            /* The active column is the one the eye should land on first. */
            className="shrink-0 text-fox-500"
            focusable="false"
        >
            <path
                d={isAscending ? "M6 14.5 12 8.5l6 6" : "M6 9.5 12 15.5l6-6"}
                fill="currentColor"
                stroke="currentColor"
                strokeWidth={1.4}
                strokeLinejoin="round"
            />
        </svg>
    );
};

/** DOCU: A sortable column header. Only the columns the API can sort are
 *  buttons, and the header cell carries `aria-sort`, so the table's order is
 *  announced rather than only seen. */
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

    /* Named for a pointer hover as well, and kept out of the text so the header
     * still reads as just the column's name. */
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
                /* Not a `.btn`, so it does not inherit that class's `cursor: pointer`
                 * - the same explicit opt-in the kebab trigger and the navbar
                 * avatar make. The header cell itself is left unclickable so the
                 * pointer only promises a sort on the label and its icon. */
                className="group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-2 border-transparent px-1.5 py-1 text-ink-soft transition hover:border-ink/15 hover:bg-white hover:text-ink"
            >
                {column.label}
                <SortIndicator isActive={isActive} isAscending={isAscending} />
            </button>
        </th>
    );
};

/**
 * DOCU: The kebab menu's own measurements, kept out of the component so the
 * positioning maths reads as arithmetic. `MENU_ITEMS` is the most the menu ever
 * holds; a row that cannot be managed shows fewer, which only makes it shorter,
 * so measuring for the tallest case never clips.
 */
const MENU_WIDTH = 192;
const MENU_ITEM_HEIGHT = 40;
const MENU_ITEMS = 3;
const MENU_HEIGHT = MENU_ITEM_HEIGHT * MENU_ITEMS;
/** The gap between the trigger and the menu, in pixels. */
const GAP = 4;

/**
 * DOCU: The row's actions, collapsed into a kebab menu. Three icon buttons per
 * row crowded the table and left a destructive Delete one mis-click from Block,
 * so only the kebab shows until an admin asks for the menu.
 *
 * It behaves like the navbar's account menu, deliberately: the trigger carries
 * `aria-haspopup`/`aria-expanded`, Escape and an outside click close it, and
 * picking an entry closes it. Each entry names the account in its accessible
 * name - "Actions for Ada Lovelace" - so a screen reader never announces a row
 * of identical buttons. `canManage` is false for the signed-in admin's own row,
 * which hides the destructive entries; the API refuses those changes too.
 */
const RowActions = ({ user, canManage, onView, onToggleStatus, onDelete }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    /** Where the menu should sit, measured from the trigger once it opens. */
    const [position, setPosition] = useState(null);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    /* The menu is portalled to the body, so it is not inside `containerRef`.
     * Both are checked, otherwise pressing an entry would count as an outside
     * click and unmount the menu before its own click ever fired. */
    const menuRef = useRef(null);
    const name = getFullName(user);
    const isBlocked = user.status === "blocked";

    /**
     * DOCU: The menu is portalled to the document body and positioned from the
     * trigger's own rectangle, because the table sits inside a horizontally
     * scrollable container: an absolutely positioned menu would be clipped by it,
     * and widening the table so a dropdown fits is a bad trade. `position: fixed`
     * escapes both that container and the card's `overflow-hidden` above it.
     *
     * Measured in a layout effect so the menu never paints in the wrong spot for
     * a frame, and re-measured on scroll and resize so it follows its row rather
     * than pointing at where the trigger used to be. It opens below the trigger,
     * flipping above when the viewport is too short - otherwise the menu on the
     * last row would be cut off by the bottom of the screen.
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
                /* Clamped to the right edge so a menu near the edge of a wide
                 * screen stays fully on screen. */
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

    /* Close on an outside click or Escape, the same two ways the account menu
     * closes, so both menus in the app behave identically. */
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

    /* Runs an action and closes the menu, so it never hangs open behind the
     * dialog or drawer the action opens. */
    const choose = (action) => {
        setIsMenuOpen(false);
        action(user);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                aria-label={`Actions for ${name}`}
                title="Row actions"
                className={`flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition ${
                    /* A border ring on hover rather than a shadow: an outline reads as
                     * "this row's menu" and stays flat, where a lift would compete
                     * with the row's own hover tint underneath it. */
                    "cursor-pointer border-2 border-transparent hover:border-ink hover:bg-white hover:text-ink"
                }`}
            >
                {/* Three stacked dots: the kebab, drawn like the other icons. */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                </svg>
            </button>

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
                            <MenuItem onClick={() => choose(onView)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path
                                        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinejoin="round"
                                    />
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                View user
                            </MenuItem>

                            {canManage && (
                                <MenuItem onClick={() => choose(onToggleStatus)}>
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                        {isBlocked && (
                                            <path
                                                d="m8 12 3 3 5-6"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        )}
                                    </svg>
                                    {isBlocked ? "Unblock" : "Block"} user
                                </MenuItem>
                            )}

                            {canManage && (
                                <MenuItem tone="danger" onClick={() => choose(onDelete)}>
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
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

/** DOCU: One entry in the kebab menu. A `<button>` inside a `role="menu"`, so it
 *  is reachable by keyboard and announced as a menu item. The label is text,
 *  not an icon, so the action is readable at a glance; `tone` tints a
 *  destructive entry red. */
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
 * DOCU: The users table. A real `<table>` with a caption, `<th scope="col">`
 * headers and `aria-sort` on the sortable ones, so the structure a screen reader
 * walks is the structure an admin sees.
 *
 * Responsively, the table holds every column from `lg` upwards. Below that the
 * container scrolls horizontally rather than the rows turning into a different
 * component on small screens: one table keeps one set of semantics. The scroll
 * container is focusable and labelled, so it can be reached with the keyboard.
 */
const UsersTable = ({ rows, sortBy, sortDir, onSort, onView, onToggleStatus, onDelete, canManageRow }) => (
    <div
        className="overflow-x-auto"
        /* A scrollable region has to be reachable without a mouse. */
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

