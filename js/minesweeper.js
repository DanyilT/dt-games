/**
 * Minesweeper Game
 *
 * A simple implementation of the classic Minesweeper game using JavaScript, HTML, and CSS.
 * This game allows players to select difficulty levels, plant mines, reveal cells, and flag potential mines.
 * It also includes a timer and mine counter.
 * The rules (the levels, the mines, opening and flagging, the win and the loss) are in js/rules.js: this file shows the
 * board, takes the player's clicks, and plays the game through GameRules.
 *
 * Features:
 * - Three difficulty levels: Beginner, Intermediate, and Expert
 * - Timer to track the time taken to complete the game
 * - Mine counter to show the number of remaining mines
 * - Ability to flag cells as potential mines
 * - Auto-reveal of empty cells
 * - Win condition check
 * - Game over condition when clicking on a mine
 * - GameHub's panel and replays (js/gamehub.js): each board is a run, with the mines placed from the run's seed, and every
 *   open and flag recorded with its time, so GameHub can play it again
 *
 * Instructions:
 * - Click on a cell to reveal it.
 * - Right-click (or long-press on mobile) to flag/unflag a cell.
 * - Use the reset button to restart the game.
 * - Select a difficulty level to change the game settings.
 * - Use the keyboard arrow keys to navigate the board. (extend controls)
 *
 * Cheat code:
 * - You can reveal all mines by running the function `revealAllMines()`, but the board must be initialized first (the
 *   game then isn't kept to watch again).
 *
 * Easter Egg:
 * - `qwerty.js`
 */


// Game settings: the levels' rows, columns and mines (js/rules.js)
const gameSettings = GameRules.LEVELS;
const LEVEL_NAMES = Object.fromEntries(Object.entries(gameSettings).map(([level, settings]) => [level, settings.name]));

// Game state
let gameData = null; // What's saved (js/storage.js), once it has loaded: the board is built then
let run = null; // The board under way, recorded so GameHub can play it again (js/gamehub.js)
let game = null; // The board under way (js/rules.js): its cells, its mines, and whether it's won or lost
let currentLevel = defaultGameData().level;
let board = []; // The board's cells (game.board): { isMine, isRevealed, isFlagged, neighbors }
let mineCount = gameSettings[currentLevel].mines;
let flaggedCount = 0;
let gameOver = false;
let timerInterval = null; // While the timer runs (a game under way, from its first click)
let seconds = 0; // The timer: whole seconds since the first click, while the page was on screen
let timerTime = 0; // ms on the timer, up to when its clock last stopped
let timerStartedAt = null; // performance.now() while the timer's clock runs, null while it's stopped

// DOM elements
const gameBoard = document.getElementById('game-board');
const resetButton = document.getElementById('reset-button');
const mineCounter = document.querySelector('.mine-counter');
const timer = document.querySelector('.timer');

// Initialize game, at the saved level (once GameHub has handed over its tickets, so the first board gets one too); or
// GameHub opened it to play a replay, which builds the board it was played on
Promise.all([loadGameData(), GameHub.ready()]).then(([data]) => {
    gameData = data;
    currentLevel = gameData.level;
    if (GameHub.replaying) {
        GameHub.onReplay({
            begin(replayRun) {
                initGame(replayRun);
                document.dispatchEvent(new Event('minesweeper:loaded')); // The Game menu shows the replay's level
            },
            input: replayInput,
        });
    } else {
        initGame();
    }
    document.dispatchEvent(new Event('minesweeper:loaded')); // The Game menu shows the level and the ⭐
});

// Event listeners
resetButton.addEventListener('click', resetGame);


// GameHub's panel: the level, the time on the board under way and the best one, then the wins and best times per level
function showStatus() {
    if (!gameData) return;
    GameHub.status({
        main: [
            { label: 'Level', value: LEVEL_NAMES[currentLevel] },
            { label: 'Time', value: seconds, format: 'time' },
            { label: 'Best time', value: gameData.bestTimes[currentLevel], format: 'time' },
        ],
        more: Object.keys(LEVEL_NAMES).map((level) => ({
            title: LEVEL_NAMES[level],
            items: [
                { label: 'Wins', value: gameData.wins[level] },
                { label: 'Best time', value: gameData.bestTimes[level], format: 'time' },
            ],
        })),
        ongoing: Boolean(game) && !game.firstClick && !gameOver,
    });
}

// What a run records: an open or a flag on a cell, as one number (cell × 2, + 1 for a flag)
function cellInput(row, col, flag) {
    return (row * game.cols + col) * 2 + (flag ? 1 : 0);
}

