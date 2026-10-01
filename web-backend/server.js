import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes/api.routes.js';
import { swaggerRoutes } from './swagger/swaggerRoutes.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { connectDB, disconnectDB } from './config/db.js';
import { HTTP_STATUS, HTTP_METHODS } from './constants/http.js';
import { ROUTE_NOT_FOUND_MESSAGE } from './constants/messages.js';

/**
 * Loaded here, after the imports above: every module below reads process.env lazily,
 * inside a function or a handler, so none of them depends on it being set at load time.
 */
dotenv.config();

const app = express();

/** A request with no Origin header (curl, the tests) is not subject to CORS. */
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error(`Origin ${origin} is not allowed by CORS`));
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
