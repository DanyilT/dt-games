document.addEventListener('DOMContentLoaded', function() {
    // A tapped button shows its pressed look (:active) on iPhones and iPads too: Safari shows it only to a page that
    // listens for touches
    document.addEventListener('touchstart', function() {}, { passive: true });

    const instructionsBtn = document.getElementById('instructions-button');
    const instructions = document.querySelector('.instructions');
    const newGameBtn = document.getElementById('reset-button');
    const pauseBtn = document.getElementById('start-button');
    const more = document.querySelector('.more');
    const moreBtn = document.getElementById('more-button');
    const soundBtn = document.getElementById('sound-button');

    // Game control buttons
    const moveLeftBtn = document.getElementById('move-left');
    const moveRightBtn = document.getElementById('move-right');
    const rotateBtn = document.getElementById('rotate');
    const moveDownBtn = document.getElementById('move-down');
    const dropBtn = document.getElementById('drop');

    // Function to toggle instructions visibility
    function toggleInstructions() {
        if (instructions.style.display === 'none') {
            instructions.style.display = 'block';
            instructionsBtn.textContent = 'Hide Instructions (I)';
            window.scrollTo({ top: window.scrollY + instructions.getBoundingClientRect().top, behavior: 'smooth' });
        } else {
            instructions.style.display = 'none';
            instructionsBtn.textContent = 'Show Instructions (I)';
            instructions.scrollTo({top: 0, behavior: 'smooth'});
        }
    }

    // Initially hide instructions
    instructions.style.display = 'none';

    // Add click event to button
    instructionsBtn.addEventListener('click', toggleInstructions);

    // More: its menu opens on hover with a mouse (css/page.css), or with a click or a tap; picking from it, a click
    // elsewhere or Escape closes it
    function openMore(open) {
        more.classList.toggle('open', open);
        moreBtn.setAttribute('aria-expanded', String(open));
    }
    moreBtn.addEventListener('click', () => openMore(!more.classList.contains('open')));
    more.querySelectorAll('.more-menu button').forEach((button) => button.addEventListener('click', () => openMore(false)));
    document.addEventListener('pointerdown', (e) => {
        if (!more.contains(e.target)) openMore(false);
    });

    // The sound button says whether the sounds are on (js/tetris.js toggleSound())
    function showSound() {
        const on = gameData?.sound !== false;
        soundBtn.textContent = `Sound: ${on ? 'On' : 'Off'} (M)`;
        soundBtn.setAttribute('aria-pressed', String(on));
    }
    soundBtn.addEventListener('click', toggleSound);
    document.addEventListener('tetris:sound', showSound);

    // The keys: I the instructions, N a new game, Esc pause or resume, M the sound
    document.addEventListener('keydown', function(e) {
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; // Held down: once; the browser's shortcuts
        if (e.key === 'i') {
            toggleInstructions();
        } else if (e.key === 'n') {
            newGameBtn.click();
        } else if (e.key === 'm') {
            soundBtn.click();
        } else if (e.key === 'Escape') {
            openMore(false);
            if (!pauseBtn.hidden) pauseBtn.click();
        }
    });

    // Game control buttons functionality
    moveLeftBtn.addEventListener('click', function() {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    moveRightBtn.addEventListener('click', function() {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });

    rotateBtn.addEventListener('click', function() {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });

    moveDownBtn.addEventListener('click', function() {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    dropBtn.addEventListener('click', function() {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    });

    // A button clicked with the mouse doesn't keep the focus, so Space doesn't press it again
    document.querySelectorAll('button').forEach(function(button) {
        button.addEventListener('click', function(e) {
            if (e.detail > 0) button.blur();
        });
    });
});
