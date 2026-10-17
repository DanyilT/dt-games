// The page's instructions shown or hidden (and saved: the page shows them the first time, then as they were left)
function showPageInstructions(shown, save = true) {
    const instructions = document.getElementById('instructions');
    instructions.hidden = !shown;
    if (shown && save) instructions.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (save && gameData) {
        gameData.instructions = shown;
        saveGameData(gameData);
    }
}

// The page's instructions the other way round: I, the keypad's 0 (js/bounce.js), or their close button
function togglePageInstructions() {
    showPageInstructions(document.getElementById('instructions').hidden);
}

document.addEventListener('DOMContentLoaded', function() {
    const closeBtn = document.getElementById('closeInstructions');

    dataLoaded.then(() => showPageInstructions(gameData.instructions, false));

    closeBtn.addEventListener('click', function() {
        showPageInstructions(false);
    });

    // I: the instructions shown or hidden; M: the sound on or off (not while typing in a field)
    document.addEventListener('keydown', function(e) {
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.target.closest?.('input, textarea')) return;
        if (e.key.toLowerCase() === 'i') togglePageInstructions();
        if (e.key.toLowerCase() === 'm') toggleSound();
    });
});
