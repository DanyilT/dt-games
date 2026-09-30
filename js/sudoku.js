// Global variables
let board = emptyGrid(); // Current state (empty until what's saved has loaded)
let solution = emptyGrid(); // Complete solution
let initialBoard = emptyGrid(); // Initial state with clues
let gameData = null; // What's saved (js/storage.js), once it has loaded: the puzzle comes with it
let difficulty = defaultGameData().level;
let winLevels = defaultGameData().wins;
let gameWon = false;
let puzzleTime = 0; // ms spent on the puzzle in progress, up to when its clock last stopped (no timer is shown)
let clockStartedAt = null; // performance.now() while the clock runs, null while it's stopped

// Initialize game with what's saved: the puzzle in progress, or a new one
loadGameData().then((data) => {
    gameData = data;
    difficulty = gameData.level; // A new puzzle is at the saved level
    winLevels = gameData.wins;
    if (gameData.board === null) {
        initGame();
    }
    loadGameState();
});

// The clock stops while the page is hidden (another tab, a locked phone), and the time so far is saved
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopClock();
        saveGameState();
    } else {
        startClock();
    }
});

// Add event listeners for cells
setupCellListeners();

// Add event listener to the difficulty selector
document.getElementById('difficulty').addEventListener('change', function() {
    if (!gameData) {
        this.value = difficulty; // What's saved is still loading: keep the level it had
        return;
    }
    difficulty = this.value;
    gameData.level = difficulty;
    saveGameData(gameData);
    initGame();
});

// Add event listeners to the game buttons
document.getElementById('newGameBtn').addEventListener('click', function() {
    if (JSON.stringify(board) !== JSON.stringify(initialBoard)) {
        const confirmReset = confirm('Are you sure you want to start a new game? Your current progress will be lost.');
        if (!confirmReset) {
            return;
        }
    }
    initGame();
});
document.getElementById('checkSolutionBtn').addEventListener('click', checkSolution);

// Function to initialize the game
function initGame() {
    if (!gameData) return; // What's saved is still loading: the puzzle comes with it
    gameWon = false;

    // A new puzzle: its clock starts from zero
    puzzleTime = 0;
    clockStartedAt = null;
    startClock();

    // Clear saved game state when starting a new game
    gameData.board = null;

    // Generate a complete solution
    solution = generateSolution();

    // Create initial board based on difficulty
    initialBoard = JSON.parse(JSON.stringify(solution));
    removeNumbers(difficulty);

    // Set current board to initial state
    board = JSON.parse(JSON.stringify(initialBoard));

    // Display the board
    updateBoard();
    saveGameState(); // Save the new puzzle, so a reload keeps it

    // Show notification
    showNotification('New game started!', 'info');
}

// An empty 9×9 grid (0 is an empty cell)
function emptyGrid() {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
}

// Start the clock of the puzzle in progress (while it's unsolved and the page is on screen)
function startClock() {
    if (clockStartedAt === null && !gameWon && !document.hidden) {
        clockStartedAt = performance.now();
    }
}

// Stop the clock, keeping the time so far
function stopClock() {
    if (clockStartedAt !== null) {
        puzzleTime += performance.now() - clockStartedAt;
        clockStartedAt = null;
    }
}

// Seconds spent on the puzzle in progress
function puzzleSeconds() {
    const running = clockStartedAt === null ? 0 : performance.now() - clockStartedAt;
    return Math.round((puzzleTime + running) / 1000);
}

// Function to generate a complete Sudoku solution
function generateSolution() {
    // Start with empty board (9x9 grid)
    const solution = Array(9).fill().map(() => Array(9).fill(0));

    // Solve it to create a valid solution
    solveSudoku(solution);
    return solution;
}

// Function to solve the Sudoku puzzle using backtracking
function solveSudoku(board) {
    const emptyCell = findEmptyCell(board);

    // If no empty cells, the board is solved
    if (!emptyCell) {
        return true;
    }

    const [row, col] = emptyCell;
    // Try digits 1-9 in random order
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    shuffleArray(digits);

    for (let num of digits) {
        if (isValidPlacement(board, row, col, num)) {
            board[row][col] = num;

            if (solveSudoku(board)) {
                return true;
            }

            // Backtrack if solution not found
            board[row][col] = 0;
        }
    }

    return false;
}

// Function to find an empty cell in the board
function findEmptyCell(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                return [row, col];
            }
        }
    }
    return null;
}

