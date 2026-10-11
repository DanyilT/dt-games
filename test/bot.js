/**
 * Replay test: Sudoku's bot (test/index.html, with test/check.js)
 *
 * Each game picks a level in the page's own list (a new puzzle), or presses New Game. Then it fills the puzzle in
 * through the cells: it types a digit on a cell (or picks the cell and taps the number pad), the right one most of the
 * time, since it can see the solution, a wrong one now and then (and puts it right later), and clears a cell once in a
 * while (Delete, Backspace or the pad's ✕). The game ends when the puzzle is solved. One game in six waits a second or
 * two in the middle, so the time counts too (it stands still while the tab is hidden, in the game and in its run alike).
 */
window.ReplayBot = (function () {
    const LEVELS = ['beginner', 'easy', 'medium', 'hard', 'expert'];
    const MAX_MOVES = 2000;

    // One of a list, at random
    function any(t, list) {
        return list[Math.floor(t.random() * list.length)];
    }

    // A digit (or 0, to clear it) put in a cell: typed on the cell, or picked on the number pad
    function enter(t, page, row, col, digit) {
        const cell = page.document.getElementById(`cell-${row * 9 + col}`);
        if (t.random() < 0.3) {
            t.click(cell);
            cell.focus(); // The pad's numbers go to the focused cell, as a real tap leaves it
            page.currentSelectedCell = cell; // (Focus can stay put in a tab that's not in front)
            t.click(page.document.querySelector(`.num-btn[data-number="${digit}"]`));
        } else {
            t.key(digit === 0 ? (t.random() < 0.5 ? 'Delete' : 'Backspace') : String(digit), cell);
        }
    }

    return {
        games: 20,

        ready(page) {
            return page.eval('gameData !== null && solution[0][0] !== 0');
        },

        async play(page, t) {
            const select = page.document.getElementById('difficulty');
            const level = any(t, LEVELS);
            if (select.value !== level) {
                select.value = level;
                select.dispatchEvent(new page.Event('change', { bubbles: true })); // A new puzzle at that level
            } else {
                t.click(page.document.getElementById('newGameBtn'));
            }
            t.watch();
            const waitAt = t.random() < 1 / 6 ? 10 : -1; // The move before which it waits, if it does

            for (let moves = 0; moves < MAX_MOVES && !page.eval('gameWon'); moves++) {
                if (moves === waitAt) await new Promise((resolve) => setTimeout(resolve, 1000 + t.random() * 1500));
                const board = page.eval('board');
                const solution = page.eval('solution');
                const clues = page.eval('initialBoard');
                const empty = [];
                const wrong = [];
                const filled = [];
                for (let row = 0; row < 9; row++) {
                    for (let col = 0; col < 9; col++) {
                        if (clues[row][col]) continue;
                        if (board[row][col] === 0) empty.push([row, col]);
                        else if (board[row][col] !== solution[row][col]) wrong.push([row, col]);
                        else filled.push([row, col]);
                    }
                }
                const chance = t.random();
                if (chance < 0.05 && filled.length) {
                    const [row, col] = any(t, filled);
                    enter(t, page, row, col, 0); // Cleared
                } else if (chance < 0.15 && empty.length) {
                    const [row, col] = any(t, empty);
                    enter(t, page, row, col, 1 + ((solution[row][col] + Math.floor(t.random() * 8)) % 9)); // A wrong digit
                } else if (wrong.length && (chance < 0.4 || !empty.length)) {
                    const [row, col] = any(t, wrong);
                    enter(t, page, row, col, solution[row][col]); // Put right
                } else if (empty.length) {
                    const [row, col] = any(t, empty);
                    enter(t, page, row, col, solution[row][col]);
                }
                if (moves % 20 === 0) await t.pause();
            }
        },
    };
})();
