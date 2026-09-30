import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

/* Loads .env file contents into process.env by default. */
dotenv.config();

/* Connect to database */
connectDB();

const app = express();

app.use( cors() );
app.use( express.json() ); // Parse JSON bodies

const PORT = process.env.PORT || 5000;
app.listen( PORT, () => console.log( `Server running on port ${ PORT }` ) );