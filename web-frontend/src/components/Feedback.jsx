/** The app's one spinner, in three sizes. */
const SPINNER_SIZES = {
    xs: "h-4 w-4 border-2",
    sm: "h-5 w-5 border-2",
    lg: "h-10 w-10 border-4",
};

const Spinner = ({ size = "sm" }) => (
    <span
        aria-hidden="true"
        className={`loading-ring inline-block shrink-0 animate-spin rounded-full border-fox-200 border-t-fox-500 ${SPINNER_SIZES[size]}`}
    />
);

/** A centred loader shown while a whole page loads. */
const FullScreenLoader = ({ label = "Loading..." }) => (
    <div
        className="flex flex-1 flex-col items-center justify-center gap-4"
        role="status"
        aria-live="polite"
    >
        <Spinner size="lg" />
        <p className="text-sm font-bold text-ink-soft">{label}</p>
    </div>
);

/** An inline loader for a section that is still loading. */
const InlineLoader = ({ label = "Loading..." }) => (
    <div className="flex items-center justify-center gap-2.5 py-8 text-sm font-bold text-ink-soft" role="status">
        <Spinner />
        {label}
    </div>
);

/**
 * A loader for a region that is *refreshing*, laid over the region rather than in place of it.
 */
const RefreshOverlay = ({ label = "Updating..." }) => (
    <div
        className="pointer-events-none absolute inset-0 z-page flex items-center justify-center gap-2.5 bg-paper/70"
        role="status"
        aria-live="polite"
    >
        <Spinner />
        <span className="text-sm font-bold text-ink-soft">{label}</span>
    </div>
);

/** Placeholder shown when a board or list has no items. */
const EmptyState = ({ title, description, action }) => (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-faint/60 bg-paper/60 px-4 py-8 text-center">
        <p className="text-sm font-extrabold text-ink">{title}</p>
        {description && (
            <p className="max-w-sm text-sm leading-relaxed font-semibold text-ink-soft sm:text-xs">
                {description}
            </p>
        )}
        {action}
    </div>
);

/** An error panel with an optional retry button. */
const ErrorState = ({ title = "Something went wrong", message, onRetry }) => (
    <div
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-6 text-center"
        role="alert"
    >
        <p className="text-sm font-extrabold text-red-800">{title}</p>
        {message && (
            <p className="max-w-sm text-sm leading-relaxed font-semibold break-anywhere text-red-600 sm:text-xs">
                {message}
            </p>
        )}
        {onRetry && (
            <button
                type="button"
                onClick={onRetry}
                className="btn btn-neutral py-2! text-sm! sm:py-1.5! sm:text-xs!"
            >
                Try again
            </button>
        )}
    </div>
);

export { FullScreenLoader, InlineLoader, RefreshOverlay, Spinner, EmptyState, ErrorState };