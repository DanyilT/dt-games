document.addEventListener('DOMContentLoaded', function() {
    const cells = [...document.querySelectorAll('.cell')];

    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat) return; // The browser's, and the Easter egg's

        // 1 to 9 play a square: 1 is the top left, 9 the bottom right (row by row)
        if (/^[1-9]$/.test(e.key)) {
            playCell(Number(e.key) - 1);
            return;
        }

        // The arrow keys move between the squares (from the top left, if none has the focus yet)
        const moves = { ArrowUp: -3, ArrowDown: 3, ArrowLeft: -1, ArrowRight: 1 };
        if (Object.hasOwn(moves, e.key)) {
            const at = cells.indexOf(document.activeElement);
            let next = at === -1 ? 0 : at + moves[e.key];
            if (at !== -1 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && Math.floor(next / 3) !== Math.floor(at / 3)) next = at;
            if (next >= 0 && next < 9) cells[next].focus();
            e.preventDefault();
            return;
        }

        // N: a new match; E, M, H: the level
        if (e.key === 'n') newMatch();
        const levels = { e: 'easy', m: 'medium', h: 'hard' };
        if (Object.hasOwn(levels, e.key)) changeLevel(levels[e.key]);
    });
});
