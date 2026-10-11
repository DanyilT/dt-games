/**
 * Tic-Tac-Toe
 *
 * Noughts and crosses against a bot that plays by minimax, on a sheet of notebook paper, drawn in pencil. A match is 5
 * rounds: X goes first, and you're X in rounds 1, 3 and 5. A round won is 2 points, a draw 1. Easy and Medium slip now
 * and then; Hard never does, so the best you can do there is draw.
 * The rules (the board, the bot, the rounds, the points) are in js/rules.js: this file draws the game, takes the
 * player's moves, and plays the match through GameRules. Each move is worked out at once (the bot's answer, the end of
 * the round, the next round); the page then shows it at a human pace: the bot "thinks", each line is drawn.
 *
 * Features:
 * - Three levels: Easy, Medium and Hard
 * - Pencil drawings: the grid, each X and O, and the line through three in a row, drawn as you watch
 * - A match's score, round by round
 * - Wins, draws, losses and the best points for each level, kept in the browser
 * - Carries on where you left off: the match under way is saved after each move
 * - GameHub's panel and replays (js/gamehub.js): each match is a run, recorded from its first move: your moves only,
 *   with the bot's answers drawn from the run's seed, so GameHub can play it again (and check it on its server)
 *
 * Easter Egg:
 * - `qwerty.js`
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const THINK_MS = [350, 650]; // The bot "thinks" this long before its move (ms, at random in between: only for show)
const ROUND_PAUSE_MS = 1600; // How long the end of a round stays up before the board is wiped
const MARK_NAMES = { [GameRules.X]: 'X', [GameRules.O]: 'O' };

// The page
const drawing = document.getElementById('drawing');
const cells = [...document.querySelectorAll('.cell')];
const statusLine = document.getElementById('status');
const levelInputs = [...document.querySelectorAll('input[name="level"]')];
const roundBoxes = [...document.querySelectorAll('.rounds li')];
let gridLayer = drawing.querySelector('.grid');
let marksLayer = drawing.querySelector('.marks');

// What's saved (js/storage.js), once it has loaded
let gameData = null;
let level = defaultGameData().level;
let ready = false; // What's saved has loaded and GameHub has handed over its tickets: a match can start

// The match under way (js/rules.js), from its first move (null before it), and its run (js/gamehub.js), recorded so
// GameHub can play it again
let match = null;
let run = null;

// What the page shows, which can be behind the match (the bot still "thinking", a round's end still up)
let shown = emptyShown();
let queue = []; // What's still to show: [{ wait (ms), action(animate) }]
let pending = null; // The step waiting for its time to show (it's off the queue)
let timer = null;

// A board with nothing on it yet, round 1, as the page shows it
function emptyShown() {
    return { board: Array(9).fill(0), round: 1, player: GameRules.X, points: 0, botPoints: 0, results: [], over: null, thinking: false };
}

// What's saved: the level, the stats, and a match under way, which carries on
const dataLoaded = loadGameData().then((data) => {
    gameData = data;
    level = gameData.level;
    showLevel();
    if (GameHub.replaying) return;
    resumeSavedMatch();
    showStatus();
});

// GameHub's panel: the level, the match's points and its round; then each level's matches and best points
function showStatus() {
    if (!gameData) return;
    const points = match ? match.points : 0;
    const botPoints = match ? match.botPoints : 0;
    GameHub.status({
        main: [
            { label: 'Level', value: GameRules.LEVELS[level].name },
            { label: 'You', value: points },
            { label: 'Bot', value: botPoints },
            { label: 'Round', value: `${match ? Math.min(match.round, GameRules.ROUNDS) : 1} of ${GameRules.ROUNDS}` },
        ],
        more: Object.keys(GameRules.LEVELS).map((each) => ({
            title: GameRules.LEVELS[each].name,
            items: [
                { label: 'Won', value: gameData.stats[each].won },
                { label: 'Drawn', value: gameData.stats[each].drawn },
                { label: 'Lost', value: gameData.stats[each].lost },
                { label: 'Best points', value: gameData.stats[each].best },
            ],
        })),
        ongoing: false, // A match under way is saved after each move (saveProgress): a reload keeps it
    });
}

// --- Pencil drawings (only for show: Math.random is fine here) ---

// A little off, at random
function jitter(amount) {
    return (Math.random() * 2 - 1) * amount;
}

// A pencil line from x1, y1 to x2, y2: a little bent, its ends a little off
function pencilLine(x1, y1, x2, y2, wobble = 3) {
    const middleX = (x1 + x2) / 2 + jitter(wobble);
    const middleY = (y1 + y2) / 2 + jitter(wobble);
    return `M${(x1 + jitter(1.5)).toFixed(1)} ${(y1 + jitter(1.5)).toFixed(1)} Q${middleX.toFixed(1)} ${middleY.toFixed(1)} `
        + `${(x2 + jitter(1.5)).toFixed(1)} ${(y2 + jitter(1.5)).toFixed(1)}`;
}

// A pencil loop round x, y: a little uneven, its end running on past its start
function pencilLoop(x, y, radius) {
    const start = Math.random() * Math.PI * 2;
    const squash = 0.88 + Math.random() * 0.1;
    const points = [];
    for (let i = 0; i <= 30; i++) {
        const angle = start + (i / 30) * Math.PI * 2 * 1.12;
        const r = radius + Math.sin(i / 2.5) * 1.2 + jitter(0.6);
        points.push(`${(x + Math.cos(angle) * r).toFixed(1)} ${(y + Math.sin(angle) * r * squash).toFixed(1)}`);
    }
    return `M${points.join(' L')}`;
}

// A pencil stroke in a layer, drawn as you watch (animate), after a delay (ms), taking a time (ms); a fainter stroke
// beside it gives it the pencil's grain
function addStroke(layer, d, kind, { animate = true, delay = 0, duration = 300, width = 3 } = {}) {
    for (const ghost of [false, true]) {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('pathLength', '1');
        path.setAttribute('stroke-width', ghost ? width * 0.45 : width);
        path.classList.add(kind);
        if (ghost) {
            path.classList.add('ghost');
            path.setAttribute('transform', 'translate(0.8 0.6)');
        }
        if (animate) {
            path.classList.add('draw');
            path.style.animationDelay = `${delay}ms`;
            path.style.animationDuration = `${duration}ms`;
        }
        layer.appendChild(path);
    }
}

// The grid: two lines down, two across
function drawGrid(animate) {
    gridLayer.replaceChildren();
    [[100, 12, 100, 288], [200, 12, 200, 288], [12, 100, 288, 100], [12, 200, 288, 200]].forEach(([x1, y1, x2, y2], i) => {
        addStroke(gridLayer, pencilLine(x1, y1, x2, y2, 4), 'grid', { animate, delay: i * 180, duration: 320, width: 2.6 });
    });
}

// An X or an O in a cell (the cells are 100 × 100, row by row)
function drawMark(cell, mark, animate) {
    const x = 50 + (cell % 3) * 100;
    const y = 50 + Math.floor(cell / 3) * 100;
    if (mark === GameRules.X) {
        addStroke(marksLayer, pencilLine(x - 27, y - 27, x + 27, y + 27, 3), 'x', { animate, duration: 180 });
        addStroke(marksLayer, pencilLine(x + 27, y - 27, x - 27, y + 27, 3), 'x', { animate, delay: 200, duration: 180 });
    } else {
        addStroke(marksLayer, pencilLoop(x, y, 29), 'o', { animate, duration: 380 });
    }
}

// The line through three in a row, a little past both ends
function drawStrike(line, animate) {
    const [from, , to] = line.map((cell) => [50 + (cell % 3) * 100, 50 + Math.floor(cell / 3) * 100]);
    const dx = (to[0] - from[0]) * 0.18;
    const dy = (to[1] - from[1]) * 0.18;
    addStroke(marksLayer, pencilLine(from[0] - dx, from[1] - dy, to[0] + dx, to[1] + dy, 5), 'strike', { animate, duration: 420, width: 4 });
}

// Wipe the marks off: they fade (rubbed out), then go
function eraseMarks(animate) {
    const old = marksLayer;
    marksLayer = document.createElementNS(SVG_NS, 'g');
    marksLayer.classList.add('marks');
    old.after(marksLayer); // In the same place: under the pencil's grain (index.html)
    if (!animate) {
        old.remove();
        return;
    }
    old.classList.add('erasing');
    setTimeout(() => old.remove(), 400);
}

// Every stroke still being drawn, drawn at once
function finishStrokes() {
    drawing.querySelectorAll('.draw').forEach((path) => path.classList.remove('draw'));
    drawing.querySelectorAll('.erasing').forEach((group) => group.remove());
}

// --- What the page shows ---

// A line under the board: what's going on
function setStatus(text) {
    statusLine.textContent = text;
}

// The cells: what's in each (for screen readers too), and whether it can be played now
function showCells() {
    const yourTurn = !GameHub.replaying && !shown.over && !shown.thinking && queue.length === 0 && !timer;
    cells.forEach((cell, i) => {
        const mark = shown.board[i];
        cell.setAttribute('aria-label', `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}: ${mark ? MARK_NAMES[mark] : 'empty'}`);
        cell.setAttribute('aria-disabled', String(!yourTurn || mark !== 0));
        cell.classList.toggle('taken', mark !== 0);
    });
}

// The score: each side's points and mark, the round, and each round's result
function showScore() {
    document.getElementById('your-mark').textContent = MARK_NAMES[shown.player];
    document.getElementById('bot-mark').textContent = MARK_NAMES[shown.player === GameRules.X ? GameRules.O : GameRules.X];
    document.getElementById('your-points').textContent = shown.points;
    document.getElementById('bot-points').textContent = shown.botPoints;
    document.getElementById('round').textContent = `Round ${shown.round} of ${GameRules.ROUNDS}`;
    roundBoxes.forEach((box, i) => {
        const result = shown.results[i];
        box.textContent = result ? { won: 'W', drawn: 'D', lost: 'L' }[result] : '';
        box.className = result ?? '';
        box.setAttribute('aria-label', `Round ${i + 1}: ${result ?? (i + 1 === shown.round && !shown.over ? 'now' : 'to come')}`);
    });
}

// The line under the board, once nothing is left to show: whose turn, or how the match ended
function showTurn() {
    if (shown.over) {
        const { points, botPoints } = shown;
        const how = {
            won: `You won the match, ${points} to ${botPoints}!`,
            lost: `The bot won the match, ${botPoints} to ${points}.`,
            over: `A drawn match, ${points} to ${botPoints}.`,
        }[shown.over];
        setStatus(GameHub.replaying ? `${how} The end of the replay.` : `${how} New match to play again.`);
    } else if (GameHub.replaying) {
        setStatus(`Round ${shown.round} of ${GameRules.ROUNDS}: the replay plays.`);
    } else {
        setStatus(`Round ${shown.round} of ${GameRules.ROUNDS}: your turn, you're ${MARK_NAMES[shown.player]}.`);
    }
}

// The level picked, ticked in the list
function showLevel() {
    levelInputs.forEach((input) => {
        input.checked = input.value === level;
    });
}

// A mark, shown
function showMark({ cell, mark, who }, animate) {
    shown.board[cell] = mark;
    shown.thinking = false;
    drawMark(cell, mark, animate);
    if (who === 'player') sound();
}

// A round's end, shown: the line through three in a row, what came of it, and the points
function showRoundEnd({ result, line }, animate) {
    if (line) drawStrike(line, animate);
    shown.results.push(result);
    shown.points += { won: 2, drawn: 1, lost: 0 }[result];
    shown.botPoints += { won: 0, drawn: 1, lost: 2 }[result];
    setStatus({ won: 'You won this round!', drawn: 'A draw.', lost: 'The bot won this round.' }[result]);
    showScore();
}

// A new round, shown: the board wiped, the marks swapped, and who goes first
function showRoundStart({ round, player }, animate) {
    eraseMarks(animate);
    shown.board = Array(9).fill(0);
    shown.round = round;
    shown.player = player;
    setStatus(player === GameRules.X
        ? `Round ${round} of ${GameRules.ROUNDS}: you're X, so you go first.`
        : `Round ${round} of ${GameRules.ROUNDS}: you're O, so the bot goes first.`);
    showScore();
}

// What happened in a move (js/rules.js play()), as steps to show one after another
function stepsFor(events) {
    const steps = [];
    for (const event of events) {
        if (event.type === 'mark' && event.who === 'player') {
            steps.push({ wait: 0, action: (animate) => showMark(event, animate) });
        } else if (event.type === 'mark') {
            steps.push({ wait: 0, action: () => {
                shown.thinking = true;
                setStatus('The bot is thinking…');
            } });
            steps.push({ wait: THINK_MS[0] + Math.random() * (THINK_MS[1] - THINK_MS[0]), action: (animate) => showMark(event, animate) });
        } else if (event.type === 'round') {
            steps.push({ wait: 400, action: (animate) => showRoundEnd(event, animate) });
        } else if (event.type === 'round-start') {
            steps.push({ wait: ROUND_PAUSE_MS, action: (animate) => showRoundStart(event, animate) });
        } else if (event.type === 'match') {
            steps.push({ wait: 600, action: () => {
                shown.over = event.outcome;
            } });
        }
    }
    return steps;
}

// Show the steps, one after another
function show(steps) {
    queue.push(...steps);
    if (!timer) nextStep();
}

// The next step, after its wait; or, when they're all shown, whose turn
function nextStep() {
    timer = null;
    pending = queue.shift() ?? null;
    if (!pending) {
        showTurn();
        showCells();
        return;
    }
    showCells();
    timer = setTimeout(() => {
        const step = pending;
        pending = null;
        step.action(true);
        nextStep();
    }, pending.wait);
}

// Nothing more to show (a new match, or a replay starting)
function stopShowing() {
    clearTimeout(timer);
    timer = null;
    pending = null;
    queue = [];
}

// Everything still to show, at once (a click while it's showing): the step waiting for its time first
function showAll() {
    clearTimeout(timer);
    timer = null;
    if (pending) {
        const step = pending;
        pending = null;
        step.action(false);
    }
    while (queue.length) queue.shift().action(false);
    finishStrokes();
    showTurn();
    showCells();
}

// The match as it is, shown at once (a saved match carried on, or a new one)
function showMatch() {
    shown = emptyShown();
    if (match) {
        Object.assign(shown, { board: match.board.slice(), round: match.round, player: match.player, points: match.points,
            botPoints: match.botPoints, results: match.results.slice() });
    }
    eraseMarks(false);
    shown.board.forEach((mark, cell) => {
        if (mark) drawMark(cell, mark, false);
    });
    showScore();
    showTurn();
    showCells();
}

// --- Playing ---

// The player plays a cell (a click, a tap, a key): the match starts with its first move (and its run). A click while
// the page is still showing the last move shows it all at once, and isn't a move.
function playCell(cell) {
    if (GameHub.replaying || !ready) return;
    if (queue.length || timer) {
        showAll();
        return;
    }
    if (shown.over || shown.board[cell] !== 0) return;
    if (!match) startMatch();
    run.input(cell); // Recorded first: the move can end the match
    const events = GameRules.play(match, cell);
    afterMove(events);
}

// A replay's move: shown as it was played (anything still showing, at once)
function replayMove(cell) {
    if (!match) return;
    if (queue.length || timer) showAll();
    const events = GameRules.play(match, cell);
    if (events) afterMove(events);
}

// After a move: the end of the match if it's come, the match saved, and the page shows it
function afterMove(events) {
    if (match.over) finishMatch();
    else saveProgress();
    show(stepsFor(events));
    showStatus();
}

// A new match at the level picked: a new run, or in a replay, the run being played
function startMatch(replayRun = null) {
    run = replayRun || GameHub.startRun({ mode: level });
    if (replayRun && Object.hasOwn(GameRules.LEVELS, replayRun.mode)) {
        level = replayRun.mode;
        showLevel();
    }
    match = GameRules.newMatch(run.random, level);
}

// The match is over: its run ends, and the stats keep it (not a replay's: it was counted then)
function finishMatch() {
    const outcome = GameRules.outcome(match);
    const stats = gameData.stats[match.level];
    const best = stats.best === null || match.points > stats.best;
    run.finish({ outcome, result: GameRules.result(match), best });
    if (GameHub.replaying) return;
    stats[{ won: 'won', lost: 'lost', over: 'drawn' }[outcome]]++;
    if (best) stats.best = match.points;
    gameData.match = null;
    saveGameData(gameData);
}

// The match under way goes with what's saved, so it carries on next time
function saveProgress() {
    if (!gameData || GameHub.replaying) return;
    gameData.match = match && !match.over ? { state: GameRules.saveState(match), run: run.save() } : null;
    saveGameData(gameData);
}

// A match saved half-way (saveProgress()) carries on, with its run
function resumeSavedMatch() {
    const saved = gameData.match;
    if (!saved) {
        showMatch();
        return;
    }
    const resumedRun = GameHub.resumeRun(saved.run);
    const resumed = GameRules.loadState(saved.state, resumedRun.random);
    if (!resumed) {
        // Not a match this version can carry on: drop it
        resumedRun.discard();
        gameData.match = null;
        saveGameData(gameData);
    } else {
        run = resumedRun;
        match = resumed;
        level = match.level;
        showLevel();
    }
    showMatch();
}

// A new match (New match, N): the one under way is dropped, if it has started (after asking)
function newMatch() {
    if (GameHub.replaying || !gameData) return;
    if (match && !match.over && !confirm('Start a new match? This one will be lost.')) return;
    if (match && !match.over) run.discard();
    stopShowing();
    match = null;
    gameData.match = null;
    saveGameData(gameData);
    drawGrid(true);
    showMatch();
    showStatus();
}

// Another level: the next match is at it (a match under way is dropped, after asking)
function changeLevel(next) {
    if (GameHub.replaying || !gameData || next === level || !Object.hasOwn(GameRules.LEVELS, next)) {
        showLevel();
        return;
    }
    if (match && !match.over && !confirm(`Start a new match on ${GameRules.LEVELS[next].name}? This one will be lost.`)) {
        showLevel();
        return;
    }
    if (match && !match.over) run.discard();
    level = next;
    gameData.level = level;
    match = null;
    gameData.match = null;
    saveGameData(gameData);
    stopShowing();
    showLevel();
    showMatch();
    showStatus();
}

// A soft pencil tap, for a move (made in the browser; quiet, and only after a click or a key)
let audio = null;
function sound() {
    if (GameHub.replaying) return;
    try {
        audio ??= new AudioContext();
        const noise = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.05), audio.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
        const source = audio.createBufferSource();
        const gain = audio.createGain();
        gain.gain.value = 0.05;
        source.buffer = noise;
        source.connect(gain).connect(audio.destination);
        source.start();
    } catch (error) {
        // No Web Audio here: no sound
    }
}

// The cells take clicks and taps
cells.forEach((cell, i) => cell.addEventListener('click', () => playCell(i)));

// The levels and New match
levelInputs.forEach((input) => input.addEventListener('change', () => changeLevel(input.value)));
document.getElementById('new-match').addEventListener('click', newMatch);

// Initialize: the grid drawn, and the board shown once what's saved has loaded; or GameHub opened the game to play a
// replay, which starts the match it was played on and makes its moves
drawGrid(true);
showMatch();
if (GameHub.replaying) {
    GameHub.onReplay({
        begin(replayRun) {
            stopShowing();
            startMatch(replayRun);
            showMatch();
        },
        input: replayMove,
    });
}
Promise.all([dataLoaded, GameHub.ready(), document.fonts?.ready]).then(() => {
    ready = true; // Once GameHub has handed over its tickets, so the first match gets one too
    GameHub.playable(); // The board's up, in its handwriting: GameHub stops showing the game as loading
});
