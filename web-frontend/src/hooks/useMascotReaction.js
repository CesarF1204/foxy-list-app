import { useEffect, useState } from "react";

import { MASCOT_HOLD_MS, MASCOT_MOODS } from "../constants/mascot";

/**
 * DOCU: Turns a form's mood into a mascot expression that plays once and then
 * clears, rather than freezing the fox in alarm for as long as the mood lasts.
 * Returns the expression name for `ControlledMascot`, or null for the idle head.
 *
 * `token` re-plays an unchanged mood, so two failures in a row both look alive;
 * pass something that changes per attempt (a submit counter).
 */
const useMascotReaction = (mood, token = 0) => {
    /** The played reaction travels with the mood and token that caused it, so
     *  the timer knows what it is clearing and render can spot a new mood. */
    const [played, setPlayed] = useState({ mood: null, token, reaction: null, hold: 0 });

    /** Reduced motion users get the face, just held far more briefly. */
    const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** Adjusting state during render, which React allows and re-runs immediately. */
    if (mood !== played.mood || token !== played.token) {
        const next = MASCOT_MOODS[mood] ?? null;
        const hold = MASCOT_HOLD_MS[mood] ?? 0;
        const duration = prefersReducedMotion ? Math.min(hold, 600) : hold;

        setPlayed({
            mood,
            token,
            reaction: next,
            /** The effect below owns the clock; render only records the intent. */
            hold: next && duration ? duration : 0,
        });
    }

    /** Only clears an expired face, in a callback not the effect body, so it
     *  never causes a cascading render. */
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
