/** DOCU: A labelled input wired up for react-hook-form, centralising the label,
 *  error message and aria wiring so every field is announced the same way. */
const FormField = ({ id, label, type = "text", error, inputClassName = "", ...inputProps }) => {
    /* Accept either a plain string or a react-hook-form error object. */
    const errorText = typeof error === "string" ? error : error?.message;

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">
                {label}
            </label>
            <input
                id={id}
                type={type}
                aria-invalid={Boolean(errorText)}
                aria-describedby={errorText ? `${id}-error` : undefined}
                className={`field ${inputClassName}`}
                {...inputProps}
            />
            {errorText && (
                <span id={`${id}-error`} className="text-xs font-bold text-red-600">
                    {errorText}
                </span>
            )}
        </div>
    );
};

export default FormField;