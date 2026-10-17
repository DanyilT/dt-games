/**
 * Bounce
 *
 * Nokia's Bounce 1.24 (2004), the red rubber ball rolling and jumping through 11 levels, on a phone's screen with its
 * keypad under it. The screen is the phone's 128 × 128 px, scaled up whole, and everything on it is drawn as the phone
 * drew it: the level from Nokia's own sprites (js/sprites.js), the status bar, and the menus in a phone's small font
 * (js/font.js).
 * The rules (the levels, the ball, the spikes, the exit, the points) are in js/rules.js: this file draws the game, takes
 * the keys (js/keypad.js), plays the sounds, keeps the saves, and plays the game through GameRules.
 *
 * Features:
 * - The phone's menu: Continue, the levels reached, New game, High score, Instructions, the sound on or off; the left
 *   soft key (or Esc) opens it, and pauses
 * - "Level N completed!", Game over, Congrats!, and the high score, as the phone showed them
 * - The phone's three tunes, played as notes (Web Audio)
 * - The phone's cheats: 7 8 7 8 9 8 makes the ball invincible, 7 8 7 8 9 9 lets 1 and 3 change the level, # flip
 *   gravity and 5 finish the level (none of it is kept as a run)
 * - Pauses by itself when the page is hidden or loses the keyboard, or GameHub asks; the game is saved then, and at each
 *   level's start, and carries on next time
 * - GameHub's panel and replays (js/gamehub.js): each level is a run, the game moving in fixed steps (GameRules.TICK),
 *   and the keys held recorded with the step they came after, so GameHub can play it again
 *
 * Easter Egg:
 * - `qwerty.js`
 */

// The phone's screen: 128 × 128 px, the game in the top 96, the status bar under it
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const SIZE = 128;
const TICK = GameRules.TICK;
const T = GameRules.TILE;

// The phone's colours
const COLORS = {
    bar: '#0853aa', // the status bar, and the menus' bars
    text: '#fffffe', // the score and "Level N"
    power: '#ff9813', // the power-up bar
    page: '#ffffff', // the menus' background
    ink: '#1a1a1a', // the menus' writing
    shade: '#d9e4f2', // the menus' scroll bar
};

// The phone's words (its lang.xx), and the remake's few more
const TEXT = {
    title: 'Bounce',
    instructions: 'Guide the ball past many obstacles to pass through all the hoops and open the door to the next level. '
        + 'Use key 4 to move the ball left, key 6 to move the ball right and key 2 to bounce the ball. Watch out for spikes. '
        + 'Use deflators to shrink the ball and inflators to return to normal size. Large balls float in water, small balls '
        + 'don’t. Collect crystals for extra points and to store your game position. Collect crystal balls to give your '
        + 'ball an extra life. Jump and speed boosts temporarily boost your powers while rubber floors give you extra bounce.',
    back: 'Back',
    congrats: 'Congrats!',
    continue: 'Continue',
    gameOver: 'Game over',
    highScore: 'High score',
    instructionsTitle: 'Instructions',
    level: (n) => `Level ${n}`,
    completed: (n) => `Level ${n} completed!`,
    newGame: 'New game',
    newHighScore: 'New high score!',
    ok: 'OK',
    select: 'Select',
    levels: 'Levels',
    sound: (on) => `Sound: ${on ? 'on' : 'off'}`,
    cheats: 'Press "787899" to unlock new cheats: Press 1 to go back to the previous level, Press 3 to go to the next level, '
        + 'Press 5 to finish a level and Press # to make ball reverse the gravity. Press "787898" to make the ball invincible.',
};

// The phone's three tunes, as notes: [Hz, ms]
const TUNES = {
    hoop: [[1046.5, 120], [659.26, 120], [783.99, 120], [1046.5, 120]],
    pickup: [[1046.5, 240], [783.99, 120], [1046.5, 240]],
    pop: [[1567.98, 60], [1975.53, 60], [523.25, 120]],
};

