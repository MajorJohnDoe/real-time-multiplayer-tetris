<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tetris Multiplayer</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/axios/0.21.1/axios.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.5.1/socket.io.js"></script>
    <script src="app.js?refresh=<?=time()?>"></script>
</head>
<body>
    <h1>Tetris Multiplayer</h1>
    <div id="message">Loading message...</div>
    
    <div id="auth-forms">
        <h2>Register</h2>
        <form onsubmit="registerPlayer(event)">
            <input type="email" id="email" required placeholder="Email">
            <input type="text" id="username" required placeholder="Username">
            <button type="submit">Register</button>
        </form>

        <h2>Login</h2>
        <form onsubmit="loginPlayer(event)">
            <input type="email" id="loginEmail" required placeholder="Email">
            <button type="submit">Login</button>
        </form>
    </div>

    <div id="game-lobby" style="display: none;">
        <h2 id="welcome-message"></h2>
        <button onclick="logout()">Logout</button>
        <h3>Game Lobby</h3>
        <div id="current-status">Current Status: idle</div>
        <button onclick="updatePlayerStatus('idle')">Set Idle</button>
        <button onclick="updatePlayerStatus('looking')">Look for Game</button>
        <button onclick="createGame()">Create New Game</button>
        <h4>Players in Lobby:</h4>
        <div id="player-list">
            <!-- Player list will be populated dynamically -->
        </div>
    </div>

    <div id="game-container" style="display: none;">
        <div id="player1-board"></div>
        <div id="player2-board"></div>
    </div>
</body>
</html>