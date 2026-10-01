import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { forgotPassword, resetPassword } from "../api-client/users";
import { useAppContext } from "../contexts/useAppContext";
import { ROUTES } from "../constants/routes";
import { TOAST_TYPES } from "../constants/toast";
import { MASCOT_HOLD_MS } from "../constants/mascot";
import {
    EMAIL_PATTERN,
    VALIDATION_MESSAGES,
    newPasswordRules,
    confirmPasswordRules,
} from "../constants/validation";
import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FormField";
import PasswordField from "../components/PasswordField";
import Icon from "../components/icons/Icon";
import useAuthMascotMood from "../hooks/useAuthMascotMood";
import { fieldErrorToast } from "../helpers/mascotMood";

const SUCCESS_HOLD_MS = MASCOT_HOLD_MS.success;

/**
 * Password recovery, in two steps on one page, so the address never has to be passed around in
 * the URL or retyped.
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

    /**
     * Cleared on unmount: the redirect would otherwise move the user again after they had
     * already navigated somewhere else.
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
     * Moves to the next step, holding the email across. Read before the step changes: after it,
     * the step one fields are unmounted.
     */
    const goToStep = (nextStep) => {
        const email = getValues("email");
        setStep(nextStep);
        reset({ email });
    };

    const forgotMutation = useMutation({
        mutationFn: forgotPassword,
        onSuccess: () => {
            showToast({
                message: "Reset link sent. Check your inbox.",
                type: TOAST_TYPES.success,
            });
            /**
             * A short pause so the fox gets to be pleased, then on to step two. `replace` is
             * not wanted: back should skip this step.
             */
            window.clearTimeout(redirectRef.current);
            redirectRef.current = window.setTimeout(() => goToStep(2), SUCCESS_HOLD_MS);
        },
        onError: (error) => showToast({ message: error.message, type: TOAST_TYPES.error }),
    });

    const resetMutation = useMutation({
        mutationFn: resetPassword,
        onSuccess: () => {
            showToast({
                message: "Password updated. Please sign in.",
                type: TOAST_TYPES.success,
            });
            redirectAfterCelebrating(ROUTES.login);
        },
        onError: (error) => showToast({ message: error.message, type: "ERROR" }),
    });

    /** Only the request for the step on screen drives the fox. */
    const activeMutation = step === 1 ? forgotMutation : resetMutation;

    /**
     * A submit that never left the browser, since `handleSubmit` stops before the mutation. The
     * toast makes a rejected form announce itself the same way a rejected request does, and
     * gives the mascot the same signal.
     */
    const reportFieldErrors = (errors) => {
        const toast = fieldErrorToast(errors);
        if (toast) {
            showToast(toast);
        }
    };

    /**
     * Keyed on the step, so moving between them clears the previous step's verdict and form
     * state.
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
                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink transition ${
                                step === number
                                    ? "bg-fox-400 text-white"
                                    : step > number
                                      ? "bg-done text-white"
                                      : "bg-white text-xs font-extrabold text-ink-faint"
                            }`}
                        >
                            {/* A finished step is the app's tick, not a `✓`
                                character - the same mark a completed task card
                                wears, so "done" looks the same everywhere. */}
                            {step > number ? <Icon name="check" size={14} /> : <span>{number}</span>}
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
                            required: VALIDATION_MESSAGES.email.required,
                            pattern: {
                                value: EMAIL_PATTERN,
                                message: VALIDATION_MESSAGES.email.pattern,
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
                            /** The email comes from step one, not from the user again. */
                            const { email } = getValues();
                            resetMutation.mutate({ email, password: data.password });
                        },
                        reportFieldErrors,
                    )}
                    noValidate
                >
                    <PasswordField
                        id="password"
                        label="New password"
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        error={errors.password}
                        {...register("password", newPasswordRules())}
                    />

                    <PasswordField
                        id="confirmPassword"
                        label="Confirm new password"
                        autoComplete="new-password"
                        placeholder="Re-enter your new password"
                        error={errors.confirmPassword}
                        {...register(
                            "confirmPassword",
                            confirmPasswordRules(() => watch("password")),
                        )}
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
                            /** Step two's form state is no longer wanted. */
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
