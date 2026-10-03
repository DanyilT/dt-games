/**
 * Minesweeper Game
 *
 * A simple implementation of the classic Minesweeper game using JavaScript, HTML, and CSS.
 * This game allows players to select difficulty levels, plant mines, reveal cells, and flag potential mines.
 * It also includes a timer and mine counter.
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

// Game settings
let gameSettings = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 }
};

// Game state
let gameData = null; // What's saved (js/storage.js), once it has loaded: the board is built then
let run = null; // The board under way, recorded so GameHub can play it again (js/gamehub.js)
let firstClickTime = 0; // run.time at the first click, when the timer starts
let currentLevel = defaultGameData().level;
let board = [];
let mineCount = gameSettings[currentLevel].mines;
let flaggedCount = 0;
let revealedCount = 0;
let gameOver = false;
let timerInterval;
let seconds = 0;
let firstClick = true;

// DOM elements
const gameBoard = document.getElementById('game-board');
const resetButton = document.getElementById('reset-button');
const mineCounter = document.querySelector('.mine-counter');
const timer = document.querySelector('.timer');

// Initialize game, at the saved level; or GameHub opened it to play a replay, which builds the board it was played on
loadGameData().then((data) => {
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

const LEVEL_NAMES = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' };

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
        ongoing: !firstClick && !gameOver,
    });
}

// What a run records: an open or a flag on a cell, as one number (cell × 2, + 1 for a flag)
function cellInput(row, col, flag) {
    return (row * gameSettings[currentLevel].cols + col) * 2 + (flag ? 1 : 0);
}

// A replay's open or flag, with the timer as it was then
function replayInput(code) {
    if (!firstClick && !gameOver) {
        seconds = Math.floor((run.time - firstClickTime) / 1000);
        updateTimer();
    }
    const { cols } = gameSettings[currentLevel];
    const cell = Math.floor(code / 2);
    if (code % 2) {
        flagCell(Math.floor(cell / cols), cell % cols);
    } else {
        openCell(Math.floor(cell / cols), cell % cols);
    }
}

// Initialize game board: a new run, or in a replay, the run being played (its level, and its mines)
function initGame(replayRun = null) {
    if (replayRun) currentLevel = LEVEL_NAMES[replayRun.mode] ? replayRun.mode : currentLevel;
    run = replayRun || GameHub.startRun({ mode: currentLevel });
    // Reset game state
    gameOver = false;
    firstClick = true;
    board = [];
    flaggedCount = 0;
    revealedCount = 0;
    seconds = 0;
    updateTimer();
    clearInterval(timerInterval);
    mineCount = gameSettings[currentLevel].mines;
    updateMineCounter();
    resetButton.textContent = '😊';

    // Create game board
    gameBoard.innerHTML = '';
    gameBoard.style.gridTemplateColumns = `repeat(${gameSettings[currentLevel].cols}, auto)`;
    gameBoard.style.gridTemplateRows = `repeat(${gameSettings[currentLevel].rows}, auto)`;

    // Initialize board with empty cells
    for (let row = 0; row < gameSettings[currentLevel].rows; row++) {
        board[row] = [];
        for (let col = 0; col < gameSettings[currentLevel].cols; col++) {
            board[row][col] = {
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighbors: 0
            };

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

// Plant mines on the board
function plantMines(firstRow, firstCol) {
    const { rows, cols, mines } = gameSettings[currentLevel];
    let minesPlanted = 0;

    while (minesPlanted < mines) {
        // From the run's numbers, so a replay gets the same mines
        const randomRow = Math.floor(run.random() * rows);
        const randomCol = Math.floor(run.random() * cols);

        // Ensure we don't plant a mine on the first clicked cell or where a mine already exists
        if ((randomRow !== firstRow || randomCol !== firstCol) && !board[randomRow][randomCol].isMine) {
            board[randomRow][randomCol].isMine = true;
            minesPlanted++;
        }
    }

    // Calculate neighbor counts
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (!board[row][col].isMine) {
                board[row][col].neighbors = countMineNeighbors(row, col);
            }
        }
    }
}

// Helper function to count mines around a cell
function countMineNeighbors(row, col) {
    let count = 0;
    const { rows, cols } = gameSettings[currentLevel];

    // Check all 8 adjacent cells
    for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
            if (r !== row || c !== col) {
                if (board[r][c].isMine) {
                    count++;
                }
            }
        }
    }

    return count;
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

// Open a cell
function openCell(row, col) {
    if (gameOver) {
        return;
    }

    // If cell is flagged, take the flag off
    if (board[row][col].isFlagged) {
        flagCell(row, col);
        return;
    }

    // Handle first click
    if (firstClick) {
        firstClick = false;
        firstClickTime = run.time;
        plantMines(row, col);
        if (!GameHub.replaying) startTimer(); // A replay's timer follows the replay
    }

    // If the cell is already revealed and has neighbors
    if (board[row][col].isRevealed && board[row][col].neighbors > 0) {
        // Count flagged neighbors
        const flaggedNeighbors = countFlaggedNeighbors(row, col);

        // If flagged neighbors matches the number, reveal unflagged neighbors
        if (flaggedNeighbors === board[row][col].neighbors) {
            revealUnflaggedNeighbors(row, col);
            checkWinCondition();
        }
        return;
    }

    // If clicked on a mine, game over
    if (board[row][col].isMine) {
        setGameOver(row, col);
        return;
    }

    // Reveal the cell
    revealCell(row, col);

    // Check win condition
    checkWinCondition();
}

// Helper function to count flagged neighbors
function countFlaggedNeighbors(row, col) {
    let count = 0;
    const { rows, cols } = gameSettings[currentLevel];

    for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
            if ((r !== row || c !== col) && board[r][c].isFlagged) {
                count++;
            }
        }
    }

    return count;
}

// Helper function to reveal all unflagged neighbors
function revealUnflaggedNeighbors(row, col) {
    const { rows, cols } = gameSettings[currentLevel];

    for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
            if (r !== row || c !== col) {
                if (!board[r][c].isRevealed && !board[r][c].isFlagged) {
                    if (board[r][c].isMine) {
                        setGameOver(r, c);
                        return;
                    }
                    revealCell(r, c);
                }
            }
        }
    }
}

// Reveal a cell and its neighbors (if neighbors are empty)
function revealCell(row, col) {
    const { rows, cols } = gameSettings[currentLevel];

    if (row < 0 || row >= rows || col < 0 || col >= cols ||
        board[row][col].isRevealed || board[row][col].isFlagged) {
        return;
    }

    board[row][col].isRevealed = true;
    revealedCount++;

    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add('revealed');

    if (board[row][col].neighbors > 0) {
        cell.textContent = board[row][col].neighbors;
        cell.dataset.value = board[row][col].neighbors;
    } else {
        // Auto-reveal empty neighboring cells
        for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
                if (r !== row || c !== col) {
                    revealCell(r, c);
                }
            }
        }
    }
}

// Flag or unflag a cell
function flagCell(row, col) {
    if (gameOver) {
        return;
    }

    if (board[row][col].isRevealed) {
        if (board[row][col].neighbors > 0) {
            // Count flagged neighbors
            const flaggedNeighbors = countFlaggedNeighbors(row, col);

            // If flagged neighbors matches the number, reveal unflagged neighbors
            if (flaggedNeighbors === board[row][col].neighbors) {
                revealUnflaggedNeighbors(row, col);
                checkWinCondition();
            }
        }
        return; // Opened cells can't be flagged
    }

    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);

    if (board[row][col].isFlagged) {
        board[row][col].isFlagged = false;
        cell.classList.remove('flagged');
        flaggedCount--;
    } else {
        board[row][col].isFlagged = true;
        cell.classList.add('flagged');
        flaggedCount++;
    }

    updateMineCounter();
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
    clearInterval(timerInterval);
    run.finish({
        outcome: 'lost',
        result: [{ label: 'Level', value: LEVEL_NAMES[currentLevel] }, { label: 'Time', value: seconds, format: 'time' }],
    });
    showStatus();

    // Reveal all mines, marking the triggered one
    revealAllMines(triggeredRow, triggeredCol);
}

// Check win condition, if all non-mine cells are revealed, the player wins
function checkWinCondition() {
    if (gameOver) return; // Lost already (a chord that opened a mine)

    const { rows, cols, mines } = gameSettings[currentLevel];
    const totalCells = rows * cols;

    if (revealedCount === totalCells - mines) {
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
        clearInterval(timerInterval);

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
}

// Start timer
function startTimer() {
    clearInterval(timerInterval);
    seconds = 0;
    updateTimer();
    timerInterval = setInterval(() => {
        seconds++;
        updateTimer();
        showStatus();
    }, 1000);
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
