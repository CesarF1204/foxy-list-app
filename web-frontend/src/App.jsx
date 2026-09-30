import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryErrorResetBoundary } from "@tanstack/react-query";

import Auth from "./pages/Auth";
import RecoverPassword from "./pages/RecoverPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import AppShell from "./components/AppShell";
import { RequireAuth, RequireGuest } from "./components/RouteGuards";
import { ROUTES } from "./constants/routes";

/**
 * DOCU: The route table, mounted inside the shell. `/login` and `/register` are
 * two modes of the same page, so both render `Auth`, which picks the form from
 * the current location. See `AppShell` for the page frame and the footer.
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
                                        path={ROUTES.board}
                                        element={
                                            <RequireAuth>
                                                <Dashboard />
                                            </RequireAuth>
                                        }
                                    />
                                    <Route
                                        path={ROUTES.login}
                                        element={
                                            <RequireGuest>
                                                <Auth />
                                            </RequireGuest>
                                        }
                                    />
                                    <Route
                                        path={ROUTES.register}
                                        element={
                                            <RequireGuest>
                                                <Auth />
                                            </RequireGuest>
                                        }
                                    />
                                    <Route
                                        path={ROUTES.recoverPassword}
                                        element={
                                            <RequireGuest>
                                                <RecoverPassword />
                                            </RequireGuest>
                                        }
                                    />
                                    <Route path={ROUTES.notFound} element={<NotFound />} />
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