<?php
$gameId = isset($_GET['gameId']) ? $_GET['gameId'] : null;
if (!$gameId) {
    die("No game ID provided. Please return to the lobby and join a game.");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tetris Game Room</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.5.1/socket.io.js"></script>
    <script src="tetris.js"></script>
    <style>
        .game-container {
            display: flex;
            justify-content: space-around;
            margin-top: 20px;
        }
        .tetris-board {
            border: 2px solid #000;
            display: inline-block;
        }
        .player-info {
            text-align: center;
            margin-bottom: 10px;
        }
        #game-container {
            display: flex;
            justify-content: center;
            gap: 20px;
        }
        #player1-game, #player2-game {
            order: 0;
        }
        .player2 #player2-game {
            order: -1;
        }
    </style>
</head>
<body>
    <h1>Tetris Game Room</h1>
    <div id="game-info">Game ID: <?php echo htmlspecialchars($gameId); ?></div>
    <div id="player-statuses">
        <p id="player1-status">Player 1: Not Ready</p>
        <p id="player2-status">Player 2: Not Ready</p>
    </div>
    <div id="waiting-message" style="display: none;">Waiting for opponent to join...</div>
    <button id="ready-button" onclick="playerReady()" style="display: none;">Ready</button>
    <div id="countdown" style="display: none;"></div>
    <div id="game-container" style="display: none;">
        <div id="player1-game">
            <div class="player-info">
                <h3 id="player1-label">Player 1</h3>
                <p>Score: <span id="player1-score">0</span></p>
            </div>
            <canvas id="player1-board" class="tetris-board" width="240" height="400"></canvas>
        </div>
        <div id="player2-game">
            <div class="player-info">
                <h3 id="player2-label">Player 2</h3>
                <p>Score: <span id="player2-score">0</span></p>
            </div>
            <canvas id="player2-board" class="tetris-board" width="240" height="400"></canvas>
        </div>
    </div>
    <script>
        const gameId = '<?php echo htmlspecialchars($gameId); ?>';
    </script>
    <script src="game-room.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM fully loaded');
            console.log('Tetris class available:', !!window.Tetris);
        });

        function setPlayerBoardOrder(playerNumber) {
            const gameContainer = document.getElementById('game-container');
            if (gameContainer && playerNumber === 2) {
                gameContainer.classList.add('player2');
            }
        }
    </script>
</body>
</html>