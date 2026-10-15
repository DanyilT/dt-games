/**
 * Solitaire
 *
 * Klondike, as Windows 7 played it: the felt table, the stock and the waste, the four foundations and the seven columns,
 * Draw one or Draw three, Standard, Vegas or no scoring, hints and statistics, and the cards bouncing off the
 * foundations when you win. Every card is drawn in code (js/cards.js), and every sound made in the browser.
 * The rules (the deal, the moves, the score, the win) are in js/rules.js: this file shows the table, takes the player's
 * drags, clicks and taps, and plays the game through GameRules. js/extend-controls.js adds the keyboard, and
 * js/buttons-handler.js the menus and dialogs.
 *
 * Features:
 * - Drag a card (and the cards on it), or click it and then where it goes; double-click sends it to its foundation,
 *   and a right-click on the table sends every card that can go
 * - Undo, a hint, statistics for each kind of game, six backs (one twinkles) and four backgrounds
 * - Options: Draw one or three; no, Standard or Vegas scoring (Cumulative: the dollars carry on); a timed game; the
 *   animations (cards glide into place, the deal flies out from the stock); sounds
 * - The game under way is saved after each move, and carries on next time
 * - GameHub's panel and replays (js/gamehub.js): each deal is a run, shuffled from the run's seed, and every move
 *   recorded with its time, so GameHub can play it again
 *
 * Easter Egg:
 * - `qwerty.js`
 */

// The table and its parts
const table = document.getElementById('table');
const cardsLayer = document.getElementById('cards');
const cascadeCanvas = document.getElementById('cascade');
const container = document.querySelector('.game-container');
const scorePanel = document.getElementById('score-panel');
const timePanel = document.getElementById('time-panel');
const announcer = document.getElementById('announce');
const pileElements = Object.fromEntries([...table.querySelectorAll('.pile')].map((element) => [element.dataset.pile, element]));
const FOUNDATION_NAMES = { a: 'foundation 1', b: 'foundation 2', c: 'foundation 3', d: 'foundation 4' };
const PILES = ['S', 'W', 'a', 'b', 'c', 'd', '0', '1', '2', '3', '4', '5', '6'];

// Game state
let gameData = null; // What's saved (js/storage.js), once it has loaded
let ready = false; // What's saved has loaded and GameHub has handed over its tickets: a game can be dealt
let game = null; // The game under way (js/rules.js), or the one that just ended
let run = null; // The game's run, recorded so GameHub can play it again (js/gamehub.js), from the deal
let picked = null; // Cards picked up by a click or the keyboard: { from (a pile), count (null: as many as fit) }
let drag = null; // A drag under way
let geometry = null; // Where everything goes on the table (layout())
let cascading = null; // The win's bouncing cards, while they bounce
let lastWin = null; // What the last win gave, for the Congratulations dialog: { score, time, mode, best }
let lastLoss = null; // What the last game lost gave, for the Game Lost dialog: { score, time, mode }
let shownSeconds = -1;

// The cards on the table: one picture each, placed by render()
const cardElements = Array.from({ length: 52 }, (_, card) => {
    const element = document.createElement('div');
    element.className = 'card';
    element.dataset.card = card;
    cardsLayer.append(element);
    return element;
});

// --- Loading, dealing, and the end of a game ---

// Deal the first game (or carry on the one saved), once what's saved has loaded and GameHub has handed over its
// tickets (so the first deal gets one too); or GameHub opened the game to play a replay
Promise.all([loadGameData(), GameHub.ready()]).then(([data]) => {
    gameData = data;
    ready = true;
    applyLook();
    if (GameHub.replaying) {
        GameHub.onReplay({ begin: beginReplay, input: replayInput });
    } else if (!resumeSavedGame()) {
        newDeal();
    }
    document.dispatchEvent(new Event('solitaire:loaded')); // The dialogs show what's saved
    GameHub.playable(); // The cards are on the table: GameHub stops showing the game as loading
});

// The level (a run's mode) the Options say, for the next game: 'standard-1', 'standard-3-untimed', 'vegas-3', …
function nextMode() {
    const untimed = gameData.scoring === 'standard' && !gameData.timed ? '-untimed' : '';
    return `${gameData.scoring}-${gameData.draw}${untimed}`;
}

// A new game: the game under way is given up first (a game nobody has played yet isn't kept)
function newDeal() {
    if (!ready || GameHub.replaying) return;
    stopCascade(false);
    giveUp();
    run = GameHub.startRun({ mode: nextMode() });
    game = GameRules.newGame(() => run.random(), nextMode());
    picked = null;
    showTip('');
    announce(`New game: ${GameRules.MODES[game.mode].name}.`);
    afterChange();
    animateDeal();
    sound('shuffle');
}

