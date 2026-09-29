document.addEventListener('DOMContentLoaded', function() {
    // Track the currently selected cell
    let selectedRow = 0;
    let selectedCol = 0;
    let selectionActive = false;
    let flagMode = false; // Default mode is reveal

    const toggleButton = document.getElementById("mode-toggle");

    // Toggle mode when button is clicked
    toggleButton.addEventListener('click', function() {
        flagMode = !flagMode;
        toggleButton.textContent = flagMode ? '🚩' : '🔍👀';
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
        if (flagMode) {
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
                activateCell(e.shiftKey);
                e.preventDefault();
                break;
        }
    });

    // Touch controls
    // Add notification for contextmenu events on cells
    document.addEventListener('contextmenu', function(e) {
        if (!('ontouchstart' in window)) return; // Only handle contextmenu on touch devices
        e.preventDefault(); // Prevent default context menu

        // Check if the clicked element is a cell
        if (e.target.classList.contains('cell')) {
            const row = parseInt(e.target.dataset.row);
            const col = parseInt(e.target.dataset.col);

            // Only show notification if the cell is not already revealed and game is not over
            if (!gameOver && !board[row][col].isRevealed) {
                // Determine if this action will flag or unflag
                const action = board[row][col].isFlagged ? 'flagged' : 'unflagged';

                // Create notification
                const notification = document.createElement('div');
                notification.textContent = `${action}`;
                notification.style.position = 'absolute';
                const rect = e.target.getBoundingClientRect();
                notification.style.top = `${rect.top}px`;
                notification.style.left = `${rect.left + rect.width / 2}px`;
                notification.style.transform = 'translateX(-50%)';
                notification.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
                notification.style.color = 'white';
                notification.style.padding = '10px 15px';
                notification.style.border = '1px solid white';
                notification.style.zIndex = '1000';
                notification.style.transition = 'opacity 0.3s';
                document.body.appendChild(notification);

                // Remove notification after delay
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        document.body.removeChild(notification);
                    }, 300);
                }, 500);

                // Vibrate on mobile (doesn't work)
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
            }
        }
    });
});
