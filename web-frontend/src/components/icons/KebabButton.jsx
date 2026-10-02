import IconButton from "./IconButton";

/** A row's overflow menu trigger. The shape is the same circle everywhere. */
const KEBAB_BUTTON_CLASS =
    "inline-flex h-11 w-11 cursor-pointer shrink-0 items-center justify-center " +
    "rounded-full border-2 border-ink/15 bg-white text-ink-faint " +
    "transition-colors duration-150 " +
    "hover:border-ink hover:bg-white hover:text-ink " +
    "active:border-ink active:bg-fox-100 active:text-ink " +
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink/15 disabled:hover:bg-white " +
    "sm:h-9 sm:w-9";

/** A row's overflow menu trigger - the three-dot kebab. */
const KebabButton = ({ label, size = 16, className = "", ...buttonProps }) => (
    <IconButton
        icon="rowActions"
        label={label}
        size={size}
        className={`${KEBAB_BUTTON_CLASS} ${className}`.trim()}
        {...buttonProps}
    />
);

export default KebabButton;