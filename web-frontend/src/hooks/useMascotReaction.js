import { useEffect, useState } from "react";

import { MASCOT_HOLD_MS, MASCOT_MOODS } from "../helpers/mascotSheets";

/**
 * DOCU: Turns a form's mood into a mascot expression that plays and then clears. <br>
 * Returns the expression name to hand to `ControlledMascot`, or null to leave the
 * mascot on its normal cursor-tracking face.
 *
 * `mood` is "error" | "neutral" | "success" | null. Rather than showing a face
 * for as long as the mood lasts - which would leave the fox frozen in alarm on
 * every invalid keystroke - each change to a mood plays its expression once and
 * then reverts to the idle head.
 *
 * `token` re-plays the mood without changing it, so two failures or two
 * successes in a row both look alive; pass a value that changes on each attempt
 * (a submit counter, a mutation attempt id).
 *
 * Every face is timed by the same rule: play once, then hand the mascot back to
 * its idle head. Nothing pins a face for as long as the thing that caused it
 * lasts - a six-second error toast or an unfixed field error would otherwise
 * leave the fox stuck in alarm long after the user has read the message, and
 * the reaction stops being a reaction.
 */
const useMascotReaction = (mood, token = 0) => {
    /*
      The played reaction travels with the mood and token that caused it. Holding
      both lets the timer below know what it is clearing, and lets render spot a
      new mood without an effect having to set anything.
    */
    const [played, setPlayed] = useState({ mood: null, token, reaction: null, hold: 0 });

    /* Reduced motion users get the face, just held far more briefly. */
    const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /*
      Adjusting state during render, which React explicitly allows and re-runs
      immediately: a new mood replaces the face without a cascading render, and
      the timer effect below only ever has to clear an expired face.
    */
    if (mood !== played.mood || token !== played.token) {
        const next = MASCOT_MOODS[mood] ?? null;
        const hold = MASCOT_HOLD_MS[mood] ?? 0;
        const duration = prefersReducedMotion ? Math.min(hold, 600) : hold;

        setPlayed({
            mood,
            token,
            reaction: next,
            /* The effect below owns the clock; render only records the intent. */
            hold: next && duration ? duration : 0,
        });
    }

    /*
      The timer is the only thing this effect does, and the setState it triggers
      happens in a callback rather than during the effect body, so a cleared face
      never causes the cascading render the linter warns about.
    */
    useEffect(() => {
        if (!played.reaction || !played.hold) {
            return undefined;
        }

        const timer = window.setTimeout(
            () => setPlayed((current) => ({ ...current, reaction: null })),
            played.hold,
        );

        return () => window.clearTimeout(timer);
    }, [played]);

    return played.reaction;
};

export default useMascotReaction;
