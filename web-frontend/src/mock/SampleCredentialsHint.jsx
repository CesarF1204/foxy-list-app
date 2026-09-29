import { SAMPLE_CREDENTIALS } from "../mock";

/**
 * TEMPORARY - MOCK LAYER ONLY.
 *
 * DOCU: A hint on the sign-in page showing the sample account, plus a button
 * that fills the form in for you. <br>
 * It renders only while MOCK_MODE is on and disappears with the rest of the
 * mock layer, so the real sign-in page is left exactly as it was.
 * @param {object} props
 * @param {Function} props.onFill - called with { email, password }
 */
const SampleCredentialsHint = ({ onFill }) => (
    <div className="rounded-2xl border-2 border-dashed border-fox-400 bg-fox-50 px-3 py-2.5">
        <p className="text-[0.65rem] font-extrabold tracking-wider text-fox-700 uppercase">
            Mock mode - sample account
        </p>
        <p className="mt-1 font-mono text-xs font-bold break-anywhere text-ink">
            {SAMPLE_CREDENTIALS.email} / {SAMPLE_CREDENTIALS.password}
        </p>
        <button
            type="button"
            onClick={() =>
                onFill({
                    email: SAMPLE_CREDENTIALS.email,
                    password: SAMPLE_CREDENTIALS.password,
                })
            }
            className="mt-1.5 text-xs font-extrabold text-fox-700 underline decoration-2 underline-offset-2 transition hover:text-fox-800"
        >
            Fill these in for me
        </button>
    </div>
);

export default SampleCredentialsHint;
