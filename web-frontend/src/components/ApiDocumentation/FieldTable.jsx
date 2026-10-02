import Chip from "./Chip";
import useMediaQuery from "../../hooks/useMediaQuery";

/**
 * The width at which four columns fit inside an endpoint detail panel.
 *
 * 40rem, the same value as Tailwind's `sm:`. Named once so the breakpoint is a
 * single fact rather than a number repeated between a query string and a class
 * list that could drift apart.
 */
const WIDE_TABLE = "(min-width: 40rem)";

/**
 * The field's notes: its description and its enum values, and nothing else. Split
 * out so the table and the stacked mobile list below render the same block - a
 * field's prose must not be able to diverge between the two layouts.
 *
 * `break-anywhere` because a description is prose the backend supplies, and one
 * containing a long token or a URL has to wrap rather than widen its column.
 */
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
 * One table of named fields: the parameters of an endpoint, or the body it accepts.
 *
 * One component for both, because they are the same shape - a name, a type, whether it must
 * be sent, and a sentence about it - and a reader comparing a body against its own
 * parameters should not have to learn two layouts to do it. The `location` column is what
 * tells the two apart, and it is omitted entirely when there is only one kind in play.
 *
 * ## Why there are two layouts
 *
 * Below `sm` the table is replaced by a stacked list. Four columns - five with
 * `showLocation` - inside a card that is itself inside the page's own padding leave
 * roughly 300px on a 360px phone. The `overflow-x-auto` wrapper kept the content
 * reachable, but only by scrolling sideways: the field name, the thing the reader
 * came for, sat off the left of a table whose type and notes columns were further
 * right still. A table that scrolls sideways inside a page that scrolls vertically is
 * the worst of both - neither gesture is obvious from where the thumb is resting.
 *
 * The stacked list gives every field its own block instead, so the name, the type and
 * the sentence about it are all reached by one downward scroll. The table is kept for
 * `sm` up rather than abandoned: past 640px it has the room to be the more compact of the
 * two, and it is what makes a request body readable as a body.
 *
 * `useMediaQuery` picks between them rather than a `hidden sm:block` / `sm:hidden` pair.
 * That pair would leave both in the document, and this panel is documentation: a reader
 * searching the page for a field name would find every one of them twice, and a screen
 * reader would announce each field and its notes twice over.
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
        /** `<dl>` rather than a list of divs so the name, the type and the notes
         *  are announced as the related triple they are, in the order read. */
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
        /** `overflow-x-auto` is still the right safety net for the narrow end of
         *  this range and for a long row of enum values: it scrolls only when it
         *  truly has to. */
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
