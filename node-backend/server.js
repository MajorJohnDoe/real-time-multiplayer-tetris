// This file serves as the main entry point for the backend server.
// It sets up the Express application, configures middleware, initializes Socket.IO,
// and connects the various components of the application (routes, socket handlers, database).
// The server handles both HTTP requests through Express routes and real-time
// communication through Socket.IO, providing a full-featured backend for the game.

// Import required modules
require('dotenv').config(); // Load environment variables

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require("socket.io");
const { setupSocketHandlers } = require('./socketHandlers');
const gameRoutes = require('./gameRoutes');
const playerRoutes = require('./playerRoutes');
const { createConnection } = require('./database');

// Initialize Express app and create HTTP server
const app = express();
const server = http.createServer(app);

// Set up Socket.IO with CORS configuration
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true
    }
});

const port = process.env.PORT || 3000;

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// Set up CORS for Express
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json());  // Parse JSON request bodies

// Make io available to the routes
app.set('io', io);

// Set up Socket.IO event handlers
setupSocketHandlers(io, createConnection);

// Define a simple test route
app.get('/api/hello', (req, res) => {
    res.json({ message: "Hello from Node.js backend!" });
});

// Use game and player route modules
app.use('/api', gameRoutes);
app.use('/api', playerRoutes);

// Start the server
server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});