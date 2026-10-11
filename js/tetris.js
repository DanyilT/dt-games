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
 * - A ghost piece: where the piece would land, dropped now
 * - Game over detection
 * - Pause and resume functionality
 * - GameHub's panel and replays (js/gamehub.js): each game is a run, with the pieces drawn from the run's seed, the game
 *   moving in fixed steps (GameRules.TICK), and every move recorded with the step it came after, so GameHub can play it
 *   again
 *
 * Instructions:
 * - Press Enter, an arrow key or Space, tap the board or press Start to start; the first game waits for it, so its run
 *   (and its GameHub ticket) starts with the player.
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
const startButton = document.getElementById('start-button'); // Start, then Pause and Resume
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
let gameOverShown = false; // The game-over screen is up (until a new game)
let loaded = false; // What's saved has loaded and GameHub has handed over its tickets: a game can start
let startAsked = false; // The player asked to start before that: it starts then

// The game under way (js/rules.js): the board, the piece and the next one, the score, the lines and the level
let game = null;

// The game under way, recorded so GameHub can play it again (js/gamehub.js): its random numbers draw the pieces
let run = null;

// The TETRIS and GAME OVER texts' font (css/game.css imports it from Google Fonts): the start screen shows again with it
// once it's loaded, and the canvas has it when the game ends
document.fonts?.load("40px 'Pixelify Sans'").then(() => showKeysHint()).catch(() => {});

// What's saved: the best score shows as soon as it has loaded
const dataLoaded = loadGameData().then((data) => {
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
        ongoing: false, // A game under way is saved when the page is hidden or closed (saveProgress): a reload keeps it
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
    if (gameData?.game) {
        // A new game: the one saved half-way is gone
        gameData.game = null;
        saveGameData(gameData);
    }
    gameActive = true;
    gamePause = false;
    gameOverShown = false;

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

// The ghost piece: where the current piece would land, dropped now (js/rules.js dropRow()), as an outline in its colour.
// It's only drawn: the game and its runs don't know it's there.
function drawGhost() {
    const piece = game.current;
    const landing = GameRules.dropRow(game);
    if (landing === piece.y) return; // Already there: the piece covers it
    ctx.save();
    ctx.strokeStyle = COLORS[piece.type];
    ctx.fillStyle = COLORS[piece.type];
    ctx.lineWidth = 2;
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (!piece.shape[y][x] || landing + y < 0) continue;
            const left = (piece.x + x) * BLOCK_SIZE;
            const top = (landing + y) * BLOCK_SIZE;
            ctx.globalAlpha = 0.15;
            ctx.fillRect(left, top, BLOCK_SIZE, BLOCK_SIZE);
            ctx.globalAlpha = 0.7;
            ctx.strokeRect(left + 1, top + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
        }
    }
    ctx.restore();
}

// Draw the current piece (and its ghost first, under it)
function drawPiece() {
    drawGhost();
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
        showPaused();
        startButton.textContent = 'Resume (p)';
        saveProgress(); // Kept as it is, so closing the page now loses nothing
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
    saveProgress(); // The game ended: no game to carry on
    showStatus();
    gameOverShown = true;
    startButton.textContent = 'Start (p)';

    // Draw the game over screen in the next frame to ensure it's not overwritten
    requestAnimationFrame(() => {
        if (gameOverShown) showGameOver();
    });
}

// What the screen says starts, resumes or restarts the game: on a touch screen (no mouse), a tap; with a keyboard, its
// keys, once the page has it (in GameHub's frame, a click on the game gives it the keyboard)
const KEYS_HINTS = {
    start: { touch: 'Tap the board to start', away: 'Click here to play', keys: 'Press Enter to start' },
    resume: { touch: 'Tap the board to resume', away: 'Click here, then press Enter', keys: 'Press Enter or P to resume' },
    restart: { touch: "Tap 'Start' to play again", away: 'Click here, then press Enter', keys: 'Press Enter to play again' },
};
function keysHint(action, focused = document.hasFocus()) {
    const hints = KEYS_HINTS[action];
    if (window.matchMedia?.('(pointer: coarse)').matches) return hints.touch;
    return focused ? hints.keys : hints.away;
}

// A dark veil over the board, with a title and a line under it
function showMessage(title, titleFont, lines) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = titleFont;
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 30);
    for (const [text, font, y] of lines) {
        ctx.font = font;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 + y);
    }
}

// The start screen (focused: whether the page has the keyboard, if it's just changed)
function showStartScreen(focused) {
    drawBoard();
    showMessage('TETRIS', "48px 'Pixelify Sans'", [[keysHint('start', focused), '16px Arial', 20]]);
}

// The paused screen: the game as it is, and how to carry on
function showPaused(focused) {
    drawBoard();
    drawPiece();
    showMessage('PAUSED', '30px Arial', [[keysHint('resume', focused), '16px Arial', 20]]);
}

// The game-over screen: the game as it ended, the score, and how to play again
function showGameOver(focused) {
    drawBoard();
    drawPiece();
    showMessage('GAME OVER!', "40px 'Pixelify Sans'", [
        [`Score: ${game.score}`, '20px Arial', 20],
        [GameHub.replaying ? 'The end of the replay' : keysHint('restart', focused), '14px Arial', 50],
    ]);
}

