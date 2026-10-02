/** One summary number on the overview. */
const StatCard = ({ label, value, accent, hint }) => (
    <div className="surface animate-rise flex min-w-0 flex-col gap-1 p-4">
        <div className={`h-1.5 w-10 rounded-full ${accent}`} aria-hidden="true" />
        <p className="mt-1 text-2xl leading-none font-extrabold break-anywhere text-ink tabular-nums sm:text-3xl">
            {value}
        </p>
        <p className="text-sm font-extrabold wrap-break-word text-ink">{label}</p>
        {hint && (
            <p className="text-sm leading-snug font-semibold text-ink-faint sm:text-xs">{hint}</p>
        )}
    </div>
);

/** Placeholder in the shape of the card it replaces. */
const StatCardSkeleton = () => (
    <div aria-hidden="true" className="surface flex flex-col gap-2 p-4">
        <div className="h-1.5 w-10 rounded-full bg-paper-deep" />
        <div className="mt-1 h-7 w-12 rounded-lg bg-paper-deep" />
        <div className="h-3.5 w-24 rounded-lg bg-paper-deep" />
        <div className="h-3 w-16 rounded-lg bg-paper-deep" />
    </div>
);

export { StatCard, StatCardSkeleton };