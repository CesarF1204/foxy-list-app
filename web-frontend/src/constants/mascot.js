/**
 * 3x3 sheets: nine head directions and nine expressions. Served from `public/` so they stay out
 * of the JS bundle. Swap both files to change character.
 */
const MASCOT_SHEETS = {
    directions: "/mascots/fox-directions.webp",
    reactions: "/mascots/fox-reactions.webp",
};

/** The character name a screen reader announces for the mascot. */
const MASCOT_LABEL = "fox";

/** The builder, used on the 404 screen. Same shape as the fox's sheets. */
const BUILDER_SHEETS = {
    directions: "/mascots/builder-directions.webp",
    reactions: "/mascots/builder-reactions.webp",
};

/** The character name a screen reader announces for the builder. */
const BUILDER_LABEL = "builder";

/**
 * How each form mood reads on the expressions sheet. The sheet is a 3x3 grid in reading order,
 * and the names match the `page-mascot` library's own list.
 */
const MASCOT_MOODS = {
    /** Invalid field, or a rejected attempt. */
    error: "dizzy",
    /** Everything typed so far checks out. */
    neutral: "sparkle",
    /** Signed in, account created, password reset. */
    success: "heart",
};

/** How long each mood holds its face, in ms. */
const MASCOT_HOLD_MS = {
    error: 2000,
    neutral: 900,
    success: 1600,
};

/**
 * One table for both, so whatever the toast claims is what the fox reacts to. INFO is
 * deliberately null: it narrates without a verdict.
 */
const TOAST_MOODS = {
    SUCCESS: "success",
    ERROR: "error",
    INFO: null,
};

/** The nine head directions on the directions sheet, in reading order. */
const MASCOT_DIRECTIONS = [
    "up-left",
    "up",
    "up-right",
    "left",
    "center",
    "right",
    "down-left",
    "down",
    "down-right",
];

/** The nine expressions on the reactions sheet, in reading order. */
const MASCOT_REACTIONS = [
    "blink",
    "heart",
    "sparkle",
    "surprised",
    "wink",
    "bashful",
    "sleepy",
    "dizzy",
    "delighted",
];

/** Clockwise from the right, matching atan2 with y pointing down. */
const MASCOT_CLOCKWISE = [
    "right",
    "down-right",
    "down",
    "down-left",
    "left",
    "up-left",
    "up",
    "up-right",
];

const MASCOT_SECTOR = (Math.PI * 2) / MASCOT_CLOCKWISE.length;
const MASCOT_HYSTERESIS = 0.12;
/** Close in, the head settles to centre instead of jittering with the cursor. */
const MASCOT_DEAD_ZONE = 70;
const MASCOT_PAYOFFS = ["heart", "sparkle", "delighted"];
const MASCOT_BOOP_PAYOFF_MS = 120;
const MASCOT_BOOP_END_MS = 560;
const MASCOT_SQUASH_MS = 420;
const MASCOT_DIZZY_AFTER = 4;
const MASCOT_DIZZY_WINDOW_MS = 1600;
const MASCOT_DIZZY_END_MS = 1100;

/**
 * The click squash. Easing is per keyframe: easing the effect would reinterpret every offset
 * and front-load the bounce.
 */
const MASCOT_SQUASH = [
    { transform: "scale(1, 1)", easing: "ease-in" },
    { transform: "scale(1.1, 0.86)", offset: 0.18, easing: "ease-out" },
    { transform: "scale(0.95, 1.08)", offset: 0.45, easing: "ease-in-out" },
    { transform: "scale(1.03, 0.97)", offset: 0.72, easing: "ease-in-out" },
    { transform: "scale(1, 1)" },
];

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
};