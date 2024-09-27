// This file defines the Express routes for game-related operations.
// It includes endpoints for creating a new game, joining an existing game,
// and retrieving game information by player ID.
// These routes interact with the database to manage game states and
// use Socket.IO to broadcast real-time updates to connected clients.
// The verifyToken middleware is used to ensure that only authenticated
// users can access these endpoints.

const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const { createConnection } = require('./database');
const { updateLobby } = require('./socketHandlers');

// Create a new game
router.post('/game/create', verifyToken, async (req, res) => {
    let connection;
    try {
        connection = await createConnection();
        await connection.beginTransaction();

        const [result] = await connection.execute(
            'INSERT INTO games (player1_id, status) VALUES (?, ?)',
            [req.userId, 'waiting']
        );
        
        const gameId = result.insertId;

        await connection.execute(
            'UPDATE players SET status = ? WHERE id = ?',
            ['waiting', req.userId]
        );

        await connection.commit();

        // Update lobby for all clients
        await updateLobby(req.app.get('io'));
        
        res.json({ message: 'Game created successfully', gameId });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ message: 'Error creating game', error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// Join an existing game
router.post('/game/join/:gameId', verifyToken, async (req, res) => {
    const { gameId } = req.params;
    let connection;
    try {
        connection = await createConnection();
        
        const [gameCheck] = await connection.execute(
            'SELECT * FROM games WHERE id = ?',
            [gameId]
        );
        
        if (gameCheck.length === 0) {
            return res.status(404).json({ message: 'Game not found' });
        }
        
        if (gameCheck[0].status !== 'waiting') {
            return res.status(400).json({ message: 'Game is not available to join' });
        }
        
        if (gameCheck[0].player1_id === req.userId) {
            return res.status(400).json({ message: 'Cannot join your own game' });
        }
        
        await connection.execute(
            'UPDATE games SET player2_id = ?, status = ? WHERE id = ?',
            [req.userId, 'ready', gameId]
        );
        
        await connection.execute(
            'UPDATE players SET status = ? WHERE id = ?',
            ['waiting', req.userId]
        );

        // Update lobby for all clients
        await updateLobby(req.app.get('io'));
        
        // Emit playerJoined event to all players in the game room
        req.app.get('io').to(`game:${gameId}`).emit('playerJoined', { gameId, playerId: req.userId });
        
        res.json({ message: 'Joined game successfully', gameId });
    } catch (error) {
        console.error('Error joining game:', error);
        res.status(500).json({ message: 'Error joining game', error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// Get game by player ID
router.get('/game/by-player/:playerId', verifyToken, async (req, res) => {
    const { playerId } = req.params;
    try {
        const connection = await createConnection();
        const [results] = await connection.execute(
            'SELECT id FROM games WHERE player1_id = ? AND status = "waiting"',
            [playerId]
        );
        await connection.end();
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'No waiting game found for this player' });
        }
        
        res.json({ gameId: results[0].id });
    } catch (error) {
        console.error('Error fetching game by player:', error);
        res.status(500).json({ message: 'Error fetching game', error: error.message });
    }
});

// Add other game-related routes here

module.exports = router;