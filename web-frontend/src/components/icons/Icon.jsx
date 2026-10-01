import { DEFAULT_ICON_SIZE, DEFAULT_ICON_STROKE_WIDTH, ICONS } from "../../constants/icons";

/** The app's only way to draw an icon. */
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

    /**
     * A typo in an icon name should be loud in development and invisible in production, rather
     * than an exception that takes a screen down with it.
     */
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
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : "true"}
            focusable="false"
            {...rest}
        />
    );
};

export default Icon;
