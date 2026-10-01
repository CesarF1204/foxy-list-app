import ControlledMascot from "./ControlledMascot";
import { MASCOT_SHEETS, MASCOT_LABEL } from "../constants/mascot";
import { BOARDS, BOARD_META } from "../constants/boards";

/**
 * The two-column shell shared by the auth screens. The form is on the left on desktop with the
 * mascot and pitch on the right; on small screens the mascot moves above the form.
 * `mascotReaction` pins the fox's expression so a form can react to its own state; pass null
 * for the default cursor tracking.
 */
const AuthLayout = ({ title, subtitle, children, footer, mascotReaction = null }) => (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
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

            {/* Form panel */}
            <div className="animate-rise surface mx-auto w-full max-w-sm p-6 sm:p-8" style={{ animationDelay: "90ms" }}>
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
                    <h2 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h2>
                    {subtitle && <p className="mt-1.5 text-sm font-semibold text-ink-soft">{subtitle}</p>}
                </div>

                {children}

                {footer}
            </div>
        </div>
    </div>
);

export default AuthLayout;