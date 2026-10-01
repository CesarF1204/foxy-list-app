import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useAppContext } from "../contexts/useAppContext";
import { getAdminStatsQueryOptions } from "../queryOptions/tasksQueryOptions";
import { STAT_CARDS, TASK_STAT_CARDS } from "../constants/admin";
import { ROLE_META } from "../constants/roles";
import { ROUTES } from "../constants/routes";
import { ErrorState, EmptyState } from "../components/Feedback";
import AdminLayout from "../components/Admin/AdminLayout";
import { StatCard, StatCardSkeleton } from "../components/Admin/StatCard";
import TaskStatusChart from "../components/Admin/TaskStatusChart";

/**
 * Reads a dotted path out of the stats object, so a card is described by data rather than by a
 * chain of conditionals.
 */
const readStat = (stats, path) => path.split(".").reduce((value, key) => value?.[key], stats) ?? 0;

/**
 * The admin overview: how many accounts exist, how many can use them, and how the tasks are
 * spread across the three boards.
 */
const AdminOverview = () => {
    const { user } = useAppContext();
    const { data: stats, isLoading, isError, error, refetch } = useQuery(
        getAdminStatsQueryOptions()
    );

    return (
        <AdminLayout
            user={user}
            title="Admin Overview"
            subtitle="A snapshot of your accounts and their task activity."
        >
            {isError ? (
                <ErrorState
                    title="Could not load the dashboard"
                    message={error?.message}
                    onRetry={refetch}
                />
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Skeletons in the exact shape of the cards, so the page does
                        * not jump when the numbers arrive. */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {isLoading
                            ? STAT_CARDS.map((card) => <StatCardSkeleton key={card.key} />)
                            : STAT_CARDS.map((card) => (
                                  <StatCard
                                      key={card.key}
                                      label={card.label}
                                      hint={card.hint}
                                      accent={card.accent}
                                      value={readStat(stats, card.key)}
                                  />
                              ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <section className="surface p-5 lg:col-span-2">
                            <h2 className="text-base font-extrabold text-ink">
                                Where the tasks are
                            </h2>
                            <p className="mt-1 mb-4 text-xs font-semibold text-ink-soft">
                                Every task on every board, counted from the task records themselves.
                            </p>

                            {isLoading ? (
                                <div
                                    className="h-8 w-full animate-pulse rounded-full bg-paper-deep"
                                    aria-hidden="true"
                                />
                            ) : (
                                <TaskStatusChart counts={stats?.tasks} />
                            )}
                        </section>

                        <div className="flex flex-col gap-4">
                            <section className="surface p-5">
                                <h2 className="text-base font-extrabold text-ink">Per board</h2>
                                <ul className="mt-3 flex flex-col gap-2">
                                    {TASK_STAT_CARDS.map((card) => (
                                        <li
                                            key={card.board}
                                            className="flex items-center gap-2.5 text-sm font-bold text-ink"
                                        >
                                            <span
                                                className={`h-3 w-3 shrink-0 rounded-full ${card.accent}`}
                                                aria-hidden="true"
                                            />
                                            {card.label}
                                            <span className="ml-auto text-base font-extrabold tabular-nums">
                                                {isLoading ? "-" : readStat(stats, `tasks.${card.board}`)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section className="surface p-5">
                                <h2 className="text-base font-extrabold text-ink">Administrators</h2>
                                <p className="mt-2 text-sm font-semibold text-ink-soft">
                                    {isLoading ? "-" : stats?.users?.admins ?? 0}{" "}
                                    {stats?.users?.admins === 1 ? "account can" : "accounts can"} reach
                                    this dashboard.
                                </p>
                                <p className="mt-2 text-xs font-semibold text-ink-faint">
                                    {ROLE_META.admin.hint}. Roles are granted here and validated by
                                    the API.
                                </p>
                                <Link to={ROUTES.adminUsers} className="btn btn-neutral mt-3 w-full">
                                    Manage users
                                </Link>
                            </section>
                        </div>
                    </div>

                    {stats?.users?.total === 0 && (
                        <EmptyState
                            title="No accounts yet"
                            description="Once someone registers, they and their task counts appear here."
                        />
                    )}
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminOverview;