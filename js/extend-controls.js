document.addEventListener('DOMContentLoaded', function() {
    // Track the currently selected cell
    let selectedRow = 0;
    let selectedCol = 0;
    let selectionActive = false;
    let flagMode = false; // Default mode is reveal

    const toggleButton = document.getElementById('mode-toggle');

    // Toggle mode when button is clicked
    toggleButton.addEventListener('click', function() {
        flagMode = !flagMode;
        toggleButton.setAttribute('aria-pressed', String(flagMode)); // Pressed in (css/page.css): a click flags
        toggleButton.title = flagMode ? 'Flag mode is on (M): a click or a tap flags' : 'Flag mode (M): a click or a tap flags';
    });

    // Modify cell click behavior based on current mode
    const originalCellClick = handleCellClick;
    const originalRightClick = handleRightClick;

    window.handleCellClick = function(row, col) {
        if (flagMode) {
            originalRightClick(row, col);
        } else {
            originalCellClick(row, col);
        }
    };

    window.handleRightClick = function(row, col) {
        if (flagMode && !board[row][col].isFlagged) {
            originalCellClick(row, col);
        } else {
            originalRightClick(row, col);
        }
    };

    // Function to visually highlight the selected cell
    function updateSelectedCell() {
        // Clear previous selection
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('select');
        });

        // Only highlight if selection is active
        if (selectionActive) {
            const cell = document.querySelector(`.cell[data-row="${selectedRow}"][data-col="${selectedCol}"]`);
            if (cell) {
                cell.classList.add('select');
            }
        }
    }

    // Function to move selection
    function moveSelection(rowDelta, colDelta) {
        const { rows, cols } = gameSettings[currentLevel];

        // If selection is not active, just activate it without moving
        if (!selectionActive) {
            selectionActive = true;
            updateSelectedCell();
            return;
        }

        // Only move the selection if it's already active
        selectedRow = Math.max(0, Math.min(rows - 1, selectedRow + rowDelta));
        selectedCol = Math.max(0, Math.min(cols - 1, selectedCol + colDelta));

        updateSelectedCell();
    }

    // Function to perform action on selected cell
    function activateCell(useFlag = false) {
        if (!selectionActive) return;

        const cell = document.querySelector(`.cell[data-row="${selectedRow}"][data-col="${selectedCol}"]`);
        if (!cell) return;

        if (useFlag) {
            // Simulate right-click to flag
            handleRightClick(selectedRow, selectedCol);
        } else {
            // Simulate left-click to reveal
            handleCellClick(selectedRow, selectedCol);
        }
    }

    // Keyboard controls
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return; // The browser's shortcuts

        // A dialog is open: the keys are for it, not for the board behind it
        const dialogOpen = [...document.querySelectorAll('.modal-overlay')].some(m => m.open);
        if (dialogOpen && e.key !== 'Escape') return;

        if (gameOver) return;

        switch (e.key) {
            case 'Escape':
                selectionActive = false;
                updateSelectedCell();
                e.preventDefault();
                break;
            case 'ArrowUp':
            case 'w':
                moveSelection(-1, 0);
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 's':
                moveSelection(1, 0);
                e.preventDefault();
                break;
            case 'ArrowLeft':
            case 'a':
                moveSelection(0, -1);
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'd':
                moveSelection(0, 1);
                e.preventDefault();
                break;
            case ' ': // Space
            case 'Enter':
                e.preventDefault();
                if (!e.repeat) activateCell(e.shiftKey); // Held down: act once (the arrows keep repeating)
                break;
        }
    });
});
