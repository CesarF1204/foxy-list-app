import { createContext } from "react";

/**
 * DOCU: The app-wide context. <br>
 * It lives in its own module so that `AppContext.jsx` exports only a component:
 * exporting both a component and a plain context object from one file breaks
 * React Fast Refresh, which is why the provider and the context are separated.
 */
const AppContext = createContext(undefined);

export { AppContext };