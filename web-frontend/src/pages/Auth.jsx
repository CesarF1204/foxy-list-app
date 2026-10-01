import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { signIn, registerUser } from "../api-client/users";
import { useAppContext } from "../contexts/useAppContext";
import { VALIDATE_TOKEN_KEY } from "../constants/queryKeys";
import { ROUTES } from "../constants/routes";
import { TOAST_TYPES } from "../constants/toast";
import { MASCOT_HOLD_MS } from "../constants/mascot";
import {
    EMAIL_PATTERN,
    NAME_PATTERN,
    VALIDATION_MESSAGES,
    newPasswordRules,
    confirmPasswordRules,
} from "../constants/validation";
import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FormField";
import PasswordField from "../components/PasswordField";
import useAuthMascotMood from "../hooks/useAuthMascotMood";
import { fieldErrorToast } from "../helpers/mascotMood";

/** DOCU: How long the fox gets to look pleased before the page changes, so the
 *  success face is never cut off. */
const SUCCESS_HOLD_MS = MASCOT_HOLD_MS.success;

/**
 * DOCU: The combined sign-in and register screen. The mode is decided by the
 * route (`/login` or `/register`), so each mode is linkable and reloadable.
 */
const Auth = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { showToast } = useAppContext();
    const queryClient = useQueryClient();

    const isRegisterMode = location.pathname === ROUTES.register;

    const formApi = useForm();

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = formApi;

    /** Keying on the mode remounts the form when the user switches, so values,
     *  errors and focus all clear - more reliable than unregistering fields. */
    const formKey = isRegisterMode ? "register" : "login";

    /** In a ref, because the redirect runs on a timer that must not fire after
     *  the user has navigated on. */
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

    const signInMutation = useMutation({
        mutationFn: signIn,
        onSuccess: () => {
            showToast({
                message: "Signed in. Welcome back!",
                type: TOAST_TYPES.success,
            });
            /* Refetch the session so the board renders with the new user. */
            queryClient.removeQueries({ queryKey: VALIDATE_TOKEN_KEY, exact: true });
            redirectAfterCelebrating(ROUTES.board);
        },
        onError: (error) => showToast({ message: error.message, type: TOAST_TYPES.error }),
    });

    const registerMutation = useMutation({
        mutationFn: registerUser,
        onSuccess: () => {
            showToast({
                message: "Account created. Please sign in.",
                type: TOAST_TYPES.success,
            });
            redirectAfterCelebrating(ROUTES.login);
        },
        onError: (error) => showToast({ message: error.message, type: TOAST_TYPES.error }),
    });

    /** Only the request for the mode on screen may drive the fox, or it shows the
     *  previous screen's result. */
    const activeMutation = isRegisterMode ? registerMutation : signInMutation;

    /** Keyed on the mode so switching clears the old form and request. */
    const mascotReaction = useAuthMascotMood(
        formApi,
        activeMutation,
        isRegisterMode ? "register" : "login",
    );

    /** Clears the outgoing mode's errors and values, then swaps the route. */
    const switchMode = (event) => {
        event.preventDefault();
        window.clearTimeout(redirectRef.current);
        reset();
        navigate(isRegisterMode ? ROUTES.login : ROUTES.register);
    };

    const isSubmitting = signInMutation.isPending || registerMutation.isPending;

    /**
     * DOCU: A submit that never left the browser, since `handleSubmit` stops
     * before the mutation. The toast makes a rejected form announce itself the
     * same way a rejected request does, and gives the mascot the same signal.
     */
    const reportFieldErrors = (errors) => {
        const toast = fieldErrorToast(errors);
        if (toast) {
            showToast(toast);
        }
    };

    return (
        <AuthLayout
            title={isRegisterMode ? "Create your account" : "Welcome back"}
            subtitle={
                isRegisterMode
                    ? "Start organising your day in under a minute."
                    : "Sign in to pick up your board where you left it."
            }
            mascotReaction={mascotReaction}
        >
            {/* The mode is the route, so both URLs render this same page. */}
            <form
                key={formKey}
                className="flex w-full flex-col gap-4"
                onSubmit={handleSubmit(
                    isRegisterMode
                        ? /* confirmPassword exists only for client-side checks. */
                          (data) => {
                              const payload = { ...data };
                              delete payload.confirmPassword;
                              registerMutation.mutate(payload);
                          }
                        : (data) => signInMutation.mutate(data),
                    reportFieldErrors,
                )}
                noValidate
            >
                {isRegisterMode && (
                    <div className="grid grid-cols-2 gap-3">
                        <FormField
                            id="firstName"
                            label="First name"
                            autoComplete="given-name"
                            placeholder="Jane"
                            error={errors.firstName}
                            {...register("firstName", {
                                required: VALIDATION_MESSAGES.firstName.required,
                                pattern: {
                                    value: NAME_PATTERN,
                                    message: VALIDATION_MESSAGES.firstName.pattern,
                                },
                            })}
                        />
                        <FormField
                            id="lastName"
                            label="Last name"
                            autoComplete="family-name"
                            placeholder="Doe"
                            error={errors.lastName}
                            {...register("lastName", {
                                required: VALIDATION_MESSAGES.lastName.required,
                                pattern: {
                                    value: NAME_PATTERN,
                                    message: VALIDATION_MESSAGES.lastName.pattern,
                                },
                            })}
                        />
                    </div>
                )}

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

                <PasswordField
                    id="password"
                    label="Password"
                    autoComplete={isRegisterMode ? "new-password" : "current-password"}
                    placeholder="At least 6 characters"
                    error={errors.password}
                    {...register(
                        "password",
                        /* Sign-in only checks that something was typed: the length
                         * and whitespace rules are about the passwords the app
                         * accepts, and applying them to an existing account could
                         * lock out somebody whose password predates the rule.
                         * Register is the screen that sets one, so it takes the
                         * full rule set from the shared builder. */
                        isRegisterMode
                            ? newPasswordRules()
                            : {
                                  required: VALIDATION_MESSAGES.password.required,
                              },
                    )}
                />

                {isRegisterMode && (
                    <PasswordField
                        id="confirmPassword"
                        label="Confirm password"
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        error={errors.confirmPassword}
                        {...register(
                            "confirmPassword",
                            confirmPasswordRules(() => watch("password")),
                        )}
                    />
                )}

                <button type="submit" disabled={isSubmitting} className="btn btn-primary mt-1 w-full">
                    {isSubmitting
                        ? isRegisterMode
                            ? "Creating account..."
                            : "Signing in..."
                        : isRegisterMode
                          ? "Create account"
                          : "Sign in"}
                </button>

                {/* The link swaps the fields and the URL in one action. */}
                <p className="text-center text-sm font-semibold text-ink-soft">
                    {isRegisterMode ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                        type="button"
                        onClick={switchMode}
                        className="font-extrabold text-fox-600 underline decoration-2 underline-offset-2 transition hover:text-fox-700"
                    >
                        {isRegisterMode ? "Sign in instead" : "Register now"}
                    </button>
                </p>

                <p className="-mt-2 text-center text-sm font-semibold text-ink-soft">
                    <Link
                        to={ROUTES.recoverPassword}
                        className="font-extrabold text-ink-faint underline decoration-2 underline-offset-2 transition hover:text-ink"
                    >
                        Forgot your password?
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
};

export default Auth;
