import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes/api.routes.js';
import { swaggerRoutes } from './swagger/swaggerRoutes.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { connectDB, disconnectDB } from './config/db.js';
import { HTTP_STATUS, HTTP_METHODS } from './constants/http.js';
import { ROUTE_NOT_FOUND_MESSAGE, CORS_REFUSED_MESSAGE } from './constants/messages.js';
import { forbidden } from './helpers/errorHelper.js';

/**
 * Loaded here, after the imports above: every module below reads process.env lazily,
 * inside a function or a handler, so none of them depends on it being set at load time.
 */
dotenv.config();

const app = express();

/** Removes a trailing slash, and any trailing whitespace, from an origin. */
const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, '');

/**
 * A request with no Origin header (curl, the tests, a server-to-server call) is not subject to
 * CORS. Anything else has to match an origin the frontend is actually served from.
 *
 * Comparison is exact after normalizing, because an `Origin` header never carries a path and
 * never carries a trailing slash - a browser sends `https://app.vercel.app`, never
 * `https://app.vercel.app/`. A value pasted into FRONTEND_URL with a trailing slash would
 * therefore never match, and the refusal would look like the origin had been left out
 * entirely. `URL` is also used to reject anything that is not a bare origin, so a value with a
 * path in it is caught at startup rather than as a request that mysteriously fails.
 *
 * Origins are matched literally, which means a Vercel *preview* deployment has to be listed
 * under the hash it was given, and that hash changes on every push. The running list is printed
 * at startup, and every refusal names the origin it turned away, so the value to add is never a
 * guess.
 */
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

/** Reports a malformed entry once at startup, rather than letting it fail a request later. */
allowedOrigins.forEach((origin) => {
    let parsed;

    try {
        parsed = new URL(origin);
    } catch {
        console.warn(`[cors] ignoring "${origin}": not a valid URL.`);
        return;
    }

    const { hostname, pathname, search, hash, protocol } = parsed;

    if (protocol !== 'http:' && protocol !== 'https:') {
        console.warn(`[cors] ignoring "${origin}": only http and https origins are supported.`);
        return;
    }

    if (pathname !== '/' || search || hash) {
        console.warn(
            `[cors] ignoring "${origin}": list a bare origin, with no path. A browser's Origin header never has one.`
        );
    }

    if (!hostname) console.warn(`[cors] ignoring "${origin}": no hostname.`);
});

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);

            console.warn(
                `[cors] refused ${origin}. Add it to FRONTEND_URL on the API host. Allowed: ${
                    allowedOrigins.join(', ') || '(none)'
                }`
            );

            /**
             * Refused with a real 403 rather than `new Error(...)`. Handing `cors` an Error sends
             * the request on to the generic error handler, which answers 500 "Something went
             * wrong" - a server fault reported for what is a configuration mistake, and with no
             * CORS headers either, so the browser shows a bare "CORS error".
             */
            return callback(forbidden(CORS_REFUSED_MESSAGE), false);
        },
        methods: HTTP_METHODS,
        credentials: true,
    })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/** A liveness probe for a container or a load balancer. */
app.get('/', (req, res) => {
    res.status(HTTP_STATUS.OK).json({ message: 'Foxy List API is running' });
});

/**
 * `/openapi.json` and the Swagger UI at `/api-docs`, registered before the API routers so a
 * future `/api` path cannot shadow them. The document is built when this line runs, which is
 * after `dotenv.config()` above - see `swagger/swaggerRoutes.js`.
 */
swaggerRoutes(app);

apiRoutes(app);

/** Unknown API routes answer with JSON, never the default HTML error page. */
app.use('/api', (req, res) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
        message: `${ROUTE_NOT_FOUND_MESSAGE}: ${req.method} ${req.originalUrl}`,
    });
});

app.use(errorMiddleware);

/** Connect before listening, so the API is never reachable with no database behind it. */
await connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    /**
     * Printed so a refused origin can be matched against the value this process is actually
     * running with, rather than the one that was intended. An empty list here is the usual
     * reason every browser request is refused.
     */
    console.log(`[cors] allowed origins: ${allowedOrigins.join(', ') || '(none)'}`);
});

/** Closes the server and the database connection on a clean shutdown. */
const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down`);
    server.close();
    await disconnectDB();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
