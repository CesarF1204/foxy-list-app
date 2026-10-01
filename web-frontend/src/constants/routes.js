/**
 * The app's paths, in one place, so a path is spelled once. `/login` and `/register` are the
 * two modes of the same page, which is why the auth screen reads the current location to decide
 * which form to show.
 */
const ROUTES = {
    board: "/dashboard",
    root: "/",
    login: "/login",
    register: "/register",
    recoverPassword: "/recover-password",
    apiDocs: "/api-docs",
    admin: "/admin",
    adminOverview: "/admin/overview",
    adminUsers: "/admin/users",
    notFound: "/404",
};

/**
 * Which routes get the site footer. An allowlist rather than a list to skip, so the `*`
 * catch-all (which renders the 404 page) is covered for free, and a route added later comes up
 * bare rather than unexpectedly carrying one.
 */
const FOOTER_PATHS = [ROUTES.board, ROUTES.adminOverview, ROUTES.adminUsers, ROUTES.apiDocs];

export { ROUTES, FOOTER_PATHS };