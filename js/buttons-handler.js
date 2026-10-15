/**
 * The window around the game: its caption buttons, the Game and Help menus, and their dialogs (Options, Change
 * Appearance, Statistics, the win's Congratulations, Help and About), as Windows 7 had them.
 */
document.addEventListener('DOMContentLoaded', function() {
    // --- Dialogs ---

    // Show a dialog as a modal one: the rest of the page can't be reached (Tab stays in the dialog, and screen readers
    // read only it) until it closes, and its first button has the keyboard (Enter picks it). It opens level with the
    // game's window, its title bar as far from the top, in the middle of the window.
    function showModal(modal) {
        if (!modal.open) modal.showModal();
        place(modal.querySelector('.modal-window'));
        modal.querySelector('[autofocus]')?.focus();
    }

    // Put a dialog's window level with the game's, in its middle, no taller than it, and inside the page
    function place(dialogWindow) {
        const main = document.querySelector('.game-container').getBoundingClientRect();
        dialogWindow.style.maxHeight = `${Math.round(Math.min(main.height, window.innerHeight - 16))}px`;
        dialogWindow.classList.add('placed');
        const box = dialogWindow.getBoundingClientRect();
        moveTo(dialogWindow, main.left + (main.width - box.width) / 2, main.top);
    }

    // Move a dialog's window, keeping it on the page (its title bar at least)
    function moveTo(dialogWindow, left, top) {
        const box = dialogWindow.getBoundingClientRect();
        const x = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - box.width - 8));
        const y = Math.min(Math.max(8, top), Math.max(8, window.innerHeight - 40));
        dialogWindow.style.left = `${Math.round(x)}px`;
        dialogWindow.style.top = `${Math.round(y)}px`;
    }

    // A dialog moves with its title bar, dragged with a mouse (as Minesweeper's do)
    function makeDraggable(modal) {
        const dialogWindow = modal.querySelector('.modal-window');
        const titleBar = dialogWindow.querySelector('.window-title-bar');
        let from = null;
        titleBar.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('.window-controls')) return;
            const box = dialogWindow.getBoundingClientRect();
            from = { x: e.clientX - box.left, y: e.clientY - box.top };
            dialogWindow.classList.add('dragging');
            titleBar.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        titleBar.addEventListener('pointermove', (e) => {
            if (from) moveTo(dialogWindow, e.clientX - from.x, e.clientY - from.y);
        });
        const stop = () => {
            from = null;
            dialogWindow.classList.remove('dragging');
        };
        titleBar.addEventListener('pointerup', stop);
        titleBar.addEventListener('pointercancel', stop);
    }

    function hideModal(modal) {
        if (modal.open) modal.close();
    }

    function isAnyModalOpen() {
        return [...document.querySelectorAll('.modal-overlay')].some((modal) => modal.open);
    }

    // A Windows 7 style dialog from the page's own text: a title, the text, and an OK button (Help and About)
    function createModal(id, title, content) {
        const modal = document.createElement('dialog');
        modal.className = 'modal-overlay';
        modal.id = id;
        modal.setAttribute('aria-labelledby', `${id}-title`);
        modal.innerHTML = `
            <form class="modal-window" method="dialog">
                <div class="window-title-bar">
                    <div class="modal-title" id="${id}-title"><img src="img/icon-no-bg.svg" class="modal-title-icon" alt="">${title}</div>
                    <div class="window-controls"><button class="modal-close" value="close" aria-label="Close"></button></div>
                </div>
                <div class="modal-content">${content}</div>
                <div class="modal-buttons"><button class="modal-button" value="close" autofocus>OK</button></div>
            </form>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    const helpModal = createModal('help-modal', 'Solitaire Help', document.querySelector('.instructions').innerHTML);
    const aboutModal = createModal('about-modal', 'About Solitaire', document.querySelector('footer').innerHTML);
    document.querySelectorAll('.modal-overlay').forEach(makeDraggable);
    const optionsDialog = document.getElementById('options-dialog');
    const appearanceDialog = document.getElementById('appearance-dialog');
    const statisticsDialog = document.getElementById('statistics-dialog');
    const wonDialog = document.getElementById('won-dialog');


    // Seconds as minutes and seconds: 2:05
    const minutes = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

    // --- Options ---

    const optionsForm = optionsDialog.querySelector('form');

    function openOptions() {
        if (!gameData) return;
        optionsForm.elements.draw.value = String(gameData.draw);
        optionsForm.elements.scoring.value = gameData.scoring;
        for (const key of ['cumulative', 'animations', 'timed', 'sounds']) optionsForm.elements[key].checked = gameData[key];
        updateCumulative();
        showModal(optionsDialog);
    }

    // Cumulative is for Vegas scoring only
    function updateCumulative() {
        optionsForm.elements.cumulative.disabled = optionsForm.elements.scoring.value !== 'vegas';
    }
    optionsForm.addEventListener('change', updateCumulative);

    // OK: the options are kept. The animations and the sounds change now; the draw, the scoring and the timing with the
    // next game (now, if this one hasn't been played yet). (On the button's submit, as it's pressed: the dialog's close
    // event comes a moment later.)
    optionsForm.addEventListener('submit', (e) => {
        if (e.submitter?.value !== 'ok' || !gameData) return;
        const was = nextMode();
        gameData.draw = Number(optionsForm.elements.draw.value);
        gameData.scoring = optionsForm.elements.scoring.value;
        for (const key of ['cumulative', 'animations', 'timed', 'sounds']) gameData[key] = optionsForm.elements[key].checked;
        saveGameData(gameData);
        applyLook();
        if (nextMode() !== was && game && !game.over && game.startedAt === null) newDeal();
        else if (game && nextMode() !== game.mode) showTip('The new options take effect in the next game.');
    });

    // --- Change Appearance: the deck's back, the court cards' design, and the table's background ---

    const backChoices = appearanceDialog.querySelector('.backs');
    const faceChoices = appearanceDialog.querySelector('.faces');
    const backgroundChoices = appearanceDialog.querySelector('.backgrounds');
    const groups = [[backChoices, 'back'], [faceChoices, 'faces'], [backgroundChoices, 'background']];
    const FACE_NAMES = { classic: 'Classic', cartoon: 'Cartoon', nature: 'Nature' };
    let choice = { back: null, faces: null, background: null };

    // A choice's button (a radio button), with a picture: a card from the sheet (its spot), or a background
    function choiceButton(group, name, title, spot = null) {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-label', title);
        button.title = title;
        button.dataset.value = name;
        if (spot) {
            button.classList.add('card-choice');
            button.style.backgroundPosition = `calc(var(--choice-w) * ${-spot.x / Cards.WIDTH}) calc(var(--choice-h) * ${-spot.y / Cards.HEIGHT})`;
        } else {
            button.className = `felt-${name}`;
        }
        group.append(button);
    }
    Cards.BACKS.forEach(({ name, title }) => choiceButton(backChoices, name, title, Cards.back(name)));
    Cards.FACES.forEach((name) => choiceButton(faceChoices, name, FACE_NAMES[name], Cards.face(2 * 13 + 12, { faces: name }))); // its king of hearts
    Object.entries(BACKGROUNDS).forEach(([name, title]) => choiceButton(backgroundChoices, name, title));

    // A choice picked (or shown as picked): its radio button checked, the others not
    function showChoices() {
        for (const [group, key] of groups) {
            const value = choice[key];
            group.querySelectorAll('button').forEach((button) => {
                const checked = button.dataset.value === value;
                button.setAttribute('aria-checked', String(checked));
                button.tabIndex = checked ? 0 : -1;
            });
        }
    }

    groups.forEach(([group, key]) => {
        group.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            choice[key] = button.dataset.value;
            showChoices();
        });
        // The arrow keys move along the choices, as in a group of radio buttons
        group.addEventListener('keydown', (e) => {
            const buttons = [...group.querySelectorAll('button')];
            const at = buttons.indexOf(document.activeElement);
            const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
            if (!step || at < 0) return;
            e.preventDefault();
            const next = buttons[(at + step + buttons.length) % buttons.length];
            choice[key] = next.dataset.value;
            showChoices();
            next.focus();
        });
    });

    function openAppearance() {
        if (!gameData) return;
        choice = { back: gameData.back, faces: gameData.faces, background: gameData.background };
        showChoices();
        showModal(appearanceDialog);
    }

    appearanceDialog.querySelector('form').addEventListener('submit', (e) => {
        if (e.submitter?.value !== 'ok' || !gameData) return;
        gameData.back = choice.back;
        gameData.faces = choice.faces;
        gameData.background = choice.background;
        saveGameData(gameData);
        applyLook();
    });

    // --- Statistics, and the win's Congratulations ---

    const statisticsMode = document.getElementById('statistics-mode');
    Object.entries(GameRules.MODES).forEach(([mode, { name }]) => statisticsMode.add(new Option(name, mode)));

    // A level's numbers as rows of a list: [[name, value], …]
    function statisticsRows(mode) {
        const stats = gameData.stats[mode];
        const { scoring } = GameRules.MODES[mode];
        const rows = [
            ['Games played', stats.played],
            ['Games won', stats.won],
            ['Win percentage', `${stats.played ? Math.round((stats.won / stats.played) * 100) : 0}%`],
        ];
        if (scoring === 'standard') rows.push(['High score', stats.best ?? '—']);
        if (scoring === 'vegas') rows.push(['Most money', stats.best === null ? '—' : GameRules.money(stats.best)]);
        rows.push(['Fastest win', stats.bestTime === null ? '—' : minutes(stats.bestTime)]);
        rows.push(['Longest winning streak', stats.longestStreak]);
        const streak = Math.abs(stats.streak);
        rows.push(['Current streak', stats.streak === 0 ? '—' : `${streak} ${stats.streak > 0 ? 'win' : 'loss'}${streak === 1 ? '' : stats.streak > 0 ? 's' : 'es'}`]);
        return rows;
    }

    function fillList(list, rows) {
        list.replaceChildren(...rows.flatMap(([name, value]) => {
            const dt = document.createElement('dt');
            dt.textContent = name;
            const dd = document.createElement('dd');
            dd.textContent = value;
            return [dt, dd];
        }));
    }

    function showStatistics() {
        fillList(document.getElementById('statistics-list'), statisticsRows(statisticsMode.value));
    }
    statisticsMode.addEventListener('change', showStatistics);

    function openStatistics() {
        if (!gameData) return;
        statisticsMode.value = game ? game.mode : nextMode();
        showStatistics();
        showModal(statisticsDialog);
    }

    // The win: the time, the score, and this level's numbers; Play again deals a new game
    document.addEventListener('solitaire:won', () => {
        if (!lastWin) return;
        const { scoring } = GameRules.MODES[lastWin.mode];
        const rows = [['Time', minutes(lastWin.time)]];
        if (scoring === 'standard') rows.push(['Score', lastWin.score]);
        if (scoring === 'vegas') rows.push(['Money', GameRules.money(lastWin.score)]);
        if (lastWin.best) rows.push([scoring === 'none' ? 'Your fastest win yet' : 'A new high score', '★']);
        const stats = statisticsRows(lastWin.mode).filter(([name]) => ['Games played', 'Games won', 'Win percentage'].includes(name));
        fillList(document.getElementById('won-list'), [...rows, ...stats]);
        showModal(wonDialog);
    });

    wonDialog.querySelector('form').addEventListener('submit', (e) => {
        if (e.submitter?.value === 'again') setTimeout(newDeal); // once the dialog has closed
    });

    // No more moves: the game is lost (js/solitaire.js declareLost()); its time, its score, and this level's numbers
    const lostDialog = document.getElementById('lost-dialog');
    document.addEventListener('solitaire:lost', () => {
        if (!lastLoss) return;
        const { scoring } = GameRules.MODES[lastLoss.mode];
        const rows = [['Time', minutes(lastLoss.time)]];
        if (scoring === 'standard') rows.push(['Score', lastLoss.score]);
        if (scoring === 'vegas') rows.push(['Money', GameRules.money(lastLoss.score)]);
        const stats = statisticsRows(lastLoss.mode).filter(([name]) => ['Games played', 'Games won', 'Win percentage', 'Current streak'].includes(name));
        fillList(document.getElementById('lost-list'), [...rows, ...stats]);
        showModal(lostDialog);
    });
    lostDialog.querySelector('form').addEventListener('submit', (e) => {
        if (e.submitter?.value === 'again') setTimeout(newDeal);
    });

    // --- The Game and Help menus' options ---

    const undoButton = document.getElementById('undo-button');
    const actions = {
        'new-game-button': () => newDeal(),
        'undo-button': () => undo(),
        'hint-button': () => hint(),
        'statistics-button': openStatistics,
        'options-button': openOptions,
        'appearance-button': openAppearance,
        'instructions-button': () => showModal(helpModal),
        'about-button': () => showModal(aboutModal),
    };
    Object.entries(actions).forEach(([id, action]) => {
        document.getElementById(id).addEventListener('click', (e) => {
            if (e.currentTarget.getAttribute('aria-disabled') === 'true') return;
            action();
        });
    });

    // Undo greys out when there's nothing to undo
    document.addEventListener('solitaire:change', () => {
        const can = Boolean(game) && GameRules.isLegal(game, 'U') && !GameHub.replaying;
        undoButton.setAttribute('aria-disabled', String(!can));
    });

    // Exit: in full screen (the game's own, or its frame's in GameHub), out of it; otherwise close the page. In
    // GameHub's frame, Exit isn't shown (css/page.css).
    document.getElementById('exit-game').addEventListener('click', () => {
        if (GameHub.isFullScreen()) {
            GameHub.fullScreen(false);
            return;
        }
        if (confirm('Are you sure you want to exit Solitaire? Your game is saved.')) window.close();
    });

    // The keys for the menus' options (js/extend-controls.js has the table's own): F2 or N a new game, Ctrl+Z or U
    // undo, H a hint, F4 or S the statistics, O the options, C the appearance, I the help
    document.addEventListener('keydown', (e) => {
        if (e.repeat || e.altKey) return;
        if (isAnyModalOpen()) return; // the dialog's own keys (Escape closes it)
        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;
        let id = null;
        if (ctrl && key === 'z') id = 'undo-button';
        else if (ctrl) return; // the browser's shortcuts
        else if (e.key === 'F2' || key === 'n') id = 'new-game-button';
        else if (key === 'u') id = 'undo-button';
        else if (key === 'h') id = 'hint-button';
        else if (e.key === 'F4' || key === 's') id = 'statistics-button';
        else if (key === 'o') id = 'options-button';
        else if (key === 'c') id = 'appearance-button';
        else if (key === 'i') id = 'instructions-button';
        if (!id) return;
        e.preventDefault();
        document.getElementById(id).click();
    });

    // --- The caption buttons: Maximize puts the game in full screen, or takes it out; Minimize and Close take it out
    // (where the browser can't, they're only for show) ---

    const windowButtons = [...document.querySelectorAll('.game-container .window-controls .window-button')];
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
            e.stopPropagation(); // Not the table's keys too
            press();
        });
    });

    // --- The Game and Help menus: a click or a tap opens one (then pointing at the other opens that one), as in
    // Windows 7; with the keyboard, Enter, Space or ↓ on a menu's name opens it, ↑ ↓ choose, Enter or Space picks, Escape
    // closes it, ← → go to the other menu. The keys a menu takes don't reach the table. ---

    const menus = [...document.querySelectorAll('.menu-bar .menu-item')];

    // A menu's options that can be picked, as shown (in GameHub's frame, Exit isn't)
    function menuOptions(menu) {
        return [...menu.querySelectorAll('[role^="menuitem"]')].filter((option) => option.getClientRects().length > 0);
    }

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

    function closeMenu(menu, focusTitle = false) {
        menu.classList.remove('open');
        const title = menu.querySelector('.menu-title');
        title.setAttribute('aria-expanded', 'false');
        if (focusTitle) title.focus();
    }

    const anyMenuOpen = () => menus.some((menu) => menu.classList.contains('open'));

    // Escape, from anywhere: a menu open (with the mouse) closes; otherwise the Game menu opens, with the keyboard on its
    // first option. Not while cards are picked up (Escape puts them back, js/extend-controls.js) or a dialog is open
    // (Escape closes it); a menu that has the keyboard closes itself (its keys don't reach here).
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
        if (isAnyModalOpen() || picked) return;
        if (anyMenuOpen()) menus.forEach((menu) => closeMenu(menu));
        else openMenu(menus[0], 'first');
        e.preventDefault();
    });

    menus.forEach((menu, index) => {
        const title = menu.querySelector('.menu-title');
        const dropdown = menu.querySelector('.menu-dropdown');
        const otherMenu = (key) => menus[(index + (key === 'ArrowRight' ? 1 : menus.length - 1)) % menus.length];

        title.addEventListener('click', () => {
            if (menu.classList.contains('open')) closeMenu(menu);
            else openMenu(menu);
        });
        title.addEventListener('mouseenter', () => {
            if (anyMenuOpen() && !menu.classList.contains('open')) openMenu(menu);
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
                return; // Tab moves on (and the menu closes, below)
            }
            e.preventDefault();
            e.stopPropagation();
        });

        // Picking an option closes the menu (not a greyed-out one); so does the keyboard going elsewhere
        dropdown.addEventListener('click', (e) => {
            const option = e.target.closest('[role^="menuitem"]');
            if (option && option.getAttribute('aria-disabled') !== 'true') closeMenu(menu);
        });
        menu.addEventListener('focusout', (e) => {
            if (!menu.contains(e.relatedTarget)) closeMenu(menu);
        });
    });

    // A click or a tap anywhere else closes the menus
    document.addEventListener('pointerdown', (e) => {
        menus.forEach((menu) => {
            if (!menu.contains(e.target)) closeMenu(menu);
        });
    });

    // A game in another tab of this game saved (the storage event only fires there): take its options and statistics,
    // so this tab doesn't save over them (js/gamehub.js keeps the save under solitaireGameData)
    window.addEventListener('storage', (event) => {
        if (event.key !== 'solitaireGameData' || !event.newValue || !gameData) return;
        try {
            const theirs = checkGameData(JSON.parse(event.newValue));
            Object.assign(gameData, { ...theirs, game: gameData.game });
        } catch (error) {
            return; // Not readable: keep this tab's
        }
        applyLook();
    });
});