// Give up the game under way: it's over, as lost (or forgotten, if nothing was played)
function giveUp() {
    if (!game || game.over) return;
    if (game.startedAt === null) {
        run.discard();
        return;
    }
    playInput('X');
}

// A game saved half-way (saveProgress()) carries on, with its run and its time: true if there was one
function resumeSavedGame() {
    const saved = gameData.game;
    if (!saved) return false;
    const resumedRun = GameHub.resumeRun(saved.run);
    const resumed = GameRules.loadState(saved.state);
    if (!resumed || resumedRun.mode !== resumed.mode || !resumedRun.save()) {
        // Not a game this version can carry on: drop it
        resumedRun.discard();
        gameData.game = null;
        saveGameData(gameData);
        return false;
    }
    run = resumedRun;
    game = resumed;
    afterChange();
    return true;
}

// The game under way goes with what's saved (after each move, and when the page is hidden or closed, with the time so
// far), so it carries on next time; a game that's over is taken out
function saveProgress() {
    if (!gameData || !game || GameHub.replaying) return;
    gameData.game = game.over ? null : { state: GameRules.saveState(game), run: run.save() };
    saveGameData(gameData);
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveProgress();
});
window.addEventListener('pagehide', saveProgress);

// --- Playing ---

// The time by the run's clock (ms): the time of an input just recorded, or a replay's input being played
function clock() {
    return run ? run.time : 0;
}

/**
 * Play an input (see js/rules.js): it's recorded with the run, at the time the run gives it, then played
 * @param {string} code
 * @return {boolean} - whether it could be played
 */
function playInput(code) {
    if (!game || game.over || GameHub.replaying || cascading || !GameRules.isLegal(game, code)) return false;
    run.input(code);
    const at = run.save()?.last ?? clock(); // the very time the run recorded
    GameRules.play(game, code, at);
    afterInput(code);
    return true;
}

// A replay's input, at its time
function replayInput(code) {
    if (!game || game.over) return;
    if (GameRules.play(game, code, clock())) afterInput(code);
}

// A replay: the run's deal, at its level
function beginReplay(replayRun) {
    stopCascade(false);
    run = replayRun;
    const mode = Object.hasOwn(GameRules.MODES, replayRun.mode) ? replayRun.mode : 'standard-1';
    game = GameRules.newGame(() => run.random(), mode);
    picked = null;
    afterChange();
}

// After an input: the sound, what happened (for screen readers), the table, and the end of the game if it ended
function afterInput(code) {
    picked = null;
    showTip('');
    const input = GameRules.parse(code);
    sound(input.type === 'deal' ? 'flip' : input.type === 'give-up' ? null : 'place');
    announce(describe(input));
    if (game.over) endGame();
    afterChange();
    if (game.won) win();
    else if (!game.over && !GameHub.replaying && GameRules.isStuck(game)) declareLost();
}

// No useful move is left (js/rules.js isStuck()): the game is given up, as lost, and the Game Lost dialog says so
function declareLost() {
    playInput('X');
    lastLoss = { score: GameRules.score(game, game.endedAt), time: GameRules.seconds(game, game.endedAt), mode: game.mode };
    sound('lost');
    announce('There are no more moves. The game is lost.');
    showTip('There are no more moves.');
    document.dispatchEvent(new Event('solitaire:lost')); // js/buttons-handler.js shows it
}

// Anything changed: the table, the status bar, GameHub's panel, the menus, and what's saved
function afterChange() {
    render();
    showScore();
    showStatus();
    document.dispatchEvent(new Event('solitaire:change')); // Undo greys out or not (js/buttons-handler.js)
    saveProgress();
}

// The game ended (won, or given up): its run, and the statistics
function endGame() {
    const { scoring } = GameRules.MODES[game.mode];
    const stats = gameData.stats[game.mode];
    const score = GameRules.score(game, game.endedAt);
    const time = GameRules.seconds(game, game.endedAt);
    let best = false;
    if (scoring === 'vegas') best = stats.best === null || score > stats.best;
    else if (scoring === 'standard') best = game.won && (stats.best === null || score > stats.best);
    else best = game.won && (stats.bestTime === null || time < stats.bestTime);
    run.finish({ outcome: game.won ? 'won' : 'lost', result: GameRules.result(game), best });
    if (GameHub.replaying) return;

    stats.played++;
    if (game.won) {
        stats.won++;
        stats.streak = stats.streak > 0 ? stats.streak + 1 : 1;
        stats.longestStreak = Math.max(stats.longestStreak, stats.streak);
        if (stats.bestTime === null || time < stats.bestTime) stats.bestTime = time;
        lastWin = { score, time, mode: game.mode, best };
    } else {
        stats.streak = stats.streak < 0 ? stats.streak - 1 : -1;
    }
    if (best && scoring !== 'none') stats.best = score;
    if (scoring === 'vegas' && gameData.cumulative) gameData.vegasTotal += game.points;
}

