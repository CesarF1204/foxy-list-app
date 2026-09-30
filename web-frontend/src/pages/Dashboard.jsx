import { useAppContext } from "../contexts/useAppContext";
import { getFullName } from "../helpers/globalHelper";
import Navbar from "../components/User/Navbar";
import Task from "../components/Tasks/Task";

/**
 * DOCU: The signed-in home page and the app's default route. The board owns its
 * own loading and error states, so this page only supplies the surrounding chrome.
 */
const Dashboard = () => {
    const { user } = useAppContext();

    return (
        <div className="flex-1">
            <Navbar user={user} />

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <div className="animate-rise mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-ink">
                        Hey {getFullName(user).split(" ")[0]}
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-ink-soft">
                        Drag a card when you start or finish it, or use the buttons on the card
                        to edit and delete.
                    </p>
                </div>

                <Task />
            </main>
        </div>
    );
};

export default Dashboard;