/**
 * DOCU: The app footer. Rendered by `AppShell`, which also decides which pages
 * get one: only the board does. The year is read at render time so the notice
 * rolls over on its own.
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
