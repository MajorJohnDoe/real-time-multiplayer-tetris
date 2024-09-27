// Configuration
const SOCKET_URL = 'http://localhost:3000';

// Game state variables
let socket, playerId, playerNumber, tetrisGame, opponentTetrisGame;
let isCreator = new URLSearchParams(window.location.search).get('creator') === 'true';
let gameStarted = false;

// Initialize socket connection
socket = io(SOCKET_URL, {
    withCredentials: true,
    extraHeaders: { "my-custom-header": "abcd" },
    transports: ['websocket', 'polling']
});

/**
 * Join the game room on the server
 */
function joinGameRoom() {
    console.log(`Joining game room ${gameId} as player ${playerId}`);
    socket.emit('joinGameRoom', { gameId, playerId }, (response) => {
        console.log('Join game room response:', response);
        if (response && response.playerNumber) {
            playerNumber = response.playerNumber;
            updatePlayerLabels();
            setPlayerBoardOrder(playerNumber);
            initializeGameUI();
        }
    });
}

/**
 * Update the player labels based on the assigned player number
 */
function updatePlayerLabels() {
    const player1Label = document.getElementById('player1-label');
    const player2Label = document.getElementById('player2-label');
    if (player1Label && player2Label) {
        player1Label.textContent = playerNumber === 1 ? 'Your Board' : 'Opponent';
        player2Label.textContent = playerNumber === 2 ? 'Your Board' : 'Opponent';
    }
}

/**
 * Set the order of player boards based on the assigned player number
 */
function setPlayerBoardOrder(playerNumber) {
    const gameContainer = document.getElementById('game-container');
    if (gameContainer && playerNumber === 2) {
        gameContainer.classList.add('player2');
    }
}

/**
 * Initialize the game UI elements
 */
function initializeGameUI() {
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) gameContainer.style.display = 'flex';
    updateGameUI();
    console.log('Game UI initialized');
}

/**
 * Update the status display for a player
 */
function updatePlayerStatus(playerNumber, status) {
    console.log(`Updating player ${playerNumber} status to ${status}`);
    const playerStatusElement = document.getElementById(`player${playerNumber}-status`);
    if (playerStatusElement) {
        playerStatusElement.textContent = `Player ${playerNumber}: ${status}`;
    }
}

/**
 * Send ready signal to the server when player clicks ready button
 */
function playerReady() {
    console.log(`Player ${playerId} clicked ready button for game ${gameId}`);
    if (socket.connected) {
        socket.emit('playerReady', { gameId, playerId }, (response) => {
            console.log('Player ready response:', response);
            if (response && response.success) {
                updatePlayerStatus(response.playerNumber, 'Ready');
                const readyButton = document.getElementById('ready-button');
                if (readyButton) readyButton.disabled = true;
            }
        });
    } else {
        console.error('Socket is not connected. Unable to emit playerReady event.');
    }
}

/**
 * Start the countdown before the game begins
 */
function startCountdown(seconds) {
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) {
        countdownElement.style.display = 'block';
        let timeLeft = seconds;

        const countdownInterval = setInterval(() => {
            console.log(`Countdown: ${timeLeft}`);
            countdownElement.innerText = `Game starting in ${timeLeft} seconds...`;
            timeLeft--;

            if (timeLeft < 0) {
                clearInterval(countdownInterval);
                countdownElement.innerText = 'Game starting!';
                setTimeout(() => {
                    countdownElement.style.display = 'none';
                    startGame();
                }, 1000);
            }
        }, 1000);
    }
}

/**
 * Initialize the Tetris game instances
 */
function initializeGame() {
    console.log('Initializing Tetris game');
    const playerCanvas = document.getElementById(`player${playerNumber}-board`);
    const opponentCanvas = document.getElementById(`player${playerNumber === 1 ? 2 : 1}-board`);
    
    if (playerCanvas && opponentCanvas && window.Tetris) {
        console.log('All requirements met, creating Tetris instances');
        tetrisGame = new window.Tetris(playerNumber, playerCanvas, socket, gameId, true);
        opponentTetrisGame = new window.Tetris(3 - playerNumber, opponentCanvas, socket, gameId, false);
        setupControls();
    } else {
        console.error('Canvas or Tetris class not found');
    }
}

