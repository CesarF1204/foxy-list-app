/**
 * One summary number on the overview. Built from the shared `.surface` card and the board
 * accent colours rather than a new visual language, and the accent is a small bar plus a
 * coloured dot beside the value, never the only cue: the label and the value are both text, so
 * the card reads without colour.
 */
const StatCard = ({ label, value, accent, hint }) => (
    /**
     * `min-w-0` on the card: the grid track is `1fr`, which is `minmax(auto, 1fr)`,
     * so a track will not shrink below its content's minimum width. A five-digit
     * task count at 30px is wider than a 160px column on a phone, and without this
     * it pushed the whole grid wider than the viewport rather than wrapping or
     * truncating. `text-2xl` below `sm` and `tabular-nums` so the digits keep
     * their column as the count changes - a number that jitters in width between
     * refreshes reads as a different number.
     */
    <div className="surface animate-rise flex min-w-0 flex-col gap-1 p-4">
        <div className={`h-1.5 w-10 rounded-full ${accent}`} aria-hidden="true" />
        <p className="mt-1 text-2xl leading-none font-extrabold break-anywhere text-ink tabular-nums sm:text-3xl">
            {value}
        </p>
        <p className="text-sm font-extrabold break-words text-ink">{label}</p>
        {hint && (
            <p className="text-sm leading-snug font-semibold text-ink-faint sm:text-xs">{hint}</p>
        )}
    </div>
);

/**
 * The grey block shown while the totals are still loading, in the exact shape of the card it
 * replaces so the page does not jump when the numbers arrive. Marked aria-hidden and paired
 * with the loader's own status message.
 */
const StatCardSkeleton = () => (
    <div
        aria-hidden="true"
        className="surface flex flex-col gap-2 p-4"
    >
        <div className="h-1.5 w-10 rounded-full bg-paper-deep" />
        <div className="mt-1 h-7 w-12 rounded-lg bg-paper-deep" />
        <div className="h-3.5 w-24 rounded-lg bg-paper-deep" />
        <div className="h-3 w-16 rounded-lg bg-paper-deep" />
    </div>
);

export { StatCard, StatCardSkeleton };