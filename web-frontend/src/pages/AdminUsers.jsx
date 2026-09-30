import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAppContext } from "../contexts/useAppContext";
import { useAdminActions } from "../hooks/useAdminActions";
import { useUserFilters } from "../hooks/useUserFilters";
import { getAdminUserQueryOptions, getAdminUsersQueryOptions } from "../queryOptions/tasksQueryOptions";
import { getFullName } from "../helpers/globalHelper";
import { TOAST_TYPES } from "../constants/toast";
import { ErrorState, EmptyState, RefreshOverlay } from "../components/Feedback";
import AdminLayout from "../components/Admin/AdminLayout";
import UserFilters from "../components/Admin/UserFilters";
import UsersTable from "../components/Admin/UsersTable";
import Pagination from "../components/Admin/Pagination";
import UserDrawer from "../components/Admin/UserDrawer";
import ConfirmDialog from "../components/Admin/ConfirmDialog";

/** DOCU: The grey rows shown while a page of users is loading, in the shape of
 *  the real table so the layout holds still when the data arrives. */
const TableSkeleton = ({ rows = 5 }) => (
    <div aria-hidden="true" className="flex flex-col gap-2 p-3">
        {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="h-11 animate-pulse rounded-xl bg-paper-deep/70" />
        ))}
    </div>
);

/**
 * DOCU: User management: the search box, the two filters, the table of accounts
 * with their task counts, and every action available on a row.
 *
 * Filtering, sorting and paging all happen in the API. The browser sends a query
 * string and receives one page of rows, so this screen behaves the same with ten
 * users and with ten thousand; the alternative - loading everyone and filtering
 * in the browser - is what makes an admin table unusable at scale.
 *
 * A row's actions are confirmed before they fire, and the drawer's own dialogs
 * confirm the rest. None of the buttons decide what is allowed: the API checks
 * the caller's role on every request and validates every value, so a request
 * made outside this UI is refused by the same rules.
 */
