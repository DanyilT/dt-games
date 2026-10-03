/**
 * Snake Game
 *
 * A simple implementation of the classic Snake game using JavaScript and HTML5 Canvas.
 * The game features a snake that grows longer as it eats food, and the player must avoid colliding with the walls or itself.
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
let gameSpeed = 100; // milliseconds per game tick
let tileCount = 20;
let tileSize;
let gameActive = false;
let gamePause = false;
let gameInterval;

// Snake variables
let snake = [];
let velocityX = 0;
let velocityY = 0;
let movedX = 0; // Direction of the last move (a turn may not reverse it)
let movedY = 0;
const SNAKE_LENGTH = 5; // Initial length of the snake
let snakeLength = SNAKE_LENGTH;

// Food variables
let foodX;
let foodY;

// Score
let score = 0;
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
            { label: 'Score', value: score },
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
    score = newScore;
    document.getElementById('score').textContent = score;
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

    // Reset snake
    snake = [];
    snakeLength = SNAKE_LENGTH;
    snake.push({x: canvas.width / 2 / tileSize, y: canvas.height / 2 / tileSize}); // Starting at center
    velocityX = 0;
    velocityY = 0;
    movedX = 0;
    movedY = 0;

    // Reset score
    score = 0;
    document.getElementById('score').textContent = score;

    // Place food
    placeFood();

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

    // Move snake
    let headX = snake[0].x + velocityX;
    let headY = snake[0].y + velocityY;

    // Check for collisions
    if (
        headX < 0 ||
        headY < 0 ||
        headX >= canvas.width / tileSize || // Horizontal boundary
        headY >= canvas.height / tileSize || // Vertical boundary
        checkSnakeCollision(headX, headY)
    ) {
        gameOver();
        return;
    }

    // The snake moves: remember which way (for the next turn)
    movedX = velocityX;
    movedY = velocityY;

    // Add new head segment
    snake.unshift({x: headX, y: headY});

    // Check for food collision
    if (headX === foodX && headY === foodY) {
        placeFood();
        snakeLength++;
        score++;
        document.getElementById('score').textContent = score;

        if (score > highScore) {
            highScore = score;
            if (gameData) {
                gameData.highScore = highScore;
                saveGameData(gameData);
            }
            document.getElementById('highScore').textContent = highScore;
        }
        showStatus();
    }

    // Remove tail if didn't eat food
    if (snake.length > snakeLength) {
        snake.pop();
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

// Turn the snake: 'U', 'D', 'L' or 'R' (never straight back: it would run into itself). A turn is recorded with the run,
// so a replay turns the same way at the same step.
function turn(direction) {
    const [x, y] = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }[direction] ?? [0, 0];
    if ((x === 0 && y === 0) || (x !== 0 && movedX === -x) || (y !== 0 && movedY === -y)) return;
    if (velocityX === x && velocityY === y) return; // Going that way already
    velocityX = x;
    velocityY = y;
    run?.input(direction);
}

// Check if snake collides with itself
function checkSnakeCollision(x, y) {
    for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === x && snake[i].y === y) {
            return true;
        }
    }
    return false;
}

// Place food at random position
function placeFood() {
    if (snake.length >= tileCount * tileCount) return; // No free cell left

    // Keep generating positions until we find one that's not on the snake (from the run's numbers, so a replay puts the
    // food in the same places)
    do {
        foodX = Math.floor(run.random() * canvas.width / tileSize);
        foodY = Math.floor(run.random() * canvas.height / tileSize);
    } while (checkSnakeCollision(foodX, foodY));
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
        ctx.fillText('Press `SPACE` to resume', canvas.width / 2, canvas.height / 2 + 30);
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
    run.finish({ outcome: 'over', result: [{ label: 'Score', value: score }], best: score > bestBefore });
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
    ctx.fillRect(foodX * tileSize, foodY * tileSize, tileSize - 1, tileSize - 1);
}