// What's on the screen: the game ({ type: 'game' }), a list ({ type: 'list', title, items, index, top, left, right,
// back }) or a page of text ({ type: 'text', title, lines, top, left, onLeft, right, onRight })
let screen = { type: 'loading' };
let game = null; // The level under way (js/rules.js), paused while a menu is on the screen
let run = null; // Its run, recorded so GameHub can play it again (js/gamehub.js)
let next = null; // On "Level completed": the level to go on to, { level, lives, score }
let ready = false; // What's saved and the sprites have loaded: the game can be played
let dirty = true; // The screen needs drawing again
let accumulator = 0; // ms of game time not stepped yet
let lastFrame = null;
let gameData = null; // What's saved (js/storage.js), once it has loaded
let soundOn = true;
let newBest = false; // This game has beaten the high score
let invincible = false; // The cheats (7 8 7 8 9 8, 7 8 7 8 9 9), for as long as the page is open
let levelCheat = false;
let cheatStep = 0;
let monochrome = false; // The Easter egg's black-and-white screen (js/qwerty.js)

// The level's held keys, as js/rules.js takes them: 1 left (navi ← or 4), 2 right (→ or 6), 4 jump (↑ or 2)
function heldKeys() {
    const { left, right, jump } = GameRules.KEYS;
    return (Keypad.isHeld('left') || Keypad.isHeld('4') ? left : 0)
        | (Keypad.isHeld('right') || Keypad.isHeld('6') ? right : 0)
        | (Keypad.isHeld('up') || Keypad.isHeld('2') ? jump : 0);
}

// --- Saving, and GameHub's panel ---

// What's saved: the high score, the levels reached and their bests, the sound, and a game under way
const dataLoaded = loadGameData().then((data) => {
    gameData = data;
    soundOn = gameData.sound;
});

// GameHub's panel: the game's score, its level and the high score; each level's best score and fastest win
function showStatus() {
    const levels = Array.from({ length: GameRules.LEVEL_COUNT }, (_, i) => gameData?.levels[i + 1] ?? null);
    GameHub.status({
        main: [
            { label: 'Score', value: game ? game.score : next ? next.score : 0 },
            { label: 'Level', value: game ? game.level : next ? next.level : null },
            { label: 'Best', value: gameData?.highScore ?? 0 },
        ],
        more: [
            { title: 'Best scores', items: levels.map((best, i) => ({ label: TEXT.level(i + 1), value: best ? best.score : null })) },
            { title: 'Fastest wins', items: levels.map((best, i) => ({ label: TEXT.level(i + 1), value: best ? best.time : null, format: 'time' })) },
        ],
        ongoing: false, // The game under way is saved when it pauses or the page is closed (saveProgress): a reload keeps it
    });
}

// The cheats on, kept with a game saved half-way (a game a cheat was used in): { invincible, levels }, or null
function cheatsOn() {
    return invincible || levelCheat ? { invincible, levels: levelCheat } : null;
}

// The game under way goes with what's saved (at each level's start, when the menu opens, when the page is hidden or
// closed), so it carries on next time, with the cheats if any was used; a game that ended is taken out
function saveProgress() {
    if (!gameData || GameHub.replaying) return;
    const cheats = cheatsOn();
    if (game && !game.over) gameData.game = { state: GameRules.saveState(game), run: run.save() };
    else if (next) gameData.game = { next };
    else gameData.game = null;
    if (gameData.game && cheats) gameData.game.cheats = cheats;
    saveGameData(gameData);
}

// A game saved half-way carries on: its level and run (paused, on the menu), or the next level to start. A game a cheat
// was used in carries on with its cheats on, and its run isn't kept, nor any later one on this page (GameHub.cheated()).
function resumeSavedGame() {
    const saved = gameData?.game;
    if (!saved || GameHub.replaying) return;
    if (saved.cheats) {
        GameHub.cheated();
        invincible = saved.cheats.invincible;
        levelCheat = saved.cheats.levels;
    }
    if (saved.next) {
        next = saved.next;
        return;
    }
    const resumedRun = GameHub.resumeRun(saved.run);
    const resumed = GameRules.loadState(saved.state);
    if (!resumed) {
        // Not a game this version can carry on: drop it
        resumedRun.discard();
        gameData.game = null;
        saveGameData(gameData);
        return;
    }
    run = resumedRun;
    game = resumed;
    invincible ||= game.invincible;
}

