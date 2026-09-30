/**
 * DOCU: One summary number on the overview. Built from the shared `.surface` card
 * and the board accent colours rather than a new visual language, and the accent
 * is a small bar plus a coloured dot beside the value, never the only cue: the
 * label and the value are both text, so the card reads without colour.
 * @param {object} props
 * @param {string} props.label - what the number counts
 * @param {number} props.value - the count
 * @param {string} props.accent - a tailwind background class for the bar
 * @param {string} props.hint - a short qualifier
 */
const StatCard = ({ label, value, accent, hint }) => (
    <div className="surface animate-rise flex flex-col gap-1 p-4">
        <div className={`h-1.5 w-10 rounded-full ${accent}`} aria-hidden="true" />
        <p className="mt-1 text-3xl leading-none font-extrabold text-ink">{value}</p>
        <p className="text-sm font-extrabold text-ink">{label}</p>
        {hint && <p className="text-xs font-semibold text-ink-faint">{hint}</p>}
    </div>
);

/** DOCU: The grey block shown while the totals are still loading, in the exact
 *  shape of the card it replaces so the page does not jump when the numbers
 *  arrive. Marked aria-hidden and paired with the loader's own status message. */
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