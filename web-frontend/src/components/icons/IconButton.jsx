import Icon from "./Icon";

/**
 * DOCU: A button whose entire content is one icon - the modal and drawer close
 * buttons, the toast dismiss, the pager arrows, a row's overflow trigger.
 *
 * These are the controls most likely to be shipped unlabelled, because there
 * is no visible text to imply what they do, and a screen reader then announces
 * them all as just "button". So the accessible name is a required prop here
 * rather than an optional one: it becomes both the `aria-label` and the
 * `title`, which gives a pointer user the same information on hover.
 *
 * The button is `type="button"` by default, so dropping one inside a form can
 * never submit it by accident - the same rule the password eye follows.
 *
 * Everything else is passed straight through, so callers keep the app's own
 * hover, focus and disabled styling rather than a second visual language.
 *
 * @param {object} props
 * @param {string} props.icon - a key of `ICONS`
 * @param {string} props.label - what the button does, e.g. "Close dialog"
 * @param {number|string} [props.size] - the icon's size
 * @param {string} [props.className] - classes for the button
 * @param {string} [props.iconClassName] - classes for the icon itself
 */
const IconButton = ({
    icon,
    label,
    size,
    weight,
    className = "",
    iconClassName = "",
    type = "button",
    ...buttonProps
}) => (
    <button type={type} aria-label={label} title={label} className={className} {...buttonProps}>
        <Icon name={icon} size={size} weight={weight} className={iconClassName} />
    </button>
);

export default IconButton;
