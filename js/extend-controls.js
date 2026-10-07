document.addEventListener('DOMContentLoaded', function() {
    const gameCanvas = document.getElementById('game');

    // Swipe detection variables
    let startX, startY, endX, endY, touchStartTime;

    // Detect swipe gestures, and taps
    gameCanvas.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent default touch behavior like page refresh, scrolling, zooming
        const touch = e.touches[0];
        startX = endX = touch.clientX;
        startY = endY = touch.clientY;
        touchStartTime = Date.now();
    });

    gameCanvas.addEventListener('touchmove', function(e) {
        e.preventDefault(); // Prevent default touch behavior like page refresh, scrolling, zooming
        const touch = e.touches[0];
        endX = touch.clientX;
        endY = touch.clientY;
    });

    gameCanvas.addEventListener('touchend', function() {
        const diffX = endX - startX;
        const diffY = endY - startY;

        // A tap (a short touch that barely moves) pauses or resumes the game under way, as Space does. Only touches count:
        // a mouse click (in GameHub, the one that gives the game the keyboard) never pauses.
        if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
            if (Date.now() - touchStartTime < 500) {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
            }
            return;
        }

        // A swipe turns the snake (or starts a game)
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal swipe
            if (diffX > 0) {
                // Swipe right
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
            } else {
                // Swipe left
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
            }
        } else {
            // Vertical swipe
            if (diffY > 0) {
                // Swipe down
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            } else {
                // Swipe up
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            }
        }
    });

    // Remap WASD keys to arrow keys
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return; // The browser's shortcuts
        switch (!e.shiftKey && e.key.toLowerCase()) {
            case 'w':
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', repeat: e.repeat }));
                e.preventDefault();
                break;
            case 'a':
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', repeat: e.repeat }));
                e.preventDefault();
                break;
            case 's':
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', repeat: e.repeat }));
                e.preventDefault();
                break;
            case 'd':
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', repeat: e.repeat }));
                e.preventDefault();
                break;
        }
    });
});
