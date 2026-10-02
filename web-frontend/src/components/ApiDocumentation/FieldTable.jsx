import Chip from "./Chip";
import useMediaQuery from "../../hooks/useMediaQuery";

/** Width at which four columns fit in the detail panel. Same value as Tailwind's `sm:`. */
const WIDE_TABLE = "(min-width: 40rem)";

/** A field's description and its enum values, shared by both layouts. */
const FieldNotes = ({ field }) => (
    <div>
        <p className="text-sm leading-relaxed font-semibold break-anywhere text-ink-soft">
            {field.isId ? "The record's id, a 24 character ObjectId." : field.description}
        </p>

        {field.enum?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
                {field.enum.map((value) => (
                    <Chip key={value} tone="accent">
                        {value}
                    </Chip>
                ))}
            </div>
        )}
    </div>
);

/**
 * One table of named fields: an endpoint's parameters, or the body it accepts.
 *
 * Below `sm` this is a stacked list; from `sm` up it is a table. `useMediaQuery` picks between
 * them rather than a `hidden sm:block` / `sm:hidden` pair, which would leave both in the document.
 *
 * @param {object} props
 * @param {object[]} props.fields - The rows, already flattened by the helpers
 * @param {boolean} [props.showLocation] - Whether to show where each field goes
 * @returns {JSX.Element|null} The fields, or null when there are none
 */
const FieldTable = ({ fields, showLocation = false }) => {
    const isWide = useMediaQuery(WIDE_TABLE);

    if (!fields?.length) return null;

    if (!isWide) {
        // Too narrow for four columns, so render each field as its own block.
        return (
            <dl className="flex flex-col gap-2">
                {fields.map((field) => (
                    <div
                        key={`${field.in ?? "body"}-${field.name}`}
                        className="rounded-xl border-2 border-paper-deep bg-paper/50 p-3"
                    >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <dt className="font-mono text-sm font-bold break-anywhere text-ink">
                                {field.name}
                            </dt>
                            {field.required && <Chip tone="required">required</Chip>}
                            {showLocation && <Chip>{field.in}</Chip>}
                        </div>

                        <p className="mt-1 font-mono text-xs break-anywhere text-ink-soft">
                            {field.type}
                        </p>

                        <dd className="mt-1.5">
                            <FieldNotes field={field} />
                        </dd>
                    </div>
                ))}
            </dl>
        );
    }

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
                                    <FieldNotes field={field} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
    </div>
    );
};

export default FieldTable;
