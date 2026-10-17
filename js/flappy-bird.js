/**
 * Flappy Bird
 *
 * The classic one-button game, in plain JavaScript and an HTML5 canvas, drawn in the original's style (every picture
 * is drawn here, in code). The bird falls; each flap lifts it. Fly it through the gaps between the pipes: each pipe
 * passed is a point, and touching a pipe or the ground ends the game.
 * The rules (the bird, the pipes, the steps, the score, the end) are in js/rules.js: this file draws the game, takes the
 * player's flaps, plays the sounds, and plays the game through GameRules.
 *
 * Features:
 * - Get Ready, the game, a scoreboard with the best score and a medal (bronze from 10, silver 20, gold 30, platinum 40)
 * - Flap with Space, ↑, W, a click or a tap; pause with Esc or the pause button on the canvas
 * - Sounds, made in the browser (Web Audio), on or off with M
 * - Pauses by itself when the page is hidden, loses the keyboard, or GameHub asks; a paused game is saved, and carries on
 *   (paused) next time
 * - GameHub's panel and replays (js/gamehub.js): each game is a run, with the pipes placed from the run's seed, the game
 *   moving in fixed steps (GameRules.TICK), and every flap recorded with the step it came after, so GameHub can play it
 *   again
 *
 * Easter Egg:
 * - `qwerty.js`
 */

// Canvas setup: the world is 288 × 512 px, drawn at twice that for sharp edges
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const SCALE = canvas.width / GameRules.WIDTH;
ctx.scale(SCALE, SCALE);

// The world, and the steps (js/rules.js)
const WIDTH = GameRules.WIDTH;
const HEIGHT = 512;
const GROUND = GameRules.GROUND;
const TICK = GameRules.TICK;
const OVER_PAUSE = 700; // ms: the scoreboard takes no flap this long after it comes up (a last frantic tap)

// The original's colours
const COLORS = {
    sky: '#4ec0ca',
    cloud: '#eafaf3',
    city: '#d7f2e4',
    cityShade: '#a9e1d3',
    bush: '#5ee270',
    bushShade: '#48c75a',
    outline: '#543847',
    pipe: '#73bf2e',
    pipeLight: '#9ce659',
    pipeShade: '#558022',
    groundTop: '#73bf2e',
    groundStripe: '#9ce659',
    sand: '#ded895',
    sandShade: '#d0c874',
    bird: '#f7d51d',
    birdBelly: '#f0a830',
    beak: '#f75a1d',
    beakLower: '#e8402a',
    wing: '#fff7d6',
    panel: '#ded895',
    panelLight: '#f5f0c4',
    label: '#e86101',
};
const NIGHT = { sky: '#008793', cloud: '#2b6f84', city: '#1d5a6b', cityShade: '#164b59', bush: '#1f8a3b', bushShade: '#17702f' };
const MEDALS = {
    bronze: ['#c6773a', '#e8a76f'],
    silver: ['#c3c3c3', '#ececec'],
    gold: ['#e8c33a', '#fbe98a'],
    platinum: ['#d9e8ec', '#ffffff'],
};

// The score's digits, 5 × 7 blocks each ('1': a block)
const DIGITS = [
    ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
];

// The pause button on the canvas, at the top left (px)
const PAUSE_BUTTON = { x: 10, y: 10, width: 26, height: 28 };

// Game state
let screen = 'ready'; // 'ready' (Get Ready), 'playing', 'dying' (the bird falls after a hit), 'over' (the scoreboard)
let paused = false;
let ready = false; // What's saved has loaded and GameHub has handed over its tickets: a game can start
let game = null; // The game under way, or the one that just ended (js/rules.js)
let previousY = GameRules.BIRD_START; // The bird's height a step ago (1/100 px), to draw it between steps
let accumulator = 0; // ms of game time not stepped yet
let lastFrame = null;
let clock = 0; // ms the page has been animating (the bird's wings, Get Ready's bobbing)
let scroll = 0; // px the ground has moved
let fallY = 0; // While dying: where the bird is (px), and how fast it falls (px a ms)
let fallSpeed = 0;
let overAt = 0; // When the scoreboard came up (clock)
let newBest = false;
let nightMode = false; // The Easter egg's night sky and golden bird (js/qwerty.js)

