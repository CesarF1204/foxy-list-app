/**
 * Every constant the app shares, re-exported from one entry point. Each area
 * keeps its own module, and importing it directly is equally fine. Nothing here
 * may import from `src/` at large: these are the values every layer agrees on.
 */

export {
    BOARDS,
    DEFAULT_BOARD,
    BOARD_LABELS,
    BOARD_META,
    CARD_BOARD_META,
} from "./boards";
export { TEMP_ID_PREFIX } from "./tasks";
export {
    PAGE_SIZE_OPTIONS,
    DEFAULT_PAGE_SIZE,
    USER_SORT_FIELDS,
    DEFAULT_USER_SORT,
    SORT_DIRECTIONS,
    STAT_CARDS,
    TASK_STAT_CARDS,
    USER_COLUMNS,
} from "./admin";
export {
    USER_ROLES,
    ADMIN_ROLE,
    DEFAULT_ROLE,
    ROLE_META,
    ACCOUNT_STATUSES,
    DEFAULT_ACCOUNT_STATUS,
    ACCOUNT_STATUS_META,
    isAdmin,
} from "./roles";
export { ROUTES, FOOTER_PATHS } from "./routes";
export {
    VALIDATE_TOKEN_KEY,
    TASKS_KEY,
    ADMIN_STATS_KEY,
    ADMIN_USERS_KEY,
    adminUsersKey,
    adminUserKey,
} from "./queryKeys";
export {
    MASCOT_SHEETS,
    MASCOT_LABEL,
    BUILDER_SHEETS,
    BUILDER_LABEL,
    MASCOT_MOODS,
    MASCOT_HOLD_MS,
    TOAST_MOODS,
    MASCOT_DIRECTIONS,
    MASCOT_REACTIONS,
    MASCOT_CLOCKWISE,
    MASCOT_SECTOR,
    MASCOT_HYSTERESIS,
    MASCOT_DEAD_ZONE,
    MASCOT_PAYOFFS,
    MASCOT_BOOP_PAYOFF_MS,
    MASCOT_BOOP_END_MS,
    MASCOT_SQUASH_MS,
    MASCOT_DIZZY_AFTER,
    MASCOT_DIZZY_WINDOW_MS,
    MASCOT_DIZZY_END_MS,
    MASCOT_SQUASH,
} from "./mascot";
export {
    TOAST_TYPES,
    TOAST_DEFAULT_TYPE,
    TOAST_STYLES,
    TOAST_ICONS,
    TOAST_DURATIONS_MS,
    TOAST_TITLE_LIMIT,
} from "./toast";
export {
    DEMO_AVATAR_URL,
    DEMO_USER_ID_PREFIX,
    DISPLAY_NAME_FALLBACK,
    INITIALS_FALLBACK,
} from "./user";
export {
    EMAIL_PATTERN,
    NAME_PATTERN,
    PASSWORD_MIN_LENGTH,
    VALIDATION_MESSAGES,
} from "./validation";
export {
    CONTROL_BASE,
    CONTROL_BUTTON,
    CONTROL_BUTTON_SUBTLE,
    CONTROL_ICON,
} from "./styles";