// --- Sounds: the phone's tunes, as square waves ---

let audio = null;
let playing = null; // The tune playing (the phone plays one at a time)

// Play a tune, if the sound is on (not in a replay: it plays by itself, maybe faster)
function playTune(name) {
    if (!soundOn || GameHub.replaying || !TUNES[name]) return;
    try {
        audio ??= new AudioContext();
        if (audio.state === 'suspended') audio.resume();
        playing?.stop();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = 'square';
        let at = audio.currentTime;
        for (const [hz, ms] of TUNES[name]) {
            oscillator.frequency.setValueAtTime(hz, at);
            gain.gain.setValueAtTime(0.05, at);
            gain.gain.setValueAtTime(0.05, at + ms / 1000 - 0.008);
            gain.gain.linearRampToValueAtTime(0, at + ms / 1000);
            at += ms / 1000;
        }
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(at);
        playing = oscillator;
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
    if (screen.type === 'list' && screen.kind === 'menu') showMenu(screen.index);
    document.dispatchEvent(new Event('bounce:sound'));
}

// --- The screens ---

// The menu ("Bounce"): Continue when there's a game, the levels reached, New game, High score, Instructions, the sound
function showMenu(index = 0) {
    const items = [];
    if (game || next) items.push({ label: TEXT.continue, action: carryOn });
    if ((gameData?.maxLevel ?? 1) > 1) items.push({ label: TEXT.levels, action: showLevels });
    items.push({ label: TEXT.newGame, action: () => newGame(1) });
    items.push({ label: TEXT.highScore, action: showHighScore });
    items.push({ label: TEXT.instructionsTitle, action: showInstructions });
    items.push({ label: TEXT.sound(soundOn), action: toggleSound });
    screen = {
        type: 'list', kind: 'menu', title: TEXT.title, items, index: Math.min(index, items.length - 1), top: 0,
        left: TEXT.select, right: game ? TEXT.back : null, back: game ? carryOn : null,
    };
    dirty = true;
}

// The levels reached, to start one of them (from: where the menu was, to go back to)
function showLevels(from) {
    const items = Array.from({ length: gameData?.maxLevel ?? 1 }, (_, i) => ({ label: TEXT.level(i + 1), action: () => newGame(i + 1) }));
    screen = { type: 'list', kind: 'levels', title: TEXT.newGame, items, index: 0, top: 0, left: TEXT.select, right: TEXT.back, back: () => showMenu(from) };
    dirty = true;
}

// A page of text, with the soft keys' words and what they do
function showText(title, text, left, onLeft, right = null, onRight = null) {
    screen = { type: 'text', title, lines: PhoneFont.wrap(text, SIZE - 12), top: 0, left, onLeft, right, onRight };
    dirty = true;
}

// High score: the best score of a whole game
function showHighScore(from) {
    showText(TEXT.highScore, String(gameData?.highScore ?? 0), null, null, TEXT.back, () => showMenu(from));
}

// Instructions (with the Easter egg on, the cheats too)
function showInstructions(from) {
    const text = monochrome ? `${TEXT.instructions}\n\n${TEXT.cheats}` : TEXT.instructions;
    showText(TEXT.instructionsTitle, text, null, null, TEXT.back, () => showMenu(from));
}

// --- The game ---

// Pause the level under way: the menu comes up, the keys are let go, and the game is saved
function pause() {
    if (screen.type !== 'game' || GameHub.replaying) return;
    Keypad.releaseAll(); // Keys held through a pause do nothing until they're pressed again, as on the phone
    showMenu();
    saveProgress();
}

// Back to the game (Continue): the level under way, or the next one after "Level completed"
function carryOn() {
    if (next) {
        startLevel(next.level, next.lives, next.score);
        return;
    }
    if (!game) return;
    screen = { type: 'game' };
    accumulator = 0;
    lastFrame = null;
    dirty = true;
}

// A new game from a level: score 0, 3 spare balls (the level under way, if any, is dropped)
function newGame(level) {
    newBest = false;
    startLevel(level, GameRules.START_LIVES, 0);
}

// A level from its start, with the balls and the score so far: a new run
function startLevel(level, lives, score, replayRun = null) {
    run?.discard();
    next = null;
    run = replayRun || GameHub.startRun({ mode: String(level), tick: TICK });
    if (lives !== GameRules.START_LIVES) run.input(`b${lives}`); // The spare balls brought from the level before
    game = GameRules.newGame(level, lives, score);
    game.invincible = invincible;
    screen = { type: 'game' };
    accumulator = 0;
    lastFrame = null;
    dirty = true;
    saveProgress();
    showStatus();
}

// One step of the game (js/rules.js): the keys held, then the ball, the spikes and the exit
function gameStep() {
    if (!game || game.over || screen.type !== 'game') return;
    const keys = heldKeys();
    if (!GameHub.replaying && keys !== game.keys) {
        run.input(keys);
        GameRules.setKeys(game, keys);
    }
    run.step();
    const result = GameRules.step(game);
    const sound = game.sounds[game.sounds.length - 1];
    if (sound) playTune(sound);
    dirty = true;
    if (result === 'won') levelWon();
    else if (result === 'lost') levelLost();
    else if (game.sounds.length) showStatus();
}

// A replay's input: the keys held from now on, or (before the first step) the spare balls the level started with
function replayInput(code) {
    if (!game || game.over) return;
    const lives = GameRules.livesInput(code);
    if (lives !== null && game.steps === 0) game.lives = lives;
    else if (Number.isInteger(code)) GameRules.setKeys(game, code);
}

// The best score so far, kept (the phone keeps it at each level's end and at the end of a game)
function keepHighScore() {
    if (GameHub.replaying || !gameData || game.score <= gameData.highScore) return;
    gameData.highScore = game.score;
    newBest = true;
}

// Through the exit: the run is won, the level's bests kept, and "Level N completed!" (after level 11, Congrats!)
function levelWon() {
    const points = game.score - game.startScore;
    const seconds = Math.floor((game.steps * TICK) / 1000);
    const best = gameData?.levels[game.level];
    const beaten = !GameHub.replaying && (!best || points > best.score || (points === best.score && seconds < best.time));
    run.finish({ outcome: 'won', result: GameRules.result(game), best: beaten });
    if (!GameHub.replaying && gameData) {
        gameData.levels[game.level] = { score: Math.max(points, best?.score ?? 0), time: Math.min(seconds, best?.time ?? seconds) };
        gameData.maxLevel = Math.max(gameData.maxLevel, Math.min(game.level + 1, GameRules.LEVEL_COUNT));
    }
    keepHighScore();
    if (game.level < GameRules.LEVEL_COUNT) {
        next = { level: game.level + 1, lives: game.lives, score: game.score };
        showText('', `${TEXT.completed(game.level)}\n\n${game.score}`, GameHub.replaying ? null : TEXT.continue, carryOn);
    } else {
        next = null;
        showGameOver(TEXT.congrats);
    }
    game = null;
    saveProgress();
    showStatus();
}

// The last ball popped: the run is lost, and Game over
function levelLost() {
    run.finish({ outcome: 'lost', result: GameRules.result(game), best: false });
    keepHighScore();
    showGameOver(TEXT.gameOver);
    game = null;
    next = null;
    saveProgress();
    showStatus();
}

// The end of a game: Game over (or Congrats!), a new high score, and the score
function showGameOver(words) {
    const score = game.score;
    const text = `${words}\n\n${newBest ? `${TEXT.newHighScore}\n\n` : ''}${score}`;
    showText(TEXT.gameOver, text, GameHub.replaying ? null : TEXT.ok, () => {
        newBest = false;
        showMenu();
    });
}

// --- Keys ---

// A phone key pressed: in the game, the cheats and the menu (the ball's keys are read each step); on a menu, moving
// and choosing. Anywhere, 0 shows or hides the page's instructions (js/buttons-handler.js), and the call key opens a
// field to type a code in (js/qwerty.js), the game waiting on the menu meanwhile.
function press(key) {
    if (!ready || GameHub.replaying) return;
    if (key === '0') {
        togglePageInstructions();
        return;
    }
    if (key === 'call') {
        pause();
        openCodeEntry();
        return;
    }
    if (screen.type === 'game') {
        pressInGame(key);
        return;
    }
    if (screen.type === 'list') {
        pressOnList(key);
        return;
    }
    if (screen.type === 'text') pressOnText(key);
}

// The keys in the game: the soft keys and the end key open the menu; 7 8 9 the cheats; with the level cheat, 1 and 3
// the level before and after, # gravity, 5 the level finished
function pressInGame(key) {
    if (key === 'soft-left' || key === 'soft-right' || key === 'end') {
        pause();
        return;
    }
    if (key === '7') cheatStep = cheatStep === 0 || cheatStep === 2 ? cheatStep + 1 : 0;
    if (key === '8') {
        if (cheatStep === 1 || cheatStep === 3) {
            cheatStep++;
        } else {
            if (cheatStep === 5) cheat('invincible');
            cheatStep = 0;
        }
    }
    if (key === '9') {
        if (cheatStep === 4) {
            cheatStep++;
        } else {
            if (cheatStep === 5) cheat('levels');
            cheatStep = 0;
        }
    }
    if (!levelCheat) return;
    if (key === '1' || key === '3') {
        const count = GameRules.LEVEL_COUNT;
        const level = key === '1' ? (game.level + count - 2) % count + 1 : game.level % count + 1;
        startLevel(level, game.lives, game.score);
    } else if (key === 'hash') {
        game.ball.gravCntr = GameRules.POWER_STEPS;
    } else if (key === '5' || key === 'select') {
        game.exitFlag = true;
    }
}

// A cheat (the phone's): the ball can't pop, or the level keys work. Nothing more is kept as a run.
function cheat(kind) {
    GameHub.cheated();
    run?.discard();
    if (kind === 'invincible') {
        invincible = true;
        if (game) game.invincible = true;
        playTune('hoop');
    } else {
        levelCheat = true;
        playTune('pop');
    }
}

// The keys on a list: up and down (the navi key, 2, 8) move, select (5, the left soft key) chooses, Back (the right
// soft key, the end key) goes back
function pressOnList(key) {
    const list = screen;
    if (key === 'up' || key === '2') {
        list.index = (list.index + list.items.length - 1) % list.items.length;
    } else if (key === 'down' || key === '8') {
        list.index = (list.index + 1) % list.items.length;
    } else if (key === 'select' || key === '5' || key === 'soft-left') {
        list.items[list.index].action(list.index);
    } else if ((key === 'soft-right' || key === 'end') && list.back) {
        list.back();
    }
    dirty = true;
}

// The keys on a page: up and down scroll; the soft keys do what the page says (select too, and a page with only
// Back goes back with either); the end key goes back, or to the menu
function pressOnText(key) {
    const page = screen;
    const first = page.onLeft ?? page.onRight;
    if (key === 'up' || key === '2') {
        page.top = Math.max(0, page.top - 1);
    } else if (key === 'down' || key === '8') {
        page.top = Math.max(0, Math.min(page.lines.length - TEXT_ROWS, page.top + 1));
    } else if ((key === 'soft-left' || key === 'select' || key === '5') && first) {
        first();
    } else if (key === 'soft-right' && page.onRight) {
        page.onRight();
    } else if (key === 'end' && page.onRight) {
        page.onRight();
    } else if (key === 'end' && page.onLeft) {
        showMenu();
    }
    dirty = true;
}

Keypad.onPress = press;
Keypad.onRelease = () => {};

// A tap on the screen (js/extend-controls.js), in the screen's px: on a menu, the item or the soft key's word tapped
function tapScreen(x, y) {
    if (!ready || GameHub.replaying || screen.type === 'game' || screen.type === 'loading') return;
    if (y >= SIZE - SOFT_BAR) {
        press(x < SIZE / 2 ? 'soft-left' : 'soft-right');
        return;
    }
    if (screen.type === 'list') {
        const row = Math.floor((y - LIST_TOP) / LIST_ROW);
        const index = screen.top + row;
        if (row >= 0 && index < screen.items.length && y >= LIST_TOP) {
            screen.index = index;
            screen.items[index].action(index);
            dirty = true;
        }
        return;
    }
    press(y < SIZE / 2 ? 'up' : 'down');
}

// --- Drawing ---

const TITLE_BAR = 12; // px: the menus' title
const SOFT_BAR = 11; // px: the soft keys' words, at the bottom
const LIST_TOP = TITLE_BAR + 3;
const LIST_ROW = 12;
const LIST_ROWS = Math.floor((SIZE - SOFT_BAR - LIST_TOP) / LIST_ROW);
const TEXT_TOP = TITLE_BAR + 4;
const TEXT_ROWS = Math.floor((SIZE - SOFT_BAR - TEXT_TOP) / PhoneFont.LINE);

// The score as the phone shows it: 8 digits, with zeros in front
function zeroString(value) {
    let zeros = '';
    if (value < 100) zeros = '0000000';
    else if (value < 1000) zeros = '00000';
    else if (value < 10000) zeros = '0000';
    else if (value < 100000) zeros = '000';
    else if (value < 1000000) zeros = '00';
    else if (value < 10000000) zeros = '0';
    return zeros + value;
}

// The level on the screen: the tiles in view, the ball, the hoops' fronts over it, the status bar, and "Level N"
function drawGame(level) {
    const left = GameRules.viewLeft(level);
    const topRow = level.tileY;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SIZE, GameRules.VIEW_HEIGHT);
    ctx.clip();
    const firstCol = Math.floor(left / T);
    for (let col = firstCol; col <= firstCol + 11; col++) {
        for (let r = 0; r < GameRules.VIEW_ROWS; r++) Sprites.drawTile(ctx, level, col, topRow + r, col * T - left, r * T);
    }
    const ball = level.ball;
    const x = ball.x - left;
    const y = ball.y - topRow * T;
    if (ball.state === GameRules.POPPING) ctx.drawImage(Sprites.poppedBall, x - 6, y - 6);
    else ctx.drawImage(ball.size === 16 ? Sprites.bigBall : Sprites.smallBall, x - ball.half, y - ball.half);
    const minCol = Math.max(0, Math.trunc((ball.x - ball.half) / T));
    const minRow = Math.max(0, Math.trunc((ball.y - ball.half) / T));
    const endCol = Math.min(level.width, Math.trunc((ball.x + ball.half - 1) / T) + 1);
    const endRow = Math.min(level.height, Math.trunc((ball.y + ball.half - 1) / T) + 1);
    for (let col = minCol; col < endCol; col++) {
        for (let row = minRow; row < endRow; row++) {
            Sprites.drawHoopFront(ctx, level.map[row * level.width + col] & 0x3F, col * T - left, (row - topRow) * T);
        }
    }
    ctx.restore();

    // The status bar: the spare balls, the hoops to go, the score, and the power-up's time left
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, GameRules.VIEW_HEIGHT, SIZE, 1);
    ctx.fillStyle = COLORS.bar;
    ctx.fillRect(0, 97, SIZE, 31);
    for (let k = 0; k < level.lives; k++) ctx.drawImage(Sprites.life, 5 + k * 11, 99);
    for (let k = 0; k < level.hoops - level.hoopsPassed; k++) ctx.drawImage(Sprites.hoop, 5 + k * 8, 112);
    PhoneFont.draw(ctx, zeroString(level.score), 64, 100, COLORS.text);
    if (level.hudPower !== 0) {
        ctx.fillStyle = COLORS.power;
        const top = SIZE - Math.trunc((3 * level.hudPower) / 30);
        ctx.fillRect(1, top, 5, SIZE - top);
    }
    if (level.levelText !== 0) PhoneFont.draw(ctx, TEXT.level(level.level), 44, 84, COLORS.text);
}

