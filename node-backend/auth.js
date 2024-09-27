// This file provides authentication middleware using JSON Web Tokens (JWT).
// The verifyToken function checks for a valid token in the request headers,
// decodes it, and attaches the user ID to the request object if successful.
// This middleware is used to protect routes that require authentication.

const jwt = require('jsonwebtoken');

// Middleware to verify JWT tokens
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from Bearer TOKEN
    
    if (!token) {
        console.log('No token provided');
        return res.status(403).json({ message: 'No token provided' });
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('Failed to authenticate token:', err);
            return res.status(401).json({ message: 'Failed to authenticate token' });
        }
        // If token is valid, save the user ID for use in other routes
        req.userId = decoded.id;
        next();
    });
}

module.exports = { verifyToken };