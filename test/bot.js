/**
 * Replay test: Flappy Bird's bot (test/index.html, with test/check.js)
 *
 * Each game is a new game, back at Get Ready (N), and starts with a flap. The bot steps the game itself (as the page
 * does each frame), so a game takes no time, and flaps through the page's own controls (Space, ↑, W, or a tap on the
 * canvas) whenever the bird is below the middle of the next gap and not already rising. Now and then it slips (no flaps
 * for a moment), more often as the score grows, which is the end of it sooner or later. Once in a while it pauses (Esc)
 * and carries on with Esc or a flap. A game still going after 20000 steps is left (N), and its run isn't kept.
 */
window.ReplayBot = (function () {
    const MAX_STEPS = 20000;

    // A flap, one way or another: a key, or a tap on the canvas (away from its pause button)
    function flap(t, page) {
        const way = t.random();
        if (way < 0.4) {
            t.key(' ');
        } else if (way < 0.6) {
            t.key('ArrowUp');
        } else if (way < 0.75) {
            t.key('w');
        } else {
            const canvas = page.document.getElementById('game');
            const box = canvas.getBoundingClientRect();
            canvas.dispatchEvent(new page.PointerEvent('pointerdown', {
                clientX: box.left + box.width / 2, clientY: box.top + box.height * 0.6, button: 0, bubbles: true, cancelable: true,
            }));
        }
    }

    return {
        games: 40,

        ready(page) {
            return page.eval('ready');
        },

        async play(page, t) {
            const rules = page.eval('GameRules');
            t.key('n'); // A new game: back to Get Ready
            flap(t, page); // The first flap starts a game (and its run)
            t.watch();

            let slip = 0; // Steps left without a flap
            for (let steps = 0; steps < MAX_STEPS && page.eval("screen === 'playing'"); steps++) {
                const game = page.eval('game');
                const chance = t.random();
                if (chance < 0.002) {
                    t.key('Escape'); // Pause
                    if (t.random() < 0.5) t.key('Escape'); // Carry on with Esc…
                    else flap(t, page); // …or a flap
                }
                if (slip > 0) {
                    slip--;
                } else if (chance < 0.001 + game.score * 0.0003) {
                    slip = 15 + Math.floor(t.random() * 20);
                } else {
                    const next = game.pipes.find((pipe) => pipe.x + rules.PIPE_WIDTH > rules.BIRD_X - 13);
                    if (game.y > (next.gapTop + next.gap / 2 + 18) * 100 && game.speed > -100) flap(t, page);
                }
                if (page.eval('paused')) t.key('Escape'); // Paused by the page (it was hidden): carry on
                page.gameStep();
                if (steps % 300 === 0) await t.pause();
            }
            if (page.eval("screen === 'playing'")) t.key('n'); // Gave up: a new game (the run is dropped)
        },
    };
})();
