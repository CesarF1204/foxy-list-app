import { useState } from "react";

import Drawer from "../Drawer";
import { getFullName, getInitials } from "../../helpers/globalHelper";
import { BOARD_META, BOARDS, BOARD_LABELS } from "../../constants/boards";
import { ROLE_META, ACCOUNT_STATUS_META, isAdmin } from "../../constants/roles";
import { TOAST_TYPES } from "../../constants/toast";
import { RoleBadge, StatusBadge } from "./Badges";
import UserProfileForm from "./UserProfileForm";
import { UserConfirmDialog, RoleDialog, PasswordDialog } from "./UserDialogs";

/** DOCU: One labelled row of the read-only detail list. */
const DetailRow = ({ label, children }) => (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
        <dt className="w-32 shrink-0 text-xs font-extrabold tracking-wide text-ink-soft uppercase">
            {label}
        </dt>
        <dd className="break-anywhere text-sm font-bold text-ink">{children}</dd>
    </div>
);

/** DOCU: The per-board task counts, as a labelled list rather than a bare row of
 *  numbers, so "12 To Do" is read aloud instead of "12, 3, 7". */
const TaskCounts = ({ counts }) => (
    <ul className="grid grid-cols-4 gap-2">
        <li className="rounded-2xl border-2 border-ink bg-white p-2 text-center">
            <span className="block text-xl font-extrabold text-ink tabular-nums">
                {counts?.total ?? 0}
            </span>
            <span className="text-[0.65rem] font-extrabold tracking-wide text-ink-soft uppercase">
                Total
            </span>
        </li>
        {BOARDS.map((board) => (
            <li key={board} className="rounded-2xl border-2 border-ink bg-white p-2 text-center">
                <span className="flex items-center justify-center gap-1.5 text-xl font-extrabold text-ink tabular-nums">
                    <span
                        className={`h-2.5 w-2.5 rounded-full ${BOARD_META[board].accent}`}
                        aria-hidden="true"
                    />
                    {counts?.[board] ?? 0}
                </span>
                <span className="text-[0.65rem] font-extrabold tracking-wide text-ink-soft uppercase">
                    {BOARD_LABELS[board]}
                </span>
            </li>
        ))}
    </ul>
);

/**
 * DOCU: The one place a single user is inspected and changed. It opens as a
 * drawer over the table, so the row it was opened from stays visible behind it.
 *
 * Two callers share this one component: the admin table opens it to manage
 * somebody, and the navbar opens it to read your own account. Which controls
 * appear is read off the two facts the caller already has - the role of the
 * signed-in user, and whether the account on screen is that same account - and
 * it is a render decision rather than a styling one: a control that is not
 * allowed is not put in the tree at all, so there is no button to click, no
 * dialog to open and nothing to reach by keyboard.
 *
 * Hiding a control is a courtesy; `requireAdmin` on the API is what holds, and
 * the two are independent on purpose. The self-service routes are the mirror
 * image: `authMiddleware` is enough for them, because they take no id and so
 * cannot reach another account.
 *
 * Every sensitive action is confirmed, and each one is a separate request: the
 * profile, the role, the status and the password have four endpoints between
 * them, so no single call here can change two things at once. Role, status and
 * password each validate server-side, so a request crafted outside the UI is
 * refused by the same rules.
 *
 * The actions that would lock an admin out - demoting, blocking or deleting
 * yourself - are hidden on your own row, and the API refuses them too. The UI
 * hiding them is a convenience; the check that holds is the one in the API.
 */
