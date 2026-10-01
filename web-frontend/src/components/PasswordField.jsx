import { useState } from "react";

import FormField from "./FormField";
import Icon from "./icons/Icon";

/**
 * A password field with a show/hide toggle, used by every password input in the app - sign-in,
 * register, reset and the admin set-password dialog - so the behaviour cannot drift between
 * screens.
 */
const PasswordField = ({ id, inputClassName = "", ...inputProps }) => {
    const [isVisible, setIsVisible] = useState(false);

    const toggle = () => setIsVisible((shown) => !shown);

    return (
        <FormField
            {...inputProps}
            id={id}
            /** The type is the toggle, so a caller cannot override it. */
            type={isVisible ? "text" : "password"}
            inputClassName={`pr-11 ${inputClassName}`}
            endAdornment={
                <button
                    type="button"
                    onClick={toggle}
                    /** Keeps the caret in the field when the eye is clicked. */
                    onMouseDown={(event) => event.preventDefault()}
                    aria-label={isVisible ? "Hide password" : "Show password"}
                    aria-pressed={isVisible}
                    title={isVisible ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-[0.7rem] text-ink-faint transition hover:text-ink focus-visible:ring-4 focus-visible:ring-fox-200 focus-visible:outline-none"
                >
                    <Icon name={isVisible ? "hide" : "show"} size={18} />
                </button>
            }
        />
    );
};

export default PasswordField;
