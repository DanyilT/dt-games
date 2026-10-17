document.addEventListener('DOMContentLoaded', function() {
    // A tapped button shows its pressed look (:active) on iPhones and iPads too: Safari shows it only to a page that
    // listens for touches
    document.addEventListener('touchstart', function() {}, { passive: true });

    const instructionsBtn = document.getElementById('instructions-button');
    const instructions = document.querySelector('.instructions');

    // Function to toggle instructions visibility
    function toggleInstructions() {
        if (instructions.style.display === 'none') {
            instructions.style.display = 'block';
            instructionsBtn.textContent = 'Hide instructions (i)';
            window.scrollTo({ top: window.scrollY + instructions.getBoundingClientRect().top, behavior: 'smooth' });
        } else {
            instructions.style.display = 'none';
            instructionsBtn.textContent = 'Instructions (i)';
        }
    }

    // Initially hide instructions
    instructions.style.display = 'none';
    instructionsBtn.addEventListener('click', toggleInstructions);

    // Keyboard shortcut: i for the instructions
    document.addEventListener('keydown', function(e) {
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'i') toggleInstructions();
    });

    // A button clicked with the mouse doesn't keep the focus, so Enter or Space doesn't press it again
    document.querySelectorAll('.controls button').forEach(function(button) {
        button.addEventListener('click', function(e) {
            if (e.detail > 0) button.blur();
        });
    });
});
