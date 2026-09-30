/**
 * DOCU: The app footer. <br>
 * Rendered by the shell in `AppShell`, so it stays in place on every page
 * without each screen having to place it, and the shell decides which pages
 * get one at all - the sign-in, register and password recovery screens do not.
 * The year is read from the clock at
 * render time rather than written into the markup, so the notice rolls over on
 * its own on 1 January. <br>
 * Deliberately quiet: a single centered line, sized and coloured to match the
 * small secondary text used across the app. The 2px ink rule matches the
 * navbar's own bottom border, so the top and bottom of the page are framed the
 * same way.
 */
const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <footer className="mt-auto border-t-2 border-ink">
            <div className="mx-auto max-w-6xl px-4 py-5 text-center sm:px-6">
                <p className="text-xs font-semibold text-ink-faint sm:text-sm">
                    © {year} All Rights Reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
