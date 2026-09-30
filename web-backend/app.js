import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes/api.routes.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { HTTP_STATUS, HTTP_METHODS } from './constants/http.js';
import { DEFAULT_FRONTEND_URL, MAX_REQUEST_BODY_SIZE } from './constants/env.js';
import { ROUTE_NOT_FOUND_MESSAGE } from './constants/messages.js';

/** Kept separate from server.js so the tests can drive it without a port. */
const app = express();

/** A request with no Origin header (curl, the tests) is not subject to CORS. */
const allowedOrigins = (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL)
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

app.use(express.json({ limit: MAX_REQUEST_BODY_SIZE }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/** A liveness probe for a container or a load balancer. */
app.get('/', (req, res) => {
    res.status(HTTP_STATUS.OK).json({ message: 'Foxy List API is running' });
});

apiRoutes(app);

/** Unknown API routes answer with JSON, never the default HTML error page. */
app.use('/api', (req, res) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
        message: `${ROUTE_NOT_FOUND_MESSAGE}: ${req.method} ${req.originalUrl}`,
    });
});

app.use(errorMiddleware);

export default app;