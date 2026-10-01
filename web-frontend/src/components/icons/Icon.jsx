import { DEFAULT_ICON_SIZE, DEFAULT_ICON_STROKE_WIDTH, ICONS } from "../../constants/icons";

/**
 * DOCU: The app's only way to draw an icon.
 *
 * ReIcon supplies the artwork; this component supplies everything the app
 * needs on top of it, so no screen has to repeat any of it:
 *
 *  - the name is looked up in `ICONS`, which is what makes "edit" the same icon
 *    everywhere. A page asks for a meaning, never for a ReIcon component;
 *  - the size, stroke and fill colour decisions live here once, rather than
 *    being re-guessed at each call site;
 *  - `shrink-0`, because an icon is a fixed-size mark and must not be squeezed
 *    by a flex sibling the way a run of text would be.
 *
 * Accessibility is the other half. By default an icon is decoration: it is
 * hidden from assistive technology and removed from the tab order, because the
 * label belongs on the control around it. An icon is only the *whole* of a
 * control's content in the rare case it is passed a `label` - the drawer and
 * modal close buttons, the password eye, the pager arrows - and then it is
 * named and exposed as an image instead. Either way the button it sits in is
 * a real `<button>`, so it stays keyboard- and screen-reader-operable.
 *
 * @param {object} props
 * @param {string} props.name - a key of `ICONS`, e.g. "edit" or "close"
 * @param {number|string} [props.size] - width and height, in px
 * @param {string} [props.label] - accessible name, when the icon stands alone
 * @param {string} [props.className] - extra classes, e.g. a colour or rotation
 */
const Icon = ({
    name,
    size = DEFAULT_ICON_SIZE,
    weight,
    strokeWidth = DEFAULT_ICON_STROKE_WIDTH,
    className = "",
    label,
    ...rest
}) => {
    const entry = ICONS[name];

    /* A typo in an icon name should be loud in development and invisible in
     * production, rather than an exception that takes a screen down with it. */
    if (!entry) {
        if (import.meta.env?.DEV) {
            console.error(`<Icon />: "${name}" is not in ICONS.`);
        }
        return null;
    }

    const { Component, weight: defaultWeight, className: entryClassName } = entry;

    return (
        <Component
            size={size}
            weight={weight ?? defaultWeight}
            strokeWidth={strokeWidth}
            className={`shrink-0 ${entryClassName ?? ""} ${className}`.trim().replace(/\s+/g, " ")}
            /* Named only when it is the control's whole content. */
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : "true"}
            /* Belt and braces: an SVG is focusable in older engines, and none of
             * these is interactive on its own. */
            focusable="false"
            {...rest}
        />
    );
};

export default Icon;
