import { useEffect, useRef, useState } from "react";

/** DOCU: The nine head directions on the directions sheet, in reading order. */
const DIRECTIONS = [
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

/**
 * DOCU: The nine expressions on the reactions sheet, in reading order. <br>
 * Names match the `page-mascot` library's own list, so any name below is a
 * valid `reaction` value.
 */
const REACTIONS = [
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

/* Clockwise from the right, matching atan2 with y pointing down. */
const CLOCKWISE = [
    "right",
    "down-right",
    "down",
    "down-left",
    "left",
    "up-left",
    "up",
    "up-right",
];

const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const HYSTERESIS = 0.12;
/** Close in, the head settles to centre instead of jittering with the cursor. */
const DEAD_ZONE = 70;
const PAYOFFS = ["heart", "sparkle", "delighted"];
const BOOP_PAYOFF = 120;
const BOOP_END = 560;
const SQUASH_MS = 420;
const DIZZY_AFTER = 4;
const DIZZY_WINDOW = 1600;
const DIZZY_END = 1100;
const SQUASH = [
    { transform: "scale(1, 1)", easing: "ease-in" },
    { transform: "scale(1.1, 0.86)", offset: 0.18, easing: "ease-out" },
    { transform: "scale(0.95, 1.08)", offset: 0.45, easing: "ease-in-out" },
    { transform: "scale(1.03, 0.97)", offset: 0.72, easing: "ease-in-out" },
    { transform: "scale(1, 1)" },
];

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
 * DOCU: The `page-mascot` fox, extended so a parent can pin its expression. <br>
 * The library only changes faces when you click the mascot, which is no use on a
 * form that has to say "that field is wrong" or "you are in". This component
 * renders the very same two sprite sheets with the same cursor tracking and
 * click squash, and adds one prop:
 *
 * - `reaction`: an expression name (`surprised`, `delighted`, ...) to hold on
 *   screen, or null/omitted for the default behaviour. While pinned it takes
 *   precedence over the click faces, and the head resumes tracking when it
 *   clears.
 *
 * State-driven screens should use this; the library's `Mascot` is still right
 * for static pages such as the 404 screen.
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
        /* Touch and keyboard users get no cursor tracking, same as the library. */
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

            if (Math.hypot(dx, dy) < DEAD_ZONE) {
                sector = -1;
                setDirection("center");
                return;
            }

            /* Hold the current sector until the pointer is well past its edge. */
            const angle = Math.atan2(dy, dx);
            if (sector !== -1 && Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) {
                return;
            }

            sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
            setDirection(CLOCKWISE[sector]);
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
        boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1;
        boops.at = now;

        if (boops.count >= DIZZY_AFTER) {
            boops.count = 0;
            setReaction("dizzy");
            later(DIZZY_END, null);
        } else {
            setReaction("blink");
            later(BOOP_PAYOFF, PAYOFFS[(boops.count - 1) % PAYOFFS.length]);
            later(BOOP_END, null);
        }

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        /*
          Per-keyframe easing with the effect itself linear: an easing on the
          effect would reinterpret every offset and front-load the bounce.
        */
        squashRef.current?.animate(SQUASH, { duration: SQUASH_MS, easing: "linear" });
    };

    /*
      A pinned reaction always wins. An unrecognised name falls back to the
      default behaviour rather than leaving a blank cell on screen.
    */
    const pinned = REACTIONS.includes(pinnedReaction) ? pinnedReaction : null;
    const shown = pinned ?? reaction;
    const showing = Boolean(shown);
    const reactionIndex = Math.max(REACTIONS.indexOf(shown ?? ""), 0);

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
                        ...cell(DIRECTIONS.indexOf(direction)),
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
