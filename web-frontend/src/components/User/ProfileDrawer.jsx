import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import UserDrawer from "../Admin/UserDrawer";
import { getTasksQueryOptions } from "../../queryOptions/tasksQueryOptions";
import { BOARDS } from "../../constants/boards";
import { isAdmin } from "../../constants/roles";
import { useOwnAccountActions } from "../../hooks/useOwnAccountActions";
import { useAdminActions } from "../../hooks/useAdminActions";
import { useAppContext } from "../../contexts/useAppContext";

/**
 * The navbar's "View Profile" - the same drawer the admin table opens, told to render
 * read-only.
 */
const ProfileDrawer = ({ user, isOpen, onClose }) => {
    const { showToast } = useAppContext();

    /** Both hooks are called unconditionally, as the rules of hooks require. */
    const ownActions = useOwnAccountActions();
    const adminActions = useAdminActions();
    const actions = isAdmin(user) ? adminActions : ownActions;

    /**
     * `enabled` keeps a merely-mounted navbar from triggering the board's query; it only reads
     * once the drawer has actually been opened.
     */
    const { data } = useQuery({
        ...getTasksQueryOptions(),
        enabled: isOpen,
    });

    /**
     * The same `{ total, todo, ongoing, done }` shape the admin aggregation returns, so
     * `TaskCounts` inside `UserDrawer` reads it unchanged.
     */
    const taskCounts = useMemo(() => {
        const counts = Object.fromEntries(BOARDS.map((board) => [board, 0]));
        const tasks = Array.isArray(data?.tasks) ? data.tasks : [];

        tasks.forEach((task) => {
            if (task.status in counts) counts[task.status] += 1;
        });

        return {
            ...counts,
            total: BOARDS.reduce((sum, board) => sum + counts[board], 0),
        };
    }, [data]);

    /** Nothing is rendered until it is opened, so the idle navbar pays for none of this. */
    if (!isOpen) return null;

    return (
        <UserDrawer
            user={{ ...user, taskCounts }}
            currentUser={user}
            actions={actions}
            showToast={showToast}
            onClose={onClose}
        />
    );
};

export default ProfileDrawer;