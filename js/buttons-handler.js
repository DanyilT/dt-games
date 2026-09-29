document.addEventListener('DOMContentLoaded', function() {
    // Help menu bar elements
    createModalWindows(); // Create modal elements

    // Get elements
    const instructionsButton = document.getElementById('instructions-button');
    const aboutButton = document.getElementById('about-button');
    const instructionsModal = document.getElementById('instructions-modal');
    const aboutModal = document.getElementById('about-modal');

    // Add click event listeners
    instructionsButton.addEventListener('click', () => showModal(instructionsModal));
    aboutButton.addEventListener('click', () => showModal(aboutModal));

    // Close buttons in modals
    document.querySelectorAll('.modal-close, .modal-button').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            hideModal(modal);
        });
    });

    // Close modal when clicking outside
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                hideModal(this);
            }
        });
    });

    // Keyboard shortcut for instructions
    document.addEventListener('keydown', function(e) {
        if (e.key === 'i') {
            if (instructionsModal.style.display === 'flex') {
                hideModal(instructionsModal);
            } else {
                showModal(instructionsModal);
            }
        }

        // Close any open modal with Escape
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                if (modal.style.display === 'flex') {
                    hideModal(modal);
                }
            });
        }
    });

    function showModal(modal) {
        modal.style.display = 'flex';
    }

    function hideModal(modal) {
        modal.style.display = 'none';
    }

    function createModalWindows() {
        // Create instructions modal
        const instructionsContent = document.querySelector('.instructions').innerHTML;
        const instructionsModal = createModal('instructions-modal', 'Instructions', instructionsContent);

        // Create about modal
        const aboutContent = document.querySelector('footer').innerHTML;
        const aboutModal = createModal('about-modal', 'About Minesweeper', aboutContent);

        // Add modals to body
        document.body.appendChild(instructionsModal);
        document.body.appendChild(aboutModal);

        // Hide original elements
        document.querySelector('.instructions').style.display = 'none';
    }

    function createModal(id, title, content) {
        const iconPath = 'img/icons/minesweeper-icon-1995.ico';

        const modal = document.createElement('dialog');
        modal.className = 'modal-overlay';
        modal.id = id;

        modal.innerHTML = `
            <div class="modal-window">
                <div class="window-title-bar">
                    <div class="modal-title">
                        <img src="${iconPath}" class="modal-title-icon" alt="Minesweeper (1995) icon">
                        ${title}
                    </div>
                    <div class="window-controls">
                        <div class="modal-close">×</div>
                    </div>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
                <div class="modal-buttons">
                    <button class="modal-button">OK</button>
                </div>
            </div>
        `;

        setTimeout(() => makeDraggable(modal), 0);

        return modal;
    }

    function makeDraggable(modalElement) {
        const titleBar = modalElement.querySelector('.window-title-bar');
        const modalWindow = modalElement.querySelector('.modal-window');

        let isDragging = false;
        let offsetX, offsetY;

        // When mouse is pressed on title bar
        titleBar.addEventListener('mousedown', (e) => {
            // Skip if clicking on controls
            if (e.target.closest('.window-controls')) return;

            isDragging = true;

            // Calculate the offset
            const rect = modalWindow.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            // Change cursor while dragging
            titleBar.style.cursor = 'move';
            e.preventDefault();
        });

        // When mouse moves
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            // Calculate new position
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;

            // Set absolute positioning
            modalWindow.style.position = 'absolute';
            modalWindow.style.margin = '0';
            modalWindow.style.left = `${newX}px`;
            modalWindow.style.top = `${newY}px`;

            // Change overlay display style
            modalElement.style.display = 'block';
        });

        // When mouse is released
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                titleBar.style.cursor = 'default';
            }
        });
    }

    // Game menu bar elements
    const difficultyOptions = document.querySelectorAll('.difficulty-option');
    const exitButton = document.getElementById('exit-game');

    // Function to update win indicators
    function updateWinIndicators() {
        const winLevels = JSON.parse(localStorage.getItem('winLevels')) || {'beginner': 0, 'intermediate': 0, 'expert': 0};

        difficultyOptions.forEach(option => {
            const level = option.dataset.level;
            // Clear previous content
            option.innerHTML = level.charAt(0).toUpperCase() + level.slice(1);

            // Add win indicator if level has been won
            if (winLevels[level] > 0) {
                const winBadge = document.createElement('span');
                winBadge.innerHTML = ` (${winLevels[level]} ⭐)`;
                winBadge.classList.add('win-badge');
                option.appendChild(winBadge);
            }

            // Add selected class if this is the current level
            if (level === localStorage.getItem('minesweeperLevel')) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    // Add keyboard shortcut
    document.addEventListener('keydown', function(e) {
        // Restart game with 'r' key
        if (e.key === 'r') {
            document.getElementById('reset-button').click();
        }

        // Change mode (flag/reveal) with 'm' key
        if (e.key === 'm') {
            document.getElementById('mode-toggle').click();
        }

        // Keyboard shortcuts for difficulty levels
        if (e.key === '1') {
            changeLevel('beginner');
            updateWinIndicators();
        } else if (e.key === '2') {
            changeLevel('intermediate');
            updateWinIndicators();
        } else if ( e.key === '3') {
            changeLevel('expert');
            updateWinIndicators();
        }
    });

    // Handle difficulty options
    difficultyOptions.forEach(option => {
        option.addEventListener('click', () => {
            changeLevel(option.dataset.level);
            updateWinIndicators();
        });
    });

    // Exit game
    exitButton.addEventListener('click', () => {
        if(confirm('Are you sure you want to exit Minesweeper Game?')) {
            window.close();
        }
    });

    // Initialize win indicators on page load
    updateWinIndicators();

    // Listen for game wins to update indicators
    window.addEventListener('storage', (event) => {
        if (event.key === 'winLevels') {
            updateWinIndicators();
        }
    });
});
