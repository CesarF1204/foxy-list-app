import mongoose from "mongoose";

/**
 * User Schema
 * Represents a user account in the Todo application.
 * Each user contains authentication information, personal details,
 * and an assigned role that determines the user's access level.
 *
 * Collection: users
 * Fields:
 *
 * @property {String} email
 * User's email address.
 * * Required
 * * Must be unique
 * * Automatically converted to lowercase
 * * Whitespace is trimmed
 *
 * @property {String} password
 * User's password.
 * * Required
 * * Should contain a hashed password when stored in the database
 *
 * @property {String} firstName
 * User's first name.
 * * Required
 * * Whitespace is trimmed
 *
 * @property {String} lastName
 * User's last name.
 * * Required
 * * Whitespace is trimmed
 *
 * @property {String} photo
 * URL or path to the user's profile photo.
 * * Optional
 * * Whitespace is trimmed
 *
 * @property {String} role
 * Defines the user's access role within the application.
 * * Allowed values: "USER", "ADMIN"
 * * Defaults to "USER"
 *
 * Timestamps:
 * Mongoose automatically adds:
 * * createdAt: Date when the user was created
 * * updatedAt: Date when the user was last updated
 */

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    photo: {
      type: String,
      required: false,
      trim: true,
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
