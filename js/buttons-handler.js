document.addEventListener('DOMContentLoaded', function() {
    const infoBtn = document.getElementById('showInfoBtn');
    const infoContainer = document.querySelector('.info-container');
    const restartBtn = document.getElementById('newGameBtn');
    const checkSolutionBtn = document.getElementById('checkSolutionBtn');
    const difficultySelect = document.getElementById('difficulty');

    // Function to toggle info visibility
    function toggleInfo() {
        // Update the score board with win levels
        document.querySelector('.score-board .scores').innerHTML = `<p>${Object.entries({beginner: 0, easy: 0, medium: 0, hard: 0, expert: 0, ...JSON.parse(localStorage.getItem('winLevels') || '{}')}).map(([level, wins]) => {
            const winBadge = wins > 0 ? ` <span class="win-badge">${wins} ⭐</span>` : `<b>${wins}</b>`;
            return `${level.charAt(0).toUpperCase() + level.slice(1)}: ${winBadge}`;
        }).join(' | ')}</p>`;

        // Add click event listener to win badges
        const winBadges = document.querySelectorAll('.win-badge');
        winBadges.forEach(badge => {
            badge.addEventListener('click', function(event) {
                createStarParticles(event);
            });
        });

        // Toggle info container visibility
        if (infoContainer.style.display === 'none') {
            infoContainer.style.display = 'block';
            infoBtn.textContent = 'Hide Info (i)';
            infoContainer.scrollIntoView({behavior: 'smooth'});
        } else {
            infoContainer.style.display = 'none';
            infoBtn.textContent = 'Show Info (i)';
            infoContainer.scrollTo({top: 0, behavior: 'smooth'});
        }
    }

    // Initially hide info, add click event to button
    infoContainer.style.display = 'none';
    infoBtn.addEventListener('click', toggleInfo);

    document.addEventListener('keydown', function(e) {
        // Show/hide info panel
        if (e.key === 'i') {
            toggleInfo();
        }

        // New game shortcut
        if (e.key === 'r') {
            restartBtn.click();
        }

        // Check solution with Enter only when no cell is focused
        if (e.key === 'Enter') {
            // Check if the event originated from a cell (not just what's currently focused)
            if (!e.target.classList || !e.target.classList.contains('cell')) {
                checkSolutionBtn.click();
            }
        }

        // Check solution with Shift+Enter, Ctrl+Enter, or Cmd+Enter (regardless of focus)
        if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
            e.preventDefault(); // Prevent default actions
            checkSolutionBtn.click();
        }

        // Change difficulty level with Shift+number
        if (e.shiftKey) {
            // Check for number keys by their key codes (49-53 are key codes for 1-5)
            const keyCode = e.keyCode || e.which;
            if (keyCode >= 49 && keyCode <= 53) {
                e.preventDefault();
                const difficultyIndex = keyCode - 49; // Convert to 0-based index
                const difficultyOptions = ['beginner', 'easy', 'medium', 'hard', 'expert'];

                difficultySelect.value = difficultyOptions[difficultyIndex];

                // Manually trigger change event
                const event = new Event('change', {
                    'bubbles': true,
                    'cancelable': true
                });
                difficultySelect.dispatchEvent(event);
            }
        }
    });

    // Function to create particles on win badge click
    function createStarParticles(event) {
        const x = event.clientX;
        const y = event.clientY;
        const count = 25;
        const particles = ['★', '✦', '✧', '⋆', '✴']; // Different star shapes
        const colors = ['gold', '#FFD700', '#FFC125', '#FFDF00', '#FFCC00']; // Different gold shades

        // Create an initial burst star
        const burstStar = document.createElement('div');
        burstStar.className = 'star-particle burst';
        burstStar.textContent = '★';
        burstStar.style.left = `${x}px`;
        burstStar.style.top = `${y}px`;
        burstStar.style.fontSize = '30px';
        burstStar.style.color = 'gold';
        document.body.appendChild(burstStar);

        // Burst animation
        setTimeout(() => {
            burstStar.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            burstStar.style.transform = 'scale(2)';
            burstStar.style.opacity = '0';
            setTimeout(() => document.body.removeChild(burstStar), 300);
        }, 0);

        // Create regular particles
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'star-particle';

            // Random star shape and color
            const particleType = particles[Math.floor(Math.random() * particles.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            particle.textContent = particleType;
            particle.style.color = color;

            // Set initial position with slight randomness
            const offsetX = (Math.random() - 0.5) * 10;
            const offsetY = (Math.random() - 0.5) * 10;
            particle.style.left = `${x + offsetX}px`;
            particle.style.top = `${y + offsetY}px`;

            // Random size
            const size = Math.random() * 12 + 5;
            particle.style.fontSize = `${size}px`;

            // Add to DOM
            document.body.appendChild(particle);

            // Variable speed for different particles
            const duration = 0.5 + Math.random() * 1.5;
            const delay = Math.random() * 0.2;

            // Random direction and distance
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 120;

            // Animate after slight delay for staggered effect
            setTimeout(() => {
                particle.style.transition = `transform ${duration}s ease-out, opacity ${duration}s ease-out`;
                particle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) rotate(${Math.random() * 720 - 360}deg)`;
                particle.style.opacity = '0';

                // Remove after animation completes
                setTimeout(() => {
                    document.body.removeChild(particle);
                }, duration * 1000);
            }, delay * 1000);
        }
    }
});
