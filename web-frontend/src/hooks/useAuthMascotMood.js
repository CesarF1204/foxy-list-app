import { useEffect, useRef, useState } from "react";

import { resolveAuthMood } from "../helpers/mascotSheets";
import { useAppContext } from "../contexts/useAppContext";
import useMascotReaction from "./useMascotReaction";

/**
 * DOCU: The one place the auth screens decide how the fox is feeling. <br>
 * Both screens have the same shape - a react-hook-form instance plus one
 * request that matters at a time - so this takes those directly and hands back
 * an expression name for `ControlledMascot`.
 *
 * It fixes the mistakes that come from wiring this by hand on each screen:
 *
 * - Pass the mutation for the step that is actually on screen. A stale success
 *   from an earlier step would otherwise keep the fox happy on the next one.
 * - Keep the fox in step with the toast. A screen that only watched the mutation
 *   would miss a verdict it had already forgotten: the mutation is deliberately
 *   reset the moment the user starts correcting it, so on its own it cannot say
 *   what the user is being shown. Note this only decides *which* face plays - no
 *   face is held open until the toast goes away.
 * - Re-validate the mood when the user edits a field, not only on submit. A
 *   `serverMood` held in state never cleared on its own, so fixing a typo left
 *   the fox complaining about an error that was no longer there.
 * - Reset the request when the screen changes, so the previous screen's verdict
 *   cannot leak into this one.
 *
 * `form` is the `useForm()` return, `mutation` the `useMutation()` return for
 * the current step, and `resetKey` anything that identifies the step (a step
 * number, a mode flag). Pass a fresh mutation or a changed key to clear it.
 */
const useAuthMascotMood = (form, mutation, resetKey = null) => {
    const { formState, watch, reset } = form;
    const { errors, isSubmitted, submitCount } = formState;
    const { isError, isPending } = mutation;
    const { toast, closeToast } = useAppContext();

    /*
      The latest `mutation.reset`, kept in a ref so the subscription below can
      depend on primitives only. The react-query result object is new on every
      render, and depending on it would unsubscribe and resubscribe constantly.
      It is refreshed in an effect rather than during render, because writing to
      a ref mid-render is not allowed.
    */
    const resetMutationRef = useRef(mutation.reset);
    useEffect(() => {
        resetMutationRef.current = mutation.reset;
    });
    /*
      Remembering the last step lets the effect below tell "the step changed"
      apart from "a render happened", which is what stops a reset firing on
      every keystroke.
    */
    const lastKeyRef = useRef(resetKey);

    /*
      A toast outlives the screen that raised it - step one's "reset link sent"
      is still on screen when step two appears. `resolveAuthMood` alone cannot
      tell that apart from a verdict about the step now on show, so the toast
      that was up at the moment of the change is remembered here and ignored from
      then on. Matching on the id (rather than clearing the toast) leaves the
      notification itself alone; only the fox stops reading it.
    */
    const [staleToast, setStaleToast] = useState({ step: resetKey, id: undefined });

    /*
      Adjusted during render, which React explicitly allows and re-runs
      immediately, so the wrong value below is never committed. `useState` rather
      than a ref because the id is read on the very next line: the linter (rightly)
      refuses a ref read during render, and an effect would be too late - the fox
      would flash the previous step's verdict on the new step for a frame.
    */
    if (staleToast.step !== resetKey) {
        setStaleToast({ step: resetKey, id: toast?.id });
    }

    /* The toast, unless it belongs to a step the user has already left. */
    const activeToast = toast && toast.id !== staleToast.id ? toast : undefined;

    /* The raw flag: resolveAuthMood decides whether it counts yet. */
    const hasFieldError = Object.keys(errors).length > 0;

    const mood = resolveAuthMood({
        isSuccess: mutation.isSuccess,
        isError,
        toastType: activeToast?.type ?? null,
        hasFieldError,
        isSubmitted,
        isPending,
    });

    /*
      Anything the user types invalidates the last request's verdict, so the fox
      stops reacting to a result the user is already fixing. `watch` in callback
      form subscribes to changes and hands back the means to stop it.
    */
    useEffect(() => {
        if (!isSubmitted || (!isError && !toast)) {
            return undefined;
        }

        /*
          The toast goes with the request. It is reporting a verdict about values
          the user is now changing, so it has stopped being true; leaving it to
          time out would keep telling them about a state they have left behind.
        */
        const subscription = watch(() => {
            resetMutationRef.current();
            closeToast();
        });

        /*
          react-hook-form returns `{ unsubscribe }` here (its `watch` hands back
          the subscription object), so that is what gets called on teardown. The
          function branch is kept because older versions handed back the
          unsubscribe function itself, and this cleanup must not be the thing
          that throws if the shape ever differs again.
        */
        return () => {
            if (typeof subscription === "function") {
                subscription();
                return;
            }

            subscription?.unsubscribe?.();
        };
    }, [isSubmitted, isError, toast, closeToast, watch]);

    /* A new step is a new story: drop the previous step's verdict. */
    useEffect(() => {
        if (lastKeyRef.current === resetKey) {
            return;
        }

        lastKeyRef.current = resetKey;
        mutation.reset();
        reset();
        /* Only on a step change: these are the unstable objects, by design. */
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);

    /*
      submitCount changes on every attempt, so the same failure twice, or two
      successes in a row, both replay their face instead of the second being a
      no-op the fox never shows. <br>
      No face is held open past its own duration: the mood above may well still
      be "error" while the toast counts down, but the fox has already played its
      face and gone back to idle, and that is the intended behaviour rather than
      a gap to paper over.
    */
    return useMascotReaction(mood, submitCount);
};

export default useAuthMascotMood;
