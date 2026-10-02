/** A small pill for a required marker or a field's enum values. */
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
