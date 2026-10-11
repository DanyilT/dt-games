/**
 * GameHub support
 *
 * GameHub (https://github.com/DanyilT/game-hub) plays this game in an iframe. This file is the same in every game. It's
 * loaded before the game's own scripts, with the game's id: <script src="js/gamehub.js" data-game="snake"></script>.
 *
 * Saves: the game saves only through window.GameHub.
 * - GameHub.load(): a Promise of the saved data (an object), or null if there's none. It never rejects, and it settles
 *   within 3 s whatever the hub does (at once when the game isn't in GameHub).
 * - GameHub.save(data): keeps data (an object JSON can hold, e.g. { "highScore": 12 }) in this browser, in localStorage
 *   under <game>GameData (snakeGameData for data-game="snake"), and sends it to the player's GameHub account when
 *   connected. It never throws, and returns whether this browser kept it.
 * - GameHub.connected: true once the hub has attached with a signed-in player (false again if their account can't be
 *   read, since then saves stay in this browser).
 * - GameHub.version: 3. GameHub's script checks it to know what this file can do: 2 keeps progress made offline (below),
 *   3 adds GameHub's panel and replays (further below).
 * - GameHub.attach(adapter): for the hub's own script only.
 * Only when the game is in a frame on one of GAMEHUB_ORIGINS does it load that page's /hub-bridge.js, which attaches.
 *
 * Which save wins, signed in: the account's, with two exceptions.
 * - The account has none: this browser's goes up (a first sign-in on a device).
 * - This browser has progress the account doesn't have yet, that carries on from the account's current save: it was
 *   played offline (GameHub can download the game, below), or its last save didn't reach the account. Then this
 *   browser's copy wins, and goes up.
 * To tell, this browser keeps <game>GameSync next to the save: { base, dirty }. base is when the account's save this
 * copy carries on from was saved (null if it never came from the account), and dirty says this browser has saved since.
 * Progress made as a guest on a device doesn't carry on from the account, so the account's save still wins over it.
 * Saves go up only after load() has read the account, so an older copy can't overwrite it. The hub reloads the game when
 * the player signs in or out, so the state at load time is all this needs. Without the hub (played on its own, or the
 * hub can't be reached), everything stays in this browser.
 *
 * Offline: GameHub can download the game to play it offline (the Download button on its page there). GameHub's script
 * then keeps the game's files in this browser and registers sw.js (next to index.html), which answers with them when
 * there's no network.
 *
 * The play area: when the frame loads, and after it changes size, GameHub sends { type: 'gamehub:center' } to ask the
 * game to put its play area in the middle of the frame. The hub can't scroll another site's page, so the game does it.
 * The play area is the element marked data-play-area.
 *
 * The view: in GameHub's frame, the game shows only what's needed to play, and the whole page in full screen.
 * - This file sets data-gamehub-view="frame" on <html> as soon as it finds GameHub around the game (here in <head>,
 *   before anything is drawn, so nothing jumps). A replay is in the frame too.
 * - Then it follows GameHub's { type: 'gamehub:view', view: 'frame' | 'full' }: 'full' when the game's frame goes full
 *   screen, 'frame' when it comes back (and after each load).
 * - Each game's css/page.css says what the frame shows, with [data-gamehub-view="frame"] rules. Played on its own, the
 *   page has no attribute, and shows as it is.
 * - GameHub.fullScreen(full): the game's own controls can put it in full screen (true) or take it out (false). The game
 *   asks the browser for its own page, which GameHub's frame allows, and GameHub, seeing its frame fill the screen,
 *   says 'full'. Full screen GameHub started (its own button) only GameHub can end, so then the game asks it:
 *   { type: 'gamehub:fullscreen', full: false } to GameHub's page (and { full: true } if the browser won't let the
 *   game itself). GameHub.isFullScreen(): whether the game fills the screen, either way; the game hears a
 *   'gamehub:fullscreenchange' event on document whenever that may have changed. GameHub.canFullScreen(): whether
 *   fullScreen(true) can work (not on an iPhone, played on its own), so a game's full-screen control can say when it
 *   can't (Minesweeper's window buttons). GameHub has its own full-screen buttons, so most games need none.
 *
 * Pausing and loading:
 * - GameHub sends { type: 'gamehub:pause' } when the game should stop and wait for the player (its frame scrolled out of
 *   view, a dialog opened over it). The game hears it as a 'gamehub:pause' event on document: a game that moves by
 *   itself (Snake, Tetris) pauses, the others needn't.
 * - GameHub.playable(): the game is on screen and ready to play, so GameHub can stop showing it as loading. It sends
 *   { type: 'gamehub:playable' } to GameHub's page, once.
 *
 * GameHub's panel, under the game: the game's numbers, and its runs to watch again.
 * - GameHub.status({ main, more, ongoing }): what the panel shows, sent again whenever it changes (GameHub hears it at
 *   most every 250 ms). main: up to 4 { label, value }, shown large (the score now, the best); more: up to 8 sections
 *   { title, items: [{ label, value }] } behind the panel's More button (wins and best times per level: what else is
 *   saved); ongoing: true while a game is under way that a reload would lose (GameHub asks before starting a replay
 *   then). A value is a number, a short text, or null (shown as —). With format: 'time', a number is seconds (1:05).
 * - GameHub.startRun({ mode, tick }): a run, from the start of a game to its end, recorded so the player can watch it
 *   again in GameHub. mode: the level it's played at ('expert'), if the game has levels. tick: the ms between the
 *   game's steps, for a game that moves by itself (Snake, Tetris); none for one that waits for the player (Minesweeper,
 *   Sudoku). The run (one at a time: starting one forgets the one before, if it hasn't ended) has:
 *   - run.random(): a number from 0 up to 1, like Math.random(), but from the run's seed. All the game's randomness
 *     (the food, the pieces, the mines, the puzzle) must come from it, so that a replay plays out the same.
 *   - run.step(): one step of the game (games with a tick), called as each step starts.
 *   - run.input(code): an input that changes the game, as a whole number or a short text the game understands ('L',
 *     45…), recorded with the step it came after (games with a tick) or its time. A replay gives it to the game again.
 *   - run.finish({ outcome, result, best }): the game is over. outcome: 'won', 'lost' or 'over'; result: up to 3
 *     { label, value } for GameHub's list of runs (score, time, level); best: true if it beat the player's best. In
 *     GameHub it's kept with the player's runs, in their browser. A run without a single input isn't kept.
 *   - run.discard(): forgets it (the player started again before it ended).
 *   - run.save() and GameHub.resumeRun(saved), for a game kept half-way (Sudoku's puzzle in progress): save() gives
 *     what to keep with it (an object JSON can hold), and resumeRun() carries on recording from there, as a run.
 *   - run.time: the game's time so far, in ms (steps × tick, or the time on screen since it started).
 * - Tickets: for a signed-in player, GameHub hands the game a few tickets, each a seed its server chose. startRun() takes
 *   one, so GameHub can check the run on its server afterwards by playing it again (records come only from runs it has
 *   checked); a run that starts without one (a guest's, or offline once they've run out) stays the player's own.
 *   GameHub.ready(): a Promise that settles once GameHub has handed them over (or isn't there, or the player isn't
 *   signed in; 3 s at most). A game that starts a run by itself as it loads (Tetris, Minesweeper, a new Sudoku) waits
 *   for it first, so that run gets a ticket too.
 * - GameHub.cheated(): a cheat was used on this page (the console, an Easter egg), so neither the run under way nor any
 *   later one is kept.
 * - Replays: GameHub opens the game with #gamehub-replay at the end of its address to play one. GameHub.replaying is
 *   then true: the game must not start a game of its own, nor take the player's inputs; nothing is saved, and runs
 *   aren't recorded. The game gives GameHub.onReplay({ begin(run), input(code), step() }) the functions it plays a run
 *   with: begin(run) starts a game the way GameHub.startRun() would (run.mode is the level, run.random() gives the same
 *   numbers, and run.time is the game's time at the input being played, for its clock), input(code) is an input from
 *   the run, and step() one step (games with a tick). GameHub calls them at the run's own pace (or 2× or 4× as fast),
 *   leaving out any wait longer than 2 s between inputs of a game without a tick.
 * Seeds: run.random() is mulberry32, from a 32-bit seed. GameHub can replay a run anywhere with the same numbers.
 */

