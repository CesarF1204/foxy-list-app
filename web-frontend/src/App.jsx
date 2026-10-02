import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryErrorResetBoundary } from "@tanstack/react-query";

import Auth from "./pages/Auth";
import RecoverPassword from "./pages/RecoverPassword";
import Dashboard from "./pages/Dashboard";
import AdminOverview from "./pages/AdminOverview";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";
import ApiDocs from "./pages/ApiDocs";
import ErrorBoundary from "./components/ErrorBoundary";
import AppShell from "./components/AppShell";
import { RequireAuth, RequireGuest, RequireAdmin } from "./components/RouteGuards";
import { ROUTES } from "./constants/routes";

/**
 * The route table, mounted inside the shell. `/login` and `/register` are two modes of the same
 * page, so both render `Auth`, which picks the form from the current location. See `AppShell`
 * for the page frame and the footer.
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
                                    {/* The root has no screen of its own, so it redirects. */}
                                    <Route
                                        path={ROUTES.root}
                                        element={
                                            <RequireAuth>
                                                <Navigate to={ROUTES.board} replace />
                                            </RequireAuth>
                                        }
                                    />
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
                                    {/* A bare /admin is an index, not a screen, so it redirects. */}
                                    <Route
                                        path={ROUTES.admin}
                                        element={<Navigate to={ROUTES.adminOverview} replace />}
                                    />
                                    <Route
                                        path={ROUTES.adminOverview}
                                        element={
                                            <RequireAuth>
                                                <RequireAdmin>
                                                    <AdminOverview />
                                                </RequireAdmin>
                                            </RequireAuth>
                                        }
                                    />
                                    <Route
                                        path={ROUTES.adminUsers}
                                        element={
                                            <RequireAuth>
                                                <RequireAdmin>
                                                    <AdminUsers />
                                                </RequireAdmin>
                                            </RequireAuth>
                                        }
                                    />
                                    {/* Deliberately unguarded: the spec describes shapes, never data. */}
                                    <Route path={ROUTES.apiDocs} element={<ApiDocs />} />
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