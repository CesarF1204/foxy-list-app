import { statusStyle } from "../../constants/apiDocs";
import FieldTable from "./FieldTable";
import Chip from "./Chip";

/**
 * The expanded detail of one endpoint: what it requires, what it takes, what it returns.
 *
 * @param {object} props
 * @param {object} props.endpoint - One entry from `groupOperationsByTag`
 * @param {string} props.id - The id the row's `aria-controls` points at
 * @returns {JSX.Element} The panel
 */
const EndpointDetail = ({ endpoint, id }) => {
    const { description, secured, parameters, requestBody, responses } = endpoint;

    return (
        <div
            id={id}
            className="animate-rise space-y-5 border-t-2 border-paper-deep px-3 py-4 sm:px-4"
        >
            {description && (
                <p className="text-sm leading-relaxed font-semibold whitespace-pre-line break-anywhere text-ink-soft">
                    {description}
                </p>
            )}

            <section>
                <h5 className="mb-1.5 text-xs font-extrabold tracking-wide text-ink uppercase">
                    Authentication
                </h5>
                <p className="text-sm font-semibold text-ink-soft">
                    {secured
                        ? "Requires a signed-in session: the httpOnly `session` cookie set at sign-in."
                        : "Public. No session is needed."}
                </p>
            </section>

            {parameters?.length > 0 && (
                <section>
                    <h5 className="mb-1.5 text-xs font-extrabold tracking-wide text-ink uppercase">
                        Parameters
                    </h5>
                    <FieldTable fields={parameters} showLocation />
                </section>
            )}

            {requestBody && (
                <section>
                    <h5 className="mb-1.5 text-xs font-extrabold tracking-wide text-ink uppercase">
                        Request body{requestBody.required ? "" : " (optional)"}
                    </h5>
                    <FieldTable fields={requestBody.fields} />
                </section>
            )}

            {responses?.length > 0 && (
                <section>
                    <h5 className="mb-1.5 text-xs font-extrabold tracking-wide text-ink uppercase">
                        Responses
                    </h5>
                    <ul className="flex flex-col gap-1.5">
                        {responses.map((response) => (
                            <li
                                key={response.status}
                                className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-sm"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <span
                                        aria-hidden="true"
                                        className={`h-2.5 w-2.5 rounded-full ${statusStyle(response.status)}`}
                                    />
                                    <span className="font-mono text-xs font-extrabold text-ink">
                                        {response.status}
                                    </span>
                                </span>
                                <span className="font-semibold text-ink-soft">
                                    {response.description}
                                </span>
                                {response.schema && <Chip tone="accent">{response.schema}</Chip>}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
};

export default EndpointDetail;
