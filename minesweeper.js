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
 *
 * Instructions:
 * - Click on a cell to reveal it.
 * - Right-click (or long-press on mobile) to flag/unflag a cell.
 * - Use the reset button to restart the game.
 * - Select a difficulty level to change the game settings.
 * - Use the keyboard arrow keys to navigate the board. (extend controls)
 *
 * Cheat code:
 * - You can reveal all mines by running the function `revealAllMines()`, but the board must be initialized first.
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
let currentLevel = localStorage.getItem('minesweeperLevel') || 'beginner';
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
const beginnerBtn = document.getElementById('beginner');
const intermediateBtn = document.getElementById('intermediate');
const expertBtn = document.getElementById('expert');

// Initialize game
initGame();

// Event listeners
resetButton.addEventListener('click', resetGame);
beginnerBtn.addEventListener('click', () => changeLevel('beginner'));
intermediateBtn.addEventListener('click', () => changeLevel('intermediate'));
expertBtn.addEventListener('click', () => changeLevel('expert'));

// Initialize game board
function initGame() {
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
}

// Plant mines on the board
function plantMines(firstRow, firstCol) {
    const { rows, cols, mines } = gameSettings[currentLevel];
    let minesPlanted = 0;

    while (minesPlanted < mines) {
        const randomRow = Math.floor(Math.random() * rows);
        const randomCol = Math.floor(Math.random() * cols);

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

// Handle cell click event
function handleCellClick(row, col) {
    if (gameOver) {
        return;
    }

    // Handle first click
    if (firstClick) {
        firstClick = false;
        plantMines(row, col);
        startTimer();
    }

    // If cell is flagged, handle right click
    if (board[row][col].isFlagged) {
        handleRightClick(row, col);
        return;
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
                        setGameOver();
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

// Handle right-click to flag/unflag a cell
function handleRightClick(row, col) {
    if (gameOver) {
        return;
    }

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

function setGameOver(triggeredRow, triggeredCol) {
    gameOver = true;
    resetButton.textContent = '😵';
    clearInterval(timerInterval);

    // Reveal all mines, marking the triggered one
    revealAllMines(triggeredRow, triggeredCol);
}

// Check win condition, if all non-mine cells are revealed, the player wins
function checkWinCondition() {
    const { rows, cols, mines } = gameSettings[currentLevel];
    const totalCells = rows * cols;

    if (revealedCount === totalCells - mines) {
        let winLevels = JSON.parse(localStorage.getItem('winLevels')) || {'beginner': 0, 'intermediate': 0, 'expert': 0};
        winLevels[currentLevel]++;
        localStorage.setItem('winLevels', JSON.stringify(winLevels));

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
    }, 1000);
}

// Update timer display
function updateTimer() {
    timer.textContent = seconds.toString().padStart(3, '0');
}

// Update mine counter display
function updateMineCounter() {
    const remainingMines = mineCount - flaggedCount;
    mineCounter.textContent = remainingMines.toString().padStart(3, '0');
}

// Reset game to initial state
function resetGame() {
    initGame();
}

// Change game level
function changeLevel(level) {
    currentLevel = level;
    localStorage.setItem('minesweeperLevel', level);
    resetGame();
}
