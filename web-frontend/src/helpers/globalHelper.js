import { DISPLAY_NAME_FALLBACK, INITIALS_FALLBACK } from "../constants/user";

/** DOCU: The user's display name. The API stores the names separately, so this
 *  is the only place that knows how to combine them. */
const getFullName = (user) =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || DISPLAY_NAME_FALLBACK;

/** DOCU: The avatar initials, falling back to the email then "?" so the avatar
 *  is never blank. */
const getInitials = (user) => {
    const fromName = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;
    if (fromName) return fromName.toUpperCase();

    const fromEmail = user?.email?.[0];
    return fromEmail ? fromEmail.toUpperCase() : INITIALS_FALLBACK;
};

/** DOCU: Today's date, formatted for the navbar. */
const getTodayLabel = (date = new Date()) =>
    date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
    });

export { getFullName, getInitials, getTodayLabel };