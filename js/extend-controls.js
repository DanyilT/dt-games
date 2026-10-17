document.addEventListener('DOMContentLoaded', function() {
    const screenCanvas = document.getElementById('screen');

    // A click or a tap on the screen: on a menu, the item (or the soft key's word at the bottom) under it
    screenCanvas.addEventListener('pointerdown', function(e) {
        if (e.button !== 0 || GameHub.replaying) return;
        e.preventDefault(); // No text selection, no double-tap zoom
        const box = screenCanvas.getBoundingClientRect();
        tapScreen((e.clientX - box.left) * 128 / box.width, (e.clientY - box.top) * 128 / box.height);
    });
});
