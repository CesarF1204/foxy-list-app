import ControlledMascot from "./ControlledMascot";
import { MASCOT_SHEETS, MASCOT_LABEL } from "../constants/mascot";
import { BOARDS, BOARD_META } from "../constants/boards";

/**
 * The two-column shell shared by the auth screens. The form is on the left on desktop with the
 * mascot and pitch on the right; on small screens the mascot moves above the form.
 * `mascotReaction` pins the fox's expression so a form can react to its own state; pass null
 * for the default cursor tracking.
 */
/**
 * The shell. `px-4 py-8` on a phone, stepping to `px-4 py-10` and the wider gutter from `sm`.
 * The panel inside already has its own padding, and the two together were spending 88px of
 * vertical space on a phone before the user saw the first field - on a 667px screen that is
 * enough to push the submit button below the fold. The horizontal padding is left alone
 * because it is the same gutter every other page uses and the panel is `max-w-sm` anyway, so
 * it changes nothing except at the very narrowest widths.
 */
const AuthLayout = ({ title, subtitle, children, footer, mascotReaction = null }) => (
    <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid w-full max-w-4xl items-center gap-10 md:grid-cols-2 md:gap-14">
            {/* Mascot panel. Hidden on mobile, where it would push the form down. */}
            <div className="animate-rise hidden flex-col items-center text-center md:flex">
                <div className="relative">
                    {/* Square card behind the fox, with no transform: the mascot is
                        a size x size block, so `inset-0` already centres it. */}
                    <div
                        className="absolute inset-0 rounded-3xl border-2 border-ink bg-fox-200"
                        aria-hidden="true"
                    />
                    <ControlledMascot
                        {...MASCOT_SHEETS}
                        label={MASCOT_LABEL}
                        size={200}
                        className="relative"
                        reaction={mascotReaction}
                    />
                </div>

                <h1 className="mt-4 text-3xl font-extrabold text-ink">Foxy List</h1>
                <p className="mt-1 max-w-[16rem] text-sm font-semibold text-ink-soft">
                    A to-do board that keeps up with you. Drag a task when you start it,
                    drop it right when you finish.
                </p>

                <ul className="mt-5 flex flex-wrap justify-center gap-2">
                    {BOARDS.map((board) => (
                        <li
                            key={board}
                            className="rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-extrabold text-ink-soft"
                        >
                            {BOARD_META[board].label}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Form panel. `p-5` below `sm` rather than `p-6`, and `text-xl` below `sm` for
                the title rather than `text-2xl`: "Creating account..." as the submit
                label is the long case, and at 24px inside a `max-w-sm` panel on a
                360px screen the heading wrapped onto two lines while the form
                below it did not move - which is the most jarring kind of wrap,
                because the thing the user is about to type into shifts under
                their thumb. */}
            <div className="animate-rise surface mx-auto w-full max-w-sm p-5 sm:p-8" style={{ animationDelay: "90ms" }}>
                {/* The fox keeps a small presence on mobile too. */}
                <div className="mb-4 flex justify-center md:hidden">
                    <ControlledMascot
                        {...MASCOT_SHEETS}
                        label={MASCOT_LABEL}
                        size={84}
                        reaction={mascotReaction}
                    />
                </div>

                <div className="mb-6 text-center">
                    <h2 className="text-xl font-extrabold tracking-tight break-words text-ink sm:text-2xl">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="mt-1.5 text-sm font-semibold text-ink-soft">{subtitle}</p>
                    )}
                </div>

                {children}

                {footer}
            </div>
        </div>
    </div>
);

export default AuthLayout;