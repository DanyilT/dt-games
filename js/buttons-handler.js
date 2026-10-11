document.addEventListener('DOMContentLoaded', function() {
    const instructionsBtn = document.getElementById('showInstructionsBtn');
    const instructions = document.querySelector('.instructions');
    const restartBtn = document.getElementById('restartBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const soundBtn = document.getElementById('soundBtn');

    // Function to toggle instructions visibility
    function toggleInstructions() {
        if (instructions.style.display === 'none') {
            instructions.style.display = 'block';
            instructionsBtn.textContent = 'Hide Instructions (i)';
            window.scrollTo({ top: window.scrollY + instructions.getBoundingClientRect().top, behavior: 'smooth' });
        } else {
            instructions.style.display = 'none';
            instructionsBtn.textContent = 'Show Instructions (i)';
            instructions.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // Initially hide instructions
    instructions.style.display = 'none';
    instructionsBtn.addEventListener('click', toggleInstructions);

    // The Sound button says whether the sound is on (js/flappy-bird.js tells it when that changes)
    function showSound() {
        soundBtn.textContent = soundOn ? 'Sound: On (m)' : 'Sound: Off (m)';
        soundBtn.setAttribute('aria-pressed', String(soundOn));
    }
    showSound();
    document.addEventListener('flappy:sound', showSound);

    // Keyboard shortcuts: i for the instructions, m for the sound
    document.addEventListener('keydown', function(e) {
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'i') toggleInstructions();
        if (e.key === 'm') toggleSound();
    });

    // The buttons: back to Get Ready, pause or resume, the sound
    restartBtn.addEventListener('click', toReady);
    pauseBtn.addEventListener('click', togglePause);
    soundBtn.addEventListener('click', toggleSound);

    // A button clicked with the mouse doesn't keep the focus, so Space (a flap) doesn't press it again
    [instructionsBtn, restartBtn, pauseBtn, soundBtn].forEach(function(button) {
        button.addEventListener('click', function(e) {
            if (e.detail > 0) button.blur();
        });
    });
});
