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
 * DOCU: The navbar's "View Profile" - the same drawer the admin table opens,
 * told to render read-only.
 *
 * This is an adapter, not a second sidebar: it owns none of the drawer's
 * layout, header, close button, overlay, animation or responsive behaviour, all
 * of which come from `UserDrawer` and `Drawer`. All it adds is the two things
 * the navbar knows and the table does not - the signed-in user is the subject,
 * and it is also the viewer - plus the counts.
 *
 * The actions offered are the viewer's role's, not this file's: `UserDrawer`
 * reads the role and decides. Both roles get Edit name and email and Set new
 * password, which are self-service; only an admin additionally gets Change
 * role. Block and delete are absent here because the subject is always the
 * viewer, and the drawer already refuses to offer an admin a way to lock
 * themselves out - the admin table is where those two apply.
 *
 * This file only chooses which write functions to hand over, and both sets come
 * from hooks that already exist.
 *
 * The counts come from the signed-in user's own tasks, which the board already
 * fetched and cached under `TASKS_KEY`. Deriving them from that cache means
 * opening the profile issues no request of its own and cannot show a number
 * that disagrees with the board. There is no self-service "my task counts"
 * endpoint, and no admin call is made here: a regular user's session would be
 * refused by `requireAdmin` anyway.
 *
 * Open and close are owned by the navbar, which has to close the account menu
 * at the same moment - the state cannot live down here or the two would fight.
 */
const ProfileDrawer = ({ user, isOpen, onClose }) => {
    const { showToast } = useAppContext();

    /* Both hooks are called unconditionally, as the rules of hooks require.
     * Only the chosen one is passed on, so an admin gets the full set of writes
     * and a plain user gets the self-service pair. `isAdmin` is the app's own
     * definition, the same one the navbar and the route guards use. */
    const ownActions = useOwnAccountActions();
    const adminActions = useAdminActions();
    const actions = isAdmin(user) ? adminActions : ownActions;

    /* `enabled` keeps a merely-mounted navbar from triggering the board's query;
     * it only reads once the drawer has actually been opened.
     *
     * The cache holds the whole `{ tasks: [...] }` envelope, exactly as the
     * board stored it - `getTasksQueryOptions` does not `select` the inner
     * array - so the list is read off `data.tasks`, the same field the board
     * reads. Reading `data` itself would hand the counts an object. */
    const { data } = useQuery({
        ...getTasksQueryOptions(),
        enabled: isOpen,
    });

    /* The same `{ total, todo, ongoing, done }` shape the admin aggregation
     * returns, so `TaskCounts` inside `UserDrawer` reads it unchanged.
     *
     * The list is normalised to an array inside the memo rather than in a
     * variable above it, so the dependency is `data` itself. A `tasks` local
     * rebuilt each render would be a new reference every time and would defeat
     * the memo, making the drawer recount on every render of the navbar.
     *
     * `Array.isArray` rather than a `?? []` default: the envelope is absent
     * before the first fetch, and `null` from a failed one would slip past a
     * `??` and reach `forEach`. Tasks on an unknown board are ignored, so the
     * total always equals the sum of the three boards. */
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

    /* Nothing is rendered until it is opened, so the idle navbar pays for
     * none of this. */
    if (!isOpen) return null;

    return (
        <UserDrawer
            user={{ ...user, taskCounts }}
            /* The viewer and the subject are the same person, which is what makes
             * the self-lock-out guard hold - and it is also what `UserDrawer`
             * reads the role from to decide which actions to offer. */
            currentUser={user}
            /* The self-service writes. It deliberately has no `changeRole`,
             * `changeStatus` or `deleteUser`, so a plain user's drawer cannot
             * offer them even before the role gate is considered. */
            actions={actions}
            showToast={showToast}
            onClose={onClose}
        />
    );
};

export default ProfileDrawer;