/**
 * Set up keyboard controls for the game
 */
function setupControls() {
    document.addEventListener('keydown', event => {
        if (!tetrisGame) return;

        switch(event.keyCode) {
            case 37: // Left arrow
                tetrisGame.playerMove(-1);
                break;
            case 39: // Right arrow
                tetrisGame.playerMove(1);
                break;
            case 40: // Down arrow
                tetrisGame.playerDrop();
                break;
            case 38: // Up arrow
                tetrisGame.playerRotate(1);
                break;
        }
        
        // Send updated arena to opponent
        socket.emit('playerMove', {
            gameId: gameId,
            playerNumber: playerNumber,
            arena: tetrisGame.arena
        });
    });
}

/**
 * Start the game
 */
function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        const waitingMessage = document.getElementById('waiting-message');
        const readyButton = document.getElementById('ready-button');
        if (waitingMessage) waitingMessage.style.display = 'none';
        if (readyButton) readyButton.style.display = 'none';
        
        console.log('Game starting!');
        initializeGame(); // Initialize the game just before starting
        
        if (tetrisGame) {
            tetrisGame.update();
        } else {
            console.error('Tetris game not initialized');
        }
    }
}

/**
 * Update the score display
 */
function updateScoreDisplay(data) {
    const playerScoreElement = document.getElementById(`player${playerNumber}-score`);
    const opponentScoreElement = document.getElementById(`player${3 - playerNumber}-score`);
    
    if (data.playerId === playerId) {
        if (playerScoreElement) playerScoreElement.innerText = data.score;
    } else {
        if (opponentScoreElement) opponentScoreElement.innerText = data.score;
    }
}

/**
 * Update the game UI based on current state
 */
function updateGameUI() {
    const waitingMessage = document.getElementById('waiting-message');
    const readyButton = document.getElementById('ready-button');
    
    if (waitingMessage) {
        waitingMessage.style.display = isCreator ? 'none' : 'block';
    }
    
    if (readyButton) {
        readyButton.style.display = 'block';
    }
}

/**
 * Set up all socket event listeners
 */
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Connected to server');
        joinGameRoom();
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected from server. Reason:', reason);
    });

    socket.on('playerJoined', (data) => {
        console.log(`Player ${data.playerId} joined the game ${data.gameId}`);
        if (data.playerId !== playerId) {
            const player2Label = document.getElementById('player2-label');
            if (player2Label) {
                player2Label.textContent = `Opponent (${data.username})`;
            }
        }
        updateGameUI();
    });

    socket.on('playerReady', (data) => {
        console.log(`Received playerReady event:`, data);
        updatePlayerStatus(data.playerNumber, 'Ready');
    });

    socket.on('allPlayersReady', (gameId) => {
        console.log(`All players ready for game ${gameId}. Starting countdown.`);
        startCountdown(5);
    });
    
    socket.on('gameStart', (gameId) => {
        console.log(`Game ${gameId} starting!`);
        startGame();
    });

    socket.on('opponentMove', (data) => {
        console.log('Received opponent move:', data);
        if (opponentTetrisGame && data.playerNumber !== playerNumber) {
            if (data.arena) {
                opponentTetrisGame.updateArena(data.arena, data.playerPos, data.playerMatrix);
            } else if (data.playerPos && data.playerMatrix) {
                opponentTetrisGame.updateOpponentPiece(data.playerPos, data.playerMatrix);
            } else {
                console.warn('Incomplete data received for opponent move:', data);
            }
        }
    });

    socket.on('scoreUpdate', updateScoreDisplay);

    socket.on('gameResult', (data) => {
        if (data.loserId === playerId) {
            tetrisGame.showGameOverMessage('You lost!');
        } else {
            tetrisGame.showGameOverMessage('You won!');
        }
    });
}

// Initialize the game room when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    playerId = localStorage.getItem('userId');
    const gameInfoElement = document.getElementById('game-info');
    if (gameInfoElement) {
        gameInfoElement.innerText = `Game ID: ${gameId}`;
    }
    
    console.log(`Initializing game room ${gameId} for player ${playerId}`);
    
    setupSocketListeners();
});

// Expose necessary functions to global scope for HTML event handlers
window.playerReady = playerReady;