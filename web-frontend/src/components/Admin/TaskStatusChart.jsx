import { BOARDS, BOARD_META, BOARD_LABELS } from "../../constants/boards";

/**
 * DOCU: How the tasks on every board are spread, drawn with plain divs rather
 * than a charting library. The app has no chart dependency and this needs three
 * numbers, so adding one would be the larger cost; a flex row of coloured
 * segments is the whole thing.
 *
 * Accessibility is handled in two layers. The bar itself is a single graphic
 * with a spoken summary, and underneath it sits a real list - one row per board
 * with the board's name, its count and its share - which is what a screen reader
 * reads and what a sighted user scans. Each board also keeps its own colour from
 * the shared board tokens, so the chart matches the task board it summarises.
 *
 * @param {object} props
 * @param {{todo: number, ongoing: number, done: number}} props.counts
 */
const TaskStatusChart = ({ counts }) => {
    const total = BOARDS.reduce((sum, board) => sum + (counts?.[board] ?? 0), 0);
    const percent = (value) => (total === 0 ? 0 : Math.round((value / total) * 100));

    if (total === 0) {
        return (
            <p className="rounded-2xl border-2 border-dashed border-ink-faint/60 bg-paper/60 px-4 py-6 text-center text-sm font-bold text-ink-soft">
                No tasks yet. The split appears here once the first one is created.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* The bar: one flex row of segments, so no absolute widths to fight. */}
            <div
                className="flex h-8 w-full overflow-hidden rounded-full border-2 border-ink"
                role="img"
                aria-label={`Task distribution: ${BOARDS.map(
                    (board) => `${counts[board]} ${BOARD_LABELS[board]}`
                ).join(", ")} of ${total} tasks`}
            >
                {BOARDS.map((board) => (
                    <div
                        key={board}
                        className={`${BOARD_META[board].accent} h-full border-r-2 border-ink last:border-r-0`}
                        style={{ width: `${percent(counts[board])}%` }}
                    />
                ))}
            </div>

            {/* The same numbers as a list, so nothing is encoded by colour alone. */}
            <ul className="flex flex-col gap-2">
                {BOARDS.map((board) => (
                    <li
                        key={board}
                        className="flex items-center gap-2.5 text-sm font-bold text-ink"
                    >
                        <span
                            className={`h-3 w-3 shrink-0 rounded-full ${BOARD_META[board].accent}`}
                            aria-hidden="true"
                        />
                        <span>{BOARD_LABELS[board]}</span>
                        <span className="ml-auto font-extrabold tabular-nums">
                            {counts[board]}
                        </span>
                        <span className="w-12 text-right text-xs font-semibold text-ink-faint tabular-nums">
                            {percent(counts[board])}%
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TaskStatusChart;