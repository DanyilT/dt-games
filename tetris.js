/**
 * TETRIS Game
 *
 * This is a simple implementation of the classic Tetris game using HTML5 Canvas and JavaScript.
 * The game features tetrominoes that fall from the top of the screen, and the player must rotate and move them to fit into complete lines.
 * The game ends when the tetrominoes stack up to the top of the screen.
 *
 * Features:
 * - Tetromino shapes and colors
 * - Piece rotation and movement
 * - Line clearing and scoring
 * - Game over detection
 * - Pause and resume functionality
 *
 * Instructions:
 * - Use the arrow keys to move and rotate the tetrominoes.
 * - Use wasd / touch controls / control buttons to move and rotate the tetrominoes. (in extend-controls.js / buttons-handler.js)
 * - Press the spacebar to hard drop the tetromino.
 * - Long tap (touch control) / 's' key / drop button to hard drop the tetromino.
 *
 * Cheat code:
 * - You can set the score directly by calling the `setScore` function with a new score value. *
 *
 * Easter Egg:
 * - `qwerty.js`
 */

// Canvas setup
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('next-piece');
const nextPieceCtx = nextPieceCanvas.getContext('2d');
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');

// Game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = canvas.width / COLS;
const NEXT_BLOCK_SIZE = nextPieceCanvas.width / 4;
const GAME_SPEED = 1000; // Initial speed in ms

// Game variables
let score = 0;
let level = 1;
let lines = 0;
let gameInterval;
let gameActive = false;
let gamePause = false;
let dropStart = Date.now();
let gameSpeed = GAME_SPEED;

// Set the game score (cheat)
function setScore(newScore) {
    score = newScore;
    document.getElementById("score").textContent = score;
}

// Initialize the board
let board = createBoard(ROWS, COLS);

// Create the board
function createBoard(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
}

// Tetromino shapes and colors
const SHAPES = [
    // I piece
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    // J piece
    [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // L piece
    [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // O piece
    [
        [1, 1],
        [1, 1]
    ],
    // S piece
    [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    // T piece
    [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // Z piece
    [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
];

const COLORS = [
    'cyan',    // I piece
    'blue',    // J piece
    'orange',  // L piece
    'yellow',  // O piece
    'green',   // S piece
    'purple',  // T piece
    'red'      // Z piece
];

// Create a piece
function Piece(shape, color) {
    this.shape = shape;
    this.color = color;
    this.x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
    this.y = 0;
    this.rotation = 0;
}

// Generate random piece
function randomPiece() {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    return new Piece(SHAPES[randomIndex], COLORS[randomIndex]);
}

// Current piece and next piece
let currentPiece;
let nextPiece;

// Reset the game
function resetGame() {
    board = createBoard(ROWS, COLS);
    score = 0;
    level = 1;
    lines = 0;
    gameSpeed = GAME_SPEED;
    gameActive = true;
    gamePause = false;

    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;

    currentPiece = randomPiece();
    nextPiece = randomPiece();

    if (gameInterval) {
        clearInterval(gameInterval);
    }

    drawBoard();
    drawPiece();
    drawNextPiece();

    dropStart = Date.now();
    // gameInterval = setInterval(gameLoop, gameSpeed);
    updateGameSpeed();
}

// Draw a square on the canvas
function drawSquare(x, y, color, canvas, blockSize) {
    const context = canvas.getContext('2d');
    context.fillStyle = color;
    context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);

    context.strokeStyle = 'gray';
    context.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);

    // Add a gradient effect to make it look 3D
    context.fillStyle = "rgba(255, 255, 255, 0.2)";
    context.beginPath();
    context.moveTo(x * blockSize, y * blockSize);
    context.lineTo((x + 1) * blockSize, y * blockSize);
    context.lineTo(x * blockSize, (y + 1) * blockSize);
    context.fill();

    context.fillStyle = "rgba(0, 0, 0, 0.2)";
    context.beginPath();
    context.moveTo((x + 1) * blockSize, y * blockSize);
    context.lineTo((x + 1) * blockSize, (y + 1) * blockSize);
    context.lineTo(x * blockSize, (y + 1) * blockSize);
    context.fill();
}

// Draw the board
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the grid lines
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 0.5;

    // Draw horizontal lines
    for (let y = 1; y < ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
    }

    // Draw vertical lines
    for (let x = 1; x < COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }

    // Draw filled squares
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawSquare(x, y, board[y][x], canvas, BLOCK_SIZE);
            }
        }
    }
}

// Draw the current piece
function drawPiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                drawSquare(
                    currentPiece.x + x,
                    currentPiece.y + y - 1,
                    currentPiece.color,
                    canvas,
                    BLOCK_SIZE
                );
            }
        }
    }
}

// Draw the next piece
function drawNextPiece() {
    nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);

    const pieceWidth = nextPiece.shape[0].length * NEXT_BLOCK_SIZE;
    const pieceHeight = nextPiece.shape.length * NEXT_BLOCK_SIZE;

    // Center the piece in the canvas
    const offsetX = (nextPieceCanvas.width - pieceWidth) / 2;
    const offsetY = (nextPieceCanvas.height - pieceHeight) / 2;

    for (let y = 0; y < nextPiece.shape.length; y++) {
        for (let x = 0; x < nextPiece.shape[y].length; x++) {
            if (nextPiece.shape[y][x]) {
                const drawX = offsetX / NEXT_BLOCK_SIZE + x;
                const drawY = offsetY / NEXT_BLOCK_SIZE + y;
                drawSquare(drawX, drawY, nextPiece.color, nextPieceCanvas, NEXT_BLOCK_SIZE);
            }
        }
    }
}

