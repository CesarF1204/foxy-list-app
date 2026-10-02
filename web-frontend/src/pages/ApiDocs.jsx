import { useAppContext } from "../contexts/useAppContext";
import Navbar from "../components/User/Navbar";
import ControlledMascot from "../components/ControlledMascot";
import { CRT_SHEETS, CRT_LABEL } from "../constants/mascot";
import { ApiDocumentation } from "../components/ApiDocumentation";

/**
 * The API documentation page.
 *
 * The viewer comes from the folder's barrel rather than from the file inside it, so the page
 * takes one import path and the folder stays free to rearrange itself. The barrel exports
 * named, so this is a named import - a default one would fail at load, not at build.
 *
 * The CRT keeps the developer page company in the header, beside the title rather than above
 * it, so it never pushes the viewer down the screen. It is decoration: the fox is the app's
 * character and already sits in the navbar, and a developer reading endpoints should meet
 * something closer to a terminal than another animal.
 *
 * Available to a signed-out visitor, deliberately: a developer integrating against this API
 * needs to read what sign-in *is* before they have one. The specification describes shapes
 * and never data, so there is nothing here to guard - and the backend serves
 * `/openapi.json` unauthenticated for exactly the same reason.
 */
const ApiDocs = () => {
    const { user } = useAppContext();

    return (
        <div className="flex-1">
            <Navbar user={user} />

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                {/* A flex row rather than a stacked header: the title takes the width it
                    needs and the CRT keeps its own, so neither is squeezed on a narrow
                    screen and the heading stays on one line as long as it can. */}
                {/* `text-2xl` below `sm` and `text-3xl` from `sm` up. "API Documentation" at
                30px is about 240px of text, which does not fit beside the CRT on a
                360px screen once the page's own padding is taken off - the heading was
                wrapping to two lines, or pushing the mascot out, depending on the
                viewport. It steps up once there is room for it. */}
            <div className="animate-rise mb-6 flex items-start gap-4">
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-extrabold tracking-tight break-words text-ink sm:text-3xl">
                        API Documentation
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-ink-soft">
                        Every endpoint the backend exposes, read live from its OpenAPI
                        specification.
                    </p>
                </div>

                    {/* Square card behind the CRT, the same construction AuthLayout uses.
                        `shrink-0` so it holds its size instead of being squeezed by the
                        heading, and the small screen keeps a reduced presence rather than
                        disappearing. */}
                    <div className="relative shrink-0">
                        <div
                            className="absolute inset-0 rounded-3xl border-2 border-ink bg-fox-200"
                            aria-hidden="true"
                        />
                        <ControlledMascot
                            {...CRT_SHEETS}
                            label={CRT_LABEL}
                            size={72}
                            className="relative"
                        />
                    </div>
                </div>

                <ApiDocumentation />
            </main>
        </div>
    );
};

export default ApiDocs;