// Score
let highScore = 0;
let bestBefore = 0; // The best score when this game started (did this one beat it?)
let gameData = null; // What's saved (js/storage.js), once it has loaded
let soundOn = true;

// The game under way, recorded so GameHub can play it again (js/gamehub.js): its random numbers place the pipes
let run = null;

// What's saved: the best score and the medals, whether the sound is on, and a game under way (resumed once GameHub has
// handed over its tickets, below)
const dataLoaded = loadGameData().then((data) => {
    gameData = data;
    if (highScore > gameData.highScore) {
        gameData.highScore = highScore; // Beaten while it was loading
        saveGameData(gameData);
    }
    highScore = gameData.highScore;
    soundOn = gameData.sound;
    document.getElementById('highScore').textContent = highScore;
    document.dispatchEvent(new Event('flappy:sound')); // The Sound button shows it
    showStatus();
});

// GameHub's panel: the score and the best, then the medals won
function showStatus() {
    const medals = gameData?.medals ?? { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    GameHub.status({
        main: [
            { label: 'Score', value: game ? game.score : 0 },
            { label: 'Best', value: highScore },
        ],
        more: [{
            title: 'Medals',
            items: [
                { label: 'Platinum', value: medals.platinum },
                { label: 'Gold', value: medals.gold },
                { label: 'Silver', value: medals.silver },
                { label: 'Bronze', value: medals.bronze },
            ],
        }],
        ongoing: false, // A game under way is saved when it pauses or the page is closed (saveProgress): a reload keeps it
    });
}

// Set the game score (cheat)
function setScore(newScore) {
    GameHub.cheated();
    if (game) game.score = newScore;
    document.getElementById('score').textContent = newScore;
}

// --- Sounds, made in the browser (no files): a flap, a point, a hit, the fall, and the swoosh of a screen ---

let audio = null;

// A short tone: its wave, its pitch from start to end (Hz), how long (s) and how loud, after a delay (s)
function tone(wave, from, to, length, volume, delay = 0) {
    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + length);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + length);
}

// Play a sound, if the sound is on (not in a replay: it plays by itself, maybe faster)
function sound(kind) {
    if (!soundOn || GameHub.replaying) return;
    try {
        audio ??= new AudioContext();
        if (audio.state === 'suspended') audio.resume();
        if (kind === 'flap') tone('triangle', 520, 880, 0.09, 0.12);
        if (kind === 'point') {
            tone('square', 988, 988, 0.08, 0.06);
            tone('square', 1319, 1319, 0.14, 0.06, 0.08);
        }
        if (kind === 'hit') tone('sawtooth', 220, 55, 0.18, 0.15);
        if (kind === 'die') tone('triangle', 600, 120, 0.45, 0.12, 0.15);
        if (kind === 'swoosh') tone('sine', 300, 900, 0.18, 0.06);
    } catch (error) {
        soundOn = false; // No Web Audio here
    }
}

// Sound on or off (saved)
function toggleSound() {
    soundOn = !soundOn;
    if (gameData) {
        gameData.sound = soundOn;
        saveGameData(gameData);
    }
    document.dispatchEvent(new Event('flappy:sound'));
}

// --- The game ---

// A new game: back to Get Ready (a game under way is dropped: not kept)
function toReady() {
    const dropped = screen === 'playing';
    if (dropped) run?.discard();
    screen = 'ready';
    paused = false;
    game = null;
    newBest = false;
    document.getElementById('score').textContent = 0;
    if (dropped) saveProgress(); // No game to carry on
    sound('swoosh');
    showStatus();
}

// A new game: a new run, or in a replay, the run being played (its steps and flaps come from the replay)
function startGame(replayRun = null) {
    run = replayRun || GameHub.startRun({ tick: TICK });
    game = GameRules.newGame(run.random);
    if (nightMode) game.gap = 140; // The Easter egg's wider gaps
    previousY = game.y;
    screen = 'playing';
    paused = false;
    newBest = false;
    accumulator = 0;
    bestBefore = highScore;
    document.getElementById('score').textContent = 0;
    showStatus();
}

