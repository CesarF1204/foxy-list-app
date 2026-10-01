/**
 * The small labelled pill used for a required marker and for a field's enum values.
 *
 * Deliberately the app's `.surface`-free, quieter cousin: a details panel is dense, and a
 * full bordered card per field would make it unreadable. So this is a soft fill with no
 * border, which keeps the eye on the text.
 */
const Chip = ({ children, tone = "neutral" }) => {
    const tones = {
        neutral: "bg-paper-deep text-ink-soft",
        accent: "bg-fox-100 text-fox-800",
        required: "bg-fox-200 text-fox-900",
    };

    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${tones[tone] ?? tones.neutral}`}
        >
            {children}
        </span>
    );
};

export default Chip;
