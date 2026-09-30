/* Shared loading, empty and error states used across the app. */

/** DOCU: A centred loader shown while a whole page loads. */
const FullScreenLoader = ({ label = "Loading..." }) => (
    <div
        className="flex flex-1 flex-col items-center justify-center gap-4"
        role="status"
        aria-live="polite"
    >
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-fox-200 border-t-fox-500" />
        <p className="text-sm font-bold text-ink-soft">{label}</p>
    </div>
);

/** DOCU: An inline loader for a section that is still loading. */
const InlineLoader = ({ label = "Loading..." }) => (
    <div className="flex items-center justify-center gap-2.5 py-8 text-sm font-bold text-ink-soft" role="status">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-fox-200 border-t-fox-500" />
        {label}
    </div>
);

/** DOCU: Placeholder shown when a board or list has no items. */
const EmptyState = ({ title, description, action }) => (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-faint/60 bg-paper/60 px-4 py-8 text-center">
        <p className="text-sm font-extrabold text-ink">{title}</p>
        {description && <p className="max-w-60 text-xs font-semibold text-ink-soft">{description}</p>}
        {action}
    </div>
);

/** DOCU: An error panel with an optional retry button. */
const ErrorState = ({ title = "Something went wrong", message, onRetry }) => (
    <div
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-6 text-center"
        role="alert"
    >
        <p className="text-sm font-extrabold text-red-800">{title}</p>
        {message && <p className="max-w-xs text-xs font-semibold text-red-600">{message}</p>}
        {onRetry && (
            <button type="button" onClick={onRetry} className="btn btn-neutral py-1.5! text-xs!">
                Try again
            </button>
        )}
    </div>
);

export { FullScreenLoader, InlineLoader, EmptyState, ErrorState };