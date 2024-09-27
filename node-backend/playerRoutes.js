// This file defines the Express routes for player-related operations.
// It includes endpoints for player registration, login, retrieving lobby data,
// and updating player status.
// These routes interact with the database to manage player information and
// use JWT for authentication.
// The verifyToken middleware is used to protect routes that require authentication.
// The lobby and status update routes also interact with Socket.IO to broadcast
// real-time updates to connected clients.

const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const { createConnection } = require('./database');
const jwt = require('jsonwebtoken');

// Register a new player
router.post('/register', async (req, res) => {
    const { email, username } = req.body;
    try {
        const connection = await createConnection();
        await connection.execute(
            'INSERT INTO players (email, username) VALUES (?, ?)',
            [email, username]
        );
        await connection.end();
        res.json({ message: 'Player registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering player', error: error.message });
    }
});

// Player login
router.post('/login', async (req, res) => {
    const { email } = req.body;
    try {
        const connection = await createConnection();
        const [results] = await connection.execute(
            'SELECT * FROM players WHERE email = ?',
            [email]
        );
        
        if (results.length > 0) {
            const user = results[0];
            const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
            
            const [players] = await connection.execute(
                'SELECT id, username, status FROM players WHERE status != ? AND id != ?',
                ['playing', user.id]
            );

            const responseData = { 
                message: 'Login successful', 
                token, 
                user: { id: user.id, username: user.username, email: user.email },
                lobbyState: players
            };

            // Emit lobbyUpdate event (this should be handled by Socket.IO)
            // io.emit('lobbyUpdate', players);

            res.json(responseData);
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
        
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

// Get lobby data
router.get('/lobby', verifyToken, async (req, res) => {
    try {
        const connection = await createConnection();
        const [results] = await connection.execute(
            'SELECT id, username, status FROM players WHERE status != ? AND id != ?',
            ['playing', req.userId]
        );
        await connection.end();
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching lobby data', error: error.message });
    }
});

// Update player status
router.put('/player/status', verifyToken, async (req, res) => {
    const { status } = req.body;
    if (!['idle', 'looking', 'waiting', 'playing'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const connection = await createConnection();
        await connection.execute(
            'UPDATE players SET status = ? WHERE id = ?',
            [status, req.userId]
        );
        
        const [players] = await connection.execute(
            'SELECT id, username, status FROM players'
        );
        
        await connection.end();
        
        // Emit lobbyUpdate event (this should be handled by Socket.IO)
        // io.emit('lobbyUpdate', players);
        
        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating status', error: error.message });
    }
});

module.exports = router;