/**
 * DOCU: The demo/mock account's fixed picture. The account is a local throwaway
 * (see `src/mock/sampleData.js` and the id prefix below), so it gets a picture;
 * real accounts keep their initials.
 */
const DEMO_AVATAR_URL = "https://cdn-icons-png.flaticon.com/128/1797/1797233.png";

/** DOCU: The id prefix marking a user as the local demo account. Matched rather
 *  than flagged, so the rule survives a re-seed. */
const DEMO_USER_ID_PREFIX = "mock-user-";

/** DOCU: Shown in place of a name when the account has neither name set. */
const DISPLAY_NAME_FALLBACK = "Guest";

/** DOCU: Shown in the avatar when there is no name and no email to fall back on. */
const INITIALS_FALLBACK = "?";

export {
    DEMO_AVATAR_URL,
    DEMO_USER_ID_PREFIX,
    DISPLAY_NAME_FALLBACK,
    INITIALS_FALLBACK,
};