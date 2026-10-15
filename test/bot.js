/**
 * Replay test: Solitaire's bot (test/index.html, with test/check.js)
 *
 * Each game: the bot picks a level in the Options dialog (Draw one or three; Standard, timed or not, Vegas or no
 * scoring; sometimes without animations) and deals a new game (N). It then plays greedily: a card onto a foundation, a
 * column's cards onto another column when that turns a card over, the waste's card onto a column, a king into an empty
 * column, or a deal from the stock; and now and then an undo. Each move goes through one of the page's own controls at
 * random: the keyboard (Enter on a pile, then on where it goes), a click on a card then on where it goes, a drag, a
 * double-click (to a foundation), D or a click on the stock, A or a right-click (everything to the foundations), U or
 * Ctrl+Z (undo). A game the bot can't win is given up with a new deal (N), which ends its run as lost. A won game's
 * bouncing cards are stopped with a click, and the Congratulations dialog closed.
 */
window.ReplayBot = (function () {
    const MAX_INPUTS = 600;

    function any(t, list) {
        return list[Math.floor(t.random() * list.length)];
    }

    // A point on the page over a pile's card (index), or over the pile itself (index −1)
    function pointOver(page, letter, index) {
        const table = page.document.getElementById('table');
        const box = table.getBoundingClientRect();
        const geometry = page.eval('geometry');
        const places = page.eval('pilePlaces')(letter);
        const place = index >= 0 ? places[index] : page.eval('pilePlace')(letter);
        return { clientX: box.left + table.clientLeft + place.x + geometry.w / 2, clientY: box.top + table.clientTop + place.y + 3 };
    }

    function pointer(page, type, point, button = 0) {
        page.document.getElementById('table').dispatchEvent(new page.PointerEvent(type, {
            ...point, pointerId: 7, button, bubbles: true, cancelable: true, pointerType: 'mouse',
        }));
    }

    // A click on the table (down and up, without moving)
    function tap(page, point) {
        pointer(page, 'pointerdown', point);
        pointer(page, 'pointerup', point);
    }

    // The pile's element (a button for the keyboard)
    function pileElement(page, letter) {
        return page.document.querySelector(`#table .pile[data-pile="${letter}"]`);
    }

    // Move count cards from a pile to another, through one of the page's controls
    function move(page, t, from, to, count) {
        const cards = page.eval('pileCards')(from);
        const index = cards.length - count;
        const way = t.random();
        if (way < 0.3) {
            t.key('Enter', pileElement(page, from));
            t.key('Enter', pileElement(page, to));
        } else if (way < 0.6) {
            tap(page, pointOver(page, from, index));
            tap(page, pointOver(page, to, page.eval('pileCards')(to).length - 1));
        } else {
            const start = pointOver(page, from, index);
            const target = pointOver(page, to, page.eval('pileCards')(to).length - 1);
            pointer(page, 'pointerdown', start);
            pointer(page, 'pointermove', { clientX: (start.clientX + target.clientX) / 2, clientY: (start.clientY + target.clientY) / 2 });
            pointer(page, 'pointermove', target);
            pointer(page, 'pointerup', target);
        }
    }

    // The bot's next move: { kind: 'foundation' | 'move' | 'deal' | 'undo' | 'auto', … }, or null (give up)
    function nextMove(page, t, stuck) {
        const rules = page.eval('GameRules');
        const game = page.eval('game');
        const legal = (code) => rules.isLegal(game, code);
        if (t.random() < 0.02 && legal('U')) return { kind: 'undo' };
        const home = rules.nextToFoundation(game);
        if (home) return t.random() < 0.15 ? { kind: 'auto' } : { kind: 'foundation', ...home };
        for (let from = 0; from < 7; from++) {
            const { cards, down } = game.tableau[from];
            const up = cards.length - down;
            if (!up || !down) continue;
            for (let to = 0; to < 7; to++) {
                const code = `${from}${to}${up > 1 ? up : ''}`;
                if (to !== from && legal(code)) return { kind: 'move', from: String(from), to: String(to), count: up };
            }
        }
        for (let to = 0; to < 7; to++) {
            if (legal(`W${to}`)) return { kind: 'move', from: 'W', to: String(to), count: 1 };
        }
        if (stuck < 3 * 24 && legal('D')) return { kind: 'deal' };
        return null;
    }

    // Close what a game that ended left: the bouncing cards (a click), and the Congratulations or Game Lost dialog
    function clearWin(page, t) {
        const canvas = page.document.getElementById('cascade');
        if (canvas.classList.contains('on')) canvas.dispatchEvent(new page.PointerEvent('pointerdown', { bubbles: true }));
        for (const id of ['won-dialog', 'lost-dialog']) {
            const dialog = page.document.getElementById(id);
            if (dialog.open) t.click(dialog.querySelector('button[value="close"]'));
        }
    }

    // Pick a level, and the animations, in the Options dialog
    function pickOptions(page, t) {
        t.key('o');
        const dialog = page.document.getElementById('options-dialog');
        if (!dialog.open) throw new Error('the Options dialog didn\'t open');
        const form = dialog.querySelector('form');
        form.elements.draw.value = any(t, ['1', '3']);
        form.elements.scoring.value = any(t, ['standard', 'standard', 'vegas', 'none']);
        form.elements.timed.checked = t.random() < 0.7;
        form.elements.animations.checked = t.random() < 0.5;
        form.elements.sounds.checked = false;
        form.elements.cumulative.checked = t.random() < 0.5;
        t.click(dialog.querySelector('button[value="ok"]'));
    }

    return {
        games: 40,

        ready(page) {
            return page.eval('ready && game !== null');
        },

        async play(page, t) {
            clearWin(page, t);
            pickOptions(page, t);
            t.key(any(t, ['n', 'F2'])); // A new game (the one before, if started, is given up)
            t.watch();
            let stuck = 0;
            for (let inputs = 0; inputs < MAX_INPUTS && !page.eval('game.over'); inputs++) {
                const step = nextMove(page, t, stuck);
                if (!step) break;
                stuck = step.kind === 'deal' ? stuck + 1 : 0;
                if (step.kind === 'undo') {
                    if (t.random() < 0.5) t.key('u');
                    else t.key('z', page.document, { ctrlKey: true });
                } else if (step.kind === 'auto') {
                    if (t.random() < 0.5) t.key('a');
                    else page.document.getElementById('table').dispatchEvent(new page.MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
                } else if (step.kind === 'deal') {
                    if (t.random() < 0.5) t.key('d');
                    else tap(page, pointOver(page, 'S', Math.max(-1, page.eval('game.stock.length') - 1)));
                } else if (step.kind === 'foundation' && step.from !== 'W' && t.random() < 0.3) {
                    // A double-click on the column's top card
                    const point = pointOver(page, step.from, page.eval('pileCards')(step.from).length - 1);
                    tap(page, point);
                    tap(page, point);
                } else {
                    move(page, t, step.from, step.to, step.count);
                }
                if (inputs % 40 === 0) await t.pause();
            }
            if (!page.eval('game.over')) t.key('n'); // The bot's stuck (the page didn't see it yet): give up with a new game
            await t.pause();
        },
    };
})();
