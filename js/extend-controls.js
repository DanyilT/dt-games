document.addEventListener('DOMContentLoaded', function() {
    const gameCanvas = document.getElementById('tetris');

    // Swipe detection variables
    let startX, startY, endX, endY;

    // Detect swipe gestures, and taps
    gameCanvas.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent default touch behavior like page refresh, scrolling, zooming
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        touchStartTime = Date.now(); // Record the start time of the touch
    });

    gameCanvas.addEventListener('touchmove', function(e) {
        e.preventDefault() // Prevent default touch behavior like page refresh, scrolling, zooming
        const touch = e.touches[0];
        endX = touch.clientX;
        endY = touch.clientY;
    });

    gameCanvas.addEventListener('touchend', function() {
        const diffX = endX - startX;
        const diffY = endY - startY;

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
                // Detect tap or long tap
                const tapDuration = Date.now() - touchStartTime;
                if (tapDuration < 500) {
                    // Short tap
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
                } else {
                    // Long tap
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
                }
            }
        }
    });

    // Remap WASD keys to arrow keys
    document.addEventListener('keydown', function(e) {
        switch (!e.shiftKey && e.key.toLowerCase()) {
            case 'w':
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
                e.preventDefault();
                break;
            case 'a':
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
                e.preventDefault();
                break;
            case 's':
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
                e.preventDefault();
                break;
            case 'd':
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
                e.preventDefault();
                break;
        }
    });
});