// Function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Function to check if a number can be placed in a cell
function isValidPlacement(board, row, col, num) {
    // Check row
    for (let x = 0; x < 9; x++) {
        if (board[row][x] === num) return false;
    }

    // Check column
    for (let y = 0; y < 9; y++) {
        if (board[y][col] === num) return false;
    }

    // Check 3x3 subgrid
    const subgridRow = Math.floor(row / 3) * 3;
    const subgridCol = Math.floor(col / 3) * 3;

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[subgridRow + i][subgridCol + j] === num) return false;
        }
    }

    return true;
}

// Function to remove numbers from the board based on difficulty
function removeNumbers(difficulty) {
    // Determine cells to remove based on difficulty
    let cellsToRemove;
    switch(difficulty) {
        case 'beginner': cellsToRemove = 20; break; // Keep 61 out of 81 cells
        case 'easy': cellsToRemove = 40; break;     // Keep 41 out of 81 cells
        case 'medium': cellsToRemove = 50; break;   // Keep 31 out of 81 cells
        case 'hard': cellsToRemove = 60; break;     // Keep 21 out of 81 cells
        case 'expert': cellsToRemove = 70; break;   // Keep 11 out of 81 cells
        default: cellsToRemove = 50;
    }

    // Create list of all positions
    const positions = [];
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            positions.push([row, col]);
        }
    }

    shuffleArray(positions);

    // Clear cells beyond what we want to keep
    for (let i = 0; i < cellsToRemove; i++) {
        const [row, col] = positions[i];
        initialBoard[row][col] = 0;
    }
}

// Function to display the Sudoku board
function updateBoard() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);

            // Set value
            cell.value = board[row][col] > 0 ? board[row][col] : '';

            // Style initial cells differently
            if (initialBoard[row][col] > 0) {
                cell.classList.add('initial');
                cell.readOnly = true;
            } else {
                cell.classList.remove('initial');
                cell.readOnly = false;
            }

            cell.classList.remove('valid', 'invalid');
        }
    }

    // Validate all cells after updating the board
    validateAllCells();
}

// Function to validate all cells and update their classes
function validateAllCells() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const value = board[row][col];
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);

            // Skip empty cells and initial clues
            if (value === 0 || initialBoard[row][col] > 0) {
                cell.classList.remove('valid', 'invalid');
                continue;
            }

            // Check if the current value is valid
            const tempBoard = JSON.parse(JSON.stringify(board));
            tempBoard[row][col] = 0; // Clear temporarily to check

            if (isValidPlacement(tempBoard, row, col, value)) {
                cell.classList.add('valid');
                cell.classList.remove('invalid');
            } else {
                cell.classList.add('invalid');
                cell.classList.remove('valid');
            }
        }
    }
}

// Function to set up event listeners for cells (focus+keydown / input / number pad)
function setupCellListeners() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.addEventListener('keydown', function(e) {
            // Prevent any input if game is won
            if (gameWon) {
                e.preventDefault();
                return;
            }

            // Prevent direct typing in cells
            if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (!this.readOnly) {
                    const row = parseInt(this.dataset.row);
                    const col = parseInt(this.dataset.col);
                    updateCell(row, col, parseInt(e.key));
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                if (!this.readOnly) {
                    const row = parseInt(this.dataset.row);
                    const col = parseInt(this.dataset.col);
                    updateCell(row, col, 0);
                }
            } else if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'Tab' || e.key === ' ') {
                e.preventDefault();
                this.blur(); // Remove focus from the input
            } else if (e.key.length === 1 && e.key !== '0' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault(); // Letters and signs would empty the cell (the i and r shortcuts still work; 0 still clears it, as before)
            }
        });

        // Handle direct input (typing, pasting)
        cell.addEventListener('input', function(e) {
            if (!this.readOnly) {
                const row = parseInt(this.dataset.row);
                const col = parseInt(this.dataset.col);

                // Get the last character if multiple were entered
                const value = this.value.slice(-1);

                // Only accept digits 1-9
                if (value.match(/^[1-9]$/)) {
                    updateCell(row, col, parseInt(value));
                } else {
                    // Clear the cell for non-valid input
                    updateCell(row, col, 0);
                }

                // Ensure the display shows only what updateCell set
                // (needed because updateCell updates the value but doesn't stop the input event)
                this.value = board[row][col] > 0 ? board[row][col] : '';
            }
        });

        // Handle focus to select the cell for numberpad input (number pad)
        cell.addEventListener('focus', function() {
            // Store the currently selected cell for use by the number pad
            window.currentSelectedCell = this;
        });
    });

    // Connect number pad buttons (number pad)
    const numButtons = document.querySelectorAll('.num-btn');
    numButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (gameWon) return;

            const num = parseInt(this.getAttribute('data-number'));
            const selectedCell = window.currentSelectedCell;

            if (selectedCell && !initialBoard[selectedCell.dataset.row][selectedCell.dataset.col]) {
                const row = parseInt(selectedCell.dataset.row);
                const col = parseInt(selectedCell.dataset.col);
                updateCell(row, col, num);
            }
        });
    });
}

