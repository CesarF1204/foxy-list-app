import { methodStyle } from "../../constants/apiDocs";

/**
 * The HTTP method badge.
 *
 * The colour is a fast way to scan a list of endpoints, but it is never the only cue: the
 * verb is spelled out in text inside the badge, which is what a screen reader announces and
 * what the page still communicates in a forced-colours mode where every background is
 * replaced.
 *
 * `text-xs` rather than `text-[0.7rem]`, and `h-7` rather than `h-6`, for the same reason
 * as the chip beside it: the verb is the one word in the row that decides which of two
 * same-shaped rows the reader is looking at, so it is the last thing that should be set
 * below a readable size.
 */
const MethodBadge = ({ method }) => (
    <span
        className={`inline-flex h-7 min-w-16 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-extrabold tracking-wide text-white sm:h-6 ${methodStyle(method)}`}
    >
        {method}
    </span>
);

export default MethodBadge;
