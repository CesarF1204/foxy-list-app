import z from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { registerUserSchema } from '../validators/userValidator.js';

const SALT_ROUNDS = Number( process.env.BCRYPT_SALT_ROUNDS || 12 );

// Validates the user's session by reading the JWT stored in the `session` cookie.
// If the cookie is missing, the user is not authenticated.
// The token is verified using the server's JWT secret.
// The decoded token contains the user's ID (`sub`), which is used to fetch the user from the database.
// If the user exists, return their public profile information.
// Any verification failure (missing cookie, invalid token, expired token) results in a 401 response.
export const validateToken = async (req, res) => {
    try {
        const token = req.cookies.session;

        if (!token) {
            return res.status(401).json({ message: 'No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.sub).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'User not found.' });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        });
    } catch (error) {
        return res.status(401).json({ error: error.message, message: 'Invalid or expired token.' });
    }
};

/* Register a new user */
export const register = async ( req, res ) => {
    try {
        if ( !req.body ) {
            return res.status( 400 ).json( {
                message: 'All required fields must be provided.',
            } );
        }

        /** Validate request body */
        const validate = registerUserSchema.safeParse( req.body );

        if ( !validate.success ) {
            return res.status( 400 ).json( {
                message: validate.error.issues[ 0 ].message,
            } );
        }

        const { email, firstName, lastName, password } = validate.data

        /** Verify if user already exist */
        const existingUser = await User.findOne( { email: email.trim().toLowerCase() } );

        if ( existingUser ) {
            return res.status( 409 ).json( {
                message: 'Email is already registered.',
            } );
        }

        /**
         *  Generate a salt and hash the password
         *  This is to encrypt the password before saving on the database
         */
        const salt = await bcrypt.genSalt( SALT_ROUNDS );
        const hashedPassword = await bcrypt.hash( password, salt );

        /** Create a new user record on the database */
        const user = await User.create( {
            email,
            password: hashedPassword,
            firstName,
            lastName,
        } );

        return res.status( 201 ).json( {
            message: 'User registered successfully.',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        } );
    } catch ( error ) {
        console.error( 'Registration error:', error.message );
        return res.status( 500 ).json( {
            message: 'Internal server error.',
        } );
    }
};

// Log in an existing user
export const login = async ( req, res ) => {
    try {
        const { email, password } = req.body;

        if ( !email || !password ) {
            return res.status( 400 ).json( {
                message: 'Email and password are required.',
            } );
        }

        const user = await User.findOne( {
            email: email.trim().toLowerCase(),
        } ).select( '+password' );

        if ( !user ) {
            return res.status( 401 ).json( {
                message: 'Invalid email or password.',
            } );
        }

        // Compare the submitted password with the stored hash
        const isPasswordValid = await bcrypt.compare( password, user.password );

        if ( !isPasswordValid ) {
            return res.status( 401 ).json( {
                message: 'Invalid email or password.',
            } );
        }

        // Create a JWT token
        const token = jwt.sign(
            {
                sub: user._id.toString(),
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '1h',
            },
        );

        // Stores the JWT in an HTTP-only cookie named `session`.
        // - httpOnly: prevents JavaScript from accessing the cookie (protects against XSS attacks).
        // - sameSite: 'lax' allows the cookie to be sent on same-site navigation (safe default).
        // - secure: false for local development; must be true in production (HTTPS required).
        // - maxAge: sets the cookie expiration (1 hour in this case).
        // The frontend will automatically send this cookie with every request, enabling session-based auth.
        res.cookie('session', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 60 * 60 * 1000
        });

        return res.status( 200 ).json( {
            message: 'Login successful.',
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        } );
    } catch ( error ) {
        console.error( 'Login error:', error.message );
        return res.status( 500 ).json( {
            message: 'Internal server error.',
        } );
    }
};
