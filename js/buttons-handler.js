document.addEventListener('DOMContentLoaded', function() {
    const instructionsBtn = document.getElementById('instructions-button');
    const instructions = document.querySelector('.instructions');
    const restartBtn = document.getElementById('reset-button');
    const pauseBtn = document.getElementById('start-button');

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
            instructionsBtn.textContent = 'Hide Instructions (i)';
            instructions.scrollIntoView({behavior: 'smooth'});
        } else {
            instructions.style.display = 'none';
            instructionsBtn.textContent = 'Show Instructions (i)';
            instructions.scrollTo({top: 0, behavior: 'smooth'});
        }
    }

    // Initially nide instructions
    instructions.style.display = 'none';

    // Add click event to button
    instructionsBtn.addEventListener('click', toggleInstructions);

    // Add keyboard shortcut (i key)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'i') {
            toggleInstructions();
        }
    });

    // Restart button functionality
    document.addEventListener('keydown', function(e) {
        if (e.key === 'r') {
            restartBtn.click();
        }
    });

    // Pause button functionality
    document.addEventListener('keydown', function(e) {
        if (e.key === 'p') {
            pauseBtn.click();
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
});
