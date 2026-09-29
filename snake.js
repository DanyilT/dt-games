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
 * - You can set the score directly by calling the `setScore` function with a new score value.
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

// Snake variables
let snake = [];
let velocityX = 0;
let velocityY = 0;
const SNAKE_LENGTH = 5; // Initial length of the snake
let snakeLength = SNAKE_LENGTH;

// Food variables
let foodX;
let foodY;

// Score
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;

// Set game parameters (game speed and tile count)
function setGameParameters(speed, tiles) {
    gameSpeed = speed;
    tileCount = tiles;
    tileSize = canvas.width / tileCount;
}

// Set the game score (cheat)
function setScore(newScore) {
    score = newScore;
    document.getElementById("score").textContent = score;
}

// Initialize the game
window.onload = function() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    tileSize = canvas.width / tileCount;

    document.getElementById("highScore").textContent = highScore;

    showIntro();
    document.addEventListener("keydown", keyDown);
};

// Reset game to initial state
function resetGame() {
    gameActive = true;

    // Reset snake
    snake = [];
    snakeLength = SNAKE_LENGTH;
    snake.push({x: canvas.width / 2 / tileSize, y: canvas.height / 2 / tileSize}); // Starting at center
    velocityX = 0;
    velocityY = 0;

    // Reset score
    score = 0;
    document.getElementById("score").textContent = score;

    // Place food
    placeFood();

    // Start game loop
    if (typeof gameInterval !== 'undefined') {
        clearInterval(gameInterval);
    }
    gameInterval = setInterval(gameLoop, gameSpeed);
}

// Main game loop
function gameLoop() {
    if (!gameActive) return;

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

    // Check for food collision
    if (headX === foodX && headY === foodY) {
        placeFood();
        snakeLength++;
        score++;
        document.getElementById("score").textContent = score;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            document.getElementById("highScore").textContent = highScore;
        }
    }

    // Add new head segment
    snake.unshift({x: headX, y: headY});

    // Remove tail if didn't eat food
    if (snake.length > snakeLength) {
        snake.pop();
    }

    // Render game
    render();
}

// Handle keyboard input
function keyDown(e) {
    // If game is not active, start it with any arrow key
    if (!gameActive && !gamePause && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        resetGame();
    }

    // Prevent reversing direction directly
    switch(e.key) {
        case "ArrowUp":
            if (velocityY !== 1) { // Not going down
                velocityX = 0;
                velocityY = -1;
            }
            break;
        case "ArrowDown":
            if (velocityY !== -1) { // Not going up
                velocityX = 0;
                velocityY = 1;
            }
            break;
        case "ArrowLeft":
            if (velocityX !== 1) { // Not going right
                velocityX = -1;
                velocityY = 0;
            }
            break;
        case "ArrowRight":
            if (velocityX !== -1) { // Not going left
                velocityX = 1;
                velocityY = 0;
            }
            break;
        case " ":
            // Pause game
            pauseGame();
            break;
        case "r":
            gameActive = false;
            gamePause = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            showIntro();
            break;
    }
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
    // Keep generating positions until we find one that's not on the snake
    do {
        foodX = Math.floor(Math.random() * canvas.width / tileSize);
        foodY = Math.floor(Math.random() * canvas.height / tileSize);
    } while (checkSnakeCollision(foodX, foodY));
}

// Intro screen
function showIntro() {
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "50px Arial";
    ctx.fillText("Snake Game", canvas.width / 2, canvas.height / 2);
    ctx.font = "20px Arial";
    ctx.fillText("Press an arrow key to start", canvas.width / 2, canvas.height / 2 + 50);
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
        ctx.font = "20px Arial";
        ctx.fillText("Press `SPACE` to resume", canvas.width / 2, canvas.height / 2 + 30);
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

    // Semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw game over text
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "40px Arial";
    ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2);
    ctx.font = "20px Arial";
    ctx.fillText("Press an arrow key or click Restart", canvas.width / 2, canvas.height / 2 + 30);
}

// Render the game
function render() {
    // Clear canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw snake
    for (let i = 0; i < snake.length; i++) {
        if (i === 0) {
            // Draw head
            ctx.fillStyle = "lightgray";
        } else {
            // Draw body
            ctx.fillStyle = "darkgray";
        }
        ctx.fillRect(snake[i].x * tileSize, snake[i].y * tileSize, tileSize - 1, tileSize - 1);
    }

    // Draw food
    ctx.fillStyle = "purple";
    ctx.fillRect(foodX * tileSize, foodY * tileSize, tileSize - 1, tileSize - 1);
}
