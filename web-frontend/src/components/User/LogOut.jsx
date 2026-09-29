import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { logOut } from "../../api-client/users";
import { useAppContext } from "../../contexts/useAppContext";

/**
 * DOCU: The sign-out entry in the account menu. <br>
 * Even if the request fails, the local session is cleared and the user is sent
 * back to the sign-in page - leaving them on a board they can no longer save to
 * would be worse than ignoring the error.
 */
const LogOut = ({ onDone }) => {
    const { showToast, clearSession } = useAppContext();
    const navigate = useNavigate();

    const leave = () => {
        clearSession();
        onDone?.();
        navigate("/login", { replace: true });
    };

    const mutation = useMutation({
        mutationFn: logOut,
        onSuccess: () => {
            showToast({ message: "Signed out", type: "SUCCESS" });
            leave();
        },
        onError: (error) => {
            showToast({ message: error.message, type: "ERROR" });
            leave();
        },
    });

    return (
        <li>
            <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="block w-full px-4 py-2 text-left text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
                {mutation.isPending ? "Signing out..." : "Sign out"}
            </button>
        </li>
    );
};

export default LogOut;