import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryErrorResetBoundary } from "@tanstack/react-query";

import Auth from "./pages/Auth";
import RecoverPassword from "./pages/RecoverPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import Footer from "./components/Footer";
import { RequireAuth, RequireGuest } from "./components/RouteGuards";

/**
 * DOCU: The app shell and the route table. <br>
 * `/` is the task board and requires a session. `/login` and `/register` are the
 * two modes of the same page, so both paths render `Auth`, which decides which
 * form to show from the current location. <br>
 * The outer column is the shell: the routed page takes the slack in the middle
 * and the footer is pinned to the bottom of the viewport, dropping below the
 * fold only when a page is taller than the screen. It sits outside the error
 * boundary so a crashed page keeps the footer too.
 */
function App() {
    return (
        <Router>
            <div className="flex min-h-screen flex-col">
                <ErrorBoundary>
                    {/* Resets the query cache when navigating away from a failed route. */}
                    <QueryErrorResetBoundary>
                        {({ reset }) => (
                            <>
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

                                {/* Sits at the bottom of every page, on every screen size. */}
                                <Footer />
                            </>
                        )}
                    </QueryErrorResetBoundary>
                </ErrorBoundary>
            </div>
        </Router>
    );
}

export default App;