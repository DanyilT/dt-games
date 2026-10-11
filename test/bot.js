/**
 * Replay test: Tic-Tac-Toe's bot (test/index.html, with test/check.js)
 *
 * Each game is a match: the bot picks a level with the page's own keys (E, M or H) and starts a new match (N). Then it
 * plays every move through the board's own squares (a click, or the key 1 to 9), at random in some matches, perfectly
 * in others (by js/rules.js bestMoves()), and a mix of both in the rest, so matches are won, drawn and lost. When the
 * page is still showing the last move (the bot "thinking", a round's end), a click shows it all at once first, as a
 * player's would; the board shown must then be the match's.
 */
window.ReplayBot = (function () {
    // One of a list, at random
    function any(t, list) {
        return list[Math.floor(t.random() * list.length)];
    }

    return {
        games: 30,

        ready(page) {
            return page.eval('ready');
        },

        async play(page, t) {
            const rules = page.eval('GameRules');
            const cells = [...page.document.querySelectorAll('.cell')];
            t.key(any(t, ['e', 'm', 'h'])); // A level
            t.key('n'); // A new match
            const style = any(t, ['random', 'perfect', 'mixed']);

            for (let moves = 0; moves < 30 && !page.eval('match?.over'); moves++) {
                if (page.eval('queue.length > 0 || timer !== null')) t.click(cells[0]); // Show the last move at once
                if (page.eval('match && shown.board.join() !== match.board.join()')) {
                    throw new Error('the page shows a different board from the match\'s'); // Shown at once, it must be the same
                }
                const match = page.eval('match');
                const board = match ? match.board : Array(9).fill(0);
                const perfect = style === 'perfect' || (style === 'mixed' && t.random() < 0.5);
                const cell = any(t, perfect ? rules.bestMoves(board.slice(), match ? match.player : rules.X) : rules.freeCells(board));
                if (t.random() < 0.7) t.click(cells[cell]);
                else t.key(String(cell + 1));
                t.watch(); // The run starts with the first move
                await t.pause();
            }
        },
    };
})();
