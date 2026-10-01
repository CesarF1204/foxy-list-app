import { useEffect } from "react";
import { useForm } from "react-hook-form";

import FormField from "../FormField";
import {
    EMAIL_PATTERN,
    NAME_PATTERN,
    VALIDATION_MESSAGES,
} from "../../constants/validation";

/**
 * The first name, last name and email editor, with the same field component, the same messages
 * and the same patterns as the auth forms
 */
const UserProfileForm = ({ user, isPending, serverError, onSave, onCancel }) => {
    const formApi = useForm();

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isDirty },
    } = formApi;

    /**
     * Re-seed the form whenever a different user is opened or the saved row comes back, so the
     * inputs never show a stale account's values.
     */
    useEffect(() => {
        reset({
            firstName: user?.firstName ?? "",
            lastName: user?.lastName ?? "",
            email: user?.email ?? "",
        });
    }, [user?._id, user?.firstName, user?.lastName, user?.email, reset]);

    /**
     * Puts a rejected request's field errors next to their own inputs. Anything not keyed by a
     * field becomes a general message instead.
     */
    const reportServerErrors = (error) => {
        const details = error?.fields;

        if (details && typeof details === "object") {
            for (const [field, message] of Object.entries(details)) {
                setError(field, { type: "server", message });
            }
            return;
        }

        setError("root", { type: "server", message: error?.message ?? "Could not save" });
    };

    return (
        <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={handleSubmit((values) => onSave(values).catch(reportServerErrors))}
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                    id="admin-first-name"
                    label="First name"
                    autoComplete="off"
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
                    id="admin-last-name"
                    label="Last name"
                    autoComplete="off"
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

            <FormField
                id="admin-email"
                label="Email"
                type="email"
                autoComplete="off"
                placeholder="name@example.com"
                error={errors.email}
                {...register("email", {
                    required: VALIDATION_MESSAGES.email.required,
                    pattern: {
                        value: EMAIL_PATTERN,
                        message: VALIDATION_MESSAGES.email.pattern,
                    },
                })}
            />

            {/* A rejected request that named no field of its own, e.g. a database
                failure. It is announced, and it is not pinned to the email box,
                which would blame the wrong field. */}
            {errors.root?.message && (
                <span className="text-xs font-bold text-red-600" role="alert">
                    {errors.root.message}
                </span>
            )}

            {serverError && (
                <span className="text-xs font-bold text-red-600" role="alert">
                    {serverError}
                </span>
            )}

            <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={onCancel} disabled={isPending} className="btn btn-neutral">
                    Cancel
                </button>
                <button type="submit" disabled={isPending || !isDirty} className="btn btn-primary">
                    {isPending ? "Saving..." : "Save changes"}
                </button>
            </div>
        </form>
    );
};

export default UserProfileForm;