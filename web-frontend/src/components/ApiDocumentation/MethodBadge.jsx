import { methodStyle } from "../../constants/apiDocs";

/** The HTTP method badge. The verb is spelled out in text, so colour is never the only cue. */
const MethodBadge = ({ method }) => (
    <span
        className={`inline-flex h-7 min-w-16 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-extrabold tracking-wide text-white sm:h-6 ${methodStyle(method)}`}
    >
        {method}
    </span>
);

export default MethodBadge;
