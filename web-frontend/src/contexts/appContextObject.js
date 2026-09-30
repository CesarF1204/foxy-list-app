import { createContext } from "react";

/** DOCU: The app-wide context, in its own module so `AppContext.jsx` exports
 *  only a component (exporting both breaks React Fast Refresh). */
const AppContext = createContext(undefined);

export { AppContext };