// Check if the piece collides
function collision(x, y, shape) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) {
                continue;
            }

            let newX = x + c;
            let newY = y + r;

            if (newX < 0 || newX >= COLS || newY >= ROWS) {
                return true;
            }

            if (newY < 0) {
                continue;
            }

            if (board[newY][newX] !== 0) {
                return true;
            }
        }
    }
    return false;
}

// Lock the piece in place
function lockPiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            // Skip empty squares
            if (!currentPiece.shape[y][x]) {
                continue;
            }

            // Only lock the piece if it's inside the board
            if (currentPiece.y + y >= 0) {
                board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
            }
        }
    }

    // Check for completed lines
    let linesCleared = 0;

    for (let y = ROWS - 1; y >= 0; y--) {
        let isRowFull = true;

        for (let x = 0; x < COLS; x++) {
            if (board[y][x] === 0) {
                isRowFull = false;
                break;
            }
        }

        if (isRowFull) {
            // Remove the line
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++; // Check the same row again after shifting
        }
    }

    // Update score and level
    if (linesCleared > 0) {
        // Scoring: 100, 300, 500, 800 points for 1, 2, 3, 4 lines respectively
        const scoreMultiplier = [0, 100, 300, 500, 800];
        score += scoreMultiplier[linesCleared] * level;

        lines += linesCleared;

        // Level up every 10 lines
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            updateGameSpeed();
        }
    }

    // Update UI
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;

    // Get next piece
    currentPiece = nextPiece;
    nextPiece = randomPiece();

    // Check if the new piece collides immediately - this is the game over condition
    if (collision(currentPiece.x, currentPiece.y, currentPiece.shape)) {
        gameOver();
    }

    drawNextPiece();
}

// Move piece down
function movePieceDown() {
    if (!collision(currentPiece.x, currentPiece.y + 1, currentPiece.shape)) {
        currentPiece.y++;
        dropStart = Date.now();
        return true;
    }
    // Piece has landed
    lockPiece();
    return false;
}

// Move piece left
function movePieceLeft() {
    if (!collision(currentPiece.x - 1, currentPiece.y, currentPiece.shape)) {
        currentPiece.x--;
    }
}

// Move piece right
function movePieceRight() {
    if (!collision(currentPiece.x + 1, currentPiece.y, currentPiece.shape)) {
        currentPiece.x++;
    }
}

// Rotate piece
function rotatePiece() {
    const nextPattern = rotate(currentPiece.shape);
    let kick = 0;

    // Check for collision when rotating
    if (collision(currentPiece.x, currentPiece.y, nextPattern)) {
        // Try to offset the piece if there's a collision
        if (currentPiece.x > COLS / 2) {
            // Try to kick the piece to the left
            kick = -1;
        } else {
            // Try to kick the piece to the right
            kick = 1;
        }
    }

    // Apply rotation if there's no collision or after applying kick
    if (!collision(currentPiece.x + kick, currentPiece.y, nextPattern)) {
        currentPiece.x += kick;
        currentPiece.shape = nextPattern;
    }
}

// Rotate matrix
function rotate(matrix) {
    const N = matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));

    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            result[x][N - 1 - y] = matrix[y][x];
        }
    }

    return result;
}

// Hard drop
function hardDrop() {
    let dropped = 0;
    while (!collision(currentPiece.x, currentPiece.y + 1, currentPiece.shape)) {
        currentPiece.y++;
        dropped++;
    }

    // Add points for hard drop
    score += dropped;
    scoreElement.textContent = score;

    lockPiece();
}

// Game loop
function gameLoop() {
    if (!gameActive || gamePause) {
        return;
    }

    movePieceDown();
    drawBoard();
    drawPiece();
}

// When resetting the game or changing level
function updateGameSpeed() {
    gameSpeed = Math.max(100, 1000 - (level - 1) * 100);
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, gameSpeed);
}

// Pause game
function pauseGame() {
    if (gameActive && !gamePause) {
        // Pause the game
        gamePause = true;
        clearInterval(gameInterval);

        // Draw pause message
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "30px Arial";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
        startButton.textContent = "Resume";
    } else if (gameActive && gamePause) {
        // Resume the game
        gamePause = false;
        gameInterval = setInterval(gameLoop, gameSpeed);
        drawBoard();
        drawPiece();
        startButton.textContent = "Pause";
    }
}

// Game over
function gameOver() {
    gameActive = false;
    clearInterval(gameInterval);

    // Draw the game over screen in the next frame to ensure it's not overwritten
    requestAnimationFrame(() => {
        // Semi-transparent overlay
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw game over text
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "40px 'Pixelify Sans'";
        ctx.fillText("GAME OVER!", canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = "20px Arial";
        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.font = "14px Arial";
        ctx.fillText("Press 'Reset Game' to play again", canvas.width / 2, canvas.height / 2 + 50);
    });
}

// Event listeners
document.addEventListener('keydown', event => {
    if (!gameActive || gamePause) {
        return;
    }

    switch(event.key) {
        case "ArrowLeft":
            movePieceLeft();
            dropStart = Date.now();
            break;
        case "ArrowUp":
            rotatePiece();
            dropStart = Date.now();
            break;
        case "ArrowRight":
            movePieceRight();
            dropStart = Date.now();
            break;
        case "ArrowDown":
            movePieceDown();
            break;
        case " ":
            hardDrop();
            break;
    }

    drawBoard();
    drawPiece();
});

startButton.addEventListener('click', () => {
    if (!gameActive) {
        resetGame();
        return;
    }

    pauseGame();
});

resetButton.addEventListener('click', resetGame);

// Initialize the game
resetGame();
