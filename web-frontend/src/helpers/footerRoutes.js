import { FOOTER_PATHS } from "../constants/routes";

/**
 * Whether the footer belongs on `pathname`. An exact match, not a prefix, and a
 * trailing slash is ignored. The allowlist and its reasoning live in
 * `src/constants/routes.js`.
 */
const showsFooter = (pathname) => FOOTER_PATHS.includes(pathname.replace(/\/+$/, "") || "/");

export { FOOTER_PATHS, showsFooter };
