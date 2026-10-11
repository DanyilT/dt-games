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

// The Easter egg: hold Shift and type Q W E R T Y (or call it from the console). The pencil is swapped for crayons, and
// the notebook for squared paper (css/page.css, .crayons). It only changes the look, so the game is still kept in
// GameHub, and the same keys turn it off again.
function activateQwertyEasterEgg() {
    const on = document.documentElement.classList.toggle('crayons');
    console.log(on ? '🖍️ QWERTY Easter Egg Activated! 🖍️' : '✏️ Back to the pencil ✏️');
}
