/**
 * DOCU: The app's paths, in one place, so a path is spelled once. `/login` and
 * `/register` are the two modes of the same page, which is why the auth screen
 * reads the current location to decide which form to show.
 */
const ROUTES = {
    /** The signed-in board. `root` is only the site entry point and redirects
     *  here, so every link to the app's home is spelled once. */
    board: "/dashboard",
    root: "/",
    login: "/login",
    register: "/register",
    recoverPassword: "/recover-password",
    /** The admin area. `admin` is its root and only redirects; the two screens
     *  are `adminOverview` and `adminUsers`, each with its own linkable path so
     *  the URL says which screen you are on. */
    admin: "/admin",
    adminOverview: "/admin/overview",
    adminUsers: "/admin/users",
    notFound: "/404",
};

/**
 * DOCU: Which routes get the site footer. An allowlist rather than a list to
 * skip, so the `*` catch-all (which renders the 404 page) is covered for free,
 * and a route added later comes up bare rather than unexpectedly carrying one.
 * The admin pages get the same treatment as the board, being signed-in pages.
 */
const FOOTER_PATHS = [ROUTES.board, ROUTES.adminOverview, ROUTES.adminUsers];

export { ROUTES, FOOTER_PATHS };