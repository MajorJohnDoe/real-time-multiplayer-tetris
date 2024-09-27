
class Tetris {
    constructor(playerNumber, canvas, socket, gameId, isPlayable = true) {
        this.playerNumber = playerNumber;
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.socket = socket;
        this.isPlayable = isPlayable;
        this.gameId = gameId;
        this.ghostPiece = null;

        // Increase the scale to make blocks larger
        this.scale = 20;
        
        this.arena = this.createMatrix(12, 20);
        this.player = this.createPlayer();
        this.playerReset(); //
        
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        
        this.dropCounter = 0;
        this.dropInterval = 1000;
        
        this.lastTime = 0;
        
        this.colors = [
            null,
            '#FF0D72',
            '#0DC2FF',
            '#0DFF72',
            '#F538FF',
            '#FF8E0D',
            '#FFE138',
            '#3877FF',
        ];

        if (this.isPlayable) {
            this.update();
        }
    }

    createMatrix(w, h) {
        const matrix = [];
        while (h--) {
            matrix.push(new Array(w).fill(0));
        }
        return matrix;
    }

    createPiece(type) {
        if (type === 'I') {
            return [
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
            ];
        } else if (type === 'L') {
            return [
                [0, 2, 0],
                [0, 2, 0],
                [0, 2, 2],
            ];
        } else if (type === 'J') {
            return [
                [0, 3, 0],
                [0, 3, 0],
                [3, 3, 0],
            ];
        } else if (type === 'O') {
            return [
                [4, 4],
                [4, 4],
            ];
        } else if (type === 'Z') {
            return [
                [5, 5, 0],
                [0, 5, 5],
                [0, 0, 0],
            ];
        } else if (type === 'S') {
            return [
                [0, 6, 6],
                [6, 6, 0],
                [0, 0, 0],
            ];
        } else if (type === 'T') {
            return [
                [0, 7, 0],
                [7, 7, 7],
                [0, 0, 0],
            ];
        }
    }

    createPlayer() {
        return {
            pos: {x: 5, y: 0},
            matrix: null,
            score: 0,
        };
    }

    draw() {
        // Clear the entire canvas
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the arena
        this.drawMatrix(this.arena, {x: 0, y: 0});

        // Draw the ghost piece (opponent's current piece)
        if (this.ghostPiece && this.ghostPiece.matrix) {
            this.drawMatrix(this.ghostPiece.matrix, this.ghostPiece.pos, true);
        }

        // Draw the current piece (for the active player)
        if (this.isPlayable && this.player.matrix) {
            this.drawMatrix(this.player.matrix, this.player.pos);
        }
    }

    drawMatrix(matrix, offset, isGhost = false) {
        if (!matrix || !Array.isArray(matrix)) {
            console.error('Invalid matrix:', matrix);
            return;
        }
        matrix.forEach((row, y) => {
            if (!Array.isArray(row)) {
                console.error('Invalid row in matrix:', row);
                return;
            }
            row.forEach((value, x) => {
                if (value !== 0) {
                    let color = this.colors[value] || '#FFF';  // Default to white if color is undefined
                    if (isGhost) {
                        this.context.globalAlpha = 0.5;
                    }
                    this.context.fillStyle = color;
                    this.context.fillRect(
                        (x + offset.x) * this.scale,
                        (y + offset.y) * this.scale,
                        this.scale,
                        this.scale
                    );
                    this.context.globalAlpha = 1;  // Reset alpha
                }
            });
        });
    }