// Function to update cell value
function updateCell(row, col, value) {
    board[row][col] = value;
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);

    // Update display
    cell.value = value > 0 ? value : '';

    // Clear classes first
    cell.classList.remove('valid', 'invalid');

    // Validate all cells since one change can affect others
    validateAllCells();

    // Check for completion only if the cell was filled
    if (value > 0) {
        checkForCompletion();
    }

    // Save game state after each cell update
    saveGameState();
}

// Function to save the complete game state
function saveGameState() {
    if (!gameData) return; // What's saved is still loading: don't save over it

    if (!gameWon) {
        gameData.board = {
            board: board,
            initialBoard: initialBoard,
            solution: solution,
            difficulty: difficulty,
            time: puzzleSeconds()
        };
    } else {
        gameData.board = null;
    }

    // Save win statistics
    gameData.wins = winLevels;

    // Save current difficulty
    gameData.level = difficulty;

    saveGameData(gameData);
}

// Function to load the complete game state
function loadGameState() {
    const difficultySelect = document.getElementById('difficulty');
    const savedGame = gameData.board;
    difficulty = gameData.level;
    winLevels = gameData.wins;

    // Update difficulty dropdown to match saved state
    if (difficultySelect) {
        difficultySelect.value = difficulty;
    }

    if (savedGame) {
        board = savedGame.board;
        initialBoard = savedGame.initialBoard;
        solution = savedGame.solution;
        difficulty = savedGame.difficulty;
        gameWon = false; // Won games aren't saved

        // Its clock goes on from the time saved with it
        puzzleTime = savedGame.time * 1000;
        clockStartedAt = null;
        startClock();

        // Display the loaded board
        updateBoard();
        return true;
    }

    return false;
}

// Function to check if the puzzle is complete
function checkForCompletion() {
    // Check if all cells are filled
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                return false;
            }
        }
    }

    // Check if all placements are valid
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const value = board[row][col];
            const tempBoard = JSON.parse(JSON.stringify(board));
            tempBoard[row][col] = 0;

            if (!isValidPlacement(tempBoard, row, col, value)) {
                return false;
            }
        }
    }

    // Record the win for the current difficulty, and the time if it's the fastest on it
    if (!gameWon) {
        stopClock();
        const time = puzzleSeconds();
        winLevels[difficulty]++;
        if (gameData) {
            const bestTime = gameData.bestTimes[difficulty];
            if (bestTime === null || time < bestTime) {
                gameData.bestTimes[difficulty] = time;
            }
        }
        gameWon = true;
        saveGameState();
        showNotification('Congratulations! You solved the puzzle!', 'success');
    }

    // Puzzle solved!
    return true;
}

// Function to check the solution
function checkSolution() {
    // Check if puzzle is complete
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                showNotification('Please complete the puzzle before checking.', 'info');
                return;
            }
        }
    }

    if (!checkForCompletion()) {
        showNotification('Your solution contains wrong placements.', 'error');
    }
}

// Function to show the solution (cheat)
function showSolution(setGameWon = true) {
    showNotification('Solution revealed', 'info');
    showNotification('You are not getting a win-badge for this', 'warning'); // gameWon is set to true (next line) and to get a badge it must be false before calling the `checkForCompletion` function
    gameWon = setGameWon;
    if (gameWon) stopClock(); // Shown, not solved: no time for this one
    board = JSON.parse(JSON.stringify(solution));
    updateBoard();
    saveGameState();
}

// Function to show notifications
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notification-container');

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add to container
    container.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after duration
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300); // Wait for fade out animation
    }, duration);
}