// A menu's frame: the white page, the title, and the soft keys' words at the bottom
function drawFrame(title, left, right) {
    ctx.fillStyle = COLORS.page;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = COLORS.bar;
    ctx.fillRect(0, 0, SIZE, TITLE_BAR);
    ctx.fillRect(0, SIZE - SOFT_BAR, SIZE, SOFT_BAR);
    if (title) PhoneFont.drawCentred(ctx, title, SIZE / 2, 2, COLORS.text);
    if (left) PhoneFont.draw(ctx, left, 3, SIZE - SOFT_BAR + 2, COLORS.text);
    if (right) PhoneFont.draw(ctx, right, SIZE - 3 - PhoneFont.width(right), SIZE - SOFT_BAR + 2, COLORS.text);
}

// A scroll bar on the right, when there's more than fits
function drawScrollBar(top, shown, total, y0, height) {
    if (total <= shown) return;
    ctx.fillStyle = COLORS.shade;
    ctx.fillRect(SIZE - 4, y0, 3, height);
    ctx.fillStyle = COLORS.bar;
    const barTop = y0 + Math.round((height * top) / total);
    ctx.fillRect(SIZE - 4, barTop, 3, Math.max(4, Math.round((height * shown) / total)));
}

// A list: its items, the chosen one on a bar
function drawList(list) {
    if (list.index < list.top) list.top = list.index;
    if (list.index >= list.top + LIST_ROWS) list.top = list.index - LIST_ROWS + 1;
    drawFrame(list.title, list.left, list.right);
    list.items.slice(list.top, list.top + LIST_ROWS).forEach((item, i) => {
        const y = LIST_TOP + i * LIST_ROW;
        const chosen = list.top + i === list.index;
        if (chosen) {
            ctx.fillStyle = COLORS.bar;
            ctx.fillRect(2, y - 2, SIZE - 8, LIST_ROW - 1);
        }
        PhoneFont.draw(ctx, item.label, 6, y, chosen ? COLORS.text : COLORS.ink);
    });
    drawScrollBar(list.top, LIST_ROWS, list.items.length, LIST_TOP - 2, LIST_ROWS * LIST_ROW);
}

