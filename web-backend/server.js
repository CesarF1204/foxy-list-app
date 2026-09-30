import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes/apiRoutes.js";

/* Loads .env file contents into process.env by default. */
dotenv.config();

/* Connect to database */
connectDB();

const app = express();

// Allowed methods and headers ensure the frontend can perform all necessary API call
app.use(
  cors({
    origin: "http://localhost:5175",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Parse cookies from incoming requests (required for reading JWT stored in cookies).

apiRoutes(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
