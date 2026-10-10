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
        if (e.ctrlKey || e.metaKey || e.altKey) return; // The browser's shortcuts

        if (e.key === 'i') {
            if (e.repeat) return; // Held down: toggle once
            if (isModalOpen(instructionsModal)) {
                hideModal(instructionsModal);
            } else {
                showModal(instructionsModal);
            }
        }

        // Close any open modal with Escape
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                if (isModalOpen(modal)) {
                    hideModal(modal);
                }
            });
        }
    });

    // Show a dialog as a modal one: the rest of the page can't be reached (Tab stays in the dialog, and screen readers
    // read only it) until it closes, and its OK button has the keyboard (Enter closes it)
    function showModal(modal) {
        if (!modal.open) modal.showModal();
        modal.querySelector('.modal-button')?.focus();
    }

    // Hide a dialog: the browser gives the keyboard back to where it was
    function hideModal(modal) {
        if (modal.open) modal.close();
        modal.style.display = ''; // Dragging it set display: block
    }

    // Whether a dialog is showing
    function isModalOpen(modal) {
        return modal.open;
    }

    // Build the Help dialogs from the page's instructions and footer
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

    // A Windows 9x style dialog, with a title bar and an OK button
    function createModal(id, title, content) {
        const iconPath = 'img/icons/minesweeper-icon-1995.ico';

        // A <dialog>, shown with showModal() (its title names it; × is for the mouse, as OK and Escape close it too)
        const modal = document.createElement('dialog');
        modal.className = 'modal-overlay';
        modal.id = id;
        modal.setAttribute('aria-labelledby', `${id}-title`);

        modal.innerHTML = `
            <div class="modal-window">
                <div class="window-title-bar">
                    <div class="modal-title" id="${id}-title">
                        <img src="${iconPath}" class="modal-title-icon" alt="">
                        ${title}
                    </div>
                    <div class="window-controls">
                        <div class="modal-close" aria-hidden="true">×</div>
                    </div>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
                <div class="modal-buttons">
                    <button class="modal-button" autofocus>OK</button>
                </div>
            </div>
        `;

        // Closed by the browser too (Escape): a dragged dialog's display goes back to the stylesheet's
        modal.addEventListener('close', () => {
            modal.style.display = '';
        });

        setTimeout(() => makeDraggable(modal), 0);

        return modal;
    }

    // Let a dialog be moved by dragging its title bar
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
        const winLevels = gameData ? gameData.wins : {}; // None until what's saved has loaded

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
            if (level === currentLevel) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
            option.setAttribute('aria-checked', String(level === currentLevel));
        });
    }

    // Add keyboard shortcut
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return; // The browser's shortcuts
        if (e.repeat) return; // Held down: act once

        // A dialog is open: the keys are for it, not for the board behind it
        const dialogOpen = [...document.querySelectorAll('.modal-overlay')].some(m => m.open);
        if (dialogOpen && e.key !== 'Escape') return;

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

    // Exit game: in full screen (the game's own, or its frame's in GameHub), out of it; otherwise close the page. In
    // GameHub's frame, Exit isn't shown (css/page.css).
    exitButton.addEventListener('click', () => {
        if (GameHub.isFullScreen()) {
            GameHub.fullScreen(false);
            return;
        }
        if(confirm('Are you sure you want to exit Minesweeper Game?')) {
            window.close();
        }
    });

    // The window's buttons: □ puts the game in full screen, or takes it out; _ and × take it out (where the browser can't,
    // they're only for show)
    const windowButtons = [...document.querySelectorAll('.window-controls .window-button')];
    const updateWindowButtons = () => {
        const canFullScreen = GameHub.canFullScreen();
        const isFullScreen = GameHub.isFullScreen();

        windowButtons.forEach((button) => {
            const disabled = button.classList.contains('maximize') ? !canFullScreen : !isFullScreen;
            button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        });
    };
    updateWindowButtons();
    document.addEventListener('gamehub:fullscreenchange', updateWindowButtons);
    windowButtons.forEach((button) => {
        const press = () => {
            if (button.getAttribute('aria-disabled') === 'true') return;
            if (button.classList.contains('maximize')) {
                GameHub.fullScreen(!GameHub.isFullScreen());
            } else if (GameHub.isFullScreen()) {
                GameHub.fullScreen(false);
            }
        };
        button.addEventListener('click', press);
        button.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            e.stopPropagation(); // Not the board's keys too
            press();
        });
    });

    // The Game and Help menus: open on hover with a mouse (css/page.css), and by a click, a tap or the keyboard: Enter,
    // Space or ↓ on a menu's name opens it, ↑ ↓ choose, Enter or Space picks, Escape closes it, ← → go to the other menu.
    // The keys a menu takes don't reach the board.
    const menus = [...document.querySelectorAll('.menu-bar .menu-item')];

    // A menu's options, as shown (in GameHub's frame, Exit isn't)
    function menuOptions(menu) {
        return [...menu.querySelectorAll('[role^="menuitem"]')].filter((option) => option.getClientRects().length > 0);
    }

    // Open a menu (and close the other), with the keyboard on its first or last option, if focus says which
    function openMenu(menu, focus = null) {
        menus.forEach((other) => {
            if (other !== menu) closeMenu(other);
        });
        menu.classList.add('open');
        menu.querySelector('.menu-title').setAttribute('aria-expanded', 'true');
        const options = menuOptions(menu);
        if (focus === 'first') options[0]?.focus();
        if (focus === 'last') options[options.length - 1]?.focus();
    }

    // Close a menu, giving the keyboard back to its name if focusTitle
    function closeMenu(menu, focusTitle = false) {
        menu.classList.remove('open');
        const title = menu.querySelector('.menu-title');
        title.setAttribute('aria-expanded', 'false');
        if (focusTitle) title.focus();
    }

    menus.forEach((menu, index) => {
        const title = menu.querySelector('.menu-title');
        const dropdown = menu.querySelector('.menu-dropdown');
        const otherMenu = (key) => menus[(index + (key === 'ArrowRight' ? 1 : menus.length - 1)) % menus.length];

        title.addEventListener('click', () => {
            if (menu.classList.contains('open')) closeMenu(menu);
            else openMenu(menu);
        });

        title.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                if (!e.repeat) openMenu(menu, 'first');
            } else if (e.key === 'ArrowUp') {
                openMenu(menu, 'last');
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                closeMenu(menu);
                otherMenu(e.key).querySelector('.menu-title').focus();
            } else if (e.key === 'Escape' && menu.classList.contains('open')) {
                closeMenu(menu);
            } else {
                return; // Not the menu's: the game's own keys still work
            }
            e.preventDefault();
            e.stopPropagation();
        });

        dropdown.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const options = menuOptions(menu);
            const at = options.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') {
                options[(at + 1) % options.length]?.focus();
            } else if (e.key === 'ArrowUp') {
                options[(at - 1 + options.length) % options.length]?.focus();
            } else if (e.key === 'Home') {
                options[0]?.focus();
            } else if (e.key === 'End') {
                options[options.length - 1]?.focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                if (!e.repeat && at >= 0) {
                    closeMenu(menu, true);
                    options[at].click();
                }
            } else if (e.key === 'Escape') {
                closeMenu(menu, true);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                openMenu(otherMenu(e.key), 'first');
            } else {
                return; // Tab moves on (and the menu closes, below); the game's own keys still work
            }
            e.preventDefault();
            e.stopPropagation();
        });

        // Picking an option closes the menu; so does the keyboard going elsewhere
        dropdown.addEventListener('click', (e) => {
            if (e.target.closest('[role^="menuitem"]')) closeMenu(menu);
        });
        menu.addEventListener('focusout', (e) => {
            if (!menu.contains(e.relatedTarget)) closeMenu(menu);
        });
    });

    // A click or a tap anywhere else closes the menus
    document.addEventListener('click', (e) => {
        menus.forEach((menu) => {
            if (!menu.contains(e.target)) closeMenu(menu);
        });
    });

    // Initialize win indicators on page load
    updateWinIndicators();

    // Update them once what's saved has loaded, and after each win
    document.addEventListener('minesweeper:loaded', updateWinIndicators);
    document.addEventListener('minesweeper:win', updateWinIndicators);

    // A win in another tab of this game (the storage event only fires there): take its save, so this tab doesn't save
    // over it (js/gamehub.js keeps the save under minesweeperGameData)
    window.addEventListener('storage', (event) => {
        if (event.key !== 'minesweeperGameData' || !event.newValue || !gameData) return;
        try {
            gameData = checkGameData(JSON.parse(event.newValue));
        } catch (error) {
            return; // Not readable: keep this tab's
        }
        updateWinIndicators();
    });
});
