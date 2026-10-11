document.addEventListener('DOMContentLoaded', function() {
    const gameCanvas = document.getElementById('game');

    // A click or a tap on the canvas flaps (or presses the pause button there): the moment it goes down, as a flap must
    // be quick
    gameCanvas.addEventListener('pointerdown', function(e) {
        if (e.button !== 0 || GameHub.replaying) return;
        e.preventDefault(); // No text selection, no double-tap zoom
        pressCanvas(e.clientX, e.clientY);
    });

    // W flaps too, as ↑ does
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return; // The browser's shortcuts, and the Easter egg's keys
        if (e.key.toLowerCase() === 'w') {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', repeat: e.repeat }));
            e.preventDefault();
        }
    });
});
