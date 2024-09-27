// This file handles all Socket.IO events for real-time game communication.
// It manages player connections, game rooms, player moves, and game state updates.
// The file interacts closely with the database to persist game and player information,
// and broadcasts updates to relevant clients to keep the game state synchronized.

const { createConnection } = require('./database');
const mysql = require('mysql2/promise');

// Store active games in memory
const games = new Map();

function setupSocketHandlers(io, createDbConnection) {
    io.on('connection', (socket) => {
        console.log('A user connected');

        // Handle user login
        socket.on('login', async (userId) => {
            console.log(`User ${userId} logged in`);
            await updateLobby(io);
        });

        // Handle user disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected');
            // Remove disconnected player from games
            for (const [gameId, game] of games) {
                for (const [playerId, player] of game.players) {
                    if (player.socket === socket.id) {
                        game.players.delete(playerId);
                        io.to(`game:${gameId}`).emit('playerDisconnected', { gameId, playerId, playerNumber: player.playerNumber });
                        break;
                    }
                }
                if (game.players.size === 0) {
                    games.delete(gameId);
                }
            }
            updateLobby(io);
        });

        // Handle player joining a game room
        socket.on('joinGameRoom', async ({ gameId, playerId }, callback) => {
            try {
                const connection = await createConnection();
                const [results] = await connection.execute(
                    'SELECT player1_id, player2_id FROM games WHERE id = ?',
                    [gameId]
                );
                await connection.end();

                if (results.length === 0) {
                    callback({ success: false, error: 'Game not found' });
                    return;
                }

                const game = results[0];
                let playerNumber = game.player1_id == playerId ? 1 : (game.player2_id == playerId ? 2 : null);

                if (playerNumber === null) {
                    callback({ success: false, error: 'Player not in this game' });
                    return;
                }

                socket.join(`game:${gameId}`);
                console.log(`Player ${playerId} (Player ${playerNumber}) joined game room ${gameId}`);
                
                if (!games.has(gameId)) {
                    games.set(gameId, { players: new Map() });
                }
                games.get(gameId).players.set(playerId, { socket: socket.id, playerNumber });

                io.to(`game:${gameId}`).emit('opponentJoined', { gameId, playerId });
                callback({ success: true, playerNumber });
            } catch (error) {
                console.error('Error joining game room:', error);
                callback({ success: false, error: 'Server error' });
            }
        });

        // Handle player ready state
        socket.on('playerReady', async ({ gameId, playerId }, callback) => {
            console.log(`Player ${playerId} trying to set ready for game ${gameId}`);
            let connection;
            try {
                connection = await createDbConnection();
                await connection.execute(
                    'UPDATE games SET player1_ready = CASE WHEN player1_id = ? THEN 1 ELSE player1_ready END, player2_ready = CASE WHEN player2_id = ? THEN 1 ELSE player2_ready END WHERE id = ?',
                    [playerId, playerId, gameId]
                );
                const [results] = await connection.execute(
                    'SELECT player1_id, player2_id, player1_ready, player2_ready FROM games WHERE id = ?',
                    [gameId]
                );

                const game = results[0];
                const playerNumber = game.player1_id == playerId ? 1 : 2;
                const allReady = game.player1_ready && game.player2_ready;

                console.log(`Emitting playerReady event for game ${gameId}. Player ${playerNumber} ready. All ready: ${allReady}`);
                io.to(`game:${gameId}`).emit('playerReady', { gameId, playerNumber, allReady });

                if (allReady) {
                    console.log(`All players ready for game ${gameId}. Starting countdown.`);
                    io.to(`game:${gameId}`).emit('allPlayersReady', gameId);
                    setTimeout(() => {
                        console.log(`Countdown finished for game ${gameId}. Starting game.`);
                        io.to(`game:${gameId}`).emit('gameStart', gameId);
                    }, 5000);
                }

                if (callback) callback({ success: true, playerNumber, allReady });
            } catch (error) {
                console.error('Error setting player ready:', error);
                if (callback) callback({ success: false, error: error.message });
            } finally {
                if (connection) await connection.end();
            }
        });

        // Handle player moves
        socket.on('playerMove', (data) => {
            socket.to(`game:${data.gameId}`).emit('opponentMove', {
                gameId: data.gameId,
                playerNumber: data.playerNumber,
                arena: data.arena,
                playerPos: data.playerPos,
                playerMatrix: data.playerMatrix
            });
        });

        // Handle score updates
        socket.on('updateScore', (data) => {
            console.log('Received score update:', data);
            io.to(`game:${data.gameId}`).emit('scoreUpdate', {
                gameId: data.gameId,
                playerId: data.playerId,
                score: data.score
            });
        });

        // Handle game over
        // TODO: Not currently working
        socket.on('gameOver', async (data) => {
            console.log('Game over:', data);
            const game = games.get(data.gameId);
            if (game) {
                const winnerId = Array.from(game.players.keys()).find(id => id != data.playerId);
                await updatePlayerStats(winnerId, data.playerId);
                io.to(`game:${data.gameId}`).emit('gameResult', {
                    gameId: data.gameId,
                    loserId: data.playerId,
                    winnerId: winnerId
                });
            }
        });

        // Handle player status updates
        socket.on('updateStatus', async (userId, status) => {
            try {
                const connection = await createConnection();
                await connection.execute(
                    'UPDATE players SET status = ? WHERE id = ?',
                    [status, userId]
                );
                await connection.end();
                await updateLobby(io);
            } catch (error) {
                console.error('Error updating status:', error);
            }
        });
    });
}

// Update player statistics after a game
async function updatePlayerStats(winnerId, loserId) {
    try {
        const connection = await createConnection();
        await connection.execute(
            'UPDATE players SET wins = wins + 1 WHERE id = ?',
            [winnerId]
        );
        await connection.execute(
            'UPDATE players SET losses = losses + 1 WHERE id = ?',
            [loserId]
        );
        await connection.end();
    } catch (error) {
        console.error('Error updating player stats:', error);
    }
}

// Update the lobby for all connected clients
async function updateLobby(io) {
    try {
        const connection = await createConnection();
        const [players] = await connection.execute(
            'SELECT id, username, status FROM players WHERE status != ?',
            ['playing']
        );
        await connection.end();
        io.emit('lobbyUpdate', players);
    } catch (error) {
        console.error('Error updating lobby:', error);
    }
}

module.exports = { setupSocketHandlers, updateLobby };