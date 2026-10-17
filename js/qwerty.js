document.addEventListener('DOMContentLoaded', function() {
    let typedKeys = '';
    const form = document.getElementById('codeEntry');
    const input = document.getElementById('codeInput');

    // Listen for keyboard input to detect "qwerty"
    document.addEventListener('keydown', function(e) {
        if (e.target.closest?.('input, textarea')) return; // Typed into the call key's field: it checks for itself

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

    // The call key's field (a phone has no Shift): "qwerty" typed there does the same
    input.addEventListener('input', function() {
        if (input.value.trim().toLowerCase() !== 'qwerty') return;
        closeCodeEntry();
        activateQwertyEasterEgg();
    });
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        closeCodeEntry();
    });
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeCodeEntry();
        }
    });
    input.addEventListener('blur', closeCodeEntry);
});

let easterEggActive = false;

// The call key (js/bounce.js): a field over the bottom of the screen to type a code in, with the phone's own keyboard
function openCodeEntry() {
    const form = document.getElementById('codeEntry');
    const input = document.getElementById('codeInput');
    form.hidden = false;
    input.value = '';
    input.focus();
}

// The field gone again (Enter, Esc, or a tap elsewhere)
function closeCodeEntry() {
    const form = document.getElementById('codeEntry');
    if (form.hidden) return;
    form.hidden = true;
    document.getElementById('codeInput').blur();
    fitScreen(); // The phone's keyboard has gone: the room it took is back
}

// The Easter egg: hold Shift and type Q W E R T Y, or press the call key and type it (or call it from the console),
// and again to undo it. The phone's screen goes black and white, as Bounce looked on Nokia's older phones
// (js/bounce.js, monochrome), and the instructions (the page's, and the phone's own) tell the phone's cheats. It changes
// only the look, not the game.
function activateQwertyEasterEgg() {
    easterEggActive = !easterEggActive;
    console.log(easterEggActive ? '🎮 QWERTY Easter Egg Activated! 🎮' : '🎮 QWERTY Easter Egg off 🎮');
    monochrome = easterEggActive;
    dirty = true;
    document.documentElement.classList.toggle('qwerty', easterEggActive);
}
