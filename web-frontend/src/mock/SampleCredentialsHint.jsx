import { SAMPLE_CREDENTIALS, SAMPLE_ADMIN_CREDENTIALS } from "../mock";

/**
 * TEMPORARY - MOCK LAYER ONLY.
 *
 * DOCU: One row per sample account on the sign-in page, each with a button that
 * fills the form in. The administrator is listed alongside the demo account
 * because it is seeded separately and there is otherwise no obvious way to find
 * it - a registered account can never be promoted to admin from the sign-in
 * screen.
 *
 * Both credentials are shown on screen. They are throwaway local mock values
 * read from `.env`, never real credentials, and the app ships no hardcoded ones.
 *
 * @param {Function} props.onFill - called with { email, password }
 */
const AccountRow = ({ label, email, password, onFill }) => (
    <div className="flex flex-col gap-1">
        <p className="text-[0.65rem] font-extrabold tracking-wider text-fox-700 uppercase">
            {label}
        </p>
        <p className="font-mono text-xs font-bold break-anywhere text-ink">
            {email} / {password}
        </p>
        <button
            type="button"
            onClick={() => onFill({ email, password })}
            className="self-start text-xs font-extrabold text-fox-700 underline decoration-2 underline-offset-2 transition hover:text-fox-800"
        >
            Fill this in
        </button>
    </div>
);

const SampleCredentialsHint = ({ onFill }) => (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-fox-400 bg-fox-50 px-3 py-2.5">
        <p className="text-[0.65rem] font-extrabold tracking-wider text-fox-700 uppercase">
            Mock mode - sample accounts
        </p>

        <AccountRow
            label="Sample admin"
            email={SAMPLE_ADMIN_CREDENTIALS.email}
            password={SAMPLE_ADMIN_CREDENTIALS.password}
            onFill={onFill}
        />

        <AccountRow
            label="Sample user"
            email={SAMPLE_CREDENTIALS.email}
            password={SAMPLE_CREDENTIALS.password}
            onFill={onFill}
        />
    </div>
);

export default SampleCredentialsHint;
