/**
 * Replay test: Tetris's bot (test/index.html, with test/check.js)
 *
 * Each game starts with Enter (or R, if one is still going). The bot steps the game itself (the page's own timer is
 * stopped), so a game takes no time, and plays through the page's own keys. For each piece it picks a turn and a column:
 * the one that leaves the stack lowest and flattest, with the fewest holes, and clears lines; or one at random, more and
 * more often after 30 lines, so a game reaches level 4 or so and then ends. It moves there (arrows and W A S D), then
 * drops the piece hard (Space) or lets it fall, with a slip now and then. Once in a while it pauses (P) and resumes with
 * Enter. A game still going after 100000 steps is left, and its run isn't kept.
 */
window.ReplayBot = (function () {
    const MAX_STEPS = 100000;

    // A move's key: its arrow or its letter (Space has no letter)
    function press(t, move) {
        const keys = { L: ['ArrowLeft', 'a'], R: ['ArrowRight', 'd'], U: ['ArrowUp', 'w'], D: ['ArrowDown', 's'], H: [' ', ' '] }[move];
        t.key(t.random() < 0.5 ? keys[0] : keys[1]);
    }

    // A shape turned a quarter clockwise, as js/rules.js turns it
    function rotate(shape) {
        const size = shape.length;
        const turned = Array.from({ length: size }, () => Array(size).fill(0));
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) turned[x][size - 1 - y] = shape[y][x];
        }
        return turned;
    }

    // How good the board is with the shape dropped at column x: lines cleared count for it; height, holes and bumps
    // against it (null if it doesn't fit there)
    function placement(rules, game, shape, x) {
        const probe = { board: game.board };
        if (rules.collision(probe, x, 0, shape)) return null;
        let y = 0;
        while (!rules.collision(probe, x, y + 1, shape)) y++;
        const board = game.board.map((row) => row.slice());
        shape.forEach((row, r) => row.forEach((cell, c) => {
            if (cell && y + r >= 0) board[y + r][x + c] = 1;
        }));
        const kept = board.filter((row) => row.some((cell) => !cell));
        const lines = board.length - kept.length;
        const heights = [];
        let holes = 0;
        for (let c = 0; c < rules.COLS; c++) {
            const top = kept.findIndex((row) => row[c]);
            heights.push(top === -1 ? 0 : kept.length - top);
            if (top !== -1) holes += kept.slice(top).filter((row) => !row[c]).length;
        }
        const height = heights.reduce((sum, h) => sum + h, 0);
        const bumps = heights.slice(1).reduce((sum, h, c) => sum + Math.abs(h - heights[c]), 0);
        return lines * 0.76 - height * 0.51 - holes * 0.36 - bumps * 0.18;
    }

    // The plan for a new piece: how many turns, and which column
    function planFor(t, page, game) {
        const plan = { piece: game.current, turns: Math.floor(t.random() * 4), column: Math.floor(t.random() * 10), hard: t.random() < 0.7 };
        if (t.random() < (game.lines < 30 ? 0.03 : Math.min(0.9, (game.lines - 30) / 30))) return plan; // At random
        const rules = page.eval('GameRules');
        let shape = game.current.shape;
        let best = -Infinity;
        for (let turns = 0; turns < 4; turns++) {
            for (let x = -2; x < rules.COLS; x++) {
                const value = placement(rules, game, shape, x);
                if (value !== null && value > best) {
                    best = value;
                    plan.turns = turns;
                    plan.column = x;
                }
            }
            shape = rotate(shape);
        }
        return plan;
    }

    // The page's own timer stopped: the bot makes the steps
    function stopTimer(page) {
        page.eval('clearInterval(gameInterval)');
    }

    return {
        games: 30,

        ready(page) {
            return page.eval('loaded');
        },

        async play(page, t) {
            t.key(page.eval('gameActive') ? 'r' : 'Enter'); // A new game (and its run)
            t.watch();
            stopTimer(page);

            let plan = null; // For the piece falling now: { piece, turns, column, hard }
            for (let steps = 0; steps < MAX_STEPS && page.eval('gameActive'); steps++) {
                const game = page.eval('game');
                if (!plan || plan.piece !== game.current) plan = planFor(t, page, game);

                const chance = t.random();
                if (chance < 0.002) {
                    t.key('p'); // Pause (the Pause button's key)
                    t.key('Enter'); // Resume
                    stopTimer(page);
                } else if (chance < 0.01) {
                    press(t, 'LRUD'[Math.floor(t.random() * 4)]); // A slip
                } else if (chance < 0.35) {
                    // A move towards the plan: turn, then across, then down
                    if (plan.turns > 0) {
                        press(t, 'U');
                        plan.turns--;
                    } else if (game.current.x !== plan.column) {
                        const x = game.current.x;
                        press(t, x < plan.column ? 'R' : 'L');
                        if (game.current.x === x) plan.column = x; // Blocked: this column it is
                    } else if (plan.hard) {
                        press(t, 'H');
                    } else if (t.random() < 0.3) {
                        press(t, 'D');
                    }
                }
                if (page.eval('gamePause')) {
                    t.key('Enter'); // Paused by the page (it was hidden): carry on
                    stopTimer(page);
                }
                if (page.eval('gameActive')) page.gameLoop();
                if (steps % 500 === 0) await t.pause();
            }
        },
    };
})();
