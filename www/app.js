// Configuration
const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

// Initialize socket connection
const socket = io(SOCKET_URL, {
    withCredentials: true,
    extraHeaders: {
        "my-custom-header": "abcd"
    }
});

// Axios instance setup
const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add token to every request
axiosInstance.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// State variables
let currentStatus = 'idle';
let currentGameId = null;
let countdownInterval = null;

// Socket event listeners
socket.on('connect', () => console.log('Connected to server'));
socket.on('connect_error', (error) => console.error('Connection error:', error));
socket.on('lobbyUpdate', updateLobbyUI);
socket.on('playerJoined', handlePlayerJoined);
socket.on('allPlayersReady', handleAllPlayersReady);
socket.on('gameStart', handleGameStart);

// Authentication functions
async function registerPlayer(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    try {
        const response = await axios.post(`${API_URL}/register`, { email, username });
        alert(response.data.message);
    } catch (error) {
        alert('Error registering player: ' + (error.response?.data?.message || error.message));
    }
}

async function loginPlayer(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    try {
        const response = await axiosInstance.post('/login', { email });
        handleSuccessfulLogin(response.data);
    } catch (error) {
        console.error('Login error:', error);
        alert('Error logging in: ' + (error.response?.data?.message || error.message));
    }
}

function handleSuccessfulLogin(data) {
    if (data && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('userId', data.user.id);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        alert('Login successful! Welcome, ' + data.user.username);
        
        socket.connect();
        socket.emit('login', data.user.id);

        if (data.lobbyState) {
            updateLobbyUI(data.lobbyState);
        }

        showGameLobby();
    } else {
        throw new Error('No token received from server');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    document.getElementById('auth-forms').style.display = 'block';
    document.getElementById('game-lobby').style.display = 'none';
}

// UI functions
function showGameLobby() {
    document.getElementById('auth-forms').style.display = 'none';
    document.getElementById('game-lobby').style.display = 'block';
    document.getElementById('welcome-message').textContent = 'Welcome, ' + localStorage.getItem('username') + '!';
    fetchLobbyData();
}

function updateLobbyUI(players) {
    const playerList = document.getElementById('player-list');
    playerList.innerHTML = '';
    const currentUserId = localStorage.getItem('userId');
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.textContent = `${player.username} - ${player.status}`;
        if (player.status === 'waiting' && player.id !== parseInt(currentUserId)) {
            const joinButton = document.createElement('button');
            joinButton.textContent = 'Join Game';
            joinButton.onclick = () => joinGame(player.id);
            playerElement.appendChild(joinButton);
        }
        playerList.appendChild(playerElement);
    });
}

// Game functions
async function createGame() {
    try {
        const response = await axiosInstance.post('/game/create');
        const gameId = response.data.gameId;
        alert(`Game created successfully! Game ID: ${gameId}. Waiting for opponent to join...`);
        window.location.href = `game-room.php?gameId=${gameId}&creator=true`;
    } catch (error) {
        console.error('Error creating game:', error);
        alert('Error creating game: ' + error.response?.data?.message || error.message);
    }
}

async function joinGame(hostPlayerId) {
    try {
        const response = await axiosInstance.get(`/game/by-player/${hostPlayerId}`);
        const gameId = response.data.gameId;
        await axiosInstance.post(`/game/join/${gameId}`);
        alert('Joined game successfully! Redirecting to game room...');
        window.location.href = `game-room.php?gameId=${gameId}`;
    } catch (error) {
        console.error('Error joining game:', error);
        alert('Error joining game: ' + (error.response?.data?.message || error.message));
    }
}

function initializeGame(gameId) {
    document.getElementById('game-lobby').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    console.log(`Initializing game with ID: ${gameId}`);
    // TODO: Initialize Tetris game boards and start the game
}

// Helper functions
async function fetchLobbyData() {
    try {
        const response = await axiosInstance.get('/lobby');
        updateLobbyUI(response.data);
    } catch (error) {
        console.error('Error fetching lobby data:', error);
        handleAxiosError(error);
    }
}

async function updatePlayerStatus(status) {
    try {
        await axiosInstance.put('/player/status', { status });
        currentStatus = status;
        document.getElementById('current-status').textContent = `Current Status: ${status}`;
    } catch (error) {
        console.error('Error updating status:', error);
        handleAxiosError(error);
    }
}

function handleAxiosError(error) {
    if (error.response && error.response.status === 403) {
        alert('Session expired. Please log in again.');
        logout();
    } else {
        alert('An error occurred: ' + error.message);
    }
}

// Event handlers
function handlePlayerJoined(data) {
    console.log(`Player ${data.playerId} joined the game ${data.gameId}`);
    if (currentGameId === data.gameId) {
        showReadyScreen(currentGameId);
    }
}

function handleAllPlayersReady(gameId) {
    if (gameId === currentGameId) {
        startCountdown(10);
    }
}

function handleGameStart(gameId) {
    if (gameId === currentGameId) {
        startGame();
    }
}

// Initialize
window.onload = function() {
    if (localStorage.getItem('token')) {
        showGameLobby();
    }
};

// Exported functions
window.registerPlayer = registerPlayer;
window.loginPlayer = loginPlayer;
window.logout = logout;
window.createGame = createGame;
window.updatePlayerStatus = updatePlayerStatus;