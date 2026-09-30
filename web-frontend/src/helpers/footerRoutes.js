/**
 * Which routes get the site footer. <br>
 * Sign-in, register and password recovery are the "front door" screens: they are
 * reached before there is a session, they are already a full screen of content,
 * and a copyright line underneath only adds clutter. Everywhere else - the
 * board, the not-found page - the footer stays.
 *
 * Kept out of `AppShell` so that file exports only a component, which is what
 * fast refresh needs to swap the shell in place during development.
 */
const FOOTERLESS_PATHS = ["/login", "/register", "/recover-password"];

/**
 * Whether the footer belongs on `pathname`. <br>
 * An exact match, not a prefix: `/login-history` is some other page and keeps
 * its footer.
 */
const showsFooter = (pathname) => !FOOTERLESS_PATHS.includes(pathname);

export { FOOTERLESS_PATHS, showsFooter };
