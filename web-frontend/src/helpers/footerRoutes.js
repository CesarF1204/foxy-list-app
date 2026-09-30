/**
 * Which routes get the site footer. <br>
 * Only the board does. Everything else is either a "front door" screen reached
 * before there is a session - sign in, register, password recovery - or a dead
 * end, and on all of them a copyright line is clutter: the forms are already a
 * full screen of content, and the not-found page is a dead end that should not
 * look like part of the product.
 *
 * This is an allowlist rather than a list of paths to skip, which is what makes
 * it cover the not-found page for free: `/404` is one route, but the `*`
 * catch-all renders that same page for *every* unknown URL, and no list of
 * excluded paths could ever enumerate those. Naming the one page that keeps the
 * footer is also the safer default - a route added later comes up bare rather
 * than unexpectedly carrying a footer.
 *
 * Kept out of `AppShell` so that file exports only a component, which is what
 * fast refresh needs to swap the shell in place during development.
 */
const FOOTER_PATHS = ["/"];

/**
 * Whether the footer belongs on `pathname`. <br>
 * An exact match, not a prefix: `/login-history` is not the board and gets no
 * footer. A trailing slash is ignored, because the router treats `/login/` as
 * `/login` and the two must not disagree.
 */
const showsFooter = (pathname) => FOOTER_PATHS.includes(pathname.replace(/\/+$/, "") || "/");

export { FOOTER_PATHS, showsFooter };
