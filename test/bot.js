/**
 * Replay test: Minesweeper's bot (test/index.html, with test/check.js)
 *
 * Each game picks a level with the page's own keys (1, 2 or 3), and starts a new board with the face. Then it clicks
 * the board's own cells. Most games it plays safe, since it can see where the mines are: it opens cells that aren't
 * mines, flags mines (right-click), and opens around numbers whose mines are flagged (a chord), so it wins. The other
 * games it clicks at random, and soon loses. One game in six waits a second or two in the middle, so the time counts
 * too (it stands still while the tab is hidden, in the game and in its run alike).
 */
window.ReplayBot = (function () {
    const MAX_MOVES = 3000;

    // One of a list, at random
    function any(t, list) {
        return list[Math.floor(t.random() * list.length)];
    }

    // The board's cell element at row, col
    function cellAt(page, row, col) {
        return page.document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    }

    return {
        games: 60,

        ready(page) {
            return page.eval('Boolean(gameData && game)');
        },

        async play(page, t) {
            t.key(String(1 + Math.floor(t.random() * 3))); // A level (and a new board)
            t.click(page.document.getElementById('reset-button')); // The face: a new board
            const careful = t.random() < 0.7;
            const waitAt = t.random() < 1 / 6 ? 3 : -1; // The move before which it waits, if it does

            for (let moves = 0; moves < MAX_MOVES && !page.eval('gameOver'); moves++) {
                if (moves === waitAt) await new Promise((resolve) => setTimeout(resolve, 1000 + t.random() * 1500));
                const game = page.eval('game');
                const closed = [];
                const numbers = [];
                game.board.forEach((row, r) => row.forEach((cell, c) => {
                    if (!cell.isRevealed) closed.push({ row: r, col: c, cell });
                    else if (cell.neighbors > 0) numbers.push({ row: r, col: c, cell });
                }));
                const chance = t.random();
                if (game.firstClick) {
                    const { row, col } = any(t, closed);
                    t.click(cellAt(page, row, col)); // The first click is always safe: the mines go in after it
                } else if (chance < 0.08) {
                    // A flag: on a mine when careful, anywhere when not (or a flag taken off)
                    const choices = careful ? closed.filter(({ cell }) => cell.isMine !== cell.isFlagged) : closed;
                    const target = choices.length ? any(t, choices) : any(t, closed);
                    t.rightClick(cellAt(page, target.row, target.col));
                } else if (chance < 0.12 && numbers.length) {
                    const { row, col } = any(t, numbers); // A chord (only around flags it put on mines, when careful)
                    if (!careful || !page.eval('game').board.some((line) => line.some((cell) => cell.isFlagged && !cell.isMine))) {
                        t.click(cellAt(page, row, col));
                    }
                } else {
                    const choices = careful ? closed.filter(({ cell }) => !cell.isMine && !cell.isFlagged) : closed;
                    const target = choices.length ? any(t, choices) : any(t, closed);
                    t.click(cellAt(page, target.row, target.col));
                }
                t.watch(); // The run starts with the first click
                if (moves % 20 === 0) await t.pause();
            }
        },
    };
})();
