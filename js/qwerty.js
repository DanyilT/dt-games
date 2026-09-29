document.addEventListener('DOMContentLoaded', function() {
    let typedKeys = '';

    // Listen for keyboard input to detect "qwerty"
    document.addEventListener('keydown', function(e) {
        // Only track keys if Shift is pressed
        if (e.shiftKey) {
            typedKeys += e.key.toLowerCase();

            if (typedKeys.length > 6) {
                typedKeys = typedKeys.substring(typedKeys.length - 6);
            }

            if (typedKeys === 'qwerty') {
                activateQwertyEasterEgg('all');
            }
        } else {
            typedKeys = '';
        }
    });
});

let easterEggActive = false;

function activateQwertyEasterEgg(activate = 'all') {
    if (easterEggActive) return;
    easterEggActive = true;

    console.log("🎮 QWERTY Easter Egg Activated! 🎮");

    activate = activate !== 'all' ? activate : ['showMines', 'invincibility', 'flagOnMine', 'colorTheme'];
    // 1. Show all mines
    if (activate.includes('showMines') && typeof revealAllMines === 'function') {
        setInterval(() => {
        revealAllMines();
        }, 16); // ~60fps

        console.log("💣 All mines revealed!");
    }

    // 2. Invincibility
    if (activate.includes('invincibility') && typeof gameOver !== 'undefined') {
        setInterval(() => {
            gameOver = false;
        }, 16); // ~60fps

        console.log("🛡️ Invincibility activated!");
    }

    // 3. flagOnMine - Auto-flag mines instead of game over when clicked
    if (activate === 'all' || activate.includes('flagOnMine')) {
        // Store the original handleCellClick function
        const originalHandleCellClick = window.handleCellClick || null;

        // Override the handleCellClick function
        window.handleCellClick = function(row, col) {
            // If clicked cell is a mine and not already flagged or revealed
            if (board[row][col].isMine && !board[row][col].isFlagged && !board[row][col].isRevealed) {
                // Flag the mine instead of triggering game over
                handleRightClick(row, col);

                // Add a subtle visual indicator that something special happened
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.style.transition = "transform 0.1s";
                    cell.style.transform = "scale(1.1)";
                    setTimeout(() => {
                        cell.style.transform = "scale(1)";
                    }, 200);
                }
                return;
            }

            // For non-mine cells, use the original behavior
            if (originalHandleCellClick) {
                originalHandleCellClick(row, col);
            }
        };

        console.log("🚩 Auto-flag mines on click activated!");
    }

    // 4. Color theme, set the cool dark mode theme (cyberpunk)
    if (activate.includes('colorTheme')) {
        // Create cyberpunk theme styles
        const cyberpunkThemeStyle = document.createElement('style');
        cyberpunkThemeStyle.id = 'qwerty-cyberpunk-theme';
        cyberpunkThemeStyle.textContent = `
            body {
                background-color: #0a0a14 !important;
                background-image: linear-gradient(rgba(18, 16, 31, 0.8) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(18, 16, 31, 0.8) 1px, transparent 1px) !important;
                background-size: 20px 20px !important;
            }
            
            .game-container {
                background-color: #121221 !important;
                border: 4px solid #ff2377 !important;
                box-shadow: 0 0 20px rgba(255, 35, 119, 0.6),
                            inset 0 0 10px rgba(0, 231, 255, 0.5) !important;
            }
            
            .window-title-bar {
                background-color: #0f0f3d !important;
                border-bottom: 1px solid #00e7ff !important;
                color: #00e7ff !important;
                text-shadow: 0 0 5px #00e7ff !important;
            }
            
            .game-area {
                background-color: #121221 !important;
            }
            
            #game-board {
                border: 3px solid #ff2377 !important;
                background-color: #121221 !important;
                box-shadow: inset 0 0 10px rgba(0, 231, 255, 0.3) !important;
            }
            
            .cell {
                background-color: #1a1a2e !important;
                border: 3px solid #3d1a54 !important;
                transition: all 0.2s ease !important;
            }
            
            .cell:hover {
                box-shadow: 0 0 8px #00e7ff !important;
            }
            
            .cell.revealed {
                background-color: #1a1a2e !important;
                border-color: #0f0f3d !important;
                color: #00e7ff !important;
            }
            
            .header {
                background-color: #121221 !important;
                border: 2px solid #ff2377 !important;
            }
            
            #reset-button, .modal-button, button {
                background-color: #1a1a2e !important;
                border: 2px solid #00e7ff !important;
                color: #ff2377 !important;
                box-shadow: 0 0 5px rgba(0, 231, 255, 0.5) !important;
            }
            
            #reset-button:hover, .modal-button:hover, button:hover {
                background-color: #331a38 !important;
                box-shadow: 0 0 10px rgba(255, 35, 119, 0.7) !important;
            }
            
            #reset-button:active, .modal-button:active, button:active {
                border-style: inset !important;
                transform: scale(0.95) !important;
            }
            
            .mine-counter, .timer {
                background-color: #000 !important;
                color: #ff2377 !important;
                border: 2px solid #00e7ff !important;
                box-shadow: 0 0 5px rgba(0, 231, 255, 0.5) !important;
            }
            
            .menu-bar {
                background-color: #0f0f3d !important;
                color: #00e7ff !important;
                border-bottom: 1px solid #ff2377 !important;
            }
            
            .menu-dropdown {
                background-color: #121221 !important;
                border: 2px solid #ff2377 !important;
                color: #00e7ff !important;
            }
            
            .menu-option:hover {
                background-color: #331a38 !important;
                color: #ff2377 !important;
            }
            
            .window-title-bar h1, window-title-bar h2 {
                animation: textFlicker 2s infinite alternate !important;
            }
            
            .window-controls .window-button, .modal-close {
                background-color: #1a1a2e !important;
                border: 1px solid #00e7ff !important;
                color: #ff2377 !important;
            }
            
            .window-controls .window-button:hover, .modal-close:hover {
                background-color: #331a38 !important;
            }
            
            .modal-overlay {
                background-color: rgba(10, 10, 20, 0.8) !important;
            }
            
            .modal-window {
                background-color: #121221 !important;
                border: 3px solid #ff2377 !important;
                box-shadow: 0 0 20px rgba(0, 231, 255, 0.6) !important;
            }
            
            .modal-content {
                background-color: #121221 !important;
                color: #00e7ff !important;
            }
            
            .modal-close {
                background-color: #1a1a2e !important;
                color: #ff2377 !important;
                border: 1px solid #00e7ff !important;
            }
            
            /* Neon number colors */
            .cell[data-value="1"] { color: #00e7ff !important; text-shadow: 0 0 5px rgba(0, 231, 255, 0.7) !important; }
            .cell[data-value="2"] { color: #00ff66 !important; text-shadow: 0 0 5px rgba(0, 255, 102, 0.7) !important; }
            .cell[data-value="3"] { color: #ff2377 !important; text-shadow: 0 0 5px rgba(255, 35, 119, 0.7) !important; }
            .cell[data-value="4"] { color: #bd00ff !important; text-shadow: 0 0 5px rgba(189, 0, 255, 0.7) !important; }
            .cell[data-value="5"] { color: #ffae00 !important; text-shadow: 0 0 5px rgba(255, 174, 0, 0.7) !important; }
            .cell[data-value="6"] { color: #14ffd8 !important; text-shadow: 0 0 5px rgba(20, 255, 216, 0.7) !important; }
            .cell[data-value="7"] { color: #ff00dd !important; text-shadow: 0 0 5px rgba(255, 0, 221, 0.7) !important; }
            .cell[data-value="8"] { color: #ffe600 !important; text-shadow: 0 0 5px rgba(255, 230, 0, 0.7) !important; }
            
            .cell.mine::before {
                content: "💣";
                filter: drop-shadow(0 0 2px #00e7ff) !important;
            }
            
            .cell.flagged::before {
                content: "🚩";
                filter: drop-shadow(0 0 2px #ff2377) !important;
            }
            
            @keyframes textFlicker {
                0% { text-shadow: 0 0 5px rgba(0, 231, 255, 0.7); }
                50% { text-shadow: 0 0 10px rgba(0, 231, 255, 1); }
                100% { text-shadow: 0 0 5px rgba(0, 231, 255, 0.7); }
            }
        `;
        document.head.appendChild(cyberpunkThemeStyle);

        console.log("🌟 Cyberpunk theme activated!");
    }

    // Visual confirmation
    // alert('🎮 QWERTY Easter Egg Activated! 🎮');

    //Create and show a temporary notification
    const notification = document.createElement('div'); notification.textContent = '🎮 QWERTY Easter Egg Activated! 🎮'; notification.style.position = 'fixed'; notification.style.top = '20px'; notification.style.left = '50%'; notification.style.transform = 'translateX(-50%)'; notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'; notification.style.color = 'lightgray'; notification.style.padding = '10px 20px'; notification.style.border = '1px solid darkgray'; notification.style.zIndex = '1'; notification.style.transition = 'opacity 0.5s'; document.body.appendChild(notification);

    // Auto-hide the notification after 3 seconds
    setTimeout(() => { notification.style.opacity = '0'; setTimeout(() => { document.body.removeChild(notification); }, 500); }, 3000);
}
