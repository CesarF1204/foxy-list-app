import Icon from "./icons/Icon";

/**
 * A labelled dropdown wired up the same way `FormField` wires an input, and for the same
 * reason: every select in the app then looks and behaves alike.
 */
const SelectField = ({
    id,
    label,
    wrapperClassName = "flex flex-col gap-1.5",
    labelClassName = "",
    className = "",
    children,
    ...selectProps
}) => (
    <div className={wrapperClassName}>
        <label
            htmlFor={id}
            className={`text-xs font-extrabold tracking-wide text-ink-soft uppercase ${labelClassName}`}
        >
            {label}
        </label>

        {/* `relative` so the chevron can be positioned against the control. */}
        <div className="relative">
            <select
                id={id}
                /**
                 * `peer` is what lets the chevron below react to this select's disabled state,
                 * since a sibling cannot inherit it.
                 */
                className={`field peer appearance-none pr-10 font-bold hover:border-fox-400 ${className}`}
                {...selectProps}
            >
                {children}
            </select>

            {/* Decoration, not a control: the chevron is hidden from assistive
                tech because the select is already named by its label, and it
                takes no pointer events, so the whole box stays clickable. */}
            <Icon
                name="chevronDown"
                size={18}
                className="pointer-events-none absolute right-3 bottom-1/2 translate-y-1/2 text-ink-faint peer-disabled:opacity-40"
            />
        </div>
    </div>
);

export default SelectField;
