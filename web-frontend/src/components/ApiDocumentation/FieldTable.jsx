import Chip from "./Chip";

/**
 * One table of named fields: the parameters of an endpoint, or the body it accepts.
 *
 * One component for both, because they are the same shape - a name, a type, whether it must
 * be sent, and a sentence about it - and a reader comparing a body against its own
 * parameters should not have to learn two layouts to do it. The `location` column is what
 * tells the two apart, and it is omitted entirely when there is only one kind in play.
 *
 * @param {object} props
 * @param {object[]} props.fields - The rows, already flattened by the helpers
 * @param {boolean} [props.showLocation] - Whether to show where each field goes
 * @returns {JSX.Element|null} The table, or null when there are no fields
 */
const FieldTable = ({ fields, showLocation = false }) => {
    if (!fields?.length) return null;

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                <thead>
                    <tr className="border-b-2 border-paper-deep text-xs font-extrabold tracking-wide text-ink-faint uppercase">
                        {showLocation && (
                            <th scope="col" className="py-2 pr-3">
                                Where
                            </th>
                        )}
                        <th scope="col" className="py-2 pr-3">
                            Field
                        </th>
                        <th scope="col" className="py-2 pr-3">
                            Type
                        </th>
                        <th scope="col" className="py-2">
                            Notes
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {fields.map((field) => (
                        <tr key={`${field.in ?? "body"}-${field.name}`} className="align-top">
                            {showLocation && (
                                <td className="py-2.5 pr-3">
                                    <Chip>{field.in}</Chip>
                                </td>
                            )}
                            <td className="py-2.5 pr-3 font-bold break-anywhere text-ink">
                                {field.name}
                                {field.required && (
                                    <span className="ml-1.5 align-middle" title="Required">
                                        <Chip tone="required">required</Chip>
                                    </span>
                                )}
                            </td>
                            <td className="py-2.5 pr-3 font-mono text-xs break-anywhere text-ink-soft">
                                {field.type}
                            </td>
                            <td className="py-2.5 text-xs leading-relaxed font-semibold text-ink-soft">
                                {field.isId ? (
                                    <span className="block">
                                        The record&apos;s id, a 24 character ObjectId.
                                    </span>
                                ) : (
                                    field.description
                                )}
                                {field.enum?.length > 0 && (
                                    <span className="mt-1.5 flex flex-wrap gap-1">
                                        {field.enum.map((value) => (
                                            <Chip key={value} tone="accent">
                                                {value}
                                            </Chip>
                                        ))}
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default FieldTable;
