/**
 * The keyboard on the table: the arrow keys move between the piles (each pile is a button: screen readers say what's on
 * it), Space or Enter picks cards up, puts them down where they go, or deals from the stock, and Escape puts them back.
 * D deals from the stock and A sends every card that can go to the foundations, from anywhere (js/buttons-handler.js has
 * the menus' keys).
 */
document.addEventListener('DOMContentLoaded', function() {
    // The piles as the table lays them out: the stock, the waste, a gap and the foundations above the seven columns
    const TOP = ['S', 'W', null, 'a', 'b', 'c', 'd'];
    const BOTTOM = ['0', '1', '2', '3', '4', '5', '6'];
    const piles = Object.fromEntries([...document.querySelectorAll('#table .pile')].map((pile) => [pile.dataset.pile, pile]));
    let cursor = 'S';

    // Move the keyboard's place to a pile (it takes the focus, and only it is in the Tab order)
    function moveCursor(letter, focus = true) {
        cursor = letter;
        Object.entries(piles).forEach(([name, pile]) => {
            pile.tabIndex = name === letter ? 0 : -1;
        });
        if (focus) piles[letter].focus();
    }

    // The pile next to this one, in a direction
    function neighbour(letter, key) {
        const inTop = TOP.includes(letter);
        const row = inTop ? TOP : BOTTOM;
        const col = row.indexOf(letter);
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            const step = key === 'ArrowRight' ? 1 : -1;
            for (let i = col + step; i >= 0 && i < row.length; i += step) {
                if (row[i]) return row[i];
            }
            return letter;
        }
        if (key === 'ArrowDown') return inTop ? BOTTOM[col] : letter;
        return inTop ? letter : TOP[col] ?? 'W'; // up: the pile above, or the waste where there's none
    }

    // Space or Enter on a pile: put down what's picked up (or put it back, on its own pile), deal from the stock, or pick
    // the pile's cards up (a column: its face-up cards; as many as fit go where they're put)
    function activate(letter) {
        if (!game || game.over || GameHub.replaying) return;
        if (picked) {
            if (picked.from === letter) {
                unpick();
                announce('Put back.');
            } else if (!moveOnto(picked.from, letter, picked.count)) {
                announce("They can't go there.");
            }
            return;
        }
        if (letter === 'S') {
            dealFromStock();
            return;
        }
        const count = pickableCount(letter);
        if (!count) return;
        const cards = pileCards(letter);
        pick(letter, /[0-6]/.test(letter) ? null : 1);
        const first = GameRules.cardName(cards[cards.length - count]);
        announce(`Picked up ${count > 1 ? `${first} and ${count - 1} more` : first}. Move to where they go, and press Enter.`);
    }

    Object.entries(piles).forEach(([letter, pile]) => {
        pile.addEventListener('focus', () => {
            cursor = letter;
            pile.classList.toggle('cursor', pile.matches(':focus-visible')); // the keyboard's, not a click's
        });
        pile.addEventListener('blur', () => pile.classList.remove('cursor'));
        pile.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                moveCursor(neighbour(letter, e.key));
            } else if (e.key === 'Enter' || e.key === ' ') {
                if (!e.repeat) activate(letter);
            } else if (e.key === 'Escape' && picked) {
                unpick();
                announce('Put back.');
            } else {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
        });
    });

    // From anywhere on the page: D deals from the stock, A sends every card that can go; an arrow key with nothing in
    // particular focused goes to the table
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
        if ([...document.querySelectorAll('.modal-overlay')].some((modal) => modal.open)) return;
        const key = e.key.toLowerCase();
        if (key === 'd') {
            dealFromStock();
        } else if (key === 'a') {
            autoPlay();
        } else if (e.key === 'Escape' && picked) {
            unpick();
        } else if (e.key.startsWith('Arrow') && (document.activeElement === document.body || !document.activeElement)) {
            moveCursor(cursor);
        } else {
            return;
        }
        e.preventDefault();
    });
});
