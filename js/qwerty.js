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

// The Easter egg: hold Shift and type Q W E R T Y (or call it from the console). A whole deck bounces off the
// foundations, kings first, as if you'd won, and the table comes back as it was. It only shows something, so the game
// is still kept in GameHub. A click or a key stops it.
function activateQwertyEasterEgg() {
    if (!game || GameHub.replaying) return;
    const throws = [];
    for (let rank = 12; rank >= 0; rank--) {
        for (let suit = 0; suit < 4; suit++) throws.push({ card: suit * 13 + rank, from: 'abcd'[suit] });
    }
    sound('win');
    cascade(throws, false, () => {});
    console.log('🃏 QWERTY Easter Egg Activated! 🃏');
}
