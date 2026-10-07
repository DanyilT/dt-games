/**
 * TETRIS Game
 *
 * This is a simple implementation of the classic Tetris game using HTML5 Canvas and JavaScript.
 * The game features tetrominoes that fall from the top of the screen, and the player must rotate and move them to fit into complete lines.
 * The game ends when the tetrominoes stack up to the top of the screen.
 * The rules (the board, the pieces, the steps, the moves, the score, the end) are in js/rules.js: this file draws the
 * game, takes the player's keys, and plays the game through GameRules.
 *
 * Features:
 * - Tetromino shapes and colors
 * - Piece rotation and movement
 * - Line clearing and scoring
 * - Game over detection
 * - Pause and resume functionality
 * - GameHub's panel and replays (js/gamehub.js): each game is a run, with the pieces drawn from the run's seed, the game
 *   moving in fixed steps (GameRules.TICK), and every move recorded with the step it came after, so GameHub can play it
 *   again
 *
 * Instructions:
 * - Use the arrow keys to move and rotate the tetrominoes.
 * - Use wasd / touch controls / control buttons to move and rotate the tetrominoes. (in extend-controls.js / buttons-handler.js)
 * - Press the spacebar to hard drop the tetromino.
 * - Long tap (touch control) / 's' key / drop button to hard drop the tetromino.
 *
 * Cheat code:
 * - You can set the score directly by calling the `setScore` function with a new score value (the game then isn't kept
 *   to watch again).
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
const bestScoreElement = document.getElementById('best-score');

// Game constants
const COLS = GameRules.COLS;
const ROWS = GameRules.ROWS;
const BLOCK_SIZE = canvas.width / COLS;
const NEXT_BLOCK_SIZE = nextPieceCanvas.width / 4;
const TICK = GameRules.TICK; // ms: the game moves in steps this long, and a piece falls every few (js/rules.js)

// Game variables
let highScore = 0; // The best score (Best)
let bestBefore = 0; // The best score when this game started (did this one beat it?)
let gameData = null; // What's saved (js/storage.js), once it has loaded: the game doesn't wait for it
let gameInterval;
let gameActive = false;
let gamePause = false;

// The game under way (js/rules.js): the board, the piece and the next one, the score, the lines and the level
let game = null;

// The game under way, recorded so GameHub can play it again (js/gamehub.js): its random numbers draw the pieces
let run = null;
let movedThisGame = false; // The player has moved a piece in this game (it starts by itself)

// The GAME OVER text's font, loaded as the game starts so the canvas has it when the game ends (css/game.css imports
// it from Google Fonts)
document.fonts?.load("40px 'Pixelify Sans'").catch(() => {});

// What's saved: the best score shows as soon as it has loaded
loadGameData().then((data) => {
    gameData = data;
    if (highScore > gameData.highScore) {
        // Beaten while it was loading
        gameData.highScore = highScore;
        saveGameData(gameData);
    }
    highScore = gameData.highScore;
    bestScoreElement.textContent = highScore;
    showStatus();
});

// GameHub's panel: the score, lines, level and best score
function showStatus() {
    GameHub.status({
        main: [
            { label: 'Score', value: game ? game.score : 0 },
            { label: 'Lines', value: game ? game.lines : 0 },
            { label: 'Level', value: game ? game.level : 1 },
            { label: 'Best', value: highScore },
        ],
        ongoing: gameActive && movedThisGame,
    });
}

// Set the game score (cheat)
function setScore(newScore) {
    GameHub.cheated();
    if (game) game.score = newScore;
    document.getElementById('score').textContent = newScore;
}

// Show the best score, and save a new one (js/storage.js) once what's saved has loaded
function updateHighScore() {
    if (game && game.score > highScore) {
        highScore = game.score;
        if (gameData) {
            gameData.highScore = highScore;
            saveGameData(gameData);
        }
    }
    bestScoreElement.textContent = highScore;
}

// The pieces' colors, by type (js/rules.js: a piece's type, and a locked block's type + 1 on the board)
const COLORS = [
    'cyan',    // I piece
    'blue',    // J piece
    'orange',  // L piece
    'yellow',  // O piece
    'green',   // S piece
    'purple',  // T piece
    'red'      // Z piece
];

// Reset the game: a new run, or in a replay, the run being played (its steps come from the replay)
function resetGame(replayRun = null) {
    if (GameHub.replaying && !replayRun) return; // A replay plays by itself
    run = replayRun || GameHub.startRun({ tick: TICK });
    bestBefore = highScore;
    movedThisGame = false;
    gameActive = true;
    gamePause = false;

    // A new game (js/rules.js): an empty board, and the first two pieces, drawn from the run's numbers so a replay gets
    // the same pieces
    game = GameRules.newGame(run.random);

    scoreElement.textContent = game.score;
    updateHighScore();
    levelElement.textContent = game.level;
    linesElement.textContent = game.lines;
    startButton.textContent = 'Pause (p)';

    if (gameInterval) {
        clearInterval(gameInterval);
    }

    drawBoard();
    drawPiece();
    drawNextPiece();

    if (!replayRun) gameInterval = setInterval(gameLoop, TICK);
    showStatus();
}

// Draw a square on the canvas
function drawSquare(x, y, color, canvas, blockSize) {
    const context = canvas.getContext('2d');
    context.fillStyle = color;
    context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);

    context.strokeStyle = 'gray';
    context.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);

    // Add a gradient effect to make it look 3D
    context.fillStyle = 'rgba(255, 255, 255, 0.2)';
    context.beginPath();
    context.moveTo(x * blockSize, y * blockSize);
    context.lineTo((x + 1) * blockSize, y * blockSize);
    context.lineTo(x * blockSize, (y + 1) * blockSize);
    context.fill();

    context.fillStyle = 'rgba(0, 0, 0, 0.2)';
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
    ctx.strokeStyle = 'gray';
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

    // Draw filled squares (none before the first game)
    if (!game) return;
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (game.board[y][x]) {
                drawSquare(x, y, COLORS[game.board[y][x] - 1], canvas, BLOCK_SIZE);
            }
        }
    }
}

// Draw the current piece
function drawPiece() {
    const currentPiece = game.current;
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                drawSquare(
                    currentPiece.x + x,
                    currentPiece.y + y,
                    COLORS[currentPiece.type],
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
    const nextPiece = game.next;

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
                drawSquare(drawX, drawY, COLORS[nextPiece.type], nextPieceCanvas, NEXT_BLOCK_SIZE);
            }
        }
    }
}

// A piece locked (js/rules.js): show the score, lines, level and best, and the next piece; or the game is over
function pieceLocked() {
    scoreElement.textContent = game.score;
    updateHighScore();
    levelElement.textContent = game.level;
    linesElement.textContent = game.lines;

    if (game.over) {
        gameOver();
    }

    drawNextPiece();
    showStatus();
}

// Game loop: one step (TICK). The piece falls every few steps, sooner at higher levels (js/rules.js).
function gameLoop() {
    if (!gameActive || gamePause) {
        return;
    }
    run.step();

    const fell = GameRules.step(game);
    if (fell === 'waiting') {
        return;
    }
    if (fell !== 'moved') pieceLocked();
    drawBoard();
    drawPiece();
}

// Pause game
function pauseGame() {
    if (gameActive && !gamePause) {
        // Pause the game
        gamePause = true;
        clearInterval(gameInterval);

        // Draw pause message
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '30px Arial';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        startButton.textContent = 'Resume (p)';
    } else if (gameActive && gamePause) {
        // Resume the game
        gamePause = false;
        gameInterval = setInterval(gameLoop, TICK);
        drawBoard();
        drawPiece();
        startButton.textContent = 'Pause (p)';
    }
}

// Game over
function gameOver() {
    gameActive = false;
    clearInterval(gameInterval);
    run.finish({
        outcome: 'over',
        result: [{ label: 'Score', value: game.score }, { label: 'Lines', value: game.lines }],
        best: game.score > bestBefore,
    });
    showStatus();

    // Draw the game over screen in the next frame to ensure it's not overwritten
    requestAnimationFrame(() => {
        if (gameActive) return; // A new game has already started

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw game over text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = "40px 'Pixelify Sans'";
        ctx.fillText('GAME OVER!', canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${game.score}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.font = '14px Arial';
        ctx.fillText(GameHub.replaying ? 'The end of the replay' : "Press 'Reset Game' to play again", canvas.width / 2, canvas.height / 2 + 50);
    });
}

// The game's moves: 'L' and 'R' (left, right), 'U' (rotate), 'D' (down a row) and 'H' (hard drop)
const MOVE_KEYS = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', ' ': 'H' };

// Event listeners
document.addEventListener('keydown', event => {
    if (!gameActive || gamePause || GameHub.replaying) {
        return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return; // The browser's shortcuts

    // The game's keys don't scroll the page, or press a button that still has focus
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) {
        event.preventDefault();
    }
    // Holding Space drops one piece, not one after another
    if (event.repeat && event.key === ' ') {
        return;
    }

    if (MOVE_KEYS[event.key]) move(MOVE_KEYS[event.key]);
});

// One move (js/rules.js). It's recorded with the run first (a drop can end the game), so a replay makes it at the same
// step.
function move(code) {
    if (!game || game.over || !GameRules.MOVES.includes(code)) return;
    run.input(code);
    movedThisGame = true;
    if (GameRules.move(game, code) !== 'moved') pieceLocked();

    drawBoard();
    drawPiece();
}

startButton.addEventListener('click', () => {
    if (GameHub.replaying) return; // A replay plays by itself
    if (!gameActive) {
        resetGame();
        return;
    }

    pauseGame();
});

resetButton.addEventListener('click', () => resetGame());

// Initialize the game (once GameHub has handed over its tickets, so the first game gets one too); or GameHub opened it
// to play a replay, which plays the game from its own steps and moves
drawBoard();
if (GameHub.replaying) {
    GameHub.onReplay({
        begin: (replayRun) => resetGame(replayRun),
        input: move,
        step: gameLoop,
    });
} else {
    GameHub.ready().then(() => {
        if (!gameActive) resetGame();
    });
}
