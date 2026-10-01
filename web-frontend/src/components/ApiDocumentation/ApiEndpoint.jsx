import { useId, useState } from "react";
import MethodBadge from "./MethodBadge";
import EndpointDetail from "./EndpointDetail";
import Chip from "./Chip";

/**
 * One documented endpoint, collapsed to a single row and expandable to its full detail.
 *
 * The collapsed row is the whole list on first paint: method, path and summary, so a reader
 * can scan every endpoint the API offers and open only the one they care about. Everything
 * else is behind a disclosure.
 *
 * The toggle is a `<button>` carrying `aria-expanded` and `aria-controls` rather than a
 * clickable heading, because a disclosure is what it is and that is the role assistive
 * technology needs in order to announce it as one.
 *
 * Open state has two owners. Given `isOpen` and `onToggle`, the row is controlled: the viewer
 * holds the single open row, so opening one endpoint closes whichever was open before it. Given
 * neither, the row keeps its own state and behaves as an ordinary self-contained disclosure -
 * which is what a screen taking this row on its own from the barrel expects.
 *
 * @param {object} props
 * @param {object} props.endpoint - One entry from `groupOperationsByTag`
 * @param {boolean} [props.isOpen] - Controlled open state, when a parent owns it
 * @param {Function} [props.onToggle] - Controlled toggle, when a parent owns the state
 * @returns {JSX.Element} The row, plus its detail panel when open
 */
const ApiEndpoint = ({ endpoint, isOpen: controlledIsOpen, onToggle }) => {
    const [ownIsOpen, setOwnIsOpen] = useState(false);
    const panelId = useId();

    /** Controlled when a parent passed a toggle, self-contained otherwise. */
    const isControlled = typeof onToggle === "function";
    const isOpen = isControlled ? Boolean(controlledIsOpen) : ownIsOpen;

    const toggle = () => {
        if (isControlled) {
            onToggle();
            return;
        }

        setOwnIsOpen((open) => !open);
    };

    const { method, path, summary, description, secured, parameters, requestBody, responses } =
        endpoint;

    /** Whether there is anything at all to reveal, so the toggle is never a dead control. */
    const hasDetail = Boolean(
        description || parameters?.length || requestBody || responses?.length || secured
    );

    return (
        <li className="overflow-hidden rounded-2xl border-2 border-ink bg-white">
            <h4>
                <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={isOpen}
                    aria-controls={hasDetail ? panelId : undefined}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-fox-50"
                >
                    <MethodBadge method={method} />

                    <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm font-bold break-anywhere text-ink">
                            {path}
                        </span>
                        {summary && (
                            <span className="mt-0.5 block text-xs font-semibold text-ink-soft">
                                {summary}
                            </span>
                        )}
                    </span>

                    {/*
                        Hidden on the narrowest screens rather than dropped: the panel says the
                        same thing, and a row that wraps on a phone is worse than a row that
                        defers the detail to the reader who opens it.
                    */}
                    {secured && (
                        <span className="hidden shrink-0 sm:block">
                            <Chip tone="accent">session</Chip>
                        </span>
                    )}

                    {hasDetail && (
                        <span
                            aria-hidden="true"
                            className={`shrink-0 text-lg leading-none text-ink-faint transition-transform ${isOpen ? "rotate-180" : ""}`}
                        >
                            ▾
                        </span>
                    )}
                </button>
            </h4>

            {isOpen && hasDetail && <EndpointDetail id={panelId} endpoint={endpoint} />}
        </li>
    );
};

export default ApiEndpoint;
