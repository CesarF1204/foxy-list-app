import { methodStyle } from "../../constants/apiDocs";

/**
 * The HTTP method badge.
 *
 * The colour is a fast way to scan a list of endpoints, but it is never the only cue: the
 * verb is spelled out in text inside the badge, which is what a screen reader announces and
 * what the page still communicates in a forced-colours mode where every background is
 * replaced.
 */
const MethodBadge = ({ method }) => (
    <span
        className={`inline-flex h-6 min-w-16 shrink-0 items-center justify-center rounded-lg px-2 text-[0.7rem] font-extrabold tracking-wide text-white ${methodStyle(method)}`}
    >
        {method}
    </span>
);

export default MethodBadge;