// What an input did, for screen readers
function describe(input) {
    const top = (pile) => (pile.length ? GameRules.cardName(pile[pile.length - 1]) : 'nothing');
    if (game.won) return 'All 52 cards are on the foundations. You won!';
    if (input.type === 'give-up') return 'Game given up.';
    if (input.type === 'undo') return 'Undone.';
    if (input.type === 'deal') return game.waste.length ? `Dealt: ${top(game.waste)} on the waste.` : 'The waste is turned over into the stock.';
    if (input.type === 'auto') return 'Every card that could go is on the foundations.';
    const where = FOUNDATION_NAMES[input.to] ?? `column ${Number(input.to) + 1}`;
    const pile = FOUNDATION_NAMES[input.to] ? game.foundations['abcd'.indexOf(input.to)] : game.tableau[Number(input.to)].cards;
    const moved = GameRules.cardName(pile[pile.length - input.count]);
    return `${input.count > 1 ? `${moved} and ${input.count - 1} more` : moved} onto ${where}.`;
}

function announce(text) {
    announcer.textContent = text;
}

// A short message at the left of the status bar ('' takes it away)
function showTip(text) {
    const tip = document.getElementById('tip-panel');
    if (tip) tip.textContent = text;
}

// The move code from a pile to another (with how many cards, when more than one)
function moveCode(from, to, count) {
    return `${from}${to}${count > 1 ? count : ''}`;
}

// How many of a pile's cards to move onto another: the count picked, or, when it's open (the keyboard picks up a whole
// column), the most that fit; null if none do
function countFor(from, to, count) {
    if (count) return GameRules.isLegal(game, moveCode(from, to, count)) ? count : null;
    for (let n = pickableCount(from); n >= 1; n--) {
        if (GameRules.isLegal(game, moveCode(from, to, n))) return n;
    }
    return null;
}

// Move picked-up cards onto a pile: true if they went
function moveOnto(from, to, count) {
    const n = countFor(from, to, count);
    return n !== null && playInput(moveCode(from, to, n));
}

// Send a pile's top card to its foundation: true if it went
function toFoundation(from) {
    const pile = pileCards(from);
    if (!pile.length) return false;
    const to = GameRules.foundationFor(game, pile[pile.length - 1]);
    return to !== null && playInput(moveCode(from, to, 1));
}

// The stock: deal from it, or turn the waste over
function dealFromStock() {
    return playInput('D');
}

// Every card that can go onto the foundations goes
function autoPlay() {
    return playInput('A');
}

function undo() {
    return playInput('U');
}

// A pile's cards (S the stock, W the waste, a to d the foundations, 0 to 6 the columns)
function pileCards(letter) {
    if (letter === 'S') return game.stock;
    if (letter === 'W') return game.waste;
    if ('abcd'.includes(letter)) return game.foundations['abcd'.indexOf(letter)];
    return game.tableau[Number(letter)].cards;
}

// How many cards a pile has that can be picked up at once (a column: its face-up ones)
function pickableCount(letter) {
    if (letter === 'S') return 0;
    const cards = pileCards(letter);
    if (/[0-6]/.test(letter)) return cards.length - game.tableau[Number(letter)].down;
    return cards.length ? 1 : 0;
}

// How many cards can be picked up from a pile, from its index-th card (null if that card can't be)
function pickableFrom(letter, index) {
    const cards = pileCards(letter);
    if (letter === 'S' || index < 0 || index >= cards.length) return null;
    if (/[0-6]/.test(letter)) return index >= game.tableau[Number(letter)].down ? cards.length - index : null;
    return index === cards.length - 1 ? 1 : null; // the waste's and a foundation's top card only
}

// Pick up cards (or put them back: the same again)
function pick(from, count) {
    picked = picked && picked.from === from && picked.count === count ? null : { from, count };
    render();
}

function unpick() {
    if (!picked) return;
    picked = null;
    render();
}

// --- A hint (Game › Hint): a move worth making, shown for a moment ---

