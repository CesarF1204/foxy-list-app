/** DOCU: A labelled input wired up for react-hook-form, centralising the label,
 *  error message and aria wiring so every field is announced the same way.
 *
 *  `endAdornment` takes a control to sit inside the input's right edge - the
 *  password eye uses it. The input is given matching right padding by the
 *  caller, so a value can never run underneath the control. */
const FormField = ({
    id,
    label,
    type = "text",
    error,
    inputClassName = "",
    endAdornment,
    ...inputProps
}) => {
    /* Accept either a plain string or a react-hook-form error object. */
    const errorText = typeof error === "string" ? error : error?.message;

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={type}
                    aria-invalid={Boolean(errorText)}
                    aria-describedby={errorText ? `${id}-error` : undefined}
                    className={`field ${inputClassName}`}
                    {...inputProps}
                />
                {endAdornment}
            </div>
            {errorText && (
                <span id={`${id}-error`} className="text-xs font-bold text-red-600">
                    {errorText}
                </span>
            )}
        </div>
    );
};

export default FormField;