const AdminUsers = () => {
    const { user, showToast } = useAppContext();
    const actions = useAdminActions();
    const filters = useUserFilters();

    const { data, isLoading, isFetching, isError, error, refetch } = useQuery(
        getAdminUsersQueryOptions(filters.params)
    );

    /** The account open in the drawer, or null. */
    const [openUserId, setOpenUserId] = useState(null);
    /** A row action awaiting confirmation, or null. */
    const [pending, setPending] = useState(null);

    /**
     * DOCU: The open user, refetched by id so the drawer always shows what the
     * API currently holds - a role changed on another screen, or a delete that
     * already happened, cannot leave a stale row on display.
     */
    const { data: openUser } = useQuery({
        ...getAdminUserQueryOptions(openUserId ?? ""),
        enabled: Boolean(openUserId),
    });

    const rows = data?.rows ?? [];

    /** DOCU: Runs a row action: the request, then a toast naming the account. */
    const run = async (work, toast) => {
        try {
            await work();
            showToast(toast);
            setPending(null);
            return true;
        } catch (problem) {
            showToast({ message: problem.message, type: TOAST_TYPES.error });
            return false;
        }
    };

    /** The pending block/unblock/delete, ready to be handed to ConfirmDialog. */
    const pendingCopy = () => {
        if (!pending) return null;

        if (pending.action === "delete") {
            return {
                title: `Delete ${getFullName(pending.user)}?`,
                confirmLabel: "Delete permanently",
                variant: "danger",
                body: (
                    <>
                        This removes the account and all{" "}
                        <span className="font-extrabold text-ink">
                            {pending.user.taskCounts?.total ?? 0}
                        </span>{" "}
                        of its tasks. It cannot be undone.
                    </>
                ),
            };
        }

        const isBlocking = pending.action === "block";
        return {
            title: `${isBlocking ? "Block" : "Unblock"} ${getFullName(pending.user)}?`,
            confirmLabel: isBlocking ? "Block user" : "Unblock user",
            variant: isBlocking ? "danger" : "primary",
            body: isBlocking ? (
                <>
                    <span className="font-extrabold text-ink">{getFullName(pending.user)}</span>{" "}
                    will not be able to sign in, and an open session stops working on their next
                    request. Their tasks are kept.
                </>
            ) : (
                <>
                    <span className="font-extrabold text-ink">{getFullName(pending.user)}</span>{" "}
                    will be able to sign in and use the app again.
                </>
            ),
        };
    };

    const copy = pendingCopy();

    return (
        <AdminLayout
            user={user}
            title="Users"
            subtitle="Search, review and manage every registered account."
        >
            <div className="flex flex-col gap-4">
                <UserFilters
                    /* The box shows what is being typed, not what the API has been
                     * asked for. The page resets to 1 inside the debounce, so the
                     * two never disagree for longer than the pause. */
                    search={filters.searchInput}
                    role={filters.params.role}
                    status={filters.params.status}
                    resultCount={data?.total}
                    onSearch={filters.setSearchInput}
                    onRole={filters.changeRole}
                    onStatus={filters.changeStatus}
                    onClear={filters.clear}
                />

                <div className="surface animate-rise overflow-hidden">
                    {/* The table's own loading boundary. `relative` anchors the
                     * refresh overlay, `aria-busy` announces that the region is
                     * updating, and the floor height keeps a short result set from
                     * shrinking the card and pulling the pagination upwards while a
                     * request is still in flight. */}
                    <div
                        className="relative min-h-64"
                        aria-busy={isFetching}
                        aria-label="Registered users table"
                    >
                        {isError ? (
                            <div className="p-4">
                                <ErrorState
                                    title="Could not load the users"
                                    message={error?.message}
                                    onRetry={refetch}
                                />
                            </div>
                        ) : isLoading ? (
                            /* The very first load, when there is no previous page to
                             * keep on screen: a skeleton holds the shape. */
                            <TableSkeleton />
                        ) : rows.length === 0 ? (
                            <div className="p-4">
                                <EmptyState
                                    title="No users match"
                                    description="Try a different search term, or clear the filters to see everyone."
                                    action={
                                        <button
                                            type="button"
                                            onClick={filters.clear}
                                            className="btn btn-neutral mt-2"
                                        >
                                            Clear filters
                                        </button>
                                    }
                                />
                            </div>
                        ) : (
                            /* A refetch never replaces the table. The rows stay put,
                             * dimmed, and the overlay says the table is updating - the
                             * filters and the pagination around it never move. */
                            <div
                                className={`transition-opacity ${
                                    isFetching ? "opacity-60" : "opacity-100"
                                }`}
                            >
                                <UsersTable
                                    rows={rows}
                                    sortBy={filters.sortBy}
                                    sortDir={filters.sortDir}
                                    onSort={filters.toggleSort}
                                    onView={(target) => setOpenUserId(target._id)}
                                    onToggleStatus={(target) =>
                                        setPending({
                                            user: target,
                                            action:
                                                target.status === "blocked" ? "unblock" : "block",
                                        })
                                    }
                                    onDelete={(target) => setPending({ user: target, action: "delete" })}
                                    /* The signed-in admin's own row cannot be blocked,
                                     * demoted or deleted - the API refuses those too. */
                                    canManageRow={(target) => target._id !== user?._id}
                                />
                            </div>
                        )}

                        {/* One overlay for every trigger - the debounced search, either
                         * filter, a sort or a page change - because they all surface as
                         * the same `isFetching` on the same query. It is skipped on the
                         * first load (the skeleton is already the loading state) and on
                         * an error, where the message and the retry button are what the
                         * admin needs to see. */}
                        {isFetching && !isLoading && !isError && (
                            <RefreshOverlay label="Loading users..." />
                        )}
                    </div>

                    {data && rows.length > 0 && (
                        <div className="border-t-2 border-paper-deep p-3">
                            <Pagination
                                page={data.page}
                                pageCount={data.pageCount}
                                total={data.total}
                                pageSize={data.pageSize}
                                isDisabled={isFetching}
                                onPage={filters.setPage}
                                onPageSize={filters.changePageSize}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* The drawer, opened from any row, holds every action for one user. */}
            {openUser && (
                <UserDrawer
                    user={openUser}
                    currentUser={user}
                    actions={actions}
                    showToast={showToast}
                    onClose={() => setOpenUserId(null)}
                />
            )}

            {/* The row-level confirmations: block, unblock and delete. */}
            {copy && pending && (
                <ConfirmDialog
                    title={copy.title}
                    confirmLabel={copy.confirmLabel}
                    variant={copy.variant}
                    isPending={actions.isMutating}
                    onClose={() => setPending(null)}
                    onConfirm={() =>
                        run(
                            () => {
                                if (pending.action === "delete") {
                                    return actions.deleteUser(pending.user._id);
                                }
                                return actions.changeStatus({
                                    userId: pending.user._id,
                                    status: pending.action === "block" ? "blocked" : "active",
                                });
                            },
                            pending.action === "delete"
                                ? actions.toasts.deleted(pending.user)
                                : pending.action === "block"
                                  ? actions.toasts.blocked(pending.user)
                                  : actions.toasts.unblocked(pending.user),
                        )
                    }
                >
                    {copy.body}
                </ConfirmDialog>
            )}
        </AdminLayout>
    );
};

export default AdminUsers;