// The move a hint shows: { from, to, count } (to: null for the stock), or null when there's none
function findHint() {
    const toFoundation = GameRules.nextToFoundation(game);
    if (toFoundation) return toFoundation;
    // A column's face-up cards onto another column, if that turns a card over
    for (let col = 0; col < 7; col++) {
        const { down } = game.tableau[col];
        const up = pickableCount(String(col));
        if (!up || !down) continue;
        for (let to = 0; to < 7; to++) {
            if (to !== col && GameRules.isLegal(game, moveCode(String(col), String(to), up))) return { from: String(col), to: String(to), count: up };
        }
    }
    // The waste's card onto a column
    for (let to = 0; to < 7; to++) {
        if (GameRules.isLegal(game, moveCode('W', String(to), 1))) return { from: 'W', to: String(to), count: 1 };
    }
    // A king's run into an empty column, from a column it doesn't already start
    for (let col = 0; col < 7; col++) {
        const { cards, down } = game.tableau[col];
        if (down === 0 || !cards.length) continue;
        const up = cards.length - down;
        for (let to = 0; to < 7; to++) {
            if (to !== col && GameRules.isLegal(game, moveCode(String(col), String(to), up))) return { from: String(col), to: String(to), count: up };
        }
    }
    return GameRules.canDeal(game) ? { from: 'S', to: null, count: 0 } : null;
}

// Show a hint: the cards to move and where they go glow for a moment (the stock, when dealing is all there is)
function hint() {
    if (!game || game.over || cascading || GameHub.replaying) return;
    unpick();
    const found = findHint();
    if (!found) {
        // (With no useful move at all, the game would already be lost: declareLost())
        showTip('No hint: try moving part of a column.');
        announce('No hint: try moving part of a column.');
        return;
    }
    const glow = (element) => {
        element.classList.remove('hint');
        void element.offsetWidth; // the glow starts again
        element.classList.add('hint');
    };
    if (found.from === 'S') {
        glow(pileElements.S);
        announce('Deal from the stock.');
        return;
    }
    const cards = pileCards(found.from);
    cards.slice(cards.length - found.count).forEach((card) => glow(cardElements[card]));
    glow(pileElements[found.to]);
    const where = FOUNDATION_NAMES[found.to] ?? `column ${Number(found.to) + 1}`;
    announce(`Hint: ${GameRules.cardName(cards[cards.length - found.count])} onto ${where}.`);
}

// --- The table: where everything goes, and the cards on it ---

// Work out the cards' size and the piles' places: as big as the table's width allows (up to the card sheet's own 71 px
// wide, so they stay sharp), and small enough for the whole window to fit the page's height
function layout() {
    const width = table.clientWidth;
    if (!width) return;
    const ratio = Cards.HEIGHT / Cards.WIDTH;
    const chrome = container.getBoundingClientRect().height - table.getBoundingClientRect().height; // the rest of the window
    const room = window.innerHeight - chrome - 24;
    // A face-up card's step in a column (of its height): enough for its corner to show (small cards' big rank needs more)
    const upFactor = (w) => (w < 52 ? 0.3 : 0.2);
    // The table's height for a card width: the top row, and a column of 6 face-down cards and 13 face-up ones
    const heightFor = (w) => Math.round(w * ratio) * (2 + 0.045 * 6 + upFactor(w) * 12) + w * 0.5;
    let w = Math.min(Cards.WIDTH, Math.floor(width / 8.1));
    while (w > 34 && heightFor(w) > room) w--;
    const h = Math.round(w * ratio);
    const gap = Math.max(3, Math.min(Math.round(w * 0.2), Math.floor((width - 7 * w) / 8)));
    const left = Math.floor((width - 7 * w - 6 * gap) / 2);
    const top = Math.max(gap, Math.round(w * 0.15));
    const columnsTop = top + h + Math.round(gap * 1.4);
    const downStep = Math.max(2, Math.round(h * 0.045)); // a face-down card under another
    const upStep = Math.round(h * upFactor(w)); // a face-up one: its corner shows
    const height = columnsTop + h + 6 * downStep + 12 * upStep + top;
    geometry = { w, h, gap, top, columnsTop, downStep, upStep, height, fanStep: Math.round(w * 0.22), x: (col) => left + col * (w + gap) };
    table.style.height = `${height}px`;
    table.style.setProperty('--card-w', `${w}px`);
    table.style.setProperty('--card-h', `${h}px`);
}

// Whether the cards are small on the screen: then each shows a big rank and one big suit sign (js/cards.js)
function smallCards() {
    return geometry.w < 52;
}

// Where a pile's first card goes
function pilePlace(letter) {
    const { x, top, columnsTop } = geometry;
    if (letter === 'S') return { x: x(0), y: top };
    if (letter === 'W') return { x: x(1), y: top };
    if ('abcd'.includes(letter)) return { x: x(3 + 'abcd'.indexOf(letter)), y: top };
    return { x: x(Number(letter)), y: columnsTop };
}

// A column's step between face-up cards: smaller when a long column would run off the table
function columnUpStep(col) {
    const { h, top, height, columnsTop, downStep, upStep } = geometry;
    const { cards, down } = game.tableau[col];
    const up = cards.length - down;
    if (up < 2) return upStep;
    const room = height - columnsTop - h - top - down * downStep;
    return Math.max(4, Math.min(upStep, Math.floor(room / (up - 1))));
}

