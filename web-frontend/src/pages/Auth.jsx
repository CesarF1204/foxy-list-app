import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { signIn, registerUser } from "../api-client/users";
import { useAppContext } from "../contexts/useAppContext";
import { VALIDATE_TOKEN_KEY } from "../contexts/authQuery";
import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FormField";
import useAuthMascotMood from "../hooks/useAuthMascotMood";
import { MASCOT_HOLD_MS, fieldErrorToast } from "../helpers/mascotSheets";

/* TEMPORARY - mock layer only. See src/mock/index.js for how to remove it. */
import { MOCK_MODE } from "../mock";
import SampleCredentialsHint from "../mock/SampleCredentialsHint";

/**
 * DOCU: How long the fox gets to look pleased before the page changes. <br>
 * Without this the redirect happens in the same tick as the success and the
 * reaction never reaches the screen. It is the mascot's own success hold rather
 * than a number of its own, so the face is never cut off part way through.
 */
const SUCCESS_HOLD_MS = MASCOT_HOLD_MS.success;

/**
 * DOCU: The combined sign-in and register screen. <br>
 * Both live in one page and one component: the mode is decided by the current
 * route (`/login` or `/register`), so switching modes swaps the fields and the
 * URL together, and each mode is individually linkable and reloadable.
 */
const Auth = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { showToast } = useAppContext();
    const queryClient = useQueryClient();

    const isRegisterMode = location.pathname === "/register";

    const formApi = useForm();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = formApi;

    /*
      Each mode gets its own form instance. Keying on the mode makes React
      remount the form when the user switches, so values, validation errors and
      focus are all cleared automatically - far more reliable than trying to
      unregister the fields that are no longer on screen.
    */
    const formKey = isRegisterMode ? "register" : "login";

    /*
      Held in a ref rather than state: the redirect below runs on a timer, and a
      timer that fires after the user has navigated on would move them out of
      whatever page they are now looking at.
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

    const signInMutation = useMutation({
        mutationFn: signIn,
        onSuccess: () => {
            showToast({ message: "Signed in. Welcome back!", type: "SUCCESS" });
            /* Refetch the session so the board renders with the new user. */
            queryClient.removeQueries({ queryKey: VALIDATE_TOKEN_KEY, exact: true });
            redirectAfterCelebrating("/");
        },
        onError: (error) => showToast({ message: error.message, type: "ERROR" }),
    });

    const registerMutation = useMutation({
        mutationFn: registerUser,
        onSuccess: () => {
            showToast({ message: "Account created. Please sign in.", type: "SUCCESS" });
            redirectAfterCelebrating("/login");
        },
        onError: (error) => showToast({ message: error.message, type: "ERROR" }),
    });

    /*
      Only the request for the mode on screen may drive the fox. Handing it the
      other one would leave it showing the previous screen's result - a stale
      success, for instance, after a failed sign-in attempt.
    */
    const activeMutation = isRegisterMode ? registerMutation : signInMutation;

    /*
      Keyed on the mode so switching clears the old form and the old request.
      The hook owns the mood rules; see useAuthMascotMood.
    */
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
        navigate(isRegisterMode ? "/login" : "/register");
    };

    const isSubmitting = signInMutation.isPending || registerMutation.isPending;

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
                                required: "Required",
                                pattern: { value: /^[A-Za-z\s]+$/, message: "Letters only" },
                            })}
                        />
                        <FormField
                            id="lastName"
                            label="Last name"
                            autoComplete="family-name"
                            placeholder="Doe"
                            error={errors.lastName}
                            {...register("lastName", {
                                required: "Required",
                                pattern: { value: /^[A-Za-z\s]+$/, message: "Letters only" },
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
                        required: "Email is required",
                        pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: "Enter a valid email address",
                        },
                    })}
                />

                <FormField
                    id="password"
                    label="Password"
                    type="password"
                    autoComplete={isRegisterMode ? "new-password" : "current-password"}
                    placeholder="At least 6 characters"
                    error={errors.password}
                    {...register("password", {
                        required: "Password is required",
                        minLength: { value: 6, message: "Must be at least 6 characters" },
                    })}
                />

                {isRegisterMode && (
                    <FormField
                        id="confirmPassword"
                        label="Confirm password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        error={errors.confirmPassword}
                        {...register("confirmPassword", {
                            required: "Please confirm your password",
                            /* watch() reads the live password value for comparison. */
                            validate: (value) =>
                                value === watch("password") || "Passwords do not match",
                        })}
                    />
                )}

                {MOCK_MODE && !isRegisterMode && (
                    <SampleCredentialsHint
                        onFill={(values) => {
                            setValue("email", values.email, { shouldValidate: true });
                            setValue("password", values.password, { shouldValidate: true });
                        }}
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
                        to="/recover-password"
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
