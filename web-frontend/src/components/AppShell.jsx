import { useLocation } from "react-router-dom";
import Footer from "./Footer";
import { showsFooter } from "../helpers/footerRoutes";

/**
 * DOCU: The app shell - a full-height column that frames the routed page and
 * pins the footer to the bottom. It sits outside the error boundary, so a
 * crashed page keeps the footer too. See `footerRoutes` for which pages get one.
 */
const AppShell = ({ children }) => {
    const { pathname } = useLocation();

    return (
        <div className="flex min-h-screen flex-col">
            {children}

            {showsFooter(pathname) && <Footer />}
        </div>
    );
};

export default AppShell;