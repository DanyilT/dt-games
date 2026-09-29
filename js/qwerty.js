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

    activate = activate !== 'all' ? activate : ['setScore', 'gradientBorder', 'blockTeleport', 'blocks3D'];    // 1. Set score to negative maximum integer
    if (activate.includes('setScore') && typeof setScore === 'function') {
        setScore(-Math.pow(2, 32) / 2);
    }

    // 2. Add gradient border to tetris canvas
    const tetrisCanvas = document.getElementById('tetris');
    if (activate.includes('gradientBorder') && tetrisCanvas) {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes gradientRotate {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
        `;
        document.head.appendChild(style);

        tetrisCanvas.style.border = 'none';
        tetrisCanvas.style.borderRadius = '8px';
        // tetrisCanvas.style.background = 'linear-gradient(45deg, cyan, blue, orange, yellow, green, purple, red, cyan)';
        tetrisCanvas.style.background = 'linear-gradient(45deg, rgb(0, 240, 255), rgb(255, 0, 255), rgb(255, 255, 0), rgb(0, 255, 127), rgb(0, 240, 255))';
        tetrisCanvas.style.backgroundSize = '400% 400%';
        tetrisCanvas.style.animation = 'gradientRotate 5s linear infinite';
    }

    // 3. Spawn blocks at random positions and teleport the block in random position
    if (activate.includes('blockTeleport')) {
        if (typeof lockPiece === 'function') {
            const originalLockPiece = lockPiece;

            window.lockPiece = function() {
                originalLockPiece();

                if (typeof currentPiece !== 'undefined' && typeof COLS !== 'undefined') {
                    const pieceWidth = currentPiece.shape[0].length;
                    const maxX = COLS - pieceWidth;
                    currentPiece.x = Math.floor(Math.random() * (maxX + 1));
                }
            };
        }

        setInterval(() => {
            if (typeof currentPiece !== 'undefined' && typeof COLS !== 'undefined') {
                const pieceWidth = currentPiece.shape[0].length;
                const maxX = COLS - pieceWidth;
                currentPiece.x = Math.floor(Math.random() * (maxX + 1));
            }
        }, 100);
    }

    // 4. Create 3D blocks flying towards the user
    if (activate.includes('blocks3D')) {
        // Create overlay for 3D blocks
        const blocks3DOverlay = document.createElement('div');
        blocks3DOverlay.id = 'blocks3D-overlay';
        blocks3DOverlay.style.position = 'fixed';
        blocks3DOverlay.style.top = '0';
        blocks3DOverlay.style.left = '0';
        blocks3DOverlay.style.width = '100%';
        blocks3DOverlay.style.height = '100%';
        blocks3DOverlay.style.pointerEvents = 'none';
        blocks3DOverlay.style.zIndex = '1000';
        blocks3DOverlay.style.perspective = '1000px';
        blocks3DOverlay.style.overflow = 'hidden';
        document.body.appendChild(blocks3DOverlay);

        // Function to create and animate a 3D block
        function spawn3DBlock() {
            const shapes = [
                [[1, 1, 1, 1]], // I
                [[1, 0, 0], [1, 1, 1]], // J
                [[0, 0, 1], [1, 1, 1]], // L
                [[1, 1], [1, 1]], // O
                [[0, 1, 1], [1, 1, 0]], // S
                [[0, 1, 0], [1, 1, 1]], // T
                [[1, 1, 0], [0, 1, 1]] // Z
            ];

            // Colors matching the tetris pieces
            const colors = ['cyan', 'blue', 'orange', 'yellow', 'green', 'purple', 'red'];

            // Random shape and color
            const idx = Math.floor(Math.random() * shapes.length);
            const shape = shapes[idx];
            const color = colors[idx];

            // Create block container
            const block = document.createElement('div');
            block.className = 'block3D';
            block.style.position = 'absolute';
            block.style.left = `${Math.random() * 90 + 5}%`;
            block.style.top = `${Math.random() * 90 + 5}%`;
            block.style.transformStyle = 'preserve-3d';
            block.style.transform = 'translateZ(-1000px)';

            // Create block cells
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        const cell = document.createElement('div');
                        cell.style.position = 'absolute';
                        cell.style.width = '20px';
                        cell.style.height = '20px';
                        cell.style.left = `${x * 20}px`;
                        cell.style.top = `${y * 20}px`;
                        cell.style.backgroundColor = color;
                        cell.style.border = '1px solid black';
                        cell.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
                        block.appendChild(cell);
                    }
                }
            }

            blocks3DOverlay.appendChild(block);

            // Animate block flying toward user
            let z = -1000;
            let rotX = Math.random() * 360;
            let rotY = Math.random() * 360;
            let rotXSpeed = Math.random() * 3 - 1.5;
            let rotYSpeed = Math.random() * 3 - 1.5;
            let speed = 7 + Math.random() * 10;

            const animation = setInterval(() => {
                z += speed;
                rotX += rotXSpeed;
                rotY += rotYSpeed;

                block.style.transform = `translateZ(${z}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;

                if (z > 500) {
                    clearInterval(animation);
                    block.style.transition = 'opacity 0.2s';
                    block.style.opacity = '0';
                    setTimeout(() => {
                        if (blocks3DOverlay.contains(block)) {
                            blocks3DOverlay.removeChild(block);
                        }
                    }, 200);
                }
            }, 16);
        }

        // Spawn blocks periodically
        const blockSpawnInterval = setInterval(() => {
            if (document.getElementById('blocks3D-overlay')) {
                spawn3DBlock();
            } else {
                clearInterval(blockSpawnInterval);
            }
        }, 10);
    }

    // Visual confirmation
    // alert('🎮 QWERTY Easter Egg Activated! 🎮');

    //Create and show a temporary notification
    const notification = document.createElement('div'); notification.textContent = '🎮 QWERTY Easter Egg Activated! 🎮'; notification.style.position = 'fixed'; notification.style.top = '20px'; notification.style.left = '50%'; notification.style.transform = 'translateX(-50%)'; notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'; notification.style.color = 'lightgray'; notification.style.padding = '10px 20px'; notification.style.border = '1px solid darkgray'; notification.style.zIndex = '1'; notification.style.transition = 'opacity 0.5s'; document.body.appendChild(notification);

    // Auto-hide the notification after 3 seconds
    setTimeout(() => { notification.style.opacity = '0'; setTimeout(() => { document.body.removeChild(notification); }, 500); }, 3000);
}