// The page gets or loses the keyboard: the screen up (the start, paused, game over) says what to do now
function showKeysHint(focused) {
    if (GameHub.replaying) return;
    if (gameOverShown) showGameOver(focused);
    else if (!game) showStartScreen(focused);
    else if (gameActive && gamePause) showPaused(focused);
}

// The game's moves: 'L' and 'R' (left, right), 'U' (rotate), 'D' (down a row) and 'H' (hard drop)
const MOVE_KEYS = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', ' ': 'H' };

// Event listeners
document.addEventListener('keydown', event => {
    if (GameHub.replaying) return; // A replay plays by itself
    if (event.ctrlKey || event.metaKey || event.altKey) return; // The browser's shortcuts
    // Enter on a button presses it
    if (event.key === 'Enter' && event.target instanceof Element && event.target.closest('button, a, input, select, textarea')) {
        return;
    }

    // The game's keys don't scroll the page, or press a button that still has focus
    const moveKey = Object.hasOwn(MOVE_KEYS, event.key);
    if (moveKey) event.preventDefault();

    // Not moving (the start screen, paused, or over): Enter starts or resumes it, and so does a move key (or a tap) but
    // after a game over, so a last key pressed in a hurry doesn't start another. Neither moves the piece.
    if (!gameActive || gamePause) {
        if (!event.repeat && (event.key === 'Enter' || (moveKey && !gameOverShown))) playOn();
        return;
    }
    // Holding Space drops one piece, not one after another
    if (event.repeat && event.key === ' ') {
        return;
    }

    if (moveKey) move(MOVE_KEYS[event.key]);
});

// Start a game, or resume the one paused
function playOn() {
    if (gameActive) pauseGame();
    else startGame();
}

// A new game, once what's saved has loaded and GameHub has handed over its tickets (so its run gets one)
function startGame() {
    if (GameHub.replaying) return; // A replay plays by itself
    if (!loaded) {
        startAsked = true;
        return;
    }
    resetGame();
}

// One move (js/rules.js). It's recorded with the run first (a drop can end the game), so a replay makes it at the same
// step.
function move(code) {
    if (!game || game.over || !GameRules.MOVES.includes(code)) return;
    run.input(code);
    if (GameRules.move(game, code) !== 'moved') pieceLocked();

    drawBoard();
    drawPiece();
}

startButton.addEventListener('click', () => {
    if (GameHub.replaying) return; // A replay plays by itself
    playOn();
});

resetButton.addEventListener('click', startGame);

// Initialize the game: the start screen, until the player starts (once GameHub has handed over its tickets, so the first
// game gets one too); or GameHub opened it to play a replay, which plays the game from its own steps and moves
drawBoard();
if (GameHub.replaying) {
    GameHub.onReplay({
        begin: (replayRun) => resetGame(replayRun),
        input: move,
        step: gameLoop,
    });
    GameHub.playable();
} else {
    startButton.textContent = 'Start (p)';
    showStartScreen();
    // A game saved half-way carries on (paused); otherwise one starts if the player has asked already
    Promise.all([dataLoaded, GameHub.ready()]).then(() => {
        loaded = true;
        if (!gameActive && !resumeSavedGame() && startAsked) resetGame();
        GameHub.playable(); // Ready to play: GameHub stops showing it as loading
    });
}

// A game saved half-way (saveProgress()) carries on, paused, with its run: true if there was one
function resumeSavedGame() {
    const saved = gameData?.game;
    if (!saved || GameHub.replaying) return false;

    // The run carries on from where it was (its random numbers too), and the game from its saved state (js/rules.js)
    const resumedRun = GameHub.resumeRun(saved.run);
    const resumed = GameRules.loadState(saved.state, resumedRun.random);
    if (!resumed) {
        // Not a game this version can carry on: drop it
        resumedRun.discard();
        gameData.game = null;
        saveGameData(gameData);
        return false;
    }
    run = resumedRun;
    game = resumed;
    bestBefore = saved.best;
    gameActive = true;
    gamePause = false;

    scoreElement.textContent = game.score;
    updateHighScore();
    levelElement.textContent = game.level;
    linesElement.textContent = game.lines;
    drawBoard();
    drawPiece();
    drawNextPiece();
    pauseGame(); // It waits for the player: Enter, P, a move, or Resume
    showStatus();
    return true;
}

// The game under way goes with what's saved (when it pauses, or the page is hidden or closed), so it carries on next
// time; a game that ended is taken out
function saveProgress() {
    if (!gameData || GameHub.replaying) return;
    gameData.game = gameActive ? { state: GameRules.saveState(game), run: run.save(), best: bestBefore } : null;
    saveGameData(gameData);
}

// The page hidden (another tab, a locked phone, GameHub's tab left) or closed, the keyboard gone elsewhere (a click
// outside GameHub's frame), or GameHub asks: a game under way pauses (and is saved)
function pauseWhileAway() {
    if (gameActive && !gamePause && !GameHub.replaying) pauseGame();
}
document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseWhileAway();
});
window.addEventListener('pagehide', pauseWhileAway);
window.addEventListener('blur', () => {
    pauseWhileAway();
    showKeysHint(false);
});
window.addEventListener('focus', () => showKeysHint(true));
// The page can get the keyboard without a focus event (as it opens, or with a click when it already had it): look again
// once it has loaded, and after each click or tap
window.addEventListener('load', () => showKeysHint());
document.addEventListener('pointerdown', () => setTimeout(showKeysHint));
document.addEventListener('gamehub:pause', pauseWhileAway);
