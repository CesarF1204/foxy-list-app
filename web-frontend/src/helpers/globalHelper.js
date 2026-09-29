/**
 * DOCU: The user's display name, falling back gracefully. <br>
 * The API stores first and last name separately, so this is the only place
 * that knows how to combine them.
 * @param {object} user
 * @returns {string}
 */
const getFullName = (user) =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Guest";

/**
 * DOCU: Builds the one-or-two letter initials shown in the avatar. <br>
 * Falls back to the email's first letter, then to "?", so the avatar is never
 * blank.
 * @param {object} user
 * @returns {string}
 */
const getInitials = (user) => {
    const fromName = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;
    if (fromName) return fromName.toUpperCase();

    const fromEmail = user?.email?.[0];
    return fromEmail ? fromEmail.toUpperCase() : "?";
};

/**
 * DOCU: The avatar image to show for a user, or "" when they have none. <br>
 * The demo/mock account is a local throwaway (see `src/mock/sampleData.js`, id
 * prefix "mock-user-"), so it gets a fixed picture; every real account keeps the
 * initials. Keeping the rule here means the navbar only asks "what do I show?".
 * @param {object} user
 * @returns {string} an image URL, or "" to fall back to the initials
 */
const DEMO_AVATAR_URL = "https://cdn-icons-png.flaticon.com/128/1797/1797233.png";
const DEMO_USER_ID_PREFIX = "mock-user-";

const getAvatarImage = (user) =>
    user?._id?.startsWith(DEMO_USER_ID_PREFIX) ? DEMO_AVATAR_URL : "";

/** DOCU: Today's date, formatted for the navbar. */
const getTodayLabel = (date = new Date()) =>
    date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
    });

export { getFullName, getInitials, getAvatarImage, getTodayLabel };