// A flap, from the player (a key, a click, a tap): it starts a game from Get Ready, resumes a paused one, and on the
// scoreboard goes back to Get Ready
function flap() {
    if (GameHub.replaying || !ready) return;
    if (screen === 'over') {
        if (clock - overAt > OVER_PAUSE) toReady();
        return;
    }
    if (screen === 'dying') return;
    if (screen === 'ready') startGame();
    if (paused) resume();
    run.input('F');
    GameRules.flap(game);
    sound('flap');
}

// A replay's flap
function replayFlap() {
    if (game && screen === 'playing') GameRules.flap(game);
}

// One step of the game (js/rules.js): the bird falls or rises, the pipes come on, a point, or the end
function gameStep() {
    if (!game || screen !== 'playing') return;
    run.step();
    previousY = game.y;
    const moved = GameRules.step(game);
    scroll += GameRules.PIPE_SPEED;
    if (moved === 'scored') {
        document.getElementById('score').textContent = game.score;
        sound('point');
        showStatus();
    } else if (moved === 'over') {
        gameOver();
    }
}

// The bird hit something: the run ends, the best and the medal are kept, and the bird falls to the ground
function gameOver() {
    screen = 'dying';
    paused = false;
    fallY = game.y / 100;
    fallSpeed = Math.max(0, game.speed / 100) / TICK;
    sound('hit');
    if (fallY < GROUND - 12) sound('die');

    const medal = GameRules.medal(game.score);
    newBest = game.score > bestBefore;
    run.finish({ outcome: 'over', result: [{ label: 'Score', value: game.score }], best: newBest });
    if (!GameHub.replaying) {
        if (game.score > highScore) {
            highScore = game.score;
            document.getElementById('highScore').textContent = highScore;
        }
        if (gameData) {
            gameData.highScore = highScore;
            if (medal) gameData.medals[medal]++;
            gameData.game = null; // It ended: no game to carry on
            saveGameData(gameData);
        }
    }
    showStatus();
}

// Pause the game under way (the pause button, Esc; the page hidden; GameHub)
function pause() {
    if (screen !== 'playing' || paused || GameHub.replaying) return;
    paused = true;
    accumulator = 0;
    saveProgress(); // Kept as it is, so closing the page now loses nothing
}

// Carry on
function resume() {
    if (!paused) return;
    paused = false;
    lastFrame = null;
}

// Pause or resume
function togglePause() {
    if (paused) resume();
    else pause();
}

// The game under way goes with what's saved (when it pauses, or the page is hidden or closed), so it carries on next
// time; a game that ended or was dropped is taken out
function saveProgress() {
    if (!gameData || GameHub.replaying) return;
    gameData.game = screen === 'playing' ? { state: GameRules.saveState(game), run: run.save(), best: bestBefore } : null;
    saveGameData(gameData);
}

// A game saved half-way (saveProgress()) carries on, paused, with its run
function resumeSavedGame() {
    const saved = gameData?.game;
    if (!saved || GameHub.replaying || screen !== 'ready') return;

    // The run carries on from where it was (its random numbers too), and the game from its saved state (js/rules.js)
    const resumedRun = GameHub.resumeRun(saved.run);
    const resumed = GameRules.loadState(saved.state, resumedRun.random);
    if (!resumed) {
        // Not a game this version can carry on: drop it
        resumedRun.discard();
        gameData.game = null;
        saveGameData(gameData);
        return;
    }
    run = resumedRun;
    game = resumed;
    previousY = game.y;
    bestBefore = saved.best;
    screen = 'playing';
    paused = true; // It waits for the player: a flap, Esc, or the play button
    newBest = false;
    accumulator = 0;
    document.getElementById('score').textContent = game.score;
    showStatus();
}

// The page hidden or closed, the keyboard gone elsewhere (a click outside GameHub's frame), or GameHub asks: a game
// under way pauses (and is saved)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
});
window.addEventListener('pagehide', pause);
window.addEventListener('blur', pause);
document.addEventListener('gamehub:pause', pause);

// The keys: Space and ↑ flap; Esc pauses; N starts a new game, back at Get Ready (js/extend-controls.js adds W, clicks
// and taps; js/buttons-handler.js, M and I)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || GameHub.replaying) return;
    if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault(); // Not a scroll, or a button that still has focus
        if (!e.repeat) flap();
    } else if (e.key === 'Escape' && !e.repeat) {
        togglePause();
    } else if (e.key === 'n' && !e.repeat) {
        toReady();
    }
});