// Where each card of a pile goes: [{ card, x, y, faceUp }]
function pilePlaces(letter) {
    const cards = pileCards(letter);
    const { x, y } = pilePlace(letter);
    if (letter === 'S') return cards.map((card, i) => ({ card, x: x + Math.min(2, Math.floor(i / 8)), y: y + Math.min(2, Math.floor(i / 8)), faceUp: false }));
    if (letter === 'W') {
        const spread = GameRules.MODES[game.mode].draw === 3 ? Math.max(1, Math.min(game.fan, cards.length)) : 1;
        const from = cards.length - spread;
        return cards.map((card, i) => ({ card, x: x + Math.max(0, i - from) * geometry.fanStep, y, faceUp: true }));
    }
    if ('abcd'.includes(letter)) return cards.map((card) => ({ card, x, y, faceUp: true }));
    const col = Number(letter);
    const { down } = game.tableau[col];
    const step = columnUpStep(col);
    let offset = 0;
    return cards.map((card, i) => {
        const place = { card, x, y: y + offset, faceUp: i >= down };
        offset += i < down ? geometry.downStep : step;
        return place;
    });
}

// Show the table as the game has it: every card in its place, face up or down, and what each pile says
function render() {
    if (!game || !geometry) return;
    for (const letter of PILES) {
        const places = pilePlaces(letter);
        const pickedFrom = picked?.from === letter ? places.length - (picked.count ?? pickableCount(letter)) : Infinity;
        places.forEach(({ card, x, y, faceUp }, i) => {
            const element = cardElements[card];
            element.style.transform = `translate(${x}px, ${y}px)`;
            element.style.zIndex = i + 1;
            // Its spot on the card sheet (css/game.css scales the sheet to the card's size)
            const spot = faceUp ? Cards.face(card, { small: smallCards(), faces: gameData?.faces }) : Cards.back(gameData?.back);
            const position = `calc(var(--card-w) * ${-spot.x / Cards.WIDTH}) calc(var(--card-h) * ${-spot.y / Cards.HEIGHT})`;
            if (element.dataset.spot !== position) {
                element.dataset.spot = position;
                element.style.backgroundPosition = position;
            }
            element.classList.remove('dragging');
            element.classList.toggle('hidden', Boolean(cascading?.hidden.has(card)));
            element.classList.toggle('picked', i >= pickedFrom);
        });
        showPile(letter, places);
    }
}

// A new deal flies out from the stock, a card at a time, row by row (Options: Display animations)
function animateDeal() {
    if (!table.classList.contains('animated') || !geometry) return;
    table.classList.remove('animated');
    const { x, y } = pilePlace('S');
    cardElements.forEach((element) => {
        element.style.transform = `translate(${x}px, ${y}px)`;
    });
    void table.offsetWidth; // the cards are at the stock first
    table.classList.add('animated');
    let order = 0;
    for (let row = 0; row < 7; row++) {
        for (let col = row; col < 7; col++) {
            const element = cardElements[game.tableau[col].cards[row]];
            element.style.transitionDelay = `${order++ * 28}ms`;
            element.classList.add('dealing');
        }
    }
    render();
    setTimeout(() => {
        cardElements.forEach((element) => {
            element.style.transitionDelay = '';
            element.classList.remove('dealing');
        });
    }, order * 28 + 400);
}

// A pile's place on the table (a column: as tall as its cards), whether it's empty, and what it says for screen readers
function showPile(letter, places) {
    const element = pileElements[letter];
    const { x, y } = pilePlace(letter);
    const last = places[places.length - 1];
    const height = /[0-6]/.test(letter) && last ? last.y - y + geometry.h : geometry.h;
    element.style.transform = `translate(${x}px, ${y}px)`;
    element.style.height = `${height}px`;
    element.classList.toggle('empty', places.length === 0);
    if (letter === 'S') {
        element.classList.toggle('done', places.length === 0 && game.waste.length > 0 && !GameRules.canDeal(game));
        element.classList.toggle('none', places.length === 0 && game.waste.length === 0);
    }
    const label = pileLabel(letter);
    if (element.getAttribute('aria-label') !== label) element.setAttribute('aria-label', label);
}