// A page of text
function drawText(page) {
    drawFrame(page.title, page.left, page.right);
    page.lines.slice(page.top, page.top + TEXT_ROWS).forEach((line, i) => {
        PhoneFont.draw(ctx, line, 5, TEXT_TOP + i * PhoneFont.LINE, COLORS.ink);
    });
    drawScrollBar(page.top, TEXT_ROWS, page.lines.length, TEXT_TOP - 2, TEXT_ROWS * PhoneFont.LINE);
}

// The Easter egg: the screen in two shades, as on a black-and-white phone. In the game's view the sky is light, water a
// fine checker, and the rest dark or light by how light it is (the tones in between dithered); on the status bar and
// the menus, blue is dark and everything else light, so the writing and the icons stand out.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function toMonochrome(inGame) {
    const image = ctx.getImageData(0, 0, SIZE, SIZE);
    const px = image.data;
    for (let p = 0; p < SIZE * SIZE; p++) {
        const i = p * 4;
        const x = p % SIZE;
        const y = (p - x) / SIZE;
        const light = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
        const blue = px[i + 2] > px[i] + 60 && px[i + 2] >= px[i + 1];
        let dark;
        if (!inGame || y >= GameRules.VIEW_HEIGHT) {
            dark = blue || light < 0.2;
        } else if (blue && light < 0.6) {
            dark = (x + y) % 2 === 0;
        } else {
            const level = Math.min(1, Math.max(0, (light - 0.4) / 0.35));
            dark = level < (BAYER[(x % 4) + (y % 4) * 4] + 0.5) / 16;
        }
        px[i] = dark ? 34 : 176;
        px[i + 1] = dark ? 44 : 190;
        px[i + 2] = dark ? 32 : 150;
    }
    ctx.putImageData(image, 0, 0);
}

