import IconButton from "./IconButton";

/**
 * DOCU: The circular styling of a row's overflow trigger, declared once here so
 * every kebab in the app is the same circle. Tailwind's `rounded-full` on a
 * square element is what makes it a true circle rather than a rounded square,
 * and it stays in the class list in every state - the ring, the fill and the
 * icon colour change, the shape never does.
 *
 * The states, and why each one is what it is:
 *
 *  - Default: the ring is *always* drawn, faintly (`ink/15`). A trigger that
 *    only appears under the pointer is invisible on a touch screen, where there
 *    is no hover to reveal it, so the circle has to be part of the resting
 *    design rather than an affordance the mouse grants.
 *  - Hover: the ring goes to full ink and the icon to full ink over a white
 *    fill, so the control lifts off the row without gaining a shadow. A lift
 *    would compete with the row's own hover tint underneath it.
 *  - Active: fox-100, the app's pressed-surface colour, so a click reads as
 *    held down and not merely hovered.
 *  - Focus: nothing extra here. The global `:focus-visible` outline in
 *    `index.css` is a real outline, and a modern engine draws it following the
 *    element's `border-radius` - so the focus ring is itself a circle, and
 *    adding a square shadow ring here would undo that.
 *  - Disabled: the resting colours are restored so a disabled kebab does not
 *    keep the hover ring it can no longer earn.
 *
 * `h-9 w-9` (36px) rather than the 32px a denser table might get away with: on
 * touch the row action is the only way into the menu, and a 36px target is the
 * smallest that is reliably hittable with a thumb. `transition-colors` alone,
 * no transform or animation - the response should be immediate and unshowy.
 */
const KEBAB_BUTTON_CLASS =
    "inline-flex h-9 w-9 cursor-pointer shrink-0 items-center justify-center " +
    "rounded-full border-2 border-ink/15 bg-white text-ink-faint " +
    "transition-colors duration-150 " +
    "hover:border-ink hover:bg-white hover:text-ink " +
    "active:border-ink active:bg-fox-100 active:text-ink " +
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink/15 disabled:hover:bg-white";

/**
 * DOCU: A row's overflow menu trigger - the three-dot kebab.
 *
 * This is the app's only overflow trigger, so it is a component rather than a
 * block of classes repeated per table: the mark, the circle and every state
 * live here, and a table that needs one in a year only has to render this.
 * The accessible name is required (see `IconButton`), and a menu must pass
 * `aria-haspopup="menu"` and `aria-expanded`, so the button announces that it
 * opens a menu and whether that menu is currently open.
 *
 * The icon itself comes from the shared `rowActions` entry in `ICONS`, which
 * is ReIcon's `More` turned a quarter turn - no hand-drawn SVG and no Unicode
 * glyph, the same mark in every table that grows one.
 *
 * @param {object} props
 * @param {string} props.label - what the menu holds, e.g. "Actions for Ada Lovelace"
 * @param {number|string} [props.size] - the icon's size, in px
 * @param {string} [props.className] - extra classes for the button
 */
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