// A replay's open or flag, with the timer as it was then
function replayInput(code) {
    if (!game.firstClick && !gameOver) {
        seconds = Math.floor((run.time - game.firstClickAt) / 1000);
        updateTimer();
    }
    const cell = Math.floor(code / 2);
    if (code % 2) {
        flagCell(Math.floor(cell / game.cols), cell % game.cols);
    } else {
        openCell(Math.floor(cell / game.cols), cell % game.cols);
    }
}

// Initialize game board: a new run, or in a replay, the run being played (its level, and its mines)
function initGame(replayRun = null) {
    if (replayRun) currentLevel = LEVEL_NAMES[replayRun.mode] ? replayRun.mode : currentLevel;
    run = replayRun || GameHub.startRun({ mode: currentLevel });
    // A new board (js/rules.js): its mines go in at the first open, from the run's numbers, so a replay gets the same ones
    game = GameRules.newGame(run.random, currentLevel);
    board = game.board;
    // Reset game state
    gameOver = false;
    flaggedCount = 0;
    clearInterval(timerInterval);
    timerInterval = null;
    timerTime = 0;
    timerStartedAt = null;
    seconds = 0;
    updateTimer();
    mineCount = game.mines;
    updateMineCounter();
    resetButton.textContent = '😊';

    // Create game board
    gameBoard.innerHTML = '';
    gameBoard.style.gridTemplateColumns = `repeat(${game.cols}, auto)`;
    gameBoard.style.gridTemplateRows = `repeat(${game.rows}, auto)`;

    // A cell element for each cell, row by row
    for (let row = 0; row < game.rows; row++) {
        for (let col = 0; col < game.cols; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;

            cell.addEventListener('click', () => handleCellClick(row, col));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(row, col);
            });

            gameBoard.appendChild(cell);
        }
    }
    showStatus();
}

// Handle cell click event: the player opens a cell. It's recorded with the run first (it can end the game).
function handleCellClick(row, col) {
    if (gameOver || GameHub.replaying || !board.length) {
        return;
    }
    run.input(cellInput(row, col, false));
    openCell(row, col);
}

// Handle right click event: the player flags a cell (or opens around a number)
function handleRightClick(row, col) {
    if (gameOver || GameHub.replaying || !board.length) {
        return;
    }
    run.input(cellInput(row, col, true));
    flagCell(row, col);
}

// Open a cell (js/rules.js), at the run's time: the first open puts the mines in, and starts the timer
function openCell(row, col) {
    if (gameOver) {
        return;
    }
    const first = game.firstClick;
    GameRules.openCell(game, row, col, run.time);
    if (first && !game.firstClick && !GameHub.replaying) startTimer(); // A replay's timer follows the replay
    afterMove();
}

// Flag or unflag a cell (js/rules.js); on an open number whose flags are all there, open the cells around it
function flagCell(row, col) {
    if (gameOver) {
        return;
    }
    GameRules.flagCell(game, row, col);
    afterMove();
}

// After an open or a flag: the cells as the board has them now, the mine counter, and the end of the game if it came
function afterMove() {
    showCells();
    updateMineCounter();
    if (game.over && !gameOver) {
        if (game.won) {
            showWin();
        } else {
            setGameOver(game.hit.row, game.hit.col);
        }
    }
}

// Show the cells the board has opened (with their numbers) and flagged
function showCells() {
    flaggedCount = 0;
    for (let row = 0; row < game.rows; row++) {
        for (let col = 0; col < game.cols; col++) {
            const cell = board[row][col];
            const element = gameBoard.children[row * game.cols + col];
            if (cell.isRevealed) {
                element.classList.add('revealed');
                if (cell.neighbors > 0 && element.dataset.value !== String(cell.neighbors)) {
                    element.textContent = cell.neighbors;
                    element.dataset.value = cell.neighbors;
                }
            }
            element.classList.toggle('flagged', cell.isFlagged);
            if (cell.isFlagged) flaggedCount++;
        }
    }
}

// Reveal all mines when game is over; or can be a cheat - should init the board first, before using the function (cheat)
function revealAllMines(triggeredRow = null, triggeredCol = null) {
    if (!board.length) return; // No board yet: what's saved is still loading
    if (!gameOver) GameHub.cheated(); // Not the end of a game: a cheat

    const { rows, cols } = gameSettings[currentLevel];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);

            if (board[row][col].isMine) {
                if (board[row][col].isFlagged) {
                    // Correctly flagged mine
                    cell.classList.add('revealed', 'mine', 'mine-flagged-correct');
                } else {
                    // Unflagged mine
                    cell.classList.add('revealed', 'mine');

                    if (triggeredRow !== null && triggeredCol !== null && row === triggeredRow && col === triggeredCol) {
                        cell.classList.add('triggered');
                    }
                }
            } else if (board[row][col].isFlagged) {
                // Incorrectly flagged cell (not a mine)
                cell.classList.add('revealed', 'mine', 'mine-flagged-wrong');
            }
        }
    }
}

