import { useEffect, useRef, useState } from "react";

import { resolveAuthMood } from "../helpers/mascotMood";
import { useAppContext } from "../contexts/useAppContext";
import useMascotReaction from "./useMascotReaction";

/**
 * The one place the auth screens decide how the fox is feeling. Takes the screen's form and its
 * one live mutation, and hands back an expression name for `ControlledMascot`.
 */
const useAuthMascotMood = (form, mutation, resetKey = null) => {
    const { formState, watch, reset } = form;
    const { errors, isSubmitted, submitCount } = formState;
    const { isError, isPending } = mutation;
    const { toast, closeToast } = useAppContext();

    /**
     * The latest `mutation.reset`, in a ref so the subscription below can depend on primitives
     * only. Refreshed in an effect: writing a ref during render is not allowed.
     */
    const resetMutationRef = useRef(mutation.reset);
    useEffect(() => {
        resetMutationRef.current = mutation.reset;
    });
    /**
     * Lets the effect below tell "the step changed" from "a render happened", so a reset does
     * not fire on every keystroke.
     */
    const lastKeyRef = useRef(resetKey);

    /**
     * A toast outlives the screen that raised it, and `resolveAuthMood` alone cannot tell that from
     * a verdict about the step now on show. The toast up at the moment of the change is remembered
     * and ignored from then on; the notification itself is left alone, only the fox stops reading it.
     */
    const [staleToast, setStaleToast] = useState({ step: resetKey, id: undefined });

    /**
     * Adjusted during render, which React allows and re-runs immediately, so the wrong value
     * below is never committed. `useState` rather than a ref because the id is read on the next
     * line.
     */
    if (staleToast.step !== resetKey) {
        setStaleToast({ step: resetKey, id: toast?.id });
    }

    /** The toast, unless it belongs to a step the user has already left. */
    const activeToast = toast && toast.id !== staleToast.id ? toast : undefined;

    /** The raw flag: resolveAuthMood decides whether it counts yet. */
    const hasFieldError = Object.keys(errors).length > 0;

    const mood = resolveAuthMood({
        isSuccess: mutation.isSuccess,
        isError,
        toastType: activeToast?.type ?? null,
        hasFieldError,
        isSubmitted,
        isPending,
    });

    /**
     * Anything the user types invalidates the last request's verdict, so the fox stops reacting
     * to a result they are already fixing.
     */
    useEffect(() => {
        if (!isSubmitted || (!isError && !toast)) {
            return undefined;
        }

        /**
         * The toast goes with the request: it reports a verdict about values the user is now
         * changing, so leaving it to time out would keep telling them about a state they have
         * left behind.
         */
        const subscription = watch(() => {
            resetMutationRef.current();
            closeToast();
        });

        /**
         * react-hook-form returns `{ unsubscribe }` here; older versions returned the function
         * itself, and this cleanup must not be the thing that throws if the shape differs.
         */
        return () => {
            if (typeof subscription === "function") {
                subscription();
                return;
            }

            subscription?.unsubscribe?.();
        };
    }, [isSubmitted, isError, toast, closeToast, watch]);

    /** A new step is a new story: drop the previous step's verdict. */
    useEffect(() => {
        if (lastKeyRef.current === resetKey) {
            return;
        }

        lastKeyRef.current = resetKey;
        mutation.reset();
        reset();
        /** Only on a step change: these are the unstable objects, by design. */
        /** eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [resetKey]);

    /**
     * submitCount is the retry key: the same failure twice, or two successes in a row, both
     * replay their face. No face is held open past its duration.
     */
    return useMascotReaction(mood, submitCount);
};

export default useAuthMascotMood;