// The screen, as it is now
function draw() {
    dirty = false;
    if (!Sprites.ready || screen.type === 'loading') {
        ctx.fillStyle = COLORS.bar;
        ctx.fillRect(0, 0, SIZE, SIZE);
        PhoneFont.drawCentred(ctx, 'Loading…', SIZE / 2, 60, COLORS.text);
    } else if (screen.type === 'game' && game) {
        drawGame(game);
    } else if (screen.type === 'list') {
        drawList(screen);
    } else if (screen.type === 'text') {
        drawText(screen);
    }
    if (monochrome) toMonochrome(screen.type === 'game' && game !== null);
}

// The screen as big as the room allows for the whole phone (the screen and the keypad), in whole
// steps of the device's pixels, so that every one of the phone's pixels is the same size; on its own, the page's title
// stays in view above it
function fitScreen() {
    if (document.activeElement?.id === 'codeInput') return; // A phone's keyboard is up for the code: the phone stays as it is
    const ratio = window.devicePixelRatio || 1;
    const phone = document.querySelector('.phone');
    const inFrame = document.documentElement.dataset.gamehubView !== undefined;
    const top = inFrame ? 0 : phone.getBoundingClientRect().top + scrollY;
    const roomWidth = innerWidth - (inFrame ? 0 : 24);
    const roomHeight = Math.max(innerHeight - top - (inFrame ? 0 : 12), SIZE);
    for (let n = Math.floor((roomWidth * ratio) / SIZE); n >= 1; n--) {
        document.documentElement.style.setProperty('--screen', `${(n * SIZE) / ratio}px`);
        const box = phone.getBoundingClientRect();
        if (n === 1 || (box.width <= roomWidth && box.height <= roomHeight)) return;
    }
}
window.addEventListener('resize', fitScreen);
document.addEventListener('gamehub:fullscreenchange', fitScreen);

