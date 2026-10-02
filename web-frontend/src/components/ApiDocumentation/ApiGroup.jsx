import ApiEndpoint from "./ApiEndpoint";
import { endpointKey } from "../../helpers/openapiHelper";

/**
 * One resource group: its heading, its description, and the endpoints under it.
 *
 * `openKey` and `onToggle` pass straight through to the rows: the group decides nothing about
 * which row is open.
 *
 * @param {object} props
 * @param {object} props.group - One entry from `groupOperationsByTag`
 * @param {string} [props.openKey] - The endpoint that is open, across the whole viewer
 * @param {Function} [props.onToggle] - Called with an endpoint's key to toggle it open or closed
 * @returns {JSX.Element} The group and its endpoints
 */
const ApiGroup = ({ group, openKey, onToggle }) => (
    <section className="flex flex-col gap-3">
        <div>
            <h2 className="text-lg font-extrabold text-ink">{group.name}</h2>
            {group.description && (
                <p className="mt-0.5 text-sm font-semibold text-ink-soft">{group.description}</p>
            )}
        </div>

        <ul className="flex flex-col gap-2.5">
            {group.endpoints.map((endpoint) => (
                <ApiEndpoint
                    key={endpointKey(endpoint)}
                    endpoint={endpoint}
                    isOpen={openKey === endpointKey(endpoint)}
                    onToggle={onToggle ? () => onToggle(endpointKey(endpoint)) : undefined}
                />
            ))}
        </ul>
    </section>
);

export default ApiGroup;
