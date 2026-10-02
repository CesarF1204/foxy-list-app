import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Ban,
    Camera,
    Check,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Edit2,
    Eye,
    EyeOff,
    InfoCircle,
    Login,
    Logout,
    More,
    Plus,
    Search,
    SortDownUp,
    Trash2,
    UserCheck,
    X,
} from "reicon-react";

/** The one place the app decides which icon means what. */
const ICONS = {
    /** Adding: the "Add a task" composer. */
    add: { Component: Plus },

    /** Editing: a task card, a user profile, anything opened in an editor. */
    edit: { Component: Edit2 },

    /** Removing: a task or a user account, always destructive. */
    remove: { Component: Trash2 },

    /** Dismissing: the close button on a modal, drawer or toast. */
    close: { Component: X },

    /**
     * Revealing a password. Paired with `hide`; the pair is the only place the two states are
     * allowed to differ, because the glyph *is* the state.
     */
    show: { Component: Eye },
    hide: { Component: EyeOff },

    /**
     * Signing in and out. The sign-out glyph is deliberately not the sign-in glyph reversed:
     * one is a door you go through, the other the door you leave by, and the app labels both in
     * words beside them.
     */
    signIn: { Component: Login },
    signOut: { Component: Logout },

    /** Paging. Arrows, not chevrons: the pager moves a whole screen of rows. */
    previous: { Component: ArrowLeft },
    next: { Component: ArrowRight },

    /**
     * Sorting. Three states, each distinguishable without colour: two arrows when the column is
     * unsorted, one filled chevron pointing the way the column is sorted when it is the active
     * one.
     */
    sortNone: { Component: SortDownUp },
    sortAscending: { Component: ChevronUp, weight: "Filled" },
    sortDescending: { Component: ChevronDown, weight: "Filled" },

    /**
     * A row's overflow menu - the kebab. ReIcon draws its three dots across, so it is turned a
     * quarter turn here rather than the path data being copied into a vertical variant by hand.
     */
    rowActions: { Component: More, className: "rotate-90" },

    /** Inspecting a record: the users table's "View user". */
    view: { Component: Eye },

    /**
     * Account status, in both directions. A ban for blocking, a tick-in-a-user for restoring,
     * so the state is legible before the words are read.
     */
    block: { Component: Ban },
    unblock: { Component: UserCheck },

    /** A bare tick: a completed task, a completed step. */
    check: { Component: Check },

    /**
     * The marker on a closed dropdown, wherever one is closed by hand: the navbar's account
     * trigger and a closed select. On the select it replaces the browser's own arrow, which is
     * the one piece of chrome in the app no stylesheet could reach, and which differs on every
     * operating system.
     */
    chevronDown: { Component: ChevronDown },

    /** Toast status marks, one per toast type. */
    toastSuccess: { Component: CheckCircle },
    toastError: { Component: AlertCircle },
    toastInfo: { Component: InfoCircle },

    /** Searching and filtering. */
    search: { Component: Search },

    /**
     * Replacing the profile picture: the badge on the camera overlay.
     *
     * A camera rather than a pencil, because what it opens is the picker for an image.
     */
    camera: { Component: Camera },
};

/**
 * Icons are square, so a size is a length rather than a width and a height. The default suits a
 * control beside `text-sm` body copy.
 */
const DEFAULT_ICON_SIZE = 18;

/**
 * ReIcon outlines are drawn at a 1.5 stroke on a 24-unit grid, which is lighter than the rest
 * of the app - this UI is deliberately chunky, and the controls it sits in are 2px borders and
 * hard shadows. 2 is the value the hand-drawn icons used, so migrating does not make every icon
 * look thinner than the box around it.
 */
const DEFAULT_ICON_STROKE_WIDTH = 2;

export { ICONS, DEFAULT_ICON_SIZE, DEFAULT_ICON_STROKE_WIDTH };