// A point on the canvas (from a click or a tap): on the pause button, it pauses or resumes; anywhere else, it flaps
function pressCanvas(clientX, clientY) {
    const box = canvas.getBoundingClientRect();
    const x = (clientX - box.left) * WIDTH / box.width;
    const y = (clientY - box.top) * HEIGHT / box.height;
    const onPause = x >= PAUSE_BUTTON.x && x <= PAUSE_BUTTON.x + PAUSE_BUTTON.width
        && y >= PAUSE_BUTTON.y && y <= PAUSE_BUTTON.y + PAUSE_BUTTON.height;
    if (onPause && screen === 'playing') togglePause();
    else flap();
}

// --- Drawing ---

// What the screen says to do: on a touch screen (no mouse), a tap; with a keyboard, its keys, once the page has it (in
// GameHub's frame, a click on the game gives it the keyboard)
const KEYS_HINTS = {
    start: { touch: 'Tap to flap', away: 'Click here to play', keys: 'Press Space to flap' },
    resume: { touch: 'Tap to carry on', away: 'Click here to carry on', keys: 'Space or Esc to carry on' },
    restart: { touch: 'Tap to play again', away: 'Click here to play again', keys: 'Press Space to play again' },
};
function keysHint(action) {
    const hints = KEYS_HINTS[action];
    if (window.matchMedia?.('(pointer: coarse)').matches) return hints.touch;
    return document.hasFocus() ? hints.keys : hints.away;
}

// A colour of the sky's (the Easter egg's night ones, when it's on)
function sky(name) {
    return (nightMode && NIGHT[name]) || COLORS[name];
}

