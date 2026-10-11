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
                activateQwertyEasterEgg();
            }
        } else {
            typedKeys = '';
        }
    });
});

let easterEggActive = false;

// The Easter egg: hold Shift and type Q W E R T Y (or call it from the console). Night falls, the bird turns gold, and
// the pipes to come have wider gaps (js/flappy-bird.js, nightMode).
function activateQwertyEasterEgg() {
    if (easterEggActive) return;
    easterEggActive = true;
    GameHub.cheated(); // It changes the game: neither the game under way nor later ones are kept to watch again in GameHub

    console.log('🎮 QWERTY Easter Egg Activated! 🎮');
    nightMode = true;
    if (game) game.gap = 140; // The pipes to come, in the game under way
    document.documentElement.classList.add('qwerty');
}
