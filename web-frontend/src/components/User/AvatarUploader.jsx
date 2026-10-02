import { AVATAR_ACCEPT } from "../../constants/user";
import { useAvatarUpload } from "../../hooks/useAvatarUpload";
import { Icon } from "../icons";
import Avatar from "./Avatar";

/**
 * The profile picture in the View Profile drawer, and the control that replaces it.
 *
 * The whole circle is the button; the camera badge says what clicking it does, and the
 * `title` tooltip spells it out in words for anyone who does not read a camera glyph as an
 * invitation. The progress ring is drawn over the picture rather than replacing it, so the
 * current image stays visible until the server confirms the new one.
 *
 * @param {object} props - The account whose picture this is
 * @param {object} props.user - The signed-in user, carrying the session's `avatar`
 * @param {object} [props.options] - Passed straight to `useAvatarUpload`, so an admin can point
 *   this at another account's endpoint. Left off, it is self-service.
 * @param {string} [props.label] - Names whose picture this is. An admin setting somebody else's
 *   needs it, because "your" would be a lie; self-service needs nothing.
 */
const AvatarUploader = ({ user, options, label: labelOverride }) => {
    const { inputRef, progress, isUploading, openFilePicker, handleFileChange } =
        useAvatarUpload(options);

    /** The ring's geometry: a 36px circle on a 44px canvas. */
    const radius = 18;
    const circumference = 2 * Math.PI * radius;

    /**
     * The one label, used twice: `aria-label` for assistive tech and `title` for the pointer
     * tooltip. They are kept on one string so the two can never drift apart and say different
     * things about the same control.
     */
    const label = labelOverride ?? (isUploading
        ? "Uploading your new profile picture"
        : "Change your profile picture");

    return (
        <>
            <button
                type="button"
                onClick={openFilePicker}
                disabled={isUploading}
                aria-label={label}
                title={label}
                className="relative flex cursor-pointer shrink-0 items-center justify-center rounded-full transition focus-visible:ring-4 focus-visible:ring-fox-200 focus-visible:outline-none disabled:cursor-progress"
            >
                <Avatar
                    user={user}
                    className="h-20 w-20 rounded-full text-2xl ring-2 ring-ink"
                />

                <span
                    aria-hidden="true"
                    className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-white text-ink shadow-pop-sm"
                >
                    <Icon name="camera" size={14} />
                </span>

                {isUploading && (
                    <span
                        className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-ink/60"
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Uploading profile picture, ${progress}%`}
                    >
                        <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
                            {/* The track: the whole circle, so the arc has something to fill. */}
                            <circle
                                cx="22"
                                cy="22"
                                r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                className="text-white/30"
                            />
                            <circle
                                cx="22"
                                cy="22"
                                r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference * (1 - progress / 100)}
                                className="text-white transition-[stroke-dashoffset] duration-200 ease-out"
                            />
                        </svg>

                        <span className="text-xs font-extrabold text-white tabular-nums">
                            {progress}%
                        </span>
                    </span>
                )}
            </button>

            {/*
              Kept in the DOM rather than created on demand: iOS cannot reopen a file input
              once unmounted, and this has to survive a re-render mid-upload.
            */}
            <input
                ref={inputRef}
                type="file"
                accept={AVATAR_ACCEPT}
                onChange={handleFileChange}
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
                data-testid="avatar-file-input"
            />
        </>
    );
};

export default AvatarUploader;
