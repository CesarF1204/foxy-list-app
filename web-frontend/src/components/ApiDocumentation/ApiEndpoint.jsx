import { useId, useState } from "react";
import MethodBadge from "./MethodBadge";
import EndpointDetail from "./EndpointDetail";
import Chip from "./Chip";

/** One documented endpoint, collapsed to a row and expandable to its full detail.
 *
 * Given `isOpen` and `onToggle` the row is controlled; given neither, it keeps its own state.
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
                    className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 py-3 text-left transition hover:bg-fox-50 sm:min-h-0 sm:gap-3 sm:px-4"
                >
                    <MethodBadge method={method} />

                    <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm font-bold break-anywhere text-ink">
                            {path}
                        </span>
                        {summary && (
                            <span className="mt-0.5 block text-sm leading-snug font-semibold text-ink-soft sm:text-xs">
                                {summary}
                            </span>
                        )}
                    </span>

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