// What a pile has on it, in words
function pileLabel(letter) {
    const cards = pileCards(letter);
    const name = (card) => GameRules.cardName(card);
    const count = (n) => `${n} card${n === 1 ? '' : 's'}`;
    if (letter === 'S') {
        if (cards.length) return `Stock: ${count(cards.length)}. Deals ${GameRules.MODES[game.mode].draw === 3 ? 'three' : 'one'}.`;
        if (!game.waste.length) return 'Stock: empty.';
        return GameRules.canDeal(game) ? 'Stock: empty. Turns the waste over.' : 'Stock: empty, no passes left.';
    }
    if (letter === 'W') return cards.length ? `Waste: ${name(cards[cards.length - 1])}, ${count(cards.length)}.` : 'Waste: empty.';
    if ('abcd'.includes(letter)) {
        const which = FOUNDATION_NAMES[letter].replace('f', 'F');
        return `${which}: ${cards.length ? `up to the ${name(cards[cards.length - 1])}` : 'empty'}.`;
    }
    const { down } = game.tableau[Number(letter)];
    if (!cards.length) return `Column ${Number(letter) + 1}: empty.`;
    const up = cards.slice(down).map(name).join(', ');
    return `Column ${Number(letter) + 1}: ${down ? `${down} face down, then ` : ''}${up}.`;
}

// Whether the game shows its time: a timed Standard game, or with the Options' Timed game for the others
function showsTime() {
    const { scoring, timed } = GameRules.MODES[game.mode];
    return scoring === 'standard' ? timed : gameData.timed;
}

// The status bar: the time and the score (Standard: points; Vegas: dollars, carried on from game to game with
// Cumulative)
function showScore() {
    if (!game) return;
    const { scoring } = GameRules.MODES[game.mode];
    const at = clock();
    let score = '';
    if (scoring === 'standard') score = `Score: ${GameRules.score(game, at)}`;
    if (scoring === 'vegas') {
        const dollars = gameData.cumulative && !GameHub.replaying ? gameData.vegasTotal + (game.over ? 0 : game.points) : game.points;
        score = `Score: ${GameRules.money(dollars)}`;
    }
    scorePanel.textContent = score;
    timePanel.textContent = showsTime() ? `Time: ${GameRules.seconds(game, at)}` : '';
}

// GameHub's panel: the score, the time and the wins at this level, then each level's games, wins and bests
function showStatus() {
    if (!gameData || !game) return;
    const at = clock();
    const { scoring } = GameRules.MODES[game.mode];
    const scoreValue = scoring === 'vegas' ? GameRules.money(game.points) : GameRules.score(game, at);
    GameHub.status({
        main: [
            { label: scoring === 'vegas' ? 'Money' : 'Score', value: scoreValue },
            { label: 'Time', value: GameRules.seconds(game, at), format: 'time' },
            { label: 'Wins', value: gameData.stats[game.mode].won },
        ],
        more: Object.entries(GameRules.MODES).map(([mode, { name, scoring: kind }]) => {
            const stats = gameData.stats[mode];
            const best = stats.best === null ? null : kind === 'vegas' ? GameRules.money(stats.best) : stats.best;
            return {
                title: name,
                items: [
                    { label: 'Played', value: stats.played },
                    { label: 'Won', value: stats.won },
                    ...(kind === 'none' ? [] : [{ label: kind === 'vegas' ? 'Best money' : 'Best score', value: best }]),
                    { label: 'Fastest win', value: stats.bestTime, format: 'time' },
                ],
            };
        }),
        ongoing: false, // The game under way is saved after each move (saveProgress): a reload keeps it
    });
}

// The clock: the status bar and GameHub's panel, each second of a game under way
setInterval(() => {
    if (!game || game.startedAt === null || game.over || document.hidden) return;
    showScore();
    const seconds = GameRules.seconds(game, clock());
    if (seconds !== shownSeconds) {
        shownSeconds = seconds;
        showStatus();
    }
}, 250);

// The look the Options and Change Appearance give: the background, the backs, the animations
function applyLook() {
    if (!gameData) return;
    table.dataset.background = gameData.background;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    table.classList.toggle('animated', gameData.animations && !reduced);
    render();
    showScore();
}

// --- Sounds, made in the browser (no files): a card put down, a card dealt, the shuffle, the win ---

let audio = null;

// A short burst of noise, shaped like a card landing on felt (pitch: the filter's Hz)
function tap(pitch, volume, delay = 0) {
    const start = audio.currentTime + delay;
    const length = 0.05;
    const buffer = audio.createBuffer(1, Math.round(audio.sampleRate * length), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = pitch;
    const gain = audio.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start(start);
}

// A note (the win's)
function note(frequency, delay, length = 0.18) {
    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + length);
}

