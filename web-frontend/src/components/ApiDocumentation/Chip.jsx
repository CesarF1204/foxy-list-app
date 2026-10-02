/**
 * The small labelled pill used for a required marker and for a field's enum values.
 *
 * Deliberately the app's `.surface`-free, quieter cousin: a details panel is dense, and a
 * full bordered card per field would make it unreadable. So this is a soft fill with no
 * border, which keeps the eye on the text.
 *
 * `text-xs` (12px) rather than the `text-[0.7rem]` (11.2px) this used to be. A chip
 * carries a value the reader may need to type exactly - `ongoing`, `required` - so it is
 * text to read rather than a coloured dot to notice, and 11.2px is below the floor at
 * which that is reliably legible on a phone. The padding is `py-1` on touch for the same
 * reason: the pill's height follows its line box, and a one-line chip at 12px with 2px of
 * vertical padding is a 20px object.
 */
const Chip = ({ children, tone = "neutral" }) => {
    const tones = {
        neutral: "bg-paper-deep text-ink-soft",
        accent: "bg-fox-100 text-fox-800",
        required: "bg-fox-200 text-fox-900",
    };

    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold sm:py-0.5 ${tones[tone] ?? tones.neutral}`}
        >
            {children}
        </span>
    );
};

export default Chip;
