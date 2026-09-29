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

    activate = activate !== 'all' ? activate : ['style', 'solution', 'matrix', 'followers'];
    // 1. Switch CSS file from style.css to basic-style.css
    if (activate.includes('style')) {
        const styleLink = document.querySelector('link[href*="style.css"]');
        if (styleLink) {
            styleLink.dataset.originalHref = styleLink.href;
            styleLink.href = styleLink.href.replace('style.css', 'basic-style.css');
            console.log("👺 Style switched to basic mode");
        }
    }

    // 2. Show solution, and set gameWon to false (so the check solution will count it as win)
    if (activate.includes('solution')) {
        setInterval(() => {
            if (typeof board !== 'undefined' && typeof initialBoard !== 'undefined' && JSON.stringify(board) === JSON.stringify(initialBoard)) {
                showSolution(false);
            }
            gameWon = false;
        }, 16); // ~60fps
        console.log("👀 Solution shown");
    }

    // 3. Matrix effect going on the background
    if (activate.includes('matrix')) {
        createMatrixEffect();
        console.log("🔢 Matrix effect activated");

        function createMatrixEffect() {
            // Create canvas for better performance
            const canvas = document.createElement('canvas');
            canvas.className = 'matrix-canvas';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '-1';
            document.body.appendChild(canvas);

            // Set canvas dimensions
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const ctx = canvas.getContext('2d');
            const columns = Math.floor(canvas.width / 20); // Column width
            const drops = [];

            // Initialize drops at random positions
            for (let i = 0; i < columns; i++) {
                drops[i] = Math.random() * -100;
            }

            // Numbers only for Sudoku theme
            const characters = '0123456789';

            function draw() {
                // Create fade effect with semi-transparent white rectangle
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Set text properties
                ctx.fillStyle = '#0f0'; // Matrix green
                ctx.font = '18px monospace';

                // Draw falling characters
                for (let i = 0; i < drops.length; i++) {
                    const text = characters.charAt(Math.floor(Math.random() * characters.length));
                    ctx.fillText(text, i * 20, drops[i] * 20);

                    // Move drops down
                    drops[i]++;

                    // Reset when off-screen with some randomness
                    if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
                        drops[i] = 0;
                    }
                }
            }

            // Start animation
            canvas.dataset.intervalId = setInterval(draw, 60);

            return canvas;
        }
    }

    // 4. Create numbers that follow the mouse cursor
    if (activate.includes('followers')) {
        createNumbersFollowEffect();
        console.log("🧙‍♂️ Numbers have come alive!");

        function createNumbersFollowEffect() {
            // Track mouse position
            let mouseX = window.innerWidth / 2;
            let mouseY = window.innerHeight / 2;

            document.addEventListener('mousemove', function(e) {
                mouseX = e.clientX;
                mouseY = e.clientY;
            });

            // Get all the cells from the Sudoku grid
            const cells = document.querySelectorAll('.cell');
            const animatedNumbers = [];

            // Create floating numbers based on values in the grid
            cells.forEach(cell => {
                if (cell.value) {
                    createFloatingNumber(cell);
                }
            });

            // Function to create a new floating number
            function createFloatingNumber(cell) {
                // Create floating number element
                const floater = document.createElement('div');
                floater.className = 'floating-number';
                floater.textContent = cell.value;
                floater.style.position = 'fixed';
                floater.style.zIndex = '100';
                floater.style.pointerEvents = 'none';
                floater.style.color = '#000';
                floater.style.textShadow = '0 0 5px rgba(0, 255, 0, 0.7)'; // Matrix green + 0.7 opacity
                floater.style.fontSize = '24px';
                floater.style.fontFamily = 'monospace';

                // Get cell position
                const rect = cell.getBoundingClientRect();
                floater.style.left = rect.left + 'px';
                floater.style.top = rect.top + 'px';

                document.body.appendChild(floater);

                // Add to tracking array with random speed (much slower initial speed)
                animatedNumbers.push({
                    element: floater,
                    x: rect.left,
                    y: rect.top,
                    speedX: (Math.random() - 0.5) * 0.8,
                    speedY: (Math.random() - 0.5) * 0.8,
                    size: 24,
                    targetSize: 24,
                    opacity: 1,
                    baseValue: cell.value,
                    lastSwitch: 0,
                    birthTime: Date.now(),
                    fromCell: true
                });
            }

            // Animation loop
            function animate() {
                const now = Date.now();

                animatedNumbers.forEach(number => {
                    // Special handling for numbers that just came from cells
                    if (number.fromCell) {
                        const timeSinceBirth = now - number.birthTime;

                        // For the first 1.5 seconds, move very slowly
                        if (timeSinceBirth < 1500) {
                            // Scale speed based on time passed (gradually increase)
                            const speedFactor = timeSinceBirth / 1500;
                            number.speedX = (Math.random() - 0.5) * speedFactor * 2;
                            number.speedY = (Math.random() - 0.5) * speedFactor * 2;
                        } else {
                            // After the initial slow period, behave normally
                            number.fromCell = false;
                        }
                    }

                    // Occasionally change numbers for effect
                    if (now - number.lastSwitch > 1000 + Math.random() * 2000) {
                        number.lastSwitch = now;
                        if (Math.random() > 0.7) {
                            number.element.textContent = Math.floor(Math.random() * 9) + 1;
                        } else {
                            number.element.textContent = number.baseValue;
                        }
                    }

                    // Calculate direction to mouse with randomness
                    const dx = mouseX - number.x;
                    const dy = mouseY - number.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Numbers follow cursor behavior
                    if (distance < 100) {
                        number.speedX -= dx * 0.01;
                        number.speedY -= dy * 0.01;
                        number.targetSize = 30; // Grow when close to mouse
                    } else {
                        number.speedX += dx * 0.0005;
                        number.speedY += dy * 0.0005;
                        number.targetSize = 24;
                    }

                    // Apply drag and limit speed
                    number.speedX *= 0.99;
                    number.speedY *= 0.99;

                    const maxSpeed = 5;
                    const speed = Math.sqrt(number.speedX * number.speedX + number.speedY * number.speedY);
                    if (speed > maxSpeed) {
                        number.speedX = (number.speedX / speed) * maxSpeed;
                        number.speedY = (number.speedY / speed) * maxSpeed;
                    }

                    // Update position
                    number.x += number.speedX;
                    number.y += number.speedY;

                    // Handle boundaries with bounce
                    if (number.x < 0 || number.x > window.innerWidth) {
                        number.speedX *= -0.8;
                        number.x = Math.max(0, Math.min(number.x, window.innerWidth));
                    }
                    if (number.y < 0 || number.y > window.innerHeight) {
                        number.speedY *= -0.8;
                        number.y = Math.max(0, Math.min(number.y, window.innerHeight));
                    }

                    // Update element
                    number.element.style.left = number.x + 'px';
                    number.element.style.top = number.y + 'px';
                    number.element.style.fontSize = number.size + 'px';
                    number.element.style.opacity = number.opacity;
                });

                return animatedNumbers;
            }

            // Start animation
            const intervalId = setInterval(animate, 16);

            return {
                intervalId: intervalId,
                elements: animatedNumbers.map(n => n.element)
            };
        }
    }

    // Visual confirmation
    // alert('🎮 QWERTY Easter Egg Activated! 🎮');

    //Create and show a temporary notification
    const notification = document.createElement('div'); notification.textContent = '🎮 QWERTY Easter Egg Activated! 🎮'; notification.style.position = 'fixed'; notification.style.top = '20px'; notification.style.left = '50%'; notification.style.transform = 'translateX(-50%)'; notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'; notification.style.color = 'lightgray'; notification.style.padding = '10px 20px'; notification.style.border = '1px solid darkgray'; notification.style.zIndex = '1'; notification.style.transition = 'opacity 0.5s'; document.body.appendChild(notification);

    // Auto-hide the notification after 3 seconds
    setTimeout(() => { notification.style.opacity = '0'; setTimeout(() => { document.body.removeChild(notification); }, 500); }, 3000);
}