// Play a sound, if the Options say so (not in a replay)
function sound(kind) {
    if (!kind || !gameData?.sounds || GameHub.replaying) return;
    try {
        audio ??= new AudioContext();
        if (audio.state === 'suspended') audio.resume();
        if (kind === 'place') tap(1400, 0.5);
        if (kind === 'flip') tap(2600, 0.35);
        if (kind === 'shuffle') for (let i = 0; i < 12; i++) tap(1800 + (i % 3) * 300, 0.25, i * 0.035);
        if (kind === 'win') [523, 659, 784, 1047].forEach((frequency, i) => note(frequency, i * 0.12, i === 3 ? 0.5 : 0.18));
        if (kind === 'lost') [392, 330, 262].forEach((frequency, i) => note(frequency, i * 0.16, i === 2 ? 0.45 : 0.2));
    } catch (error) {
        // No Web Audio here: no sounds
    }
}

// --- The mouse and touch: drag, click, double-click, right-click ---

const DOUBLE_CLICK_MS = 400;
let lastClick = { at: 0, target: null };

// Where on the table a pointer is (px, from its top left corner, inside its edge)
function tablePoint(event) {
    const box = table.getBoundingClientRect();
    return { x: event.clientX - box.left - table.clientLeft, y: event.clientY - box.top - table.clientTop };
}

// The pile (and the card in it) under a point: { letter, index } (index −1: the pile itself), or null
function pileAt(point) {
    const inside = (x, y) => point.x >= x && point.x < x + geometry.w && point.y >= y && point.y < y + geometry.h;
    for (const letter of PILES) {
        const places = pilePlaces(letter);
        for (let i = places.length - 1; i >= 0; i--) {
            if (inside(places[i].x, places[i].y)) return { letter, index: i };
        }
        const { x, y } = pilePlace(letter);
        if (inside(x, y)) return { letter, index: -1 };
    }
    return null;
}

table.addEventListener('pointerdown', (event) => {
    if (!game || !ready || GameHub.replaying || cascading || event.button !== 0) return;
    const point = tablePoint(event);
    const hit = pileAt(point);
    drag = { start: point, pointer: event.pointerId, hit, moved: false, count: null, elements: [] };
    if (hit && hit.index >= 0 && !game.over) {
        const count = pickableFrom(hit.letter, hit.index);
        if (count !== null) {
            drag.count = count;
            drag.elements = pilePlaces(hit.letter).slice(hit.index).map(({ card, x, y }) => ({ element: cardElements[card], x, y }));
        }
    }
    try {
        table.setPointerCapture(event.pointerId); // the drag goes on outside the table
    } catch (error) {
        // a pointer the browser no longer has: the drag still works over the table
    }
});

table.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointer || !drag.elements.length) return;
    const point = tablePoint(event);
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) {
        drag.moved = true;
        picked = null;
        render();
    }
    drag.elements.forEach(({ element, x, y }, i) => {
        element.classList.add('dragging');
        element.style.zIndex = 1000 + i;
        element.style.transform = `translate(${x + dx}px, ${y + dy}px)`;
    });
    drag.dx = dx;
    drag.dy = dy;
});

table.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const done = drag;
    drag = null;
    if (done.moved) drop(done);
    else click(done.hit);
});

table.addEventListener('pointercancel', () => {
    drag = null;
    render();
});

// A drag ended: the cards go onto the pile they cover most (one they can go onto), or glide back where they were
function drop({ hit, count, dx, dy }) {
    const first = pilePlaces(hit.letter)[hit.index];
    const box = { x: first.x + dx, y: first.y + dy };
    let best = null;
    for (const letter of ['a', 'b', 'c', 'd', '0', '1', '2', '3', '4', '5', '6']) {
        if (letter === hit.letter) continue;
        const { x, y } = pilePlace(letter);
        const places = pilePlaces(letter);
        const bottom = (places.length ? places[places.length - 1].y : y) + geometry.h;
        const overlapX = Math.min(box.x + geometry.w, x + geometry.w) - Math.max(box.x, x);
        const overlapY = Math.min(box.y + geometry.h, bottom) - Math.max(box.y, y);
        const area = overlapX > 0 && overlapY > 0 ? overlapX * overlapY : 0;
        if (area > 0 && (!best || area > best.area) && GameRules.isLegal(game, moveCode(hit.letter, letter, count))) best = { letter, area };
    }
    if (!best || !playInput(moveCode(hit.letter, best.letter, count))) render();
}

// A click or a tap (no drag): deal, pick up, put down, or, twice quickly, to the foundations
function click(hit) {
    const now = performance.now();
    const target = hit ? `${hit.letter}:${hit.index}` : 'table';
    const again = now - lastClick.at < DOUBLE_CLICK_MS && lastClick.target === target;
    lastClick = { at: again ? 0 : now, target };
    if (!game || game.over) return;

    if (!hit) {
        // The table itself: twice quickly (a double-tap) sends every card that can go
        if (again) autoPlay();
        else unpick();
        return;
    }
    const { letter, index } = hit;
    if (letter === 'S') {
        picked = null;
        dealFromStock();
        return;
    }
    const cards = pileCards(letter);
    if (again && index === cards.length - 1 && (letter === 'W' || /[0-6]/.test(letter))) {
        picked = null;
        if (!toFoundation(letter)) render();
        return;
    }
    if (picked && picked.from !== letter && moveOnto(picked.from, letter, picked.count)) return;
    const count = pickableFrom(letter, index);
    if (count !== null) pick(letter, count);
    else unpick();
}

