document.addEventListener('DOMContentLoaded', function() {
    const instructionsBtn = document.getElementById('showInstructionsBtn');
    const instructions = document.querySelector('.instructions');
    const restartBtn = document.getElementById('restartBtn');
    const pauseBtn = document.getElementById('pauseBtn');

    // Function to toggle instructions visibility
    function toggleInstructions() {
        if (instructions.style.display === 'none') {
            instructions.style.display = 'block';
            instructionsBtn.textContent = 'Hide Instructions (i)';
            window.scrollTo({ top: window.scrollY + instructions.getBoundingClientRect().top, behavior: 'smooth' });
        } else {
            instructions.style.display = 'none';
            instructionsBtn.textContent = 'Show Instructions (i)';
            instructions.scrollTo({top: 0, behavior: 'smooth'});
        }
    }

    // Initially hide instructions
    instructions.style.display = 'none';

    // Add click event to button
    instructionsBtn.addEventListener('click', toggleInstructions);

    // Add keyboard shortcut (i key)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'i' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
            toggleInstructions();
        }
    });

    // Simulate key press for restart button
    restartBtn.addEventListener('click', function() {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
    });

    // Simulate key press for pause button
    pauseBtn.addEventListener('click', function() {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    });

    // A button clicked with the mouse doesn't keep the focus, so Space doesn't press it again
    [instructionsBtn, restartBtn, pauseBtn].forEach(function(button) {
        button.addEventListener('click', function(e) {
            if (e.detail > 0) button.blur();
        });
    });
});
