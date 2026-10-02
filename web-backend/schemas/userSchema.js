import mongoose from 'mongoose';
import { USER_ROLES, DEFAULT_ROLE, ACCOUNT_STATUSES, DEFAULT_ACCOUNT_STATUS } from '../constants/roles.js';
import { NAME_MAX_LENGTH, AVATAR_URL_MAX_LENGTH } from '../constants/validation.js';

/**
 * DOCU: Defines the schema for a user <br>
 * It specifies the fields and their validation rules for a user record <br>
 * Last Updated Date: October 1, 2026 <br>
 * @constant userSchema
 * @type {Schema}
 * @description Defines the Mongoose schema for users, covering their name, email, password hash, and the two authorisation fields the admin API writes.
 * @property {String} firstName - The user's first name. Required, trimmed, and at most 60 characters.
 * @property {String} lastName - The user's last name. Required, trimmed, and at most 60 characters.
 * @property {String} email - The user's email address. Required, unique, lowercased and trimmed, so one mailbox is one account.
 * @property {String} password - The user's password hash. Required, and excluded from every query unless one is explicitly requested.
 * @property {String} role - What the account may do. Must be one of USER_ROLES and defaults to DEFAULT_ROLE.
 * @property {String} status - Whether the account may still sign in. Must be one of ACCOUNT_STATUSES and defaults to DEFAULT_ACCOUNT_STATUS.
 * @property {String} avatar - The Cloudinary secure URL of the profile picture, or an empty string when none has been uploaded.
 * @property {Date} createdAt - Timestamp of when the account was created (automatically added by Mongoose).
 * @property {Date} updatedAt - Timestamp of when the account was last updated (automatically added by Mongoose).
 * @author Kate, Updated by: Cesar
 */
const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
            maxlength: [NAME_MAX_LENGTH, `First name must be under ${NAME_MAX_LENGTH} characters`],
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
            maxlength: [NAME_MAX_LENGTH, `Last name must be under ${NAME_MAX_LENGTH} characters`],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            select: false,
        },
        role: {
            type: String,
            enum: {
                values: USER_ROLES,
                message: `Role must be one of: ${USER_ROLES.join(', ')}`,
            },
            default: DEFAULT_ROLE,
        },
        status: {
            type: String,
            enum: {
                values: ACCOUNT_STATUSES,
                message: `Status must be one of: ${ACCOUNT_STATUSES.join(', ')}`,
            },
            default: DEFAULT_ACCOUNT_STATUS,
        },
        /** The Cloudinary secure URL of the profile picture, `''` when none is set. */
        avatar: {
            type: String,
            default: '',
            trim: true,
            maxlength: [AVATAR_URL_MAX_LENGTH, `Profile picture URL must be under ${AVATAR_URL_MAX_LENGTH} characters`],
        },
        passwordResetToken: {
            type: String,
            default: null,
        },
        passwordResetExpiration: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

/**
 * DOCU: Looks an account up by email with its password hash included.
 * Last Updated Date: October 1, 2026
 * @function findForLogin
 * @param {string} email - The email address
 * @returns {Promise<object|null>} The account, with a password hash
 * @author Cesar
 */
userSchema.statics.findForLogin = function findForLogin(email) {
    return this.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
};

export default mongoose.model('User', userSchema);
