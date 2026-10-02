import { useState } from "react";

import { getInitials } from "../../helpers/globalHelper";

/**
 * The one way the app draws a profile picture: the image when the account has one, its
 * initials otherwise.
 *
 * `alt` is empty by default because the name always sits beside the picture. A picture that
 * fails to load falls back to the initials rather than a broken-image glyph.
 *
 * @param {object} props - The user to draw, plus the sizing the call site wants
 * @param {object} props.user - The account; `avatar` is the Cloudinary URL, `""` when unset
 * @param {string} [props.className] - Classes for the box
 * @param {string} [props.imgClassName] - Classes for the `<img>` inside it
 * @param {string} [props.alt] - Override for the image's alt text
 */
const Avatar = ({ user, className = "", imgClassName = "", alt = "" }) => {
    /** The URL that failed to load, so a new URL is free to be tried again. */
    const [failedUrl, setFailedUrl] = useState(null);

    const picture = user?.avatar;
    const showPicture = Boolean(picture) && picture !== failedUrl;

    return (
        <span
            className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-ink bg-fox-400 font-extrabold text-white ${className}`}
        >
            {showPicture ? (
                <img
                    key={picture}
                    src={picture}
                    alt={alt}
                    className={`h-full w-full object-cover ${imgClassName}`}
                    onError={() => setFailedUrl(picture)}
                />
            ) : (
                <span aria-hidden={alt ? undefined : "true"}>{getInitials(user)}</span>
            )}
        </span>
    );
};

export default Avatar;