const UserDrawer = ({ user, currentUser, actions, showToast, onClose }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [dialog, setDialog] = useState(null);

    if (!user) return null;

    /* The account on screen, and whether it is the caller's own. */
    const isSelf = currentUser?._id === user._id;
    const isBlocked = user.status === "blocked";

    /* Which controls this drawer may offer, decided from the caller's role
     * rather than from a prop, so a caller cannot widen them by forgetting to
     * pass something. `isAdmin` is the same utility the navbar and the route
     * guards use, so there is one definition of an admin in the app.
     *
     * Editing your own name and email, and setting your own password, are
     * self-service: the API has a route for each that needs only a session.
     * Everything else - role, block, delete - is an administrative write against
     * somebody, and only an admin may perform one. */
    const isViewerAdmin = isAdmin(currentUser);
    const canEditProfile = true;
    const canSetPassword = true;
    const canChangeRole = isViewerAdmin;
    /* The self-lock-out guard stays on top of the role check: an admin opening
     * their own account still cannot demote, block or delete themselves. The
     * API refuses it as well, so the two agree. */
    const canBlock = isViewerAdmin && !isSelf;
    const canDelete = isViewerAdmin && !isSelf;

    const isPending = actions.isMutating;

    /**
     * DOCU: Runs one action, reports the outcome as a toast, and closes the
     * dialog on success. The message names the account from the row the admin
     * was looking at, never from anything the request carried, so a message can
     * never claim a change that did not happen.
     * @returns {Promise<boolean>} whether the action succeeded
     */
    const run = async (work, successToast) => {
        try {
            await work();
            showToast(successToast);
            setDialog(null);
            return true;
        } catch (error) {
            showToast({ message: error.message, type: TOAST_TYPES.error });
            return false;
        }
    };

    const closeOnDelete = () => {
        setDialog(null);
        onClose();
    };

    return (
        <>
            <Drawer isOpen onClose={onClose} title={getFullName(user)}>
                {/* Identity first: avatar, name and both badges, so the state of
                    the account is readable without hunting for a control. */}
                <div className="flex items-center gap-3">
                    <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-fox-400 font-extrabold text-white"
                        aria-hidden="true"
                    >
                        {getInitials(user)}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={user.role} />
                        <StatusBadge status={user.status} />
                    </div>
                </div>

                {/* Self-service: every signed-in user can edit their own name and email,
                    through `useOwnAccountActions` or the admin hook depending on
                    the caller. `canEditProfile` is stated rather than assumed so
                    the rule lives in one place with the rest of them.
                    Set new password sits beside it because both are the "your own
                    account" pair; the administrative writes stay below the
                    divider, where they are not mistaken for self-service.
                    It steps aside while the form is open: two ways of editing
                    the same account side by side invites the wrong one, so the
                    password button returns once the form is cancelled or
                    saved. */}
                {(canEditProfile || canSetPassword) && (
                    <div className="flex flex-wrap items-start gap-2">
                        {canEditProfile &&
                            (isEditing ? (
                                <UserProfileForm
                                    user={user}
                                    isPending={isPending}
                                    onCancel={() => setIsEditing(false)}
                                    onSave={(values) =>
                                        run(
                                            () =>
                                                actions.saveProfile({
                                                    userId: user._id,
                                                    ...values,
                                                }),
                                            actions.toasts.profileSaved({
                                                ...user,
                                                ...values,
                                            }),
                                        ).then((saved) => saved && setIsEditing(false))
                                    }
                                />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    disabled={isPending}
                                    className="btn btn-neutral"
                                >
                                    Edit name and email
                                </button>
                            ))}

                        {/* Hidden, not disabled, while the profile form is open: a
                            disabled control on screen implies the password is
                            blocked, which is not what is happening here - the
                            form simply has the row to itself. */}
                        {canSetPassword && !isEditing && (
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={() => setDialog("password")}
                                className="btn btn-neutral"
                            >
                                Set new password
                            </button>
                        )}
                    </div>
                )}

                <dl className="flex flex-col gap-2.5">
                    <DetailRow label="Email">{user.email}</DetailRow>
                    <DetailRow label="Role">{ROLE_META[user.role]?.hint}</DetailRow>
                    <DetailRow label="Status">{ACCOUNT_STATUS_META[user.status]?.hint}</DetailRow>
                    <DetailRow label="Joined">
                        {new Date(user.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </DetailRow>
                </dl>

                <TaskCounts counts={user.taskCounts} />

                {/* ------------------------------ actions ------------------------------ */}

                {/* Administrative writes only: role, block and delete. The two
                    self-service buttons are up top with the identity block, so
                    this bar holds nothing that touches somebody else's account
                    by accident. Each control is gated on its own capability, so
                    an admin sees the full set while a plain user gets none.
                    The ones that are refused are not rendered, not disabled:
                    there is nothing in the tree to click or tab to.
                    The bar itself is hidden when it would be empty, so a plain
                    user is not left with a bare divider to look at. */}
                {(canChangeRole || canBlock || canDelete) && (
                    <div className="flex flex-wrap gap-2 border-t-2 border-paper-deep pt-4">
                        {canChangeRole && (
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={() => setDialog("role")}
                                className="btn btn-neutral"
                            >
                                Change role
                            </button>
                        )}

                        {canBlock && (
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={() => setDialog(isBlocked ? "unblock" : "block")}
                                className={`btn ${isBlocked ? "btn-primary" : "btn-neutral"}`}
                            >
                                {isBlocked ? "Unblock user" : "Block user"}
                            </button>
                        )}

                        {canDelete && (
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={() => setDialog("delete")}
                                className="btn btn-danger"
                            >
                                Delete user
                            </button>
                        )}

                        {/* Said once, and only where it is true: a plain user simply
                            has no administrative controls and nothing to explain. */}
                        {isViewerAdmin && isSelf && (
                            <p className="w-full text-xs font-semibold text-ink-faint">
                                This is your own account, so the actions that would lock you out
                                of the dashboard are hidden here.
                            </p>
                        )}
                    </div>
                )}
            </Drawer>

            {/* ------------------------------ dialogs ------------------------------ */}

            {/* The dialogs ride on the same capabilities as the buttons that open them.
                `dialog` can only be set by a rendered button, so this is belt and
                braces - but it means no admin dialog exists in the tree for a
                caller that has no business opening one. */}
                {canChangeRole && dialog === "role" && (
                <RoleDialog
                    user={user}
                    role={user.role}
                    isPending={isPending}
                    onClose={() => setDialog(null)}
                    onConfirm={(role) =>
                        run(
                            () => actions.changeRole({ userId: user._id, role }),
                            actions.toasts.roleChanged(user, role),
                        )
                    }
                />
            )}

            {canSetPassword && dialog === "password" && (
                <PasswordDialog
                    user={user}
                    isPending={isPending}
                    onClose={() => setDialog(null)}
                    onConfirm={(password) =>
                        run(
                            () => actions.changePassword({ userId: user._id, password }),
                            actions.toasts.passwordChanged(user),
                        )
                    }
                />
            )}

            {canBlock && dialog === "block" && (
                <UserConfirmDialog
                    title={`Block ${getFullName(user)}?`}
                    confirmLabel="Block user"
                    variant="danger"
                    isPending={isPending}
                    onClose={() => setDialog(null)}
                    onConfirm={() =>
                        run(
                            () => actions.changeStatus({ userId: user._id, status: "blocked" }),
                            actions.toasts.blocked(user),
                        )
                    }
                >
                    <span className="font-extrabold text-ink">{getFullName(user)}</span> will not be
                    able to sign in, and a session they already have open stops working on their
                    next request. Their tasks are kept.
                </UserConfirmDialog>
            )}

            {canBlock && dialog === "unblock" && (
                <UserConfirmDialog
                    title={`Unblock ${getFullName(user)}?`}
                    confirmLabel="Unblock user"
                    isPending={isPending}
                    onClose={() => setDialog(null)}
                    onConfirm={() =>
                        run(
                            () => actions.changeStatus({ userId: user._id, status: "active" }),
                            actions.toasts.unblocked(user),
                        )
                    }
                >
                    <span className="font-extrabold text-ink">{getFullName(user)}</span> will be
                    able to sign in and use the app again straight away.
                </UserConfirmDialog>
            )}

            {canDelete && dialog === "delete" && (
                <UserConfirmDialog
                    title={`Delete ${getFullName(user)}?`}
                    confirmLabel="Delete permanently"
                    variant="danger"
                    isPending={isPending}
                    onClose={() => setDialog(null)}
                    onConfirm={async () => {
                        /* The account is gone, so there is nothing left to show it
                         * in: the drawer closes and the table refetches. */
                        await run(
                            () => actions.deleteUser(user._id),
                            actions.toasts.deleted(user),
                        );
                        closeOnDelete();
                    }}
                >
                    This removes the account and all{" "}
                    <span className="font-extrabold text-ink">{user.taskCounts?.total ?? 0}</span> of
                    its tasks. It cannot be undone.
                </UserConfirmDialog>
            )}
        </>
    );
};

export default UserDrawer;

