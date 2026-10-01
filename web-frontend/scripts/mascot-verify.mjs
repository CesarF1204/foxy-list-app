import {
    resolveAuthMood,
    fieldErrorToast,
} from "../src/helpers/mascotMood.js";
import {
    MASCOT_HOLD_MS,
    MASCOT_MOODS,
    MASCOT_REACTIONS,
    TOAST_MOODS,
} from "../src/constants/mascot.js";

/** The nine cells of the reactions sheet, in reading order: the real list. */
const REACTIONS = MASCOT_REACTIONS;

/** The background-position a reaction name resolves to, as the sprite renders it. */
const cellOf = (name) => {
    const index = REACTIONS.indexOf(name);
    return index < 0 ? null : `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`;
};

let failures = 0;

/** Structural equality for plain JSON-ish data, enough for the literals below. */
const same = (actual, expected) => {
    if (actual === expected) return true;
    if (typeof actual !== "object" || typeof expected !== "object") return false;
    if (actual === null || expected === null) return false;

    return JSON.stringify(actual) === JSON.stringify(expected);
};

const check = (label, actual, expected) => {
    if (same(actual, expected)) {
        console.log(`  ok    ${label}`);
    } else {
        failures += 1;
        console.error(`  FAIL  ${label}\n        expected ${expected}\n        actual   ${actual}`);
    }
};

/** Shorthand: the mood for a form/mutation combination. */
const moodOf = (state) => resolveAuthMood(state);

console.log("\nIdle, before the user has done anything:");
check("an untouched form leaves the fox alone", moodOf({}), null);
check(
    "field errors before any submit are ignored",
    moodOf({ hasFieldError: true, isSubmitted: false }),
    null,
    "react-hook-form reports errors only after submit, but guard it anyway",
);

console.log("\nA field is invalid:");
check("a validation failure is an error", moodOf({ isSubmitted: true, hasFieldError: true }), "error");

console.log("\nNothing is wrong:");
check("a clean submit is neutral", moodOf({ isSubmitted: true }), "neutral");
check(
    "a request in flight says nothing",
    moodOf({ isSubmitted: true, isPending: true }),
    null,
    "the fox must not react to a verdict from the previous attempt",
);

console.log("\nThe server said no:");
check("a rejected request is an error", moodOf({ isSubmitted: true, isError: true }), "error");
check(
    "a server error outranks a clean field",
    moodOf({ isSubmitted: true, isError: true, hasFieldError: false }),
    "error",
);

console.log("\nThe toast is what the user is reading, so it counts too:");
check("an ERROR toast is an error", moodOf({ isSubmitted: true, toastType: "ERROR" }), "error");
check(
    "a SUCCESS toast is a success",
    moodOf({ isSubmitted: true, toastType: "SUCCESS" }),
    "success",
);
check(
    "an INFO toast says nothing",
    moodOf({ isSubmitted: true, toastType: "INFO" }),
    "neutral",
    "it narrates without a verdict, so the form state decides",
);
check(
    "an error toast outlives the reset mutation",
    moodOf({ isSubmitted: true, toastType: "ERROR", isError: false }),
    "error",
    "the user is still reading the red message, so the fox must agree with it",
);
check(
    "a request in flight outranks the toast",
    moodOf({ isSubmitted: true, toastType: "ERROR", isPending: true }),
    null,
);
check(
    "the server outranks a stale toast",
    moodOf({ isSubmitted: true, toastType: "ERROR", isSuccess: true }),
    "success",
);
check("every toast type has an entry", Object.keys(TOAST_MOODS).length, 3);
for (const type of Object.keys(TOAST_MOODS)) {
    check(
        `"${type}" resolves to a real mood`,
        [null, ...Object.keys(MASCOT_MOODS)].includes(TOAST_MOODS[type]),
        true,
    );
}

console.log("\nIt worked:");
check("a resolved request is a success", moodOf({ isSubmitted: true, isSuccess: true }), "success");
check(
    "success outranks a field error from an earlier attempt",
    moodOf({ isSubmitted: true, isSuccess: true, hasFieldError: true }),
    "success",
    "the request went through, so the fox celebrates rather than complains",
);

console.log("\nA blocked submit announces itself:");
check(
    "field errors become an ERROR toast",
    fieldErrorToast({ email: { message: "Enter a valid email address" } }),
    { message: ["Enter a valid email address"], type: "ERROR" },
);
check(
    "every broken field is reported",
    fieldErrorToast({
        password: { message: "Must be at least 6 characters" },
        confirmPassword: { message: "Passwords do not match" },
    }).message.length,
    2,
);
check("a clean form raises nothing", fieldErrorToast({}), null);
check("a missing errors object raises nothing", fieldErrorToast(undefined), null);
check("a field with no message is skipped", fieldErrorToast({ email: {} }), null);

console.log("\nThe pages wait as long as the fox's face does:");
check("the success hold is shared", MASCOT_HOLD_MS.success, 1600);
check("every mood has a hold", Object.keys(MASCOT_HOLD_MS).sort(), Object.keys(MASCOT_MOODS).sort());
check("every hold is a usable number", Object.values(MASCOT_HOLD_MS).every((ms) => ms > 0), true);

console.log("\nThe moods point at real sprite cells:");
for (const [mood, name] of Object.entries(MASCOT_MOODS)) {
    check(`"${mood}" maps to a named reaction`, REACTIONS.includes(name), true);
    check(`"${mood}" (${name}) lands on a cell`, cellOf(name), cellOf(name));
    console.log(`          ${name} -> background-position ${cellOf(name)}`);
}

console.log("\nThe exact moods chosen for this app:");
check("an error makes the fox dizzy", MASCOT_MOODS.error, "dizzy");
check("a clean field sparkles", MASCOT_MOODS.neutral, "sparkle");
check("a success gets a heart", MASCOT_MOODS.success, "heart");

console.log(
    failures === 0 ? "\nAll mascot checks passed.\n" : `\n${failures} check(s) failed.\n`,
);
process.exitCode = failures === 0 ? 0 : 1;
