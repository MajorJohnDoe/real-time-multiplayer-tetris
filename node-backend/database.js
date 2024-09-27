// This file handles database connections using mysql2/promise.
// It exports a createConnection function that creates and returns a new database connection.
// The database configuration is loaded from environment variables for security.
// This module is used throughout the application to interact with the MySQL database.

const mysql = require('mysql2/promise');

// Database configuration object
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// Function to create a new database connection
async function createConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Database connected successfully');
        return connection;
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}

module.exports = { createConnection };