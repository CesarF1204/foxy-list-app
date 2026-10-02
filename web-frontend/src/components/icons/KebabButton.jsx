import IconButton from "./IconButton";

/**
 * The circular styling of a row's overflow trigger, declared once here so every kebab in the
 * app is the same circle. Tailwind's `rounded-full` on a square element is what makes it a true
 * circle rather than a rounded square, and it stays in the class list in every state - the
 * ring, the fill and the icon colour change, the shape never does.
 *
 * `h-11 w-11` (44px) below `sm`, `h-9 w-9` from `sm` up. This is the *only* way to reach a row's
 * three actions, so a 36px circle in the last column of a phone-width card is a target the user
 * has to aim at rather than press. It is the one control on the row that has to work without a
 * pointer, and widening the card view to `sm` is what makes the larger circle affordable there.
 */
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