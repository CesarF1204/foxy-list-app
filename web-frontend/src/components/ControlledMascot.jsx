import { useEffect, useRef, useState } from "react";

import {
    MASCOT_BOOP_END_MS,
    MASCOT_BOOP_PAYOFF_MS,
    MASCOT_CLOCKWISE,
    MASCOT_DEAD_ZONE,
    MASCOT_DIRECTIONS,
    MASCOT_DIZZY_AFTER,
    MASCOT_DIZZY_END_MS,
    MASCOT_DIZZY_WINDOW_MS,
    MASCOT_HYSTERESIS,
    MASCOT_PAYOFFS,
    MASCOT_REACTIONS,
    MASCOT_SECTOR,
    MASCOT_SQUASH,
    MASCOT_SQUASH_MS,
} from "../constants/mascot";

/* background-size 300% makes each cell a clean 0/50/100% step on both axes. */
const cell = (index) => ({
    backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`,
});

/** Wraps an angle into -PI..PI so sector comparisons never jump across the seam. */
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

const layer = {
    position: "absolute",
    inset: 0,
    backgroundSize: "300% 300%",
    backgroundRepeat: "no-repeat",
};

/**
 * DOCU: The `page-mascot` fox, extended so a parent can pin its expression. The
 * library only changes faces on click, which is no use on a form that has to say
 * "that field is wrong". Same sheets, cursor tracking and click squash, plus:
 *
 * - `reaction`: an expression name to hold on screen, or null for the default
 *   behaviour. Takes precedence over the click faces while pinned.
 *
 * Static pages such as the 404 should use the library's `Mascot` instead.
 */
const ControlledMascot = ({
    directions,
    reactions,
    size = 140,
    className,
    label = "mascot",
    reaction: pinnedReaction = null,
}) => {
    const buttonRef = useRef(null);
    const squashRef = useRef(null);
    const timersRef = useRef([]);
    const boopsRef = useRef({ count: 0, at: 0 });
    const [direction, setDirection] = useState("center");
    const [reaction, setReaction] = useState(null);

    useEffect(() => {
        /** Touch and keyboard users get no cursor tracking, same as the library. */
        if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            return;
        }

        let sector = -1;
        let pointer = null;

        const aim = () => {
            const button = buttonRef.current;
            if (!button || !pointer) {
                return;
            }

            const box = button.getBoundingClientRect();
            const dx = pointer.x - (box.left + box.width / 2);
            const dy = pointer.y - (box.top + box.height / 2);

            if (Math.hypot(dx, dy) < MASCOT_DEAD_ZONE) {
                sector = -1;
                setDirection("center");
                return;
            }

            /** Hold the current sector until the pointer is well past its edge. */
            const angle = Math.atan2(dy, dx);
            if (
                sector !== -1 &&
                Math.abs(wrap(angle - sector * MASCOT_SECTOR)) <
                    MASCOT_SECTOR / 2 + MASCOT_HYSTERESIS
            ) {
                return;
            }

            sector =
                (Math.round(angle / MASCOT_SECTOR) + MASCOT_CLOCKWISE.length) %
                MASCOT_CLOCKWISE.length;
            setDirection(MASCOT_CLOCKWISE[sector]);
        };

        const onPointerMove = (event) => {
            pointer = { x: event.clientX, y: event.clientY };
            aim();
        };

        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("scroll", aim, { passive: true });

        return () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("scroll", aim);
        };
    }, []);

    /* Timers outlive the boop that set them, so unmounting must cancel them. */
    useEffect(
        () => () => {
            timersRef.current.forEach(window.clearTimeout);
        },
        [],
    );

    /** The library's click payoff: blink, then a happy face, then back to normal. */
    const boop = () => {
        timersRef.current.forEach(window.clearTimeout);
        timersRef.current = [];

        const later = (ms, next) => {
            timersRef.current.push(window.setTimeout(() => setReaction(next), ms));
        };

        const now = Date.now();
        const boops = boopsRef.current;
        boops.count = now - boops.at < MASCOT_DIZZY_WINDOW_MS ? boops.count + 1 : 1;
        boops.at = now;

        if (boops.count >= MASCOT_DIZZY_AFTER) {
            boops.count = 0;
            setReaction("dizzy");
            later(MASCOT_DIZZY_END_MS, null);
        } else {
            setReaction("blink");
            later(
                MASCOT_BOOP_PAYOFF_MS,
                MASCOT_PAYOFFS[(boops.count - 1) % MASCOT_PAYOFFS.length]
            );
            later(MASCOT_BOOP_END_MS, null);
        }

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        /** Easing is per keyframe; easing the effect itself would reinterpret
         *  every offset and front-load the bounce. */
        squashRef.current?.animate(MASCOT_SQUASH, {
            duration: MASCOT_SQUASH_MS,
            easing: "linear",
        });
    };

    /** A pinned reaction always wins. An unrecognised name falls back to the
     *  default behaviour rather than leaving a blank cell on screen. */
    const pinned = MASCOT_REACTIONS.includes(pinnedReaction) ? pinnedReaction : null;
    const shown = pinned ?? reaction;
    const showing = Boolean(shown);
    const reactionIndex = Math.max(MASCOT_REACTIONS.indexOf(shown ?? ""), 0);

    /* Inline styles so the file drops into any project without a CSS framework. */
    return (
        <button
            ref={buttonRef}
            type="button"
            onClick={boop}
            aria-label={`Boop the ${label}`}
            className={className}
            style={{
                position: "relative",
                display: "block",
                flexShrink: 0,
                width: size,
                height: size,
                padding: 0,
                border: 0,
                background: "transparent",
                appearance: "none",
                cursor: "pointer",
                userSelect: "none",
            }}
        >
            <span
                ref={squashRef}
                style={{
                    position: "relative",
                    display: "block",
                    width: "100%",
                    height: "100%",
                    transformOrigin: "50% 78%",
                }}
            >
                {/* Directions underneath, hidden while a face is up. */}
                <span
                    style={{
                        ...layer,
                        backgroundImage: `url(${directions})`,
                        ...cell(MASCOT_DIRECTIONS.indexOf(direction)),
                        opacity: showing ? 0 : 1,
                    }}
                />
                {/* Expressions on top, transparent until one is chosen. */}
                <span
                    style={{
                        ...layer,
                        backgroundImage: `url(${reactions})`,
                        ...cell(reactionIndex),
                        opacity: showing ? 1 : 0,
                    }}
                />
            </span>
        </button>
    );
};

export default ControlledMascot;
