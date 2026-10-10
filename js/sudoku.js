/**
 * Sudoku Game
 *
 * The classic number puzzle: fill the 9×9 grid so that no row, column or 3×3 box has a digit twice.
 * The rules (the puzzle, made from the run's random numbers, and when it's solved) are in js/rules.js: this file shows the
 * grid, takes the player's numbers, keeps the puzzle in progress, and plays the game through GameRules.
 *
 * Cheat code:
 * - `showSolution()` fills in the solution (no win, and the puzzle isn't kept to watch again).
 *
 * Easter Egg:
 * - `qwerty.js`
 */

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
// The puzzle in progress, recorded so GameHub can play it again (js/gamehub.js): its random numbers make the puzzle, and
// it's kept with the puzzle when that's saved, so it carries on after a reload (or on another device)
let run = null;

const LEVELS = Object.keys(GameRules.LEVELS); // 'beginner' (For a Bread), 'easy', 'medium', 'hard', 'expert'

// Initialize game with what's saved: the puzzle in progress, or a new one (once GameHub has handed over its tickets, so
// it gets one too); or GameHub opened the game to play a replay, which makes the puzzle it was played on
Promise.all([loadGameData(), GameHub.ready()]).then(([data]) => {
    gameData = data;
    difficulty = gameData.level; // A new puzzle is at the saved level
    winLevels = gameData.wins;
    if (GameHub.replaying) {
        GameHub.onReplay({ begin: (replayRun) => initGame(replayRun), input: replayInput });
    } else {
        if (gameData.board === null) {
            initGame();
        }
        loadGameState();
    }
    GameHub.playable(); // The puzzle is up: GameHub stops showing the game as loading
});

// A level's name, as the difficulty list shows it
function levelName(level) {
    return document.querySelector(`#difficulty option[value="${level}"]`)?.textContent ?? level;
}

