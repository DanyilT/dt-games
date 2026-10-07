/**
 * Snake Game
 *
 * A simple implementation of the classic Snake game using JavaScript and HTML5 Canvas.
 * The game features a snake that grows longer as it eats food, and the player must avoid colliding with the walls or itself.
 * The rules (the board, the steps, the food, the score, the end) are in js/rules.js: this file draws the game, takes the
 * player's keys, and plays the game through GameRules.
 * The game can be controlled using arrow keys or (if use extend-controls.js) WASD keys, and it also supports touch gestures for mobile devices.
 *
 * Features:
 * - Snake movement and growth
 * - Food spawning
 * - Collision detection
 * - Score tracking
 * - Game over and restart functionality
 * - Pause functionality
 * - High score tracking
 * - Instructions and controls
 * - Responsive design for different screen sizes
 * - Touch controls for mobile devices (with use extend-controls.js)
 * - Customizable game parameters (speed and tile count)
 * - Cheat code to set score
 * - GameHub's panel and replays (js/gamehub.js): each game is a run, with the food placed from the run's seed, and every
 *   turn recorded with the step it came after, so GameHub can play it again
 *
 * Instructions:
 * - Use arrow keys to control the snake's direction.
 * - Press the spacebar to pause or resume the game.
 * - Press 'r' to restart the game.
 * - Use the 'i' key to toggle instructions. (in index.html, see buttons-handler.js)
 *
 * Parameters - call the setGameParameters function to set:
 * - Game speed: Adjust the speed of the game by changing the `gameSpeed` variable.
 * - Tile count: Change the number of tiles on the canvas by modifying the `tileCount` variable.
 *
 * Cheat code:
 * - You can set the score directly by calling the `setScore` function with a new score value (the game then isn't kept
 *   to watch again).
 *
 * Easter Egg:
 * - `qwerty.js`
 */

// Game variables
let canvas;
let ctx;
let gameSpeed = GameRules.TICK; // milliseconds per game tick
let tileCount = GameRules.TILES;
let tileSize;
let gameActive = false;
let gamePause = false;
let gameInterval;

// The game under way (js/rules.js): the snake, its direction, the food and the score
let game = null;

// Score
let highScore = 0;
let bestBefore = 0; // The high score when this game started (did this one beat it?)
let gameData = null; // What's saved (js/storage.js), once it has loaded: the game doesn't wait for it

// The game under way, recorded so GameHub can play it again (js/gamehub.js): its random numbers place the food
let run = null;

// What's saved: the high score shows as soon as it has loaded
loadGameData().then((data) => {
    gameData = data;
    if (highScore > gameData.highScore) {
        // Beaten while it was loading
        gameData.highScore = highScore;
        saveGameData(gameData);
    }
    highScore = gameData.highScore;
    document.getElementById('highScore').textContent = highScore;
    showStatus();
});

// GameHub's panel: the score and the high score
function showStatus() {
    GameHub.status({
        main: [
            { label: 'Score', value: game ? game.score : 0 },
            { label: 'Best', value: highScore },
        ],
        ongoing: gameActive,
    });
}

// Set game parameters (game speed and tile count): a game under way isn't kept to watch again
function setGameParameters(speed, tiles) {
    run?.discard();
    gameSpeed = speed;
    tileCount = tiles;
    tileSize = canvas.width / tileCount;
}

// Set the game score (cheat)
function setScore(newScore) {
    GameHub.cheated();
    if (game) game.score = newScore;
    document.getElementById('score').textContent = newScore;
}

// Initialize the game
window.onload = function() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    tileSize = canvas.width / tileCount;

    document.getElementById('highScore').textContent = highScore;

    showIntro();
    document.addEventListener('keydown', keyDown);

    // GameHub opened the game to play a replay: the replay plays the game, from its own steps and turns
    if (GameHub.replaying) {
        GameHub.onReplay({
            begin(replayRun) {
                tileCount = replayRun.mode ? Number(replayRun.mode) : 20; // the board it was played on
                tileSize = canvas.width / tileCount;
                resetGame(replayRun);
            },
            input: turn,
            step: gameLoop,
        });
    }
};

