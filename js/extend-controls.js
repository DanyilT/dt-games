document.addEventListener('DOMContentLoaded', function() {
    // Track the currently keyboard-selected cell and last focused cell
    let keyboardSelectedCell = null;
    let lastFocusedCell = null;
    let navigationMethod = 'none'; // Keep track of whether focus came from keyboard or mouse

    // Add keyboard navigation for Sudoku grid
    document.addEventListener('keydown', function(e) {
        // Handle navigation keys (arrows and WASD)
        if (isNavigationKey(e.key)) {
            e.preventDefault(); // Prevent scrolling
            navigationMethod = 'keyboard';
            navigateGrid(e.key);
        }

        // Check if a key is used for navigation
        function isNavigationKey(key) {
            return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 's', 'a', 'd'].includes(key);
        }
    });

    // Set up focus/blur events for all cells to track keyboard selection
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.addEventListener('focus', function() {
            if (gameWon) return;

            // Remove previous selection highlight
            if (keyboardSelectedCell) {
                keyboardSelectedCell.classList.remove('keyboard-selected');
            }

            // Set new selection
            keyboardSelectedCell = this;
            lastFocusedCell = this;
            // Only apply keyboard-selected class if navigating with keyboard
            if (navigationMethod === 'keyboard') {
                this.classList.add('keyboard-selected');
            }

            // If this is an initial cell, highlight same numbers
            if (this.readOnly && this.value) {
                highlightSameNumbers(parseInt(this.value));
            } else {
                // Clear highlights when focusing on non-initial cells
                clearHighlights();
            }
        });

        // Remove keyboard selection highlight when focus moves away
        cell.addEventListener('blur', function() {
            // Only remove highlight when focus moves to a non-cell element
            const relatedTarget = document.activeElement;
            if (!relatedTarget || !relatedTarget.classList.contains('cell')) {
                this.classList.remove('keyboard-selected');
                keyboardSelectedCell = null;
                clearHighlights();
                // Note: We keep lastFocusedCell as is for future reference
            }
        });

        // Track mouse clicks on cells too
        cell.addEventListener('mousedown', function() {
            navigationMethod = 'mouse';
            lastFocusedCell = this;

            if (keyboardSelectedCell) {
                keyboardSelectedCell.classList.remove('keyboard-selected');
            }
        });
    });

    // Navigate the grid based on key press
    function navigateGrid(key) {
        // Get starting position - use cell with focus, keyboard selected cell,
        // last focused cell, or default to first cell
        let currentCell = document.activeElement;
        let isFirstInteraction = false;

        if (!currentCell || !currentCell.classList.contains('cell')) {
            currentCell = keyboardSelectedCell || lastFocusedCell;
        }

        if (!currentCell || !currentCell.classList.contains('cell')) {
            // If no reference point, start with the first non-initial cell
            isFirstInteraction = true;
            currentCell = document.querySelector('.cell:not([readonly])' || document.querySelector('.cell'));
        }

        const row = parseInt(currentCell.dataset.row);
        const col = parseInt(currentCell.dataset.col);

        // Calculate new position based on key
        let newRow = row;
        let newCol = col;

        // Function to find the next non-initial cell in a direction
        function findNextEditableCell(direction) {
            let r = row, c = col;
            let attempts = 0;

            while (attempts < 9) { // Avoid infinite loops
                attempts++;

                // Move in specified direction
                switch(direction) {
                    case 'up':
                        r = (r - 1 + 9) % 9;
                        break;
                    case 'down':
                        r = (r + 1) % 9;
                        break;
                    case 'left':
                        c = (c - 1 + 9) % 9;
                        break;
                    case 'right':
                        c = (c + 1) % 9;
                        break;
                }

                // Check if we've gone full circle
                if (r === row && c === col) {
                    break;
                }

                // Check if this cell is editable
                const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                if (cell) {
                    return [r, c];
                }
            }

            // If we couldn't find an editable cell, just return the next cell
            return [r, c];
        }

        // Find next cell based on direction
        let newPos;
        switch(key) {
            case 'ArrowUp':
            case 'w':
                newPos = findNextEditableCell('up'); // Move up with wrapping
                break;
            case 'ArrowDown':
            case 's':
                newPos = findNextEditableCell('down'); // Move down with wrapping
                break;
            case 'ArrowLeft':
            case 'a':
                newPos = findNextEditableCell('left'); // Move left with wrapping
                break;
            case 'ArrowRight':
            case 'd':
                newPos = findNextEditableCell('right'); // Move right with wrapping
                break;
        }

        // Apply new position
        if (!isFirstInteraction) {
            newRow = newPos ? newPos[0] : newRow;
            newCol = newPos ? newPos[1] : newCol;
        }

        // Find and focus the new cell
        const newCell = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);
        if (newCell) {
            newCell.focus();
            window.currentSelectedCell = newCell; // Update selected cell for number pad
        }
    }

    // Function to highlight all cells with the same number
    function highlightSameNumbers(value) {
        clearHighlights();

        // If no value or value is 0, exit
        if (!value) return;

        // Highlight all cells with the same value
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                if (cell && cell.value == value) {
                    cell.classList.add('same-number');
                }
            }
        }
    }

    // Function to clear highlights
    function clearHighlights() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('same-number');
        });
    }

    // Hide keyboard on mobile devices
    let hideKeyboard = true;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && hideKeyboard) {
        // Add inputmode="none" attribute to all cells to prevent keyboard
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.setAttribute('inputmode', 'none');

            // Prevent keyboard from showing on touch events and focus
            ['touchstart', 'touchend', 'mousedown', 'mouseup', 'click', 'focus'].forEach(eventType => {
                cell.addEventListener(eventType, function(e) {
                    e.preventDefault();
                    // For iOS, which might ignore inputmode
                    if (!this.readOnly) {
                        const isInitialCell = this.classList.contains('initial');
                        if (!isInitialCell) {
                            // Save the current value and temporarily set readonly
                            const currentValue = this.value;
                            const row = parseInt(this.dataset.row);
                            const col = parseInt(this.dataset.col);

                            // Temporarily set readonly to prevent keyboard
                            this.readOnly = true; // Only first touch, and then it again not readonly

                            // Reset readonly status after a short delay
                            setTimeout(() => {
                                if (!initialBoard[row][col]) {
                                    this.readOnly = false;
                                    this.value = currentValue;
                                }
                            }, 100);
                        }
                    }
                });
            });

            // Also prevent keyboard on touch events
            cell.addEventListener('touchstart', function(e) {
                // Mark this cell as the currently selected one
                window.currentSelectedCell = this;

                // Focus the input without showing keyboard
                this.focus();
            });
        });
    }
});