// Game over: stop the timer and show all the mines
function setGameOver(triggeredRow, triggeredCol) {
    gameOver = true;
    resetButton.textContent = '😵';
    stopTimer();
    run.finish({
        outcome: 'lost',
        result: [{ label: 'Level', value: LEVEL_NAMES[currentLevel] }, { label: 'Time', value: seconds, format: 'time' }],
    });
    showStatus();

    // Reveal all mines, marking the triggered one
    revealAllMines(triggeredRow, triggeredCol);
}

// The board is won (js/rules.js: every cell but the mines is open)
function showWin() {
    const { rows, cols } = game;
    stopTimer(); // The time it shows is the win's

    // Count the win, and keep the time if it's the fastest on this level (not a replay's: it was counted then)
    const bestTime = gameData.bestTimes[currentLevel];
    if (!GameHub.replaying) {
        gameData.wins[currentLevel]++;
        if (bestTime === null || seconds < bestTime) {
            gameData.bestTimes[currentLevel] = seconds;
        }
        saveGameData(gameData);
    }
    run.finish({
        outcome: 'won',
        result: [{ label: 'Level', value: LEVEL_NAMES[currentLevel] }, { label: 'Time', value: seconds, format: 'time' }],
        best: bestTime === null || seconds < bestTime,
    });
    document.dispatchEvent(new Event('minesweeper:win')); // The Game menu shows the new ⭐ count

    gameOver = true;
    resetButton.textContent = '😎';

    // Flag all remaining mines
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (board[row][col].isMine && !board[row][col].isFlagged) {
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                cell.classList.add('flagged');
                flaggedCount++;
            }
        }
    }

    updateMineCounter();
    showStatus();
}

// The timer's clock runs only while the page is on screen, as the run's does (js/gamehub.js), so the time a win shows is
// the time GameHub's server finds when it plays the run again
function timerSeconds() {
    const running = timerStartedAt === null ? 0 : performance.now() - timerStartedAt;
    return Math.floor((timerTime + running) / 1000);
}

// Start the timer's clock (not while the page is hidden)
function startClock() {
    if (timerStartedAt === null && !document.hidden) {
        timerStartedAt = performance.now();
    }
}

// Stop the timer's clock, keeping its time so far
function stopClock() {
    if (timerStartedAt !== null) {
        timerTime += performance.now() - timerStartedAt;
        timerStartedAt = null;
    }
}

// The page hidden (another tab, a locked phone): the timer waits until it's back
document.addEventListener('visibilitychange', () => {
    if (timerInterval === null) return; // No game under way
    if (document.hidden) {
        stopClock();
    } else {
        startClock();
    }
});

// Start timer: from 0, at the first click
function startTimer() {
    clearInterval(timerInterval);
    timerTime = 0;
    timerStartedAt = null;
    startClock();
    seconds = 0;
    updateTimer();
    timerInterval = setInterval(() => {
        const now = timerSeconds();
        if (now === seconds) return;
        seconds = now;
        updateTimer();
        showStatus();
    }, 200);
}

// Stop timer: the game is over, and the timer shows its time to the end (a replay's timer follows the replay instead)
function stopTimer() {
    if (timerInterval === null) return;
    clearInterval(timerInterval);
    timerInterval = null;
    stopClock();
    seconds = timerSeconds();
    updateTimer();
}

// Update timer display
function updateTimer() {
    timer.textContent = seconds.toString().padStart(3, '0');
}

// Update mine counter display
function updateMineCounter() {
    const remainingMines = mineCount - flaggedCount;
    mineCounter.textContent = remainingMines < 0
        ? '-' + String(-remainingMines).padStart(2, '0')
        : remainingMines.toString().padStart(3, '0');
}

// Reset game to initial state
function resetGame() {
    if (!gameData || GameHub.replaying) return; // What's saved is still loading: the board comes with it
    initGame();
}

// Change game level
function changeLevel(level) {
    if (!gameData || GameHub.replaying) return; // What's saved is still loading: the board comes with it
    currentLevel = level;
    gameData.level = level;
    saveGameData(gameData);
    resetGame();
}
