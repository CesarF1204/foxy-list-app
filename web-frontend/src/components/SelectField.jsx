import Icon from "./icons/Icon";

/**
 * DOCU: A labelled dropdown wired up the same way `FormField` wires an input, and
 * for the same reason: every select in the app then looks and behaves alike.
 *
 * The arrow is the point of this component. A bare `<select>` draws its own, and
 * that arrow is the one piece of UI chrome in the app no stylesheet can reach -
 * it is drawn by the operating system, so it was a different shape on Windows,
 * macOS and every mobile browser, and it ignored the app's ink-and-fox palette
 * entirely. So the native one is switched off with `appearance-none` and the
 * app's own ReIcon chevron is drawn in its place, which makes "closed dropdown"
 * mean the same thing on every platform.
 *
 * Two details that are easy to get wrong and are handled once, here:
 *
 *  - `pointer-events-none` on the chevron. It is purely a picture; without this
 *    it would swallow clicks at the right edge of the control, and a user
 *    clicking what looks like the arrow to open the menu would get nothing.
 *  - `pr-10` on the select. The `.field` padding is not enough once the native
 *    arrow is gone, so the longest option ("Any status") would otherwise run
 *    under the chevron.
 *
 * `appearance-none` is scoped to this component rather than added to the shared
 * `.field` class, because `.field` also styles every text input, where it would
 * achieve nothing.
 *
 * The chevron is a sibling of the select rather than inside it, so it is drawn
 * by the app and not by the browser - but that also means it cannot inherit the
 * select's `disabled` styling. `peer` links the two: the select is the peer, the
 * chevron reacts to `peer-disabled`, so a greyed-out control gets a greyed-out
 * arrow and the two never disagree about whether the field is usable.
 *
 * The role and status filters and the page-size picker are all built on this, so
 * the app has one select. `wrapperClassName` and `labelClassName` are what let
 * the same control sit in a stacked form row (a filter above a box) and in a
 * horizontal bar (a label beside a small picker) without either caller
 * re-implementing the arrow.
 *
 * @param {object} props
 * @param {string} props.id - the select's id, which its `<label>` points at
 * @param {string} props.label - the field's visible label
 * @param {string} [props.wrapperClassName] - classes for the label/select wrapper
 * @param {string} [props.labelClassName] - extra classes for the `<label>`
 * @param {string} [props.className] - extra classes for the `<select>` itself
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
                /* `peer` is what lets the chevron below react to this select's
                 * disabled state, since a sibling cannot inherit it.
                 *
                 * `font-bold` because the closed control shows one chosen option
                 * and nothing else, and that one line is the whole state of the
                 * field - it should read as an answer, not as placeholder text.
                 * `hover:border-fox-400` gives the menu the same "this responds
                 * to me" affordance every other control in the app has; the
                 * border-colour transition itself comes from `.field`. */
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