// The only pages the game connects to, and loads a script from: GameHub, and its local dev server
const GAMEHUB_ORIGINS = Object.freeze([
    'https://game-hub.danyt.workers.dev',
    'https://gamehub.foo',
    'http://localhost:3000',
]);

// GameHub's messages to the page: where its play area goes, and how much of the page shows (see the top of this file)
window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;

    if (event.data?.type === 'gamehub:view' && ['frame', 'full'].includes(event.data.view)) {
        document.documentElement.dataset.gamehubView = event.data.view;
        document.dispatchEvent(new Event('gamehub:fullscreenchange'));
        return;
    }
    if (event.data?.type === 'gamehub:pause') {
        document.dispatchEvent(new Event('gamehub:pause')); // The game pauses, if it moves by itself
        return;
    }
    if (event.data?.type !== 'gamehub:center') return;

    const playArea = document.querySelector('[data-play-area]');
    if (!playArea) return;

    const box = playArea.getBoundingClientRect();
    window.scrollBy({ top: box.top - (innerHeight - box.height) / 2, left: box.left - (innerWidth - box.width) / 2 });
});

// The game's own full screen, on or off: GameHub.isFullScreen() may have changed (see the top of this file)
for (const type of ['fullscreenchange', 'webkitfullscreenchange']) {
    document.addEventListener(type, () => document.dispatchEvent(new Event('gamehub:fullscreenchange')));
}