// Text in the original's style: outlined in dark and white, in the pixel font
function outlinedText(text, x, y, size, fill) {
    ctx.save();
    ctx.font = `${size}px 'Pixelify Sans', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size / 4;
    ctx.strokeStyle = COLORS.outline;
    ctx.strokeText(text, x, y);
    ctx.lineWidth = size / 8;
    ctx.strokeStyle = '#fff';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    ctx.restore();
}

// A number in the score's blocky digits, outlined, its middle at x (block: px a block)
function drawNumber(value, x, y, block) {
    const digits = String(value).split('').map(Number);
    const width = digits.length * 6 * block - block;
    let left = Math.round(x - width / 2);
    for (const pass of ['outline', 'fill']) {
        ctx.fillStyle = pass === 'outline' ? COLORS.outline : '#fff';
        const grow = pass === 'outline' ? block / 2 + 1 : 0;
        digits.forEach((digit, i) => {
            DIGITS[digit].forEach((row, r) => {
                for (let c = 0; c < 5; c++) {
                    if (row[c] !== '1') continue;
                    ctx.fillRect(left + (i * 6 + c) * block - grow, y + r * block - grow, block + grow * 2, block + grow * 2);
                }
            });
        });
    }
}

// The sky, its clouds, the city and the bushes (each further back moving slower)
function drawBackground() {
    ctx.fillStyle = sky('sky');
    ctx.fillRect(0, 0, WIDTH, GROUND);
    if (nightMode) {
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % WIDTH, (i * 53) % 260, 1, 1); // Stars
    }

    // Clouds: a row of puffs
    const cloudShift = (scroll * 0.1) % 64;
    ctx.fillStyle = sky('cloud');
    for (let x = -cloudShift - 32; x < WIDTH + 64; x += 64) {
        ctx.beginPath();
        ctx.arc(x, 330, 24, 0, Math.PI * 2);
        ctx.arc(x + 30, 322, 30, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillRect(0, 330, WIDTH, 30);

    // The city: blocks of buildings with windows
    const cityShift = (scroll * 0.25) % 96;
    for (let x = -cityShift - 96; x < WIDTH + 96; x += 96) {
        [[0, 30, 20], [22, 18, 34], [42, 26, 26], [70, 22, 40]].forEach(([dx, width, height]) => {
            ctx.fillStyle = sky('city');
            ctx.fillRect(x + dx, 372 - height, width, height + 10);
            ctx.fillStyle = sky('cityShade');
            for (let wy = 372 - height + 4; wy < 372; wy += 6) {
                for (let wx = x + dx + 3; wx < x + dx + width - 3; wx += 6) ctx.fillRect(wx, wy, 2, 3);
            }
        });
    }

    // Bushes: a row of rounded tops
    const bushShift = (scroll * 0.5) % 40;
    for (const [color, top] of [[sky('bushShade'), 376], [sky('bush'), 382]]) {
        ctx.fillStyle = color;
        for (let x = -bushShift - 40; x < WIDTH + 40; x += 40) {
            ctx.beginPath();
            ctx.arc(x, top + 8, 14, 0, Math.PI * 2);
            ctx.arc(x + 20, top + 4, 16, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillRect(0, top + 8, WIDTH, GROUND - top - 8);
    }
}

// One half of a pipe: its body from y to y + height, and its rim at the gap's side (rimAt: the rim's top)
function drawPipePart(x, y, height, rimAt) {
    const width = GameRules.PIPE_WIDTH;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = COLORS.pipe;
    ctx.fillRect(x + 2, y, width - 4, height);
    ctx.fillStyle = COLORS.pipeLight;
    ctx.fillRect(x + 6, y, 6, height);
    ctx.fillStyle = COLORS.pipeShade;
    ctx.fillRect(x + width - 10, y, 6, height);

    // The rim: a little wider than the body
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 3, rimAt, width + 6, 24);
    ctx.fillStyle = COLORS.pipe;
    ctx.fillRect(x - 1, rimAt + 2, width + 2, 20);
    ctx.fillStyle = COLORS.pipeLight;
    ctx.fillRect(x + 3, rimAt + 2, 6, 20);
    ctx.fillStyle = COLORS.pipeShade;
    ctx.fillRect(x + width - 9, rimAt + 2, 6, 20);
}

// The pipes, moved on by part of a step (offset, px)
function drawPipes(offset) {
    if (!game) return;
    for (const pipe of game.pipes) {
        const x = Math.round(pipe.x - offset);
        drawPipePart(x, -10, pipe.gapTop + 10, pipe.gapTop - 24); // The top half, from above the screen
        const bottom = pipe.gapTop + pipe.gap;
        drawPipePart(x, bottom, GROUND - bottom, bottom); // The bottom half, down to the ground
    }
}

// The ground: its striped top, moving with the pipes, and the sand under it
function drawGround(offset) {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(0, GROUND, WIDTH, 2);
    ctx.fillStyle = COLORS.groundTop;
    ctx.fillRect(0, GROUND + 2, WIDTH, 12);
    ctx.fillStyle = COLORS.groundStripe;
    const shift = Math.round(scroll + offset) % 14;
    for (let x = -shift - 14; x < WIDTH + 14; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND + 14);
        ctx.lineTo(x + 7, GROUND + 2);
        ctx.lineTo(x + 14, GROUND + 2);
        ctx.lineTo(x + 7, GROUND + 14);
        ctx.fill();
    }
    ctx.fillStyle = '#558022';
    ctx.fillRect(0, GROUND + 14, WIDTH, 2);
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(0, GROUND + 16, WIDTH, HEIGHT - GROUND - 16);
    ctx.fillStyle = COLORS.sandShade;
    ctx.fillRect(0, GROUND + 16, WIDTH, 3);
}

// The bird at x, y (its middle, px), turned by angle (radians), its wing up (0), level (1) or down (2)
function drawBird(x, y, angle, wing) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.outline;

    // Body (the Easter egg's: gold, glowing in the night)
    if (nightMode) {
        ctx.shadowColor = 'rgba(255, 215, 0, 0.9)';
        ctx.shadowBlur = 14;
    }
    ctx.fillStyle = nightMode ? '#ffc400' : COLORS.bird;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = nightMode ? '#d98e00' : COLORS.birdBelly;
    ctx.beginPath();
    ctx.ellipse(-1, 6, 12, 5, 0, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(7, -4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.fillRect(8, -6, 3, 5);

    // Beak: two lips
    ctx.fillStyle = COLORS.beak;
    ctx.beginPath();
    ctx.roundRect(6, 1, 14, 5, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.beakLower;
    ctx.beginPath();
    ctx.roundRect(5, 5, 12, 5, 2);
    ctx.fill();
    ctx.stroke();

    // Wing
    const wingY = [-5, 0, 4][wing];
    ctx.fillStyle = COLORS.wing;
    ctx.beginPath();
    ctx.ellipse(-8, wingY, 8, 5, wing === 0 ? -0.4 : wing === 2 ? 0.4 : 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

// The pause button (two bars), or the play button while paused (a triangle)
function drawPauseButton() {
    const { x, y, width, height } = PAUSE_BUTTON;
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, width - 4, height - 4, 3);
    ctx.fill();
    ctx.fillStyle = COLORS.label;
    if (paused) {
        ctx.beginPath();
        ctx.moveTo(x + 9, y + 7);
        ctx.lineTo(x + 19, y + 14);
        ctx.lineTo(x + 9, y + 21);
        ctx.fill();
    } else {
        ctx.fillRect(x + 8, y + 7, 4, 14);
        ctx.fillRect(x + 14, y + 7, 4, 14);
    }
}

// A line of small text, dark on the sky
function hintText(text, y) {
    ctx.save();
    ctx.font = "14px 'Pixelify Sans', monospace";
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLORS.outline;
    ctx.strokeText(text, WIDTH / 2, y);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, WIDTH / 2, y);
    ctx.restore();
}

// Get Ready: the title, the bird bobbing, and how to start
function drawReady() {
    outlinedText('Flappy Bird', WIDTH / 2, 90, 34, '#fff');
    outlinedText('Get Ready!', WIDTH / 2, 150, 28, '#6bd34f');
    const bob = Math.round(Math.sin(clock / 160) * 4);
    drawBird(GameRules.BIRD_X, GameRules.BIRD_START / 100 + bob, 0, Math.floor(clock / 120) % 3);

    // The tap sign: an arrow up, and the hint
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(144, 268);
    ctx.lineTo(132, 284);
    ctx.lineTo(140, 284);
    ctx.lineTo(140, 300);
    ctx.lineTo(148, 300);
    ctx.lineTo(148, 284);
    ctx.lineTo(156, 284);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    hintText(ready ? keysHint('start') : 'Loading…', 326);
}

// A medal (colour and shine), or the empty slot
function drawMedal(x, y, medal) {
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fillStyle = medal ? MEDALS[medal][0] : COLORS.sandShade;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.outline;
    ctx.stroke();
    if (!medal) return;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.strokeStyle = MEDALS[medal][1];
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = MEDALS[medal][1];
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x + 3, y - 3);
    ctx.lineTo(x + 9, y - 2);
    ctx.lineTo(x + 4, y + 3);
    ctx.lineTo(x + 6, y + 9);
    ctx.lineTo(x, y + 6);
    ctx.lineTo(x - 6, y + 9);
    ctx.lineTo(x - 4, y + 3);
    ctx.lineTo(x - 9, y - 2);
    ctx.lineTo(x - 3, y - 3);
    ctx.closePath();
    ctx.fill();
}

// The scoreboard: Game Over, the score and the best, the medal, and how to play again
function drawGameOver() {
    outlinedText('Game Over', WIDTH / 2, 130, 34, '#fc7858');
    const left = 31;
    const top = 180;
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.roundRect(left, top, 226, 116, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.panelLight;
    ctx.beginPath();
    ctx.roundRect(left + 2, top + 2, 222, 112, 6);
    ctx.fill();
    ctx.fillStyle = COLORS.panel;
    ctx.beginPath();
    ctx.roundRect(left + 5, top + 5, 216, 106, 5);
    ctx.fill();

    ctx.font = "13px 'Pixelify Sans', monospace";
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.label;
    ctx.fillText('MEDAL', left + 52, top + 24);
    ctx.textAlign = 'right';
    ctx.fillText('SCORE', left + 206, top + 24);
    ctx.fillText('BEST', left + 206, top + 70);
    drawMedal(left + 52, top + 62, GameRules.medal(game.score));
    ctx.save();
    ctx.translate(left + 206, 0);
    drawRightNumber(game.score, top + 32);
    drawRightNumber(highScore, top + 78);
    ctx.restore();
    if (newBest && !GameHub.replaying) {
        ctx.fillStyle = COLORS.beakLower;
        ctx.beginPath();
        ctx.roundRect(left + 116, top + 62, 34, 15, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = "11px 'Pixelify Sans', monospace";
        ctx.fillText('NEW', left + 133, top + 74);
    }
    if (GameHub.replaying) hintText('The end of the replay', 336);
    else if (clock - overAt > OVER_PAUSE) hintText(keysHint('restart'), 336);
}

// A number in small blocky digits, its right edge at 0 (the scoreboard's)
function drawRightNumber(value, y) {
    const width = String(value).length * 6 * 3 - 3;
    drawNumber(value, -width / 2, y, 3);
}

// Paused: a veil, and how to carry on
function drawPaused() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    outlinedText('Paused', WIDTH / 2, 200, 34, '#fff');
    hintText(keysHint('resume'), 240);
}

// The bird's tilt: nose up just after a flap, then down as it falls faster (radians)
function birdAngle(speed) {
    const degrees = speed < 0 ? -25 : Math.min(90, -25 + speed / 100 * 16);
    return degrees * Math.PI / 180;
}

// Everything, as it is now (alpha: how far into the next step, 0 to 1, for smooth movement)
function draw(alpha) {
    const offset = alpha * GameRules.PIPE_SPEED;
    drawBackground();
    drawPipes(screen === 'playing' ? offset : 0);
    drawGround(screen === 'playing' || screen === 'ready' ? offset : 0);

    if (screen === 'ready') {
        drawReady();
        return;
    }
    if (screen === 'playing') {
        const y = (previousY + (game.y - previousY) * alpha) / 100;
        const wing = game.speed < 200 ? Math.floor(clock / 80) % 3 : 1; // Flapping on the way up, gliding down
        drawBird(GameRules.BIRD_X, y, birdAngle(game.speed), wing);
        drawNumber(game.score, WIDTH / 2, 40, 5);
        drawPauseButton();
        if (paused) drawPaused();
        return;
    }
    drawBird(GameRules.BIRD_X, fallY, Math.PI / 2 * (screen === 'over' ? 1 : Math.min(1, fallSpeed * 4)), 1);
    if (screen === 'dying') drawNumber(game.score, WIDTH / 2, 40, 5);
    else drawGameOver();
}

// Every frame: the steps due (the game moves in fixed steps, whatever the screen's rate), the fall after a hit, and the
// picture
function frame(now) {
    const elapsed = lastFrame === null ? 0 : Math.min(now - lastFrame, 250);
    lastFrame = now;
    clock += elapsed;

    if (screen === 'ready') {
        scroll += elapsed / TICK * GameRules.PIPE_SPEED; // The ground moves on Get Ready too
    } else if (screen === 'playing' && !paused && !GameHub.replaying) {
        accumulator += elapsed;
        for (let steps = 0; accumulator >= TICK && screen === 'playing'; steps++) {
            if (steps === 8) {
                accumulator = 0; // Too far behind (a slow device): drop the rest
                break;
            }
            gameStep();
            accumulator -= TICK;
        }
    } else if (screen === 'dying') {
        fallSpeed = Math.min(fallSpeed + 0.0025 * elapsed, 0.6);
        fallY = Math.min(fallY + fallSpeed * elapsed, GROUND - 12);
        if (fallY >= GROUND - 12) {
            screen = 'over';
            overAt = clock;
            sound('swoosh');
            showStatus();
        }
    }

    const alpha = screen === 'playing' && !paused && !GameHub.replaying ? Math.min(accumulator / TICK, 1) : 0;
    draw(alpha);
    requestAnimationFrame(frame);
}

// Initialize the game: Get Ready, until the player flaps (once GameHub has handed over its tickets, so the first game
// gets one too), or a game saved half-way, paused; or GameHub opened it to play a replay, which plays the game from its
// own steps and flaps
if (GameHub.replaying) {
    GameHub.onReplay({
        begin: (replayRun) => startGame(replayRun),
        input: replayFlap,
        step: gameStep,
    });
}
document.fonts?.load("16px 'Pixelify Sans'").catch(() => {}); // The canvas's text font (css/game.css imports it)
Promise.all([dataLoaded, GameHub.ready()]).then(() => {
    resumeSavedGame();
    ready = true;
    GameHub.playable(); // Ready to play: GameHub stops showing it as loading
});
requestAnimationFrame(frame);