// A right-click on the table: every card that can go onto the foundations goes
table.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    if (!GameHub.replaying && !cascading) autoPlay();
});

// The table follows the window's width and the page's height
function relayout() {
    layout();
    render();
}
new ResizeObserver(relayout).observe(table);
window.addEventListener('resize', relayout);
window.addEventListener('load', relayout); // the window at its full size, everything on the page in place
layout();

// --- The win: the cards bounce off the foundations ---

// A win: the cards bounce off the foundations (Options: Display animations), then the Congratulations dialog (not in a
// replay)
function win() {
    sound('win');
    const after = () => {
        if (!GameHub.replaying) document.dispatchEvent(new Event('solitaire:won')); // js/buttons-handler.js shows it
    };
    if (!table.classList.contains('animated')) {
        after();
        return;
    }
    const throws = [];
    for (let rank = 12; rank >= 0; rank--) {
        game.foundations.forEach((pile, i) => {
            if (pile[rank] !== undefined) throws.push({ card: pile[rank], from: 'abcd'[i] });
        });
    }
    cascade(throws, true, after);
}

/**
 * The bouncing cards: one after another, each from its foundation, falling and bouncing along the table, leaving a
 * trail, until it's off the table; then the next. A click or a key stops it.
 * @param {object[]} throws - [{ card, from (a foundation's letter) }], in order
 * @param {boolean} hideThrown - each card leaves its foundation as it goes (a win)
 * @param {function} done - called at the end
 */
function cascade(throws, hideThrown, done) {
    stopCascade(false);
    const ratio = window.devicePixelRatio || 1;
    const width = table.clientWidth;
    const height = table.clientHeight;
    cascadeCanvas.width = Math.round(width * ratio);
    cascadeCanvas.height = Math.round(height * ratio);
    const ctx = cascadeCanvas.getContext('2d');
    ctx.scale(ratio, ratio);
    cascadeCanvas.classList.add('on');
    const scale = geometry.w / 71;
    const state = { hidden: new Set(), next: 0, current: null, frame: null, done };
    cascading = state;

    const step = () => {
        if (cascading !== state) return;
        for (let i = 0; i < 3; i++) { // three steps a frame: about 20 seconds for the whole deck
            if (!state.current) {
                if (state.next >= throws.length) {
                    stopCascade();
                    return;
                }
                const { card, from } = throws[state.next++];
                const { x, y } = pilePlace(from);
                const direction = Math.random() < 0.5 ? -1 : 1;
                state.current = {
                    spot: Cards.face(card, { small: smallCards(), faces: gameData?.faces }), x, y,
                    vx: direction * (3 + Math.random() * 4) * scale,
                    vy: -(1 + Math.random() * 5) * scale,
                };
                if (hideThrown) {
                    state.hidden.add(card);
                    cardElements[card].classList.add('hidden');
                }
            }
            const c = state.current;
            c.vy += 0.45 * scale;
            c.x += c.vx;
            c.y += c.vy;
            if (c.y + geometry.h > height) {
                c.y = height - geometry.h;
                c.vy = -c.vy * 0.78;
            }
            if (Cards.sheet.complete) ctx.drawImage(Cards.sheet, c.spot.x, c.spot.y, Cards.WIDTH, Cards.HEIGHT, c.x, c.y, geometry.w, geometry.h);
            if (c.x + geometry.w < 0 || c.x > width) state.current = null;
        }
        state.frame = requestAnimationFrame(step);
    };
    state.frame = requestAnimationFrame(step);
}

// Stop the bouncing cards (at their end, or a click or a key), and go on to what comes after (unless thenDone is false:
// a new deal, or a replay, takes over)
function stopCascade(thenDone = true) {
    const state = cascading;
    if (!state) return;
    cascading = null;
    cancelAnimationFrame(state.frame);
    cascadeCanvas.classList.remove('on');
    cascadeCanvas.getContext('2d').clearRect(0, 0, cascadeCanvas.width, cascadeCanvas.height);
    render();
    if (thenDone) state.done?.();
}

// A click on the bouncing cards, or a key, stops them
cascadeCanvas.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    stopCascade();
});
document.addEventListener('keydown', (event) => {
    if (cascading && !event.repeat) {
        event.preventDefault();
        event.stopImmediatePropagation();
        stopCascade();
    }
}, true);

