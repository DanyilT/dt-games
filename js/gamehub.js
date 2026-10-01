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
 * - GameHub.version: 2. GameHub's script checks it to know this file keeps progress made offline (below).
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
 */

// The only pages the game connects to, and loads a script from: GameHub, and its local dev server
const GAMEHUB_ORIGINS = Object.freeze([
    'https://game-hub.danyt.workers.dev',
    'http://localhost:3000',
]);

window.addEventListener('message', (event) => {
    if (event.source !== window.parent || event.data?.type !== 'gamehub:center') return;

    const playArea = document.querySelector('[data-play-area]');
    if (!playArea) return;

    const box = playArea.getBoundingClientRect();
    window.scrollBy({ top: box.top - (innerHeight - box.height) / 2, left: box.left - (innerWidth - box.width) / 2 });
});

// window.GameHub: saves in this browser, and in the player's GameHub account when the hub is there
(function () {
    const LOAD_DEADLINE = 3000; // ms: load() settles by then, whatever the hub does
    const ATTACH_TIMEOUT = 2500; // ms: the hub's script has this long to attach
    const HUB_SAVE_LIMIT = 64 * 1024; // bytes: the hub refuses bigger saves

    const game = document.currentScript?.dataset.game;
    if (!game) {
        console.warn('js/gamehub.js needs the game\'s id on its <script> tag, e.g. data-game="snake"');
    }
    const storageKey = `${game || 'game'}GameData`;
    const syncKey = `${game || 'game'}GameSync`;

    let hub = null; // The hub's adapter, while it's connected with a signed-in player
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

        // Version 2 adapters answer { data, updatedAt }; version 1 adapters, the data alone
        const account = adapter.version === 2 ? saved : (saved === null || saved === undefined ? null : { data: saved, updatedAt: null });
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

    // For the hub's script: { version: 1 or 2, signedIn, load: () => Promise, save: (data, seq) => void }. Version 2's
    // load() answers { data, updatedAt } or null; attaching one returns { synced(seq, updatedAt) } for the script to
    // call when a save lands. Version 1's load() answers the data or null.
    function attach(adapter) {
        if (!stopWaiting) return false; // Not asked for, or too late: the game went on without the hub

        const version = adapter?.version;
        const valid = (version === 1 || version === 2) && typeof adapter.load === 'function' && typeof adapter.save === 'function';
        if (valid && adapter.signedIn === true) {
            hub = adapter;
        }
        stopWaiting();
        if (!valid) return false;
        return version === 2 ? Object.freeze({ synced: onSynced }) : true;
    }

    window.GameHub = Object.freeze({
        version: 2,
        load,
        save,
        attach,
        get connected() {
            return hub !== null;
        },
    });
})();
