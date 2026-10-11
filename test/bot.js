/**
 * Replay test: Snake's bot (test/index.html, with test/check.js)
 *
 * Each game starts with an arrow key. The bot steps the game itself (the page's own timer is stopped), so a game takes
 * no time, and steers through the page's own keys (arrows and W A S D): towards the food, never into a wall or itself,
 * except for a turn at random now and then (which may be the end of it). Once in a while it pauses (Space) and resumes
 * with an arrow key. A game still going after 4000 steps is restarted (R), and its run isn't kept.
 */
window.ReplayBot = (function () {
    const KEYS = { U: ['ArrowUp', 'w'], D: ['ArrowDown', 's'], L: ['ArrowLeft', 'a'], R: ['ArrowRight', 'd'] };
    const MOVES = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
    const MAX_STEPS = 4000;

    // A direction's key: its arrow or its letter
    function press(t, direction) {
        const [arrow, letter] = KEYS[direction];
        t.key(t.random() < 0.5 ? arrow : letter);
    }

    // A direction at random
    function anyDirection(t) {
        return 'UDLR'[Math.floor(t.random() * 4)];
    }

    // Whether a direction is safe for the next step: not straight back, and not into a wall or the snake
    function safe(game, direction) {
        const [x, y] = MOVES[direction];
        if ((x !== 0 && game.movedX === -x) || (y !== 0 && game.movedY === -y)) return false;
        const headX = game.snake[0].x + x;
        const headY = game.snake[0].y + y;
        if (headX < 0 || headY < 0 || headX >= game.tiles || headY >= game.tiles) return false;
        return !game.snake.some((part) => part.x === headX && part.y === headY);
    }

    // The way to go: towards the food if that's safe, another safe way if not (none: straight on, to the end)
    function nextDirection(t, game) {
        const head = game.snake[0];
        const wanted = [];
        if (game.foodX !== head.x) wanted.push(game.foodX > head.x ? 'R' : 'L');
        if (game.foodY !== head.y) wanted.push(game.foodY > head.y ? 'D' : 'U');
        if (t.random() < 0.5) wanted.reverse();
        const others = ['U', 'D', 'L', 'R'].filter((direction) => !wanted.includes(direction));
        return [...wanted, ...others].find((direction) => safe(game, direction)) ?? null;
    }

    // The page's own timer stopped: the bot makes the steps
    function stopTimer(page) {
        page.eval('clearInterval(gameInterval)');
    }

    return {
        games: 50,

        ready(page) {
            return page.eval('Boolean(canvas)');
        },

        async play(page, t) {
            press(t, anyDirection(t)); // Starts a game (and its run)
            t.watch();
            stopTimer(page);

            for (let steps = 0; steps < MAX_STEPS && page.eval('gameActive'); steps++) {
                const chance = t.random();
                if (chance < 0.005) {
                    t.key(' '); // Pause
                    press(t, anyDirection(t)); // An arrow key resumes it, and turns
                    stopTimer(page);
                } else if (chance < 0.007) {
                    press(t, anyDirection(t)); // At random: maybe the end of it
                } else {
                    const direction = nextDirection(t, page.eval('game'));
                    if (direction) press(t, direction); // The game records it only if it changes the direction
                }
                if (page.eval('gamePause')) {
                    t.key(' '); // Paused by the page (it was hidden): carry on
                    stopTimer(page);
                }
                page.gameLoop();
                if (steps % 200 === 0) await t.pause();
            }
            if (page.eval('gameActive')) t.key('r'); // Gave up: restart (the run is discarded)
        },
    };
})();
