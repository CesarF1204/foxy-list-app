import Icon from "./Icon";

/**
 * A button whose entire content is one icon - the modal and drawer close buttons, the toast
 * dismiss, the pager arrows, a row's overflow trigger.
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
