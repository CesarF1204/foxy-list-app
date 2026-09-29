import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { forgotPassword, resetPassword } from "../api-client/users";
import { useAppContext } from "../contexts/useAppContext";
import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FormField";
import useAuthMascotMood from "../hooks/useAuthMascotMood";
import { MASCOT_HOLD_MS, fieldErrorToast } from "../helpers/mascotSheets";

/**
 * DOCU: How long the fox celebrates before the page changes. <br>
 * The redirect has to wait, or the success face never reaches the screen. It
 * is the mascot's own success hold rather than a number of its own, so the face
 * is never cut off part way through.
 */
const SUCCESS_HOLD_MS = MASCOT_HOLD_MS.success;

/**
 * DOCU: Password recovery, in two steps on one page. <br>
 * Step one asks for the email address. Step two sets a new password for that
 * same address. Keeping both steps here means the address never has to be
 * passed around in the URL or retyped.
 */
const RecoverPassword = () => {
    const navigate = useNavigate();
    const { showToast } = useAppContext();
    const [step, setStep] = useState(1);

    const formApi = useForm({ defaultValues: { email: "" } });

    const {
        register,
        handleSubmit,
        watch,
        getValues,
        reset,
        formState: { errors },
    } = formApi;

    /*
      On a timer, and cleared on unmount: the redirect would otherwise fire after
      the user had already navigated somewhere else and move them again.
    */
    const redirectRef = useRef(null);
    useEffect(
        () => () => {
            window.clearTimeout(redirectRef.current);
        },
        [],
    );

    /** Celebrates for a beat, then moves on - unless the page has moved already. */
    const redirectAfterCelebrating = (to) => {
        window.clearTimeout(redirectRef.current);
        redirectRef.current = window.setTimeout(() => {
            navigate(to, { replace: true });
        }, SUCCESS_HOLD_MS);
    };

    /**
     * Moves to the next step, holding the email across. <br>
     * The address is read *before* the step changes: after it, the step one
     * fields are unmounted and their values are no longer the live ones.
     */
    const goToStep = (nextStep) => {
        const email = getValues("email");
        setStep(nextStep);
        reset({ email });
    };

    const forgotMutation = useMutation({
        mutationFn: forgotPassword,
        onSuccess: () => {
            showToast({ message: "Reset link sent. Check your inbox.", type: "SUCCESS" });
            /*
              A short pause so the fox gets to be pleased about it, then on to
              step two. `replace` is not wanted here: back should skip this step.
            */
            window.clearTimeout(redirectRef.current);
            redirectRef.current = window.setTimeout(() => goToStep(2), SUCCESS_HOLD_MS);
        },
        onError: (error) => showToast({ message: error.message, type: "ERROR" }),
    });

    const resetMutation = useMutation({
        mutationFn: resetPassword,
        onSuccess: () => {
            showToast({ message: "Password updated. Please sign in.", type: "SUCCESS" });
            redirectAfterCelebrating("/login");
        },
        onError: (error) => showToast({ message: error.message, type: "ERROR" }),
    });

    /*
      Only the request for the step on screen drives the fox. Step one's success
      must not leave the fox pleased on step two, which it never asked about.
    */
    const activeMutation = step === 1 ? forgotMutation : resetMutation;

    /**
     * DOCU: A submit that never left the browser. <br>
     * `handleSubmit` stops here when validation fails, so no mutation runs and
     * the only feedback would be the inline field errors. Raising a toast as
     * well means a rejected form announces itself the same way a rejected
     * request does - and gives the mascot the same signal to react to.
     */
    const reportFieldErrors = (errors) => {
        const toast = fieldErrorToast(errors);
        if (toast) {
            showToast(toast);
        }
    };

    /*
      Keyed on the step, so moving between them clears the previous step's
      verdict and form state. The mood rules live in the hook.
    */
    const mascotReaction = useAuthMascotMood(formApi, activeMutation, step);

    return (
        <AuthLayout
            title={step === 1 ? "Recover your password" : "Choose a new password"}
            subtitle={
                step === 1
                    ? "Enter the email on your account and we'll send a reset link."
                    : "Pick something you haven't used before."
            }
            mascotReaction={mascotReaction}
        >
            {/* Two numbered steps, with the active one highlighted. */}
            <ol className="mb-5 flex items-center justify-center gap-2" aria-label="Recovery steps">
                {[1, 2].map((number) => (
                    <li key={number} className="flex items-center gap-2">
                        <span
                            aria-current={step === number ? "step" : undefined}
                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink text-xs font-extrabold transition ${
                                step === number
                                    ? "bg-fox-400 text-white"
                                    : step > number
                                      ? "bg-done text-white"
                                      : "bg-white text-ink-faint"
                            }`}
                        >
                            {step > number ? "✓" : number}
                        </span>
                        {number === 1 && (
                            <span className="h-0.5 w-8 rounded-full bg-ink/20" aria-hidden="true" />
                        )}
                    </li>
                ))}
            </ol>

            {step === 1 ? (
                <form
                    className="flex w-full flex-col gap-4"
                    onSubmit={handleSubmit(
                        (data) => forgotMutation.mutate(data.email),
                        reportFieldErrors,
                    )}
                    noValidate
                >
                    <FormField
                        id="email"
                        label="Email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        error={errors.email}
                        {...register("email", {
                            required: "Email is required",
                            pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: "Enter a valid email address",
                            },
                        })}
                    />

                    <button
                        type="submit"
                        disabled={forgotMutation.isPending}
                        className="btn btn-primary w-full"
                    >
                        {forgotMutation.isPending ? "Sending..." : "Send reset link"}
                    </button>
                </form>
            ) : (
                <form
                    className="flex w-full flex-col gap-4"
                    onSubmit={handleSubmit(
                        (data) => {
                            /* The email comes from step one, not from the user again. */
                            const { email } = getValues();
                            resetMutation.mutate({ email, password: data.password });
                        },
                        reportFieldErrors,
                    )}
                    noValidate
                >
                    <FormField
                        id="password"
                        label="New password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        error={errors.password}
                        {...register("password", {
                            required: "Password is required",
                            minLength: { value: 6, message: "Must be at least 6 characters" },
                        })}
                    />

                    <FormField
                        id="confirmPassword"
                        label="Confirm new password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Re-enter your new password"
                        error={errors.confirmPassword}
                        {...register("confirmPassword", {
                            required: "Please confirm your password",
                            validate: (value) =>
                                value === watch("password") || "Passwords do not match",
                        })}
                    />

                    <button
                        type="submit"
                        disabled={resetMutation.isPending}
                        className="btn btn-primary w-full"
                    >
                        {resetMutation.isPending ? "Updating..." : "Update password"}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            /* Step two's form state is no longer wanted. */
                            window.clearTimeout(redirectRef.current);
                            reset();
                            setStep(1);
                        }}
                        className="btn btn-neutral w-full"
                    >
                        Use a different email
                    </button>
                </form>
            )}

            <p className="mt-5 text-center text-sm font-semibold text-ink-soft">
                Remembered it?{" "}
                <Link
                    to="/login"
                    className="font-extrabold text-fox-600 underline decoration-2 underline-offset-2 transition hover:text-fox-700"
                >
                    Back to sign in
                </Link>
            </p>
        </AuthLayout>
    );
};

export default RecoverPassword;
