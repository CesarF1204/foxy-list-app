import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { logOut } from "../../api-client/users";
import { useAppContext } from "../../contexts/useAppContext";
import { ROUTES } from "../../constants/routes";
import { TOAST_TYPES } from "../../constants/toast";

/**
 * The sign-out entry in the account menu. Even if the request fails the local session is
 * cleared and the user is sent back to sign-in: leaving them on a board they can no longer save
 * to would be worse than ignoring the error.
 */
const LogOut = ({ onDone }) => {
    const { showToast, clearSession } = useAppContext();
    const navigate = useNavigate();

    const leave = () => {
        clearSession();
        onDone?.();
        navigate(ROUTES.login, { replace: true });
    };

    const mutation = useMutation({
        mutationFn: logOut,
        onSuccess: () => {
            showToast({ message: "Signed out", type: TOAST_TYPES.success });
            leave();
        },
        onError: (error) => {
            showToast({ message: error.message, type: TOAST_TYPES.error });
            leave();
        },
    });

    return (
        <li>
            <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="block w-full cursor-pointer px-4 py-2.5 text-left text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 md:py-2"
            >
                {mutation.isPending ? "Signing out..." : "Sign out"}
            </button>
        </li>
    );
};

export default LogOut;