    merge() {
        this.player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.arena[y + this.player.pos.y][x + this.player.pos.x] = value;
                }
            });
        });
    }

    rotate(matrix, dir) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [
                    matrix[x][y],
                    matrix[y][x],
                ] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
            }
        }

        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }

    playerDrop() {
        this.player.pos.y++;
        if (this.collide(this.arena, this.player)) {
            this.player.pos.y--;
            this.merge();
            this.playerReset();
            this.arenaSweep();
            this.updateScore();
        }
        this.dropCounter = 0;
        this.emitMove();
    }

    playerMove(offset) {
        this.player.pos.x += offset;
        if (this.collide(this.arena, this.player)) {
            this.player.pos.x -= offset;
        }
        this.emitMove();
    }

    playerReset() {
        const pieces = 'TJLOSZI';
        this.player.matrix = this.createPiece(pieces[Math.floor(Math.random() * pieces.length)]);
        this.player.pos.y = 0;
        this.player.pos.x = Math.floor((this.arena[0].length / 2) - (this.player.matrix[0].length / 2));
        
        // Add this check
        if (this.collide(this.arena, this.player)) {
            this.arena.forEach(row => row.fill(0));
            this.player.score = 0;
            this.updateScore();
            // Try again with a different piece
            this.playerReset();
        }

        if (this.checkGameOver()) {
            this.gameOver = true;
            this.showGameOverMessage('You lost!');
        }
    }

    playerRotate(dir) {
        const pos = this.player.pos.x;
        let offset = 1;
        this.rotate(this.player.matrix, dir);
        while (this.collide(this.arena, this.player)) {
            this.player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.player.matrix[0].length) {
                this.rotate(this.player.matrix, -dir);
                this.player.pos.x = pos;
                return;
            }
        }
        this.emitMove();
    }

    showGameOverMessage(message) {
        const gameOverDiv = document.createElement('div');
        gameOverDiv.style.position = 'absolute';
        gameOverDiv.style.top = '50%';
        gameOverDiv.style.left = '50%';
        gameOverDiv.style.transform = 'translate(-50%, -50%)';
        gameOverDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        gameOverDiv.style.color = 'white';
        gameOverDiv.style.padding = '20px';
        gameOverDiv.style.borderRadius = '10px';
        gameOverDiv.style.fontSize = '24px';
        gameOverDiv.textContent = message;
        this.canvas.parentNode.appendChild(gameOverDiv);
    }

    emitMove() {
        this.socket.emit('playerMove', {
            gameId: this.gameId,
            playerNumber: this.playerNumber,
            arena: this.arena,
            playerPos: this.player.pos,
            playerMatrix: this.player.matrix
        });
    }

    collide(arena, player) {
        const m = player.matrix;
        const o = player.pos;
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                   (arena[y + o.y] &&
                    arena[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    arenaSweep() {
        let rowCount = 1;
        outer: for (let y = this.arena.length - 1; y > 0; --y) {
            for (let x = 0; x < this.arena[y].length; ++x) {
                if (this.arena[y][x] === 0) {
                    continue outer;
                }
            }

            const row = this.arena.splice(y, 1)[0].fill(0);
            this.arena.unshift(row);
            ++y;

            this.player.score += rowCount * 10;
            rowCount *= 2;
        }
    }

    updateScore() {
        document.getElementById(`player${this.playerNumber}-score`).innerText = this.player.score;
        this.socket.emit('updateScore', {
            gameId: this.gameId,
            playerId: this.playerNumber,
            score: this.player.score
        });
    }

    update(time = 0) {
        if (!this.isPlayable || !this.player.matrix) return; 

        const deltaTime = time - this.lastTime;

        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.playerDrop();
        }

        this.lastTime = time;

        this.draw();
        requestAnimationFrame(this.update.bind(this));
    }

    updateOpponentPiece(playerPos, playerMatrix) {
        if (playerPos && playerMatrix) {
            this.ghostPiece = {
                pos: playerPos,
                matrix: playerMatrix
            };
            this.draw();
        }
    }

    updateArena(newArena, playerPos, playerMatrix) {
        console.log('Updating arena:', { newArena, playerPos, playerMatrix });
        if (newArena) {
            this.arena = newArena;
        }
        if (playerPos && playerMatrix) {
            this.ghostPiece = {
                pos: playerPos,
                matrix: playerMatrix
            };
        }
        this.draw();
    }

    createEmptyArena() {
        return Array(20).fill().map(() => Array(12).fill(0));
    }

    createEmptyMatrix(width, height) {
        return Array(height).fill().map(() => Array(width).fill(0));
    }    

    drawCell(x, y, value) {
        this.context.fillStyle = value === 0 ? '#000' : this.colors[value];
        this.context.fillRect(x * this.scale, y * this.scale, this.scale, this.scale);
    }

    reset() {
        this.arena.forEach(row => row.fill(0));
        this.player.score = 0;
        this.updateScore();
        this.playerReset();
    }

    checkGameOver() {
        if (this.collide(this.arena, this.player)) {
            this.socket.emit('gameOver', {
                gameId: this.gameId,
                playerId: this.playerId
            });
            return true;
        }
        return false;
    }


}

window.Tetris = Tetris;
console.log('Tetris class exposed to global scope');