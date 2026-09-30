import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryErrorResetBoundary } from "@tanstack/react-query";

import Auth from "./pages/Auth";
import RecoverPassword from "./pages/RecoverPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import AppShell from "./components/AppShell";
import { RequireAuth, RequireGuest } from "./components/RouteGuards";

/**
 * DOCU: The route table, mounted inside the shell. <br>
 * `/` is the task board and requires a session. `/login` and `/register` are the
 * two modes of the same page, so both paths render `Auth`, which decides which
 * form to show from the current location. <br>
 * The shell owns the page frame and decides whether the footer appears at all -
 * see `AppShell`, which keeps the sign-in, register and password recovery
 * screens free of it. The footer stays outside the error boundary so a crashed
 * page keeps it too.
 */
function App() {
    return (
        <Router>
            <AppShell>
                <ErrorBoundary>
                    {/* Resets the query cache when navigating away from a failed route. */}
                    <QueryErrorResetBoundary>
                        {({ reset }) => (
                            <div className="flex flex-1 flex-col">
                                <Routes>
                                    {/* The board is the default page. */}
                                    <Route
                                        path="/"
                                        element={
                                            <RequireAuth>
                                                <Dashboard />
                                            </RequireAuth>
                                        }
                                    />
                                    <Route
                                        path="/login"
                                        element={
                                            <RequireGuest>
                                                <Auth />
                                            </RequireGuest>
                                        }
                                    />
                                    <Route
                                        path="/register"
                                        element={
                                            <RequireGuest>
                                                <Auth />
                                            </RequireGuest>
                                        }
                                    />
                                    <Route
                                        path="/recover-password"
                                        element={
                                            <RequireGuest>
                                                <RecoverPassword />
                                            </RequireGuest>
                                        }
                                    />
                                    <Route path="/404" element={<NotFound />} />
                                    {/* Unknown paths fall through to the not-found page. */}
                                    <Route path="*" element={<NotFound onReset={reset} />} />
                                </Routes>
                            </div>
                        )}
                    </QueryErrorResetBoundary>
                </ErrorBoundary>
            </AppShell>
        </Router>
    );
}

export default App;