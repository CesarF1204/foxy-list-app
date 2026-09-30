import { ROLE_META, ACCOUNT_STATUS_META, DEFAULT_ROLE, DEFAULT_ACCOUNT_STATUS } from "../../constants/roles";

/**
 * DOCU: A user's role or account status as a pill. The colour comes from the
 * shared meta in `constants/roles.js`, so a role looks the same everywhere, and
 * every pill carries a text label and a shape as well as a colour - the dot is
 * filled for active and hollow for blocked, so the state never depends on hue
 * alone.
 */
const Badge = ({ meta, fallback, withDot = false }) => {
    const info = meta ?? fallback;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${info.badge}`}
        >
            {withDot && (
                <span aria-hidden="true" className="text-[0.7em] leading-none">
                    {info.dot}
                </span>
            )}
            {info.label}
        </span>
    );
};

/** DOCU: The role pill for a user row or drawer. */
const RoleBadge = ({ role }) => (
    <Badge meta={ROLE_META[role]} fallback={ROLE_META[DEFAULT_ROLE]} />
);

/** DOCU: The account status pill, with the filled/hollow dot. */
const StatusBadge = ({ status }) => (
    <Badge
        meta={ACCOUNT_STATUS_META[status]}
        fallback={ACCOUNT_STATUS_META[DEFAULT_ACCOUNT_STATUS]}
        withDot
    />
);

export { Badge, RoleBadge, StatusBadge };