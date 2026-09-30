import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { registerUserSchema } from "../validators/userValidator.js";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

/* Register a new user */
export const register = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        message: "All required fields must be provided.",
      });
    }

    /** Validate request body */
    const validate = registerUserSchema.safeParse(req.body);

    if (!validate.success) {
      return res.status(400).json({
        message: validate.error.issues[0].message,
      });
    }

    const { email, firstName, lastName, password } = validate.data;

    /** Verify if user already exist */
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    /**
     *  Generate a salt and hash the password
     *  This is to encrypt the password before saving on the database
     */
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);

    /** Create a new user record on the database */
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });

    return res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// Log in an existing user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Compare the submitted password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Create a JWT token
    const token = jwt.sign(
      {
        sub: user._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};
