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
                activateQwertyEasterEgg('all');
            }
        } else {
            typedKeys = '';
        }
    });
});

let easterEggActive = false;

function activateQwertyEasterEgg(activate = 'all') {
    if (easterEggActive) return;
    easterEggActive = true;

    console.log("🎮 QWERTY Easter Egg Activated! 🎮");

    activate = activate !== 'all' ? activate : ['snakeLength', 'setScore', 'glowSnake', 'rotateCanvas'];
    // 1. Set snake length to maximum integer
    if (activate.includes('snakeLength') && typeof snakeLength !== 'undefined') {
        setInterval(() => {
            snakeLength = Math.pow(2, 32) - 1;
        }, 16); // ~60fps
    }

    // 2. Set score to negative maximum integer
    if (activate.includes('setScore') && typeof setScore === 'function') {
        setInterval(() => {
            setScore(-Math.pow(2, 32) / 2);
        }, 16); // ~60fps
    }

    // 3. Make snake glow by modifying the render function
    if (activate.includes('glowSnake') && typeof render === 'function') {
        const originalRender = render;
        render = function () {
            originalRender();

            if (!ctx || !snake || !tileSize) return;

            ctx.shadowBlur = 20;
            ctx.shadowColor = "rgba(255, 255, 0, 0.8)";

            for (let i = 0; i < snake.length; i++) {
                const hue = (Date.now() / 20 + i * 10) % 360;
                ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                ctx.fillRect(snake[i].x * tileSize, snake[i].y * tileSize, tileSize - 1, tileSize - 1);
            }

            ctx.shadowBlur = 0;
        };
    }

    // 4. Rotate the canvas
    const gameCanvas = document.getElementById('game');
    if (activate.includes('rotateCanvas') && gameCanvas) {
        let rotation = 0;
        gameCanvas.style.transition = 'transform 3s ease-in-out';

        setInterval(function () {
            rotation += 90;
            gameCanvas.style.transform = `rotate(${rotation}deg)`;
        }, 4000);
    }

    // Visual confirmation
    // alert('🎮 QWERTY Easter Egg Activated! 🎮');

    //Create and show a temporary notification
    const notification = document.createElement('div'); notification.textContent = '🎮 QWERTY Easter Egg Activated! 🎮'; notification.style.position = 'fixed'; notification.style.top = '20px'; notification.style.left = '50%'; notification.style.transform = 'translateX(-50%)'; notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'; notification.style.color = 'lightgray'; notification.style.padding = '10px 20px'; notification.style.border = '1px solid darkgray'; notification.style.zIndex = '1'; notification.style.transition = 'opacity 0.5s'; document.body.appendChild(notification);

    // Auto-hide the notification after 3 seconds
    setTimeout(() => { notification.style.opacity = '0'; setTimeout(() => { document.body.removeChild(notification); }, 500); }, 3000);
}