// window.GameHub: saves in this browser, and in the player's GameHub account when the hub is there
(function () {
    const LOAD_DEADLINE = 3000; // ms: load() settles by then, whatever the hub does
    const ATTACH_TIMEOUT = 2500; // ms: the hub's script has this long to attach
    const HUB_SAVE_LIMIT = 64 * 1024; // bytes: the hub refuses bigger saves
    const STATUS_EVERY = 250; // ms: the hub hears the game's numbers at most this often
    const MAX_INPUTS = 20000; // a run with more inputs is too long to keep
    const REPLAY_MAX_WAIT = 2000; // ms: a replay of a game without a tick skips longer waits between inputs
    const REPLAY_REPORT_EVERY = 250; // ms: how often a replay tells the hub how far it has got
    const REPLAY_SPEEDS = [1, 2, 4];
    const TICKETS_WAIT = 3000; // ms: ready() waits this long for the tickets, once the hub has attached

    const game = document.currentScript?.dataset.game;
    if (!game) {
        console.warn('js/gamehub.js needs the game\'s id on its <script> tag, e.g. data-game="snake"');
    }
    const storageKey = `${game || 'game'}GameData`;
    const syncKey = `${game || 'game'}GameSync`;

    let hub = null; // The hub's adapter, while it's connected with a signed-in player (saves)
    let panel = null; // The hub's adapter (version 3), signed in or not: the panel's numbers, runs and replays
    let synced = false; // load() has read the account, so saves may go up
    let stopWaiting = null; // Ends the wait for the hub's script, while there is one
    let lastSent = 0; // The number of the newest save sent to the hub (the hub says when each one lands)

    // Something the game could have saved: an object (not null, not an array)
    function isData(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    // This browser's copy, or null (none, storage blocked, or not readable)
    function readLocal() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey));
            return isData(saved) ? saved : null;
        } catch (error) {
            return null;
        }
    }

    // Keep a save (JSON) in this browser; false if the browser won't
    function writeLocal(json) {
        try {
            localStorage.setItem(storageKey, json);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Where this browser's copy stands against the account: { base, dirty } (see the top of this file)
    function readSync() {
        try {
            const sync = JSON.parse(localStorage.getItem(syncKey));
            return { base: typeof sync?.base === 'string' ? sync.base : null, dirty: sync?.dirty === true };
        } catch (error) {
            return { base: null, dirty: false };
        }
    }

    function writeSync(sync) {
        try {
            localStorage.setItem(syncKey, JSON.stringify(sync));
        } catch (error) {
            // Storage blocked: the account's save wins next time, as it would anyway
        }
    }

    // Leave the hub out for the rest of this visit (its account can't be read)
    function goOffline() {
        hub = null;
        synced = false;
    }

    // Send a save to the account, numbered, without waiting, and without the hub's trouble ever reaching the game
    function sendToHub(data) {
        lastSent += 1;
        try {
            Promise.resolve(hub.save(data, lastSent)).catch(() => {});
        } catch (error) {
            // The save is in this browser anyway
        }
    }

    // The hub says save number `seq` is in the account, saved at `updatedAt`. Only the newest save sent counts: an
    // older one landing doesn't make this browser's copy the same as the account's.
    function onSynced(seq, updatedAt) {
        if (seq === lastSent && typeof updatedAt === 'string') writeSync({ base: updatedAt, dirty: false });
    }

    // The GameHub page around the game, or null (not in a frame, or in any other page)
    function findHub() {
        if (window.parent === window) return null;
        let origin;
        try {
            origin = location.ancestorOrigins?.[0] || new URL(document.referrer).origin;
        } catch (error) {
            return null; // No referrer to tell
        }
        return GAMEHUB_ORIGINS.includes(origin) ? origin : null;
    }

    // Inside GameHub: load its script, and give it ATTACH_TIMEOUT to attach (a script that doesn't load, or doesn't
    // attach, leaves the game offline)
    const hubOrigin = findHub();
    // In GameHub's frame, the page shows only what's needed to play, until GameHub says it's full screen
    if (hubOrigin) document.documentElement.dataset.gamehubView = 'frame';
    // GameHub opened the game to play a replay (see the top of this file)
    const replaying = Boolean(hubOrigin) && location.hash === '#gamehub-replay';
    let signedIn = false; // what the hub said when it attached
    const attached = new Promise((resolve) => {
        if (!hubOrigin) {
            resolve();
            return;
        }
        stopWaiting = () => {
            stopWaiting = null;
            resolve();
        };
        const script = document.createElement('script');
        script.async = true;
        script.src = `${hubOrigin}/hub-bridge.js`;
        script.onerror = () => stopWaiting?.();
        (document.head || document.documentElement).appendChild(script);
        setTimeout(() => stopWaiting?.(), ATTACH_TIMEOUT);
    });

    // Whether the game fills the screen: its own full screen, or its frame's in GameHub
    function isFullScreen() {
        return Boolean(document.fullscreenElement ?? document.webkitFullscreenElement)
            || document.documentElement.dataset.gamehubView === 'full';
    }

    // Whether fullScreen(true) can work: the browser lets the page fill the screen, or GameHub can do it for the game
    function canFullScreen() {
        return Boolean(hubOrigin || document.fullscreenEnabled || document.webkitFullscreenEnabled);
    }

    // Ask GameHub to put its frame in full screen, or take it out (see the top of this file)
    function askHubFullScreen(full) {
        if (hubOrigin) window.parent.postMessage({ type: 'gamehub:fullscreen', full }, hubOrigin);
    }

    // Full screen on (true) or off (false), from the game's own controls (see the top of this file)
    function fullScreen(full) {
        const own = document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
        if (full) {
            if (isFullScreen()) return;
            const root = document.documentElement;
            const request = root.requestFullscreen ?? root.webkitRequestFullscreen;
            if (!request) {
                askHubFullScreen(true);
                return;
            }
            try {
                Promise.resolve(request.call(root)).catch(() => askHubFullScreen(true));
            } catch (error) {
                askHubFullScreen(true);
            }
        } else if (own) {
            (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document);
        } else if (isFullScreen()) {
            askHubFullScreen(false); // GameHub put the frame in full screen: only GameHub can take it out
        }
    }

    // The game is ready to play: GameHub can stop showing it as loading (once, and only in GameHub)
    let saidPlayable = false;
    function playable() {
        if (saidPlayable || !hubOrigin) return;
        saidPlayable = true;
        window.parent.postMessage({ type: 'gamehub:playable' }, hubOrigin);
    }

    // A save as JSON text, or undefined if it isn't something the game could have saved
    function toJson(data) {
        try {
            return isData(data) ? JSON.stringify(data) : undefined;
        } catch (error) {
            return undefined;
        }
    }

    // The account's save (or this browser's, when there's no hub); nothing is written or sent once isOpen() is false
    async function loadFromHub(isOpen) {
        await attached;
        const adapter = hub;
        if (!adapter) return readLocal(); // No hub, or signed out

        let saved;
        try {
            saved = await adapter.load();
        } catch (error) {
            if (isOpen()) goOffline();
            return readLocal();
        }
        if (!isOpen()) return null; // Too late: load() has settled without it

        // Adapters from version 2 on answer { data, updatedAt }; version 1 adapters, the data alone
        const account = adapter.version >= 2 ? saved : (saved === null || saved === undefined ? null : { data: saved, updatedAt: null });
        if (account === null || account === undefined) {
            // The account has none: this browser's goes up (a first sign-in on this device)
            synced = true;
            const local = readLocal();
            if (local) sendToHub(local);
            return local;
        }

        const json = toJson(account.data);
        if (json === undefined) {
            goOffline(); // Not something the game saved: leave the account alone
            return readLocal();
        }

        // This browser played on from the account's save (offline, or its last save didn't reach the account): it wins
        const local = readLocal();
        const sync = readSync();
        if (local && sync.dirty && typeof account.updatedAt === 'string' && sync.base === account.updatedAt) {
            synced = true;
            sendToHub(local);
            return local;
        }

        writeLocal(json); // The account's save wins, here too
        writeSync({ base: typeof account.updatedAt === 'string' ? account.updatedAt : null, dirty: false });
        synced = true;
        return JSON.parse(json);
    }

    // The saved data or null: never rejects, and settles within LOAD_DEADLINE
    function load() {
        if (!hubOrigin) return Promise.resolve(readLocal());
        // A replay only reads: this browser's copy, once the hub's script has put the player's own in place
        if (replaying) return attached.then(readLocal);

        return new Promise((resolve) => {
            let open = true;
            const finish = (data) => {
                if (!open) return;
                open = false;
                clearTimeout(deadline);
                resolve(data);
            };
            const deadline = setTimeout(() => {
                goOffline();
                finish(readLocal());
            }, LOAD_DEADLINE);
            loadFromHub(() => open).then(finish, () => finish(readLocal()));
        });
    }

    // Keep data in this browser, and send it to the account when connected; true if this browser kept it
    function save(data) {
        if (replaying) return false; // A replay changes nothing
        const json = toJson(data);
        if (json === undefined) {
            console.warn('GameHub.save() takes an object JSON can hold, like { "highScore": 12 }: nothing was saved');
            return false;
        }

        const kept = writeLocal(json);
        if (kept) {
            const sync = readSync();
            if (!sync.dirty) writeSync({ base: sync.base, dirty: true }); // until the account has it
        }
        if (hub && synced) {
            const size = new TextEncoder().encode(json).length;
            if (size > HUB_SAVE_LIMIT) {
                console.warn(`GameHub.save(): ${size} bytes is over the hub's 64 KB, so this save stays in this browser`);
            } else {
                sendToHub(JSON.parse(json));
            }
        }
        return kept;
    }

    // Tell the hub's panel something, without the hub's trouble ever reaching the game
    function tellPanel(kind, value) {
        try {
            panel?.[kind]?.(value);
        } catch (error) {
            // The game goes on without the panel
        }
    }

    // ==========================================
    // The panel's numbers
    // ==========================================
    let status = null; // The newest numbers, as JSON-safe data
    let statusTimer = null;
    let statusSentAt = 0;

    function sendStatus() {
        clearTimeout(statusTimer);
        statusTimer = null;
        statusSentAt = Date.now();
        if (status) tellPanel('status', status);
    }

    // The game's numbers for GameHub's panel (see the top of this file); false if they aren't an object JSON can hold
    function setStatus(info) {
        const json = toJson(info);
        if (json === undefined) {
            console.warn('GameHub.status() takes an object, like { main: [{ label: "Score", value: 12 }] }');
            return false;
        }
        status = JSON.parse(json);
        if (statusTimer === null) statusTimer = setTimeout(sendStatus, Math.max(0, statusSentAt + STATUS_EVERY - Date.now()));
        return true;
    }

    // ==========================================
    // Runs
    // ==========================================
    // mulberry32: numbers from 0 up to 1 from a 32-bit seed, the same everywhere for the same seed
    function seededRandom(seed) {
        let state = seed | 0;
        return function () {
            state = (state + 0x6D2B79F5) | 0;
            let t = Math.imul(state ^ (state >>> 15), 1 | state);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function newSeed() {
        try {
            return crypto.getRandomValues(new Uint32Array(1))[0];
        } catch (error) {
            return Math.floor(Math.random() * 4294967296);
        }
    }

    function newRunId() {
        return `${Date.now().toString(36)}-${newSeed().toString(36)}`;
    }

    const isCode = (code) => (Number.isSafeInteger(code) && code >= 0) || (typeof code === 'string' && code.length > 0 && code.length <= 16);
    const isMode = (mode) => mode === null || (typeof mode === 'string' && mode.length <= 32);
    const isTick = (tick) => tick === null || (Number.isSafeInteger(tick) && tick >= 1 && tick <= 10000);

    let runsOff = replaying; // GameHub.cheated(), or a replay: no run is kept
    let currentRun = null; // The run being recorded (one at a time)

    // Tickets from the hub: [{ id, seed }], one per run. One taken on this page is never taken again, even if the hub
    // still lists it.
    let tickets = [];
    const usedTickets = new Set();
    let markReady = null;
    const ready = new Promise((resolve) => {
        markReady = resolve;
    });
    if (!hubOrigin) markReady();
    attached.then(() => {
        if (!panel || !signedIn || replaying) markReady();
        else setTimeout(markReady, TICKETS_WAIT);
    });

    function setTickets(list) {
        if (!Array.isArray(list)) return;
        tickets = list.filter((ticket) => isData(ticket) && typeof ticket.id === 'string' && ticket.id.length <= 40
            && Number.isSafeInteger(ticket.seed) && ticket.seed >= 0 && ticket.seed < 4294967296 && !usedTickets.has(ticket.id))
            .map(({ id, seed }) => ({ id, seed }));
        markReady();
    }

    function takeTicket() {
        const ticket = tickets.shift() ?? null;
        if (ticket) usedTickets.add(ticket.id);
        return ticket;
    }

    // A run that records nothing (a replay, a cheat, or a run the game asked for wrongly)
    function idleRun(mode) {
        return {
            seed: 0,
            mode: isMode(mode) ? mode : null,
            random: Math.random,
            step() {},
            input() {},
            finish() {},
            discard() {},
            save() {
                return null;
            },
            get time() {
                return 0;
            },
        };
    }

    // A run being recorded, from its state: { id, seed, mode, tick, length, last, draws, inputs } (see run.save())
    function recordingRun(state) {
        const next = seededRandom(state.seed);
        for (let i = 0; i < state.draws; i += 1) next(); // Resumed: the numbers carry on from where they were
        let ended = false;
        let tooLong = false;

        // Games without a tick count their time in ms, while the page is on screen
        let clockFrom = null; // performance.now() while the clock runs
        const startClock = () => {
            if (clockFrom === null && !document.hidden) clockFrom = performance.now();
        };
        const stopClock = () => {
            if (clockFrom === null) return;
            state.length += Math.round(performance.now() - clockFrom);
            clockFrom = null;
        };
        const onVisibility = () => (document.hidden ? stopClock() : startClock());
        const now = () => (state.tick || clockFrom === null ? state.length : state.length + Math.round(performance.now() - clockFrom));
        const end = () => {
            ended = true;
            if (!state.tick) {
                stopClock();
                document.removeEventListener('visibilitychange', onVisibility);
            }
            if (currentRun === run) currentRun = null;
        };
        if (!state.tick) {
            document.addEventListener('visibilitychange', onVisibility);
            startClock();
        }

        const run = {
            seed: state.seed,
            mode: state.mode,
            random() {
                state.draws += 1;
                return next();
            },
            step() {
                if (!ended && state.tick) state.length += 1;
            },
            input(code) {
                if (ended || tooLong) return;
                if (!isCode(code)) {
                    console.warn('run.input() takes a whole number or a text of up to 16 characters');
                    return;
                }
                if (state.inputs.length >= MAX_INPUTS * 2) {
                    tooLong = true; // Too long to keep
                    return;
                }
                const at = now();
                state.inputs.push(at - state.last, code);
                state.last = at;
            },
            finish({ outcome = 'over', result = [], best = false } = {}) {
                if (ended) return;
                const length = now();
                end();
                if (runsOff || tooLong || state.inputs.length === 0) return;
                const record = {
                    v: 1,
                    id: state.id,
                    ticket: state.ticket,
                    seed: state.seed,
                    mode: state.mode,
                    tick: state.tick,
                    length,
                    inputs: state.inputs,
                    outcome: ['won', 'lost', 'over'].includes(outcome) ? outcome : 'over',
                    result: Array.isArray(result) ? result.slice(0, 3) : [],
                    best: best === true,
                };
                const json = toJson(record);
                if (json !== undefined) tellPanel('run', JSON.parse(json));
            },
            discard() {
                if (!ended) end();
            },
            save() {
                if (ended) return null;
                return {
                    v: 1, id: state.id, ticket: state.ticket, seed: state.seed, mode: state.mode, tick: state.tick, length: now(),
                    last: state.last, draws: state.draws, inputs: state.inputs.slice(),
                };
            },
            get time() {
                return state.tick ? state.length * state.tick : now();
            },
        };
        return run;
    }

    // A new run (see the top of this file)
    function startRun({ mode = null, tick = null } = {}) {
        currentRun?.discard();
        if (runsOff || !isMode(mode) || !isTick(tick)) {
            if (!runsOff) console.warn('GameHub.startRun() takes { mode: a short text or null, tick: whole ms or null }');
            return idleRun(mode);
        }
        const ticket = takeTicket();
        currentRun = recordingRun({
            id: newRunId(), ticket: ticket?.id ?? null, seed: ticket ? ticket.seed : newSeed(), mode, tick, length: 0, last: 0,
            draws: 0, inputs: [],
        });
        tellPanel('runStart', { ticket: ticket?.id ?? null });
        return currentRun;
    }

    // A run carried on from what run.save() gave (an idle run when that isn't one)
    function resumeRun(saved) {
        currentRun?.discard();
        const valid = isData(saved) && saved.v === 1 && typeof saved.id === 'string' && saved.id.length <= 40
            && (saved.ticket === undefined || saved.ticket === null || (typeof saved.ticket === 'string' && saved.ticket.length <= 40))
            && Number.isSafeInteger(saved.seed) && saved.seed >= 0 && saved.seed < 4294967296 && isMode(saved.mode)
            && isTick(saved.tick) && [saved.length, saved.last, saved.draws].every((n) => Number.isSafeInteger(n) && n >= 0)
            && saved.last <= saved.length && Array.isArray(saved.inputs) && saved.inputs.length % 2 === 0
            && saved.inputs.length <= MAX_INPUTS * 2
            && saved.inputs.every((value, i) => (i % 2 === 0 ? Number.isSafeInteger(value) && value >= 0 : isCode(value)));
        if (runsOff || !valid) return idleRun(isData(saved) ? saved.mode : null);
        currentRun = recordingRun({ ...saved, ticket: saved.ticket ?? null, inputs: saved.inputs.slice() });
        return currentRun;
    }

    // A cheat was used: nothing more is kept from this page
    function cheated() {
        runsOff = true;
        currentRun?.discard();
    }

    // ==========================================
    // Replays
    // ==========================================
    let replayer = null; // The game's { begin, input, step }
    let waitingReplay = null; // A replay the hub asked for before the game gave its replayer
    let replay = null; // The replay under way
    let replayReportedAt = 0;

    function reportReplay(force = false) {
        if (!replay || (!force && Date.now() - replayReportedAt < REPLAY_REPORT_EVERY)) return;
        replayReportedAt = Date.now();
        const { record } = replay;
        const position = record.tick ? replay.done * record.tick : replay.at;
        let state = 'playing';
        if (replay.error) state = 'error';
        else if (replay.ended) state = 'ended';
        else if (replay.paused) state = 'paused';
        tellPanel('replayState', { state, position, length: record.tick ? record.length * record.tick : record.length });
    }

    function failReplay() {
        clearTimeout(replay.timer);
        replay.error = true;
        reportReplay(true);
    }

    function endReplay() {
        replay.ended = true;
        if (!replay.record.tick) replay.at = replay.record.length;
        reportReplay(true);
    }

    // Games with a tick: the inputs that came after the steps played so far
    function playDueInputs() {
        const { events } = replay;
        while (replay.next < events.length && events[replay.next].at <= replay.done) {
            replayer.input(events[replay.next].code);
            replay.next += 1;
        }
    }

    // The next thing in the replay, after its wait: a step (games with a tick) or an input
    function scheduleReplay() {
        if (!replay || replay.paused || replay.ended || replay.error) return;
        const { record, events } = replay;
        if (record.tick) {
            replay.timer = setTimeout(() => {
                if (replay.done >= record.length) {
                    endReplay();
                    return;
                }
                try {
                    replayer.step();
                    replay.done += 1;
                    playDueInputs();
                } catch (error) {
                    failReplay();
                    return;
                }
                reportReplay();
                scheduleReplay();
            }, record.tick / replay.speed);
            return;
        }
        if (replay.next >= events.length) {
            endReplay();
            return;
        }
        const event = events[replay.next];
        replay.timer = setTimeout(() => {
            replay.at = event.at;
            replay.next += 1;
            try {
                replayer.input(event.code);
            } catch (error) {
                failReplay();
                return;
            }
            reportReplay();
            scheduleReplay();
        }, Math.min(event.at - replay.at, REPLAY_MAX_WAIT) / replay.speed);
    }

    // A run from the hub, checked, with its inputs at the times they came: { record, events }, or null
    function readRecord(record) {
        const valid = isData(record) && record.v === 1 && Number.isSafeInteger(record.seed) && record.seed >= 0
            && record.seed < 4294967296 && isMode(record.mode) && isTick(record.tick)
            && Number.isSafeInteger(record.length) && record.length >= 0 && Array.isArray(record.inputs)
            && record.inputs.length % 2 === 0 && record.inputs.length <= MAX_INPUTS * 2;
        if (!valid) return null;
        const events = [];
        let at = 0;
        for (let i = 0; i < record.inputs.length; i += 2) {
            const wait = record.inputs[i];
            const code = record.inputs[i + 1];
            if (!Number.isSafeInteger(wait) || wait < 0 || !isCode(code)) return null;
            at += wait;
            events.push({ at, code });
        }
        return { record, events };
    }

    function startReplay(raw, speed) {
        const read = readRecord(raw);
        replay = { record: read?.record ?? { tick: null, length: 0 }, events: read?.events ?? [], next: 0, done: 0, at: 0, speed, paused: false, ended: false, error: false, timer: null };
        if (!read || (read.record.tick && typeof replayer.step !== 'function')) {
            failReplay();
            return;
        }
        const { record } = read;
        const random = seededRandom(record.seed);
        const run = idleRun(record.mode);
        run.seed = record.seed;
        run.random = random;
        Object.defineProperty(run, 'time', { get: () => (record.tick ? replay.done * record.tick : replay.at) });
        try {
            replayer.begin(run);
            if (record.tick) playDueInputs();
        } catch (error) {
            failReplay();
            return;
        }
        reportReplay(true);
        scheduleReplay();
    }

    // What the hub asks of a replay: { action: 'play', run, speed } | { action: 'pause' | 'resume' } | { action: 'speed', speed }
    function replayCommand(command) {
        if (!replaying || !isData(command)) return;
        const speed = REPLAY_SPEEDS.includes(command.speed) ? command.speed : 1;
        if (command.action === 'play') {
            if (replay) return; // One replay per page: the hub reloads the game for the next
            if (replayer) startReplay(command.run, speed);
            else waitingReplay = { run: command.run, speed };
            return;
        }
        if (!replay && waitingReplay && command.action === 'speed') {
            waitingReplay.speed = speed; // Not started yet: it starts at that speed
            return;
        }
        if (!replay || replay.ended || replay.error) return;
        if (command.action === 'pause' && !replay.paused) {
            replay.paused = true;
            clearTimeout(replay.timer);
        } else if (command.action === 'resume' && replay.paused) {
            replay.paused = false;
            scheduleReplay();
        } else if (command.action === 'speed') {
            replay.speed = speed;
            clearTimeout(replay.timer);
            scheduleReplay(); // The current wait starts again at the new speed
        } else {
            return;
        }
        reportReplay(true);
    }

    // The game's replayer: { begin(run), input(code), step() } (see the top of this file); false if it isn't one
    function onReplay(player) {
        if (!player || typeof player.begin !== 'function' || typeof player.input !== 'function') {
            console.warn('GameHub.onReplay() takes { begin(run), input(code), step() }');
            return false;
        }
        replayer = player;
        if (waitingReplay && !replay) {
            const { run, speed } = waitingReplay;
            waitingReplay = null;
            startReplay(run, speed);
        }
        return true;
    }

    // For the hub's script: { version: 1, 2 or 3, signedIn, load: () => Promise, save: (data, seq) => void }, and from
    // version 3 { status(info), run(record), runStart({ ticket }), replayState(state) } for its panel (state: { state:
    // 'playing', 'paused', 'ended' or 'error', position, length }, in ms of the game's time). Version 2's load() answers
    // { data, updatedAt } or null, and so does version 3's; attaching either returns { synced(seq, updatedAt),
    // replay(command), tickets(list) } for the script to call when a save lands, when the panel asks something of a
    // replay, or with the player's tickets ([{ id, seed }]). Version 1's load() answers the data or null.
    function attach(adapter) {
        if (!stopWaiting) return false; // Not asked for, or too late: the game went on without the hub

        const version = adapter?.version;
        const valid = (version === 1 || version === 2 || version === 3) && typeof adapter.load === 'function'
            && typeof adapter.save === 'function';
        if (valid && adapter.signedIn === true && !replaying) {
            hub = adapter;
        }
        if (valid && version === 3) {
            panel = adapter;
            signedIn = adapter.signedIn === true;
            if (status) sendStatus(); // The numbers the game gave before the hub was there
        }
        stopWaiting();
        if (!valid) return false;
        return version === 1 ? true : Object.freeze({ synced: onSynced, replay: replayCommand, tickets: setTickets });
    }

    window.GameHub = Object.freeze({
        version: 3,
        load,
        save,
        attach,
        status: setStatus,
        startRun,
        resumeRun,
        cheated,
        onReplay,
        replaying,
        ready() {
            return ready;
        },
        fullScreen,
        isFullScreen,
        canFullScreen,
        playable,
        get connected() {
            return hub !== null;
        },
    });
})();
