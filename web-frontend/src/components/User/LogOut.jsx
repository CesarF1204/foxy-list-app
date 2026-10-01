import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { logOut } from "../../api-client/users";
import { useAppContext } from "../../contexts/useAppContext";
import { ROUTES } from "../../constants/routes";
import { TOAST_TYPES } from "../../constants/toast";

/**
 * DOCU: The sign-out entry in the account menu. Even if the request fails the
 * local session is cleared and the user is sent back to sign-in: leaving them
 * on a board they can no longer save to would be worse than ignoring the error.
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
                /* `cursor-pointer` because this is a menu entry, not one of the
                 * `.btn` buttons that carry it - it is a full-width row of text on
                 * a red hover, and without it the pointer stays an I-beam over
                 * something that is entirely clickable. `disabled:cursor-not-allowed`
                 * is the same pairing the pager and the kebab trigger use, so a
                 * button that is mid-request stops inviting the click. The hover
                 * fill and the dimmed pending state are unchanged. */
                className="block w-full cursor-pointer px-4 py-2 text-left text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {mutation.isPending ? "Signing out..." : "Sign out"}
            </button>
        </li>
    );
};

export default LogOut;