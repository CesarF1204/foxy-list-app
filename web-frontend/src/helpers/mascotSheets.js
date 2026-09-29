/**
 * DOCU: Where the mascot's sprite sheets live. <br>
 * The `page-mascot` component takes a pair of 3x3 sheets: one for the nine head
 * directions and one for the nine expressions. Both files are served from
 * `public/`, so they are referenced by absolute path rather than imported, which
 * keeps them out of the JS bundle and lets the browser cache them separately.
 *
 * To swap in a different character, replace these two files (or point them at
 * another pair from the library's demo page) and change nothing else.
 */
const MASCOT_SHEETS = {
    directions: "/mascots/fox-directions.webp",
    reactions: "/mascots/fox-reactions.webp",
};

/** DOCU: The character name a screen reader announces for the mascot. */
const MASCOT_LABEL = "fox";

/**
 * DOCU: The builder, the second character. <br>
 * Same shape as the fox's sheets and the same `page-mascot` component, so it can
 * stand in anywhere. It is used on the not-found screen, where a character
 * holding a hard hat suits a page about something not being built, and where
 * dropping the product's own fox keeps the 404 from looking like the app.
 */
const BUILDER_SHEETS = {
    directions: "/mascots/builder-directions.webp",
    reactions: "/mascots/builder-reactions.webp",
};

/** DOCU: The character name a screen reader announces for the builder. */
const BUILDER_LABEL = "builder";

/**
 * DOCU: How each form mood reads on the expressions sheet. <br>
 * The sheet is a 3x3 grid whose nine cells, in reading order, are: blink,
 * heart, sparkle, surprised, wink, bashful, sleepy, dizzy, delighted. <br>
 * The names match the `page-mascot` library's own list, so a cell picked here is
 * the same face a click on the mascot would show.
 */
const MASCOT_MOODS = {
    /* A field is invalid, or the server rejected the attempt: the fox is dizzy. */
    error: "dizzy",
    /* Everything typed so far checks out: a small encouraging sparkle. */
    neutral: "sparkle",
    /* Signed in, account created, password reset: the fox is delighted. */
    success: "heart",
};

/**
 * DOCU: How long each mood holds its face, in ms. <br>
 * Lives here, next to the moods, because both the reaction hook and the pages
 * need it and the two must not drift: a page that navigates away before the
 * matching face has finished playing would cut the celebration short. <br>
 * `error` sticks around because the message it reacts to does; the others are
 * one-off flourishes that get out of the way again.
 */
const MASCOT_HOLD_MS = {
    error: 2000,
    neutral: 900,
    success: 1600,
};

/**
 * DOCU: The mood each toast type stands for. <br>
 * The toast and the mascot are saying the same thing to the same person, so
 * they are mapped from one table rather than chosen twice: whatever the toast
 * claims happened is what the fox reacts to. `INFO` is deliberately null - it
 * narrates without a verdict, so the fox has nothing to say about it.
 */
const TOAST_MOODS = {
    SUCCESS: "success",
    ERROR: "error",
    INFO: null,
};

export {
    MASCOT_SHEETS,
    MASCOT_LABEL,
    BUILDER_SHEETS,
    BUILDER_LABEL,
    MASCOT_MOODS,
    MASCOT_HOLD_MS,
    TOAST_MOODS,
};

/**
 * DOCU: The toast a blocked submit should raise. <br>
 * A form that fails validation never reaches the server, so nothing in the
 * mutation layer fires and the user is left with inline field errors and no
 * notification. This gives the screens a consistent ERROR toast for that case,
 * so a field error and a server error look and sound the same. <br>
 * Returns null when there is nothing wrong, so the caller can pass the result
 * straight to `showToast` without a guard.
 *
 * @param {object} errors react-hook-form's `errors` object.
 * @returns {?{message: string[], type: string}} A toast payload, or null.
 */
const fieldErrorToast = (errors) => {
    /* The order is the order the fields appear in, so the first one reported is
       the first one on screen. `error.message` is the string RHF was given. */
    const messages = Object.values(errors ?? {})
        .map((error) => error?.message)
        .filter(Boolean);

    if (!messages.length) {
        return null;
    }

    /* An array, because the API already reports its own errors that way and
       `Toast` knows how to join them. */
    return { message: messages, type: "ERROR" };
};

/**
 * DOCU: Works out which mood the fox should be in, given everything the screen
 * knows. <br>
 * Kept as a pure function, away from React, because both auth screens need the
 * exact same answer and the rules are easier to reason about (and to check)
 * than they would be spread across two components.
 *
 * The inputs, and why each one is here:
 *
 * - `isSuccess` / `isError`: the request for the step on screen settled. The
 *   strongest signal there is - the server has actually answered.
 * - `toastType`: what the user is being told right now. This is what keeps the
 *   fox in step with the notification. The mutation alone is not enough,
 *   because a screen deliberately forgets a result as soon as the user starts
 *   correcting it while the error toast is still on screen for several seconds;
 *   without this the mascot would go back to neutral next to a red message.
 * - `hasFieldError`: something on the form itself is wrong. Only meaningful
 *   once the form has been sent, hence `isSubmitted`.
 * - `isPending`: a request is in flight. It wins over the two above, because a
 *   verdict from the previous attempt says nothing about the one now running.
 *
 * The rules, in order:
 *
 * 1. Pending - a submit is on its way. Nothing has been decided yet, so the fox
 *    has nothing to say, and any earlier verdict is stale.
 * 2. Success - the mutation resolved, or a success toast is on screen.
 * 3. Error - the server said no, an error toast is up, or a field failed
 *    validation.
 * 4. Neutral - a submit went through and nothing is wrong with it.
 * 5. Nothing - untouched, so the fox stays on its normal idle face.
 *
 * Only the *active* request may set a mood. A stale success from a previous
 * step (the sign-in form after registering, say) must not keep the fox happy on
 * a screen it knows nothing about, which is why the caller passes one mutation
 * rather than both - see `useAuthMascotMood`.
 *
 * The `isPending` rule is what stops the fox reacting to field errors the user
 * has already moved past: pressing submit again clears the errors for the
 * duration of the request, and a fox that flickered between faces mid-request
 * would be worse than one that waits.
 */
const resolveAuthMood = ({
    isSuccess = false,
    isError = false,
    toastType = null,
    hasFieldError = false,
    isSubmitted = false,
    isPending = false,
}) => {
    /* Re-checked on every submit, so this outranks a verdict being displayed. */
    if (isPending) return null;

    /* An INFO toast carries no verdict, so `TOAST_MOODS` maps it to null. */
    const toastMood = TOAST_MOODS[toastType] ?? null;

    if (isSuccess || toastMood === "success") return "success";
    if (isError || toastMood === "error") return "error";

    /*
      Gated here rather than by the caller. Field errors only mean something once
      the form has been sent: react-hook-form reports them from the first submit
      on, but it also produces them transiently while a field is being re-checked,
      and reacting to those would make the fox flicker as the user types.
    */
    if (isSubmitted && hasFieldError) return "error";

    if (isSubmitted) return "neutral";
    return null;
};

export { resolveAuthMood, fieldErrorToast };
