import { useState } from "react";

import Drawer from "../Drawer";
import { getFullName, getInitials } from "../../helpers/globalHelper";
import { BOARD_META, BOARDS, BOARD_LABELS } from "../../constants/boards";
import { ROLE_META, ACCOUNT_STATUS_META } from "../../constants/roles";
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

    const isSelf = currentUser?._id === user._id;
    const isBlocked = user.status === "blocked";
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

                {isEditing ? (
                    <UserProfileForm
                        user={user}
                        isPending={isPending}
                        onCancel={() => setIsEditing(false)}
                        onSave={(values) =>
                            run(
                                () => actions.saveProfile({ userId: user._id, ...values }),
                                actions.toasts.profileSaved({ ...user, ...values }),
                            ).then((saved) => saved && setIsEditing(false))
                        }
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        disabled={isPending}
                        className="btn btn-neutral self-start"
                    >
                        Edit name and email
                    </button>
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

                <div className="flex flex-wrap gap-2 border-t-2 border-paper-deep pt-4">
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setDialog("role")}
                        className="btn btn-neutral"
                    >
                        Change role
                    </button>

                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setDialog("password")}
                        className="btn btn-neutral"
                    >
                        Set new password
                    </button>

                    {!isSelf && (
                        <>
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={() => setDialog(isBlocked ? "unblock" : "block")}
                                className={`btn ${isBlocked ? "btn-primary" : "btn-neutral"}`}
                            >
                                {isBlocked ? "Unblock user" : "Block user"}
                            </button>

                            <button
                                type="button"
                                disabled={isPending}
                                onClick={() => setDialog("delete")}
                                className="btn btn-danger"
                            >
                                Delete user
                            </button>
                        </>
                    )}

                    {isSelf && (
                        <p className="w-full text-xs font-semibold text-ink-faint">
                            This is your own account, so the actions that would lock you out of
                            the dashboard are hidden here. The API refuses them as well.
                        </p>
                    )}
                </div>
            </Drawer>

            {/* ------------------------------ dialogs ------------------------------ */}

            {dialog === "role" && (
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

            {dialog === "password" && (
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

            {dialog === "block" && (
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

            {dialog === "unblock" && (
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

            {dialog === "delete" && (
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

