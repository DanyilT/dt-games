/**
 * The cards: Windows 7's own, from its card sheet (img/HIGHLIGHTSHEET1.jpg: 14 × 10 cells of 73 × 98 px, each card
 * 71 × 96 inside its cell, its grey edge included). A card shows its part of the sheet, scaled to the card's size on
 * the table.
 * - The number cards (ace to 10) in two designs: the usual pips, and, for cards small on the screen (a phone), a big
 *   rank and one big suit sign.
 * - The court cards in four designs: classic, cartoon and nature (Change Appearance), and the big suit sign (small).
 * - Three backs (Change Appearance).
 * Cards.face(card, { small, faces }) and Cards.back(name) give the card's place on the sheet: { x, y } (px).
 * Cards.sheet is the sheet as an <img>, for the canvas (the win's bouncing cards).
 */
const Cards = (() => {
    const SHEET = 'img/HIGHLIGHTSHEET1.jpg';
    const SHEET_WIDTH = 1022;
    const SHEET_HEIGHT = 980;
    const WIDTH = 71;
    const HEIGHT = 96;
    const at = (col, row) => ({ x: col * 73 + 1, y: row * 98 + 1 }); // a cell's card

    // The court cards' designs: the sheet's first column of each (its two columns hold J♣ Q♣ / K♣ J♦ / Q♦ K♦ / J♠ Q♠ /
    // K♠ J♥ / Q♥ K♥, row by row)
    const FACES = Object.freeze({ classic: 0, cartoon: 4, nature: 6 });
    const BIG_COURTS = 2;
    const COURT_SUIT = [0, 1, 3, 2]; // the rules' suits (clubs, diamonds, hearts, spades) in the sheet's order

    // The backs: [name, what it's called, its column in the sheet's seventh row]
    const BACKS = [['blue', 'Blue', 6], ['red', 'Red', 0], ['crown', 'Crown', 4]];

    const suitOf = (card) => Math.floor(card / 13);
    const rankOf = (card) => card % 13 + 1;

    /**
     * Where a card's face is on the sheet
     * @param {number} card - 0 to 51 (js/rules.js)
     * @param {object} options - small: the big-sign design; faces: the court cards' design (FACES)
     * @return {{x: number, y: number}}
     */
    function face(card, { small = false, faces = 'classic' } = {}) {
        const suit = suitOf(card);
        const rank = rankOf(card);
        if (rank > 10) {
            const index = COURT_SUIT[suit] * 3 + rank - 11;
            const first = small ? BIG_COURTS : FACES[faces] ?? FACES.classic;
            return at(first + (index % 2), Math.floor(index / 2));
        }
        const i = rank - 1;
        if (suit === 3) return at((small ? 0 : 4) + (i % 4), 7 + Math.floor(i / 4)); // spades: four to a row
        return at(8 + suit * 2 + (i % 2), (small ? 5 : 0) + Math.floor(i / 2)); // the others: two to a row
    }

    // Where a back is on the sheet
    function back(name) {
        const found = BACKS.find(([id]) => id === name) ?? BACKS[0];
        return at(found[2], 6);
    }

    const sheet = new Image();
    sheet.src = SHEET;

    return Object.freeze({
        SHEET, SHEET_WIDTH, SHEET_HEIGHT, WIDTH, HEIGHT,
        FACES: Object.keys(FACES),
        BACKS: BACKS.map(([name, title]) => ({ name, title })),
        face,
        back,
        sheet,
    });
})();
