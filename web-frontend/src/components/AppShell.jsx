import { useLocation } from "react-router-dom";
import Footer from "./Footer";
import { showsFooter } from "../helpers/footerRoutes";

/**
 * DOCU: The app shell - a full-height column that frames the routed page and
 * pins the footer to the bottom of the viewport, dropping below the fold only
 * when a page is taller than the screen. <br>
 * The footer is rendered here rather than by each page so it stays in place
 * without every screen having to place it, and the decision of whether to show
 * it at all is made once, from the location - see `footerRoutes`. <br>
 * It sits *outside* the error boundary, so a crashed page keeps the footer too:
 * the boundary is passed in as `children`.
 */
const AppShell = ({ children }) => {
    const { pathname } = useLocation();

    return (
        <div className="flex min-h-screen flex-col">
            {children}

            {/* Sits at the bottom of every page, on every screen size. */}
            {showsFooter(pathname) && <Footer />}
        </div>
    );
};

export default AppShell;