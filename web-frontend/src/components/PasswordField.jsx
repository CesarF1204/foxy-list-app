import { useState } from "react";

import FormField from "./FormField";
import Icon from "./icons/Icon";

/**
 * DOCU: A password field with a show/hide toggle, used by every password input
 * in the app - sign-in, register, reset and the admin set-password dialog - so
 * the behaviour cannot drift between screens.
 *
 * Two decisions are worth stating. First, the toggle only swaps the input's
 * `type` between "password" and "text"; the value is never rewritten, so
 * validation, submission and the form state are untouched by a click. Second,
 * each instance owns its own visibility state, which is what lets a new
 * password and its confirmation be revealed independently.
 *
 * The glyph comes from the shared `ICONS` registry, so the eye and the crossed
 * eye are the same two icons anywhere else they are needed. `Eye` is the
 * resting state (click to show) and `EyeOff` means the value is currently on
 * screen. The button names the action it performs rather than the state it
 * leaves behind, so it is always "Show password" when the value is hidden -
 * a label that describes the current state is ambiguous the moment it changes.
 *
 * The button is `type="button"`, so it can never submit the form, and it is
 * suppressed from `mousedown` so clicking it with a mouse leaves the caret in
 * the input instead of dropping focus onto the button. Keyboard users still
 * reach it by tabbing, where the ring is the same one every other control uses.
 */
const PasswordField = ({ id, inputClassName = "", ...inputProps }) => {
    const [isVisible, setIsVisible] = useState(false);

    const toggle = () => setIsVisible((shown) => !shown);

    return (
        <FormField
            {...inputProps}
            id={id}
            /* The type is the toggle, so a caller cannot override it. */
            type={isVisible ? "text" : "password"}
            inputClassName={`pr-11 ${inputClassName}`}
            endAdornment={
                <button
                    type="button"
                    onClick={toggle}
                    /* Keeps the caret in the field when the eye is clicked. */
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