// Reset game to initial state: a new run, or in a replay, the run being played (its steps come from the replay)
function resetGame(replayRun = null) {
    gameActive = true;
    run = replayRun || GameHub.startRun({ mode: tileCount === 20 ? null : String(tileCount), tick: gameSpeed });
    bestBefore = highScore;

    // A new game (js/rules.js): the snake in the middle, and the food, placed from the run's numbers so a replay puts it
    // in the same places
    game = GameRules.newGame(run.random, tileCount);
    document.getElementById('score').textContent = game.score;

    // Start game loop
    if (typeof gameInterval !== 'undefined') {
        clearInterval(gameInterval);
    }
    if (!replayRun) gameInterval = setInterval(gameLoop, gameSpeed);
    showStatus();
}

// Main game loop
function gameLoop() {
    if (!gameActive) return;
    run.step();

    // The snake moves a tile (js/rules.js), and may run into a wall or itself, or eat the food
    const moved = GameRules.step(game);
    if (moved === 'over') {
        gameOver();
        return;
    }

    if (moved === 'ate') {
        document.getElementById('score').textContent = game.score;

        if (game.score > highScore) {
            highScore = game.score;
            if (gameData) {
                gameData.highScore = highScore;
                saveGameData(gameData);
            }
            document.getElementById('highScore').textContent = highScore;
        }
        showStatus();
    }

    // Render game
    render();
}

// Handle keyboard input
function keyDown(e) {
    // Keys held with Ctrl, Cmd or Alt are the browser's (Ctrl+S, Alt+←…)
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // A replay plays by itself
    if (GameHub.replaying) return;
    // The game's keys don't scroll the page, or press a button that still has focus
    if (e.key.startsWith('Arrow') || (e.key === ' ' && gameActive)) e.preventDefault();
    // A held-down key doesn't start a new game, restart or flicker the pause
    if (e.repeat && (!gameActive || e.key === ' ' || e.key === 'r')) return;

    // If game is not active, start it with any arrow key
    if (!gameActive && !gamePause && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        resetGame();
    }

    switch(e.key) {
        case 'ArrowUp':
            turn('U');
            break;
        case 'ArrowDown':
            turn('D');
            break;
        case 'ArrowLeft':
            turn('L');
            break;
        case 'ArrowRight':
            turn('R');
            break;
        case ' ':
            // Pause game
            pauseGame();
            break;
        case 'r':
            run?.discard(); // Restarted before it ended: not kept
            gameActive = false;
            gamePause = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            showIntro();
            showStatus();
            break;
    }
}

// Turn the snake: 'U', 'D', 'L' or 'R' (never straight back: it would run into itself, js/rules.js). A turn that changes
// the direction is recorded with the run, so a replay turns the same way at the same step.
function turn(direction) {
    if (!game || !['U', 'D', 'L', 'R'].includes(direction)) return;
    if (GameRules.turn(game, direction)) run?.input(direction);
}

// Intro screen
function showIntro() {
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = '50px Arial';
    ctx.fillText('Snake Game', canvas.width / 2, canvas.height / 2);
    ctx.font = '20px Arial';
    ctx.fillText('Press an arrow key to start', canvas.width / 2, canvas.height / 2 + 50);
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
        ctx.font = '20px Arial';
        ctx.fillText('Tap or press SPACE to resume', canvas.width / 2, canvas.height / 2 + 30);
    } else if (gamePause) {
        // Resume the game
        gamePause = false;
        gameInterval = setInterval(gameLoop, gameSpeed);
    }
}

// Game over
function gameOver() {
    gameActive = false;
    clearInterval(gameInterval);
    run.finish({ outcome: 'over', result: [{ label: 'Score', value: game.score }], best: game.score > bestBefore });
    showStatus();

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw game over text
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = '40px Arial';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2);
    ctx.font = '20px Arial';
    ctx.fillText(GameHub.replaying ? 'The end of the replay' : 'Press an arrow key to restart', canvas.width / 2, canvas.height / 2 + 30);
}

// Render the game
function render() {
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw snake
    const snake = game.snake;
    for (let i = 0; i < snake.length; i++) {
        if (i === 0) {
            // Draw head
            ctx.fillStyle = 'lightgray';
        } else {
            // Draw body
            ctx.fillStyle = 'darkgray';
        }
        ctx.fillRect(snake[i].x * tileSize, snake[i].y * tileSize, tileSize - 1, tileSize - 1);
    }

    // Draw food
    ctx.fillStyle = 'red';
    ctx.fillRect(game.foodX * tileSize, game.foodY * tileSize, tileSize - 1, tileSize - 1);
}