// Every frame: the steps due (the game moves in fixed steps, whatever the screen's rate), and the picture when it
// changed (the phone drew once a step)
function frame(now) {
    const elapsed = lastFrame === null ? 0 : Math.min(now - lastFrame, 250);
    lastFrame = now;
    if (screen.type === 'game' && !GameHub.replaying) {
        accumulator += elapsed;
        for (let steps = 0; accumulator >= TICK && screen.type === 'game'; steps++) {
            if (steps === 8) {
                accumulator = 0; // Too far behind (a slow device): drop the rest, as the phone did
                break;
            }
            gameStep();
            accumulator -= TICK;
        }
    }
    if (dirty) draw();
    requestAnimationFrame(frame);
}

// The page hidden or closed, the keyboard gone elsewhere, or GameHub asks: the game pauses (and is saved)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
});
window.addEventListener('pagehide', () => {
    pause();
    saveProgress();
});
window.addEventListener('blur', pause);
document.addEventListener('gamehub:pause', pause);

// Start: the menu (with Continue, for a game saved half-way), once what's saved and the sprites have loaded and GameHub
// has handed over its tickets; or GameHub opened it to play a replay, which plays a level from its own steps and keys
if (GameHub.replaying) {
    GameHub.onReplay({
        begin: (replayRun) => startLevel(Number(replayRun.mode) || 1, GameRules.START_LIVES, 0, replayRun),
        input: replayInput,
        step: gameStep,
    });
}
fitScreen();
Promise.all([dataLoaded, GameHub.ready(), Sprites.load('img/objects.png')]).then(() => {
    resumeSavedGame();
    ready = true;
    if (!GameHub.replaying) showMenu();
    dirty = true;
    showStatus();
    GameHub.playable(); // Ready to play: GameHub stops showing it as loading
}).catch(() => {
    screen = { type: 'text', title: TEXT.title, lines: ['The game didn’t load.', 'Try again later.'], top: 0 };
    dirty = true;
});
requestAnimationFrame(frame);
