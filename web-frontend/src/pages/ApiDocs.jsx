import { useAppContext } from "../contexts/useAppContext";
import Navbar from "../components/User/Navbar";
import ControlledMascot from "../components/ControlledMascot";
import { CRT_SHEETS, CRT_LABEL } from "../constants/mascot";
import { ApiDocumentation } from "../components/ApiDocumentation";

/**
 * The API documentation page.
 *
 * The viewer is a named import because the folder's barrel exports named; the CRT replaces the
 * navbar's fox, since a developer reading endpoints should meet a terminal.
 *
 * Deliberately available to a signed-out visitor: the spec describes shapes, never data.
 */
const ApiDocs = () => {
    const { user } = useAppContext();

    return (
        <div className="flex-1">
            <Navbar user={user} />

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <div className="animate-rise mb-6 flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-extrabold tracking-tight wrap-break-word text-ink sm:text-3xl">
                            API Documentation
                        </h1>
                        <p className="mt-1 text-sm font-semibold text-ink-soft">
                            Every endpoint the backend exposes, read live from its OpenAPI
                            specification.
                        </p>
                    </div>

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