// GameHub's panel: the level, how much of the puzzle is filled in, and the best time; then the wins and best times per
// level
function showStatus() {
    if (!gameData) return;
    let toFill = 0;
    let filled = 0;
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (initialBoard[row][col] === 0) {
                toFill++;
                if (board[row][col] > 0) filled++;
            }
        }
    }
    GameHub.status({
        main: [
            { label: 'Level', value: levelName(difficulty) },
            { label: 'Filled', value: gameWon ? 'Solved' : `${filled} of ${toFill}` },
            { label: 'Best time', value: gameData.bestTimes[difficulty], format: 'time' },
        ],
        more: LEVELS.map((level) => ({
            title: levelName(level),
            items: [
                { label: 'Solved', value: winLevels[level] },
                { label: 'Best time', value: gameData.bestTimes[level], format: 'time' },
            ],
        })),
        ongoing: false, // The puzzle in progress is saved: a replay doesn't lose it
    });
}

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
    if (!gameData || GameHub.replaying) {
        this.value = difficulty; // What's saved is still loading (or a replay plays): keep the level it had
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

// Function to initialize the game: a new puzzle and run, or in a replay, the puzzle of the run being played
function initGame(replayRun = null) {
    if (!gameData) return; // What's saved is still loading: the puzzle comes with it
    if (GameHub.replaying && !replayRun) return; // A replay plays by itself
    if (replayRun && LEVELS.includes(replayRun.mode)) {
        difficulty = replayRun.mode;
        document.getElementById('difficulty').value = difficulty;
    }
    run = replayRun || GameHub.startRun({ mode: difficulty });
    gameWon = false;

    // A new puzzle: its clock starts from zero
    puzzleTime = 0;
    clockStartedAt = null;
    startClock();

    // Clear saved game state when starting a new game
    gameData.board = null;

    // A new puzzle (js/rules.js): a complete solution, and the clues kept from it for the difficulty, made from the run's
    // numbers so a replay gets the same puzzle
    const puzzle = GameRules.makePuzzle(run.random, difficulty);
    solution = puzzle.solution;
    initialBoard = puzzle.initial;

    // Set current board to initial state
    board = JSON.parse(JSON.stringify(initialBoard));

    // Display the board
    updateBoard();
    saveGameState(); // Save the new puzzle, so a reload keeps it
    showStatus();

    // Show notification
    showNotification(replayRun ? 'Replay' : 'New game started!', 'info');
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

// Function to display the Sudoku board
function updateBoard() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);

            // Set value
            cell.value = board[row][col] > 0 ? board[row][col] : '';

            // Style initial cells differently (and in a replay, no cell takes the player's input)
            if (initialBoard[row][col] > 0) {
                cell.classList.add('initial');
                cell.readOnly = true;
            } else {
                cell.classList.remove('initial');
                cell.readOnly = GameHub.replaying;
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

            // Check if the current value is valid (js/rules.js)
            const tempBoard = JSON.parse(JSON.stringify(board));
            tempBoard[row][col] = 0; // Clear temporarily to check

            if (GameRules.isValidPlacement(tempBoard, row, col, value)) {
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
            if (gameWon || GameHub.replaying) return;

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

// The player changes a cell. It's recorded with the run first (it can solve the puzzle): one number, cell × 10 + value.
function updateCell(row, col, value) {
    if (GameHub.replaying) return;
    if (board[row][col] !== value) run?.input((row * 9 + col) * 10 + value);
    setCell(row, col, value);
}

// A replay's change to a cell
function replayInput(code) {
    const cell = Math.floor(code / 10);
    setCell(Math.floor(cell / 9), cell % 9, code % 10);
}

// Function to update cell value (js/rules.js: a clue can't change)
function setCell(row, col, value) {
    const entered = GameRules.enter(board, initialBoard, row, col, value);
    if (entered === 'clue') return;
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);

    // Update display
    cell.value = value > 0 ? value : '';

    // Clear classes first
    cell.classList.remove('valid', 'invalid');

    // Validate all cells since one change can affect others
    validateAllCells();

    // The puzzle is solved: record the win
    if (entered === 'solved') {
        checkForCompletion();
    }

    // Save game state after each cell update
    saveGameState();
    showStatus();
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
            time: puzzleSeconds(),
            run: run ? run.save() : null // The run, to carry on recording it
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
        run = GameHub.resumeRun(savedGame.run); // Recording carries on (a puzzle saved before runs isn't recorded)

        // Its clock goes on from the time saved with it
        puzzleTime = savedGame.time * 1000;
        clockStartedAt = null;
        startClock();

        // Display the loaded board
        updateBoard();
        showStatus();
        return true;
    }

    showStatus();
    return false;
}

// Function to check if the puzzle is complete: every cell filled, with no digit twice in a row, column or box (js/rules.js)
function checkForCompletion() {
    if (!GameRules.isSolved(board)) {
        return false;
    }

    // Record the win for the current difficulty, and the time if it's the fastest on it (not a replay's: it was then)
    if (!gameWon) {
        stopClock();
        const time = puzzleSeconds();
        const bestTime = gameData ? gameData.bestTimes[difficulty] : null;
        if (!GameHub.replaying) {
            winLevels[difficulty]++;
            if (gameData && (bestTime === null || time < bestTime)) {
                gameData.bestTimes[difficulty] = time;
            }
        }
        gameWon = true;
        run?.finish({
            outcome: 'won',
            result: [{ label: 'Level', value: levelName(difficulty) }, { label: 'Time', value: time, format: 'time' }],
            best: bestTime === null || time < bestTime,
        });
        saveGameState();
        showStatus();
        showNotification(GameHub.replaying ? 'Solved!' : 'Congratulations! You solved the puzzle!', 'success');
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

// Function to show the solution (cheat: the puzzle isn't kept to watch again)
function showSolution(setGameWon = true) {
    GameHub.cheated();
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
