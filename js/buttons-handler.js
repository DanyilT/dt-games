document.addEventListener('DOMContentLoaded', function() {
    // A tapped button shows its pressed look (:active) on iPhones and iPads too: Safari shows it only to a page that
    // listens for touches
    document.addEventListener('touchstart', function() {}, { passive: true });

    const instructionsBtn = document.getElementById('showInstructionsBtn');
    const instructions = document.querySelector('.instructions');
    const newGameBtn = document.getElementById('restartBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const more = document.querySelector('.more');
    const moreBtn = document.getElementById('more-button');
    const soundBtn = document.getElementById('sound-button');

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

    // More: its menu opens on hover with a mouse (css/page.css), or with a click or a tap; picking from it, or a click
    // elsewhere, closes it
    function openMore(open) {
        more.classList.toggle('open', open);
        moreBtn.setAttribute('aria-expanded', String(open));
    }
    moreBtn.addEventListener('click', () => openMore(!more.classList.contains('open')));
    more.querySelectorAll('.more-menu button').forEach((button) => button.addEventListener('click', () => openMore(false)));
    document.addEventListener('pointerdown', (e) => {
        if (!more.contains(e.target)) openMore(false);
    });

    // The sound button says whether the sounds are on (js/snake.js toggleSound())
    function showSound() {
        const on = gameData?.sound !== false;
        soundBtn.textContent = `Sound: ${on ? 'On' : 'Off'} (M)`;
        soundBtn.setAttribute('aria-pressed', String(on));
    }
    soundBtn.addEventListener('click', () => toggleSound());
    document.addEventListener('snake:sound', showSound);

    // The keys: I the instructions, M the sound (js/snake.js has the game's: the arrows, Space and Esc, N)
    document.addEventListener('keydown', function(e) {
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; // Held down: once; the browser's shortcuts
        if (e.key === 'i') toggleInstructions();
        if (e.key === 'm') soundBtn.click();
        if (e.key === 'Escape') openMore(false);
    });

    // New Game and Pause press the game's keys
    newGameBtn.addEventListener('click', function() {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
    });
    pauseBtn.addEventListener('click', function() {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    });

    // The direction pad (on a touch screen): each button presses its arrow key, and the middle one pauses or resumes
    const pad = { 'turn-up': 'ArrowUp', 'turn-left': 'ArrowLeft', 'turn-right': 'ArrowRight', 'turn-down': 'ArrowDown', 'pad-pause': ' ' };
    Object.entries(pad).forEach(([id, key]) => {
        document.getElementById(id).addEventListener('click', function() {
            document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
    });

    // A button clicked with the mouse doesn't keep the focus, so Space doesn't press it again
    document.querySelectorAll('button').forEach(function(button) {
        button.addEventListener('click', function(e) {
            if (e.detail > 0) button.blur();
        });
    });
});
