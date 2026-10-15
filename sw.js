/**
 * GameHub offline play
 *
 * When a player downloads this game in GameHub (the Download button on its page there), GameHub's script in this page
 * (hub-bridge.js, loaded by js/gamehub.js) registers this worker and asks it to download the game: every file
 * offline.json lists (the deploy writes it, each file with its SHA-256), checking each one. From then on, inside
 * GameHub:
 * - the game opens from its copy at once, without waiting on the network;
 * - each time it opens, the worker checks the copy against offline.json in the background. A new version, or a file
 *   that's changed or broken, is downloaded again, and the copy switches only once it's whole. It tells the page how
 *   that goes, and GameHub's Download button shows it;
 * - GameHub's script is kept too (the network's when it answers within BRIDGE_WAIT, else the copy), so offline the game
 *   still connects to GameHub: tickets, runs and saves;
 * - the game's Google Fonts are kept with it.
 * A copy made by an older GameHub (the cache gamehub-offline: whatever the page had loaded) is used as before, network
 * first, and moved to the new kind at the first check that can. Removing the download is GameHub's: it deletes every
 * gamehub-offline* cache and this worker. This file is the same in every game.
 */
const PREFIX = 'gamehub-offline';
const META = `${PREFIX}-meta`; // { version, files, bridge, extras }: the copy in use
const SHARED = `${PREFIX}-shared`; // GameHub's script and the fonts (not part of the game's version)
const LEGACY = PREFIX; // a copy made by an older GameHub
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const CHECK_EVERY = 60_000; // ms: a check at most this often
const MANIFEST_WAIT = 5000; // ms for offline.json
const BRIDGE_WAIT = 2000; // ms for GameHub's script before its copy is used
const LEGACY_WAIT = 3000; // ms for the network before an old copy is used

const root = new URL('./', self.location.href); // the game's address

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const hex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (bytes) => hex(await crypto.subtle.digest('SHA-256', bytes));
const keyOf = (path) => new URL(path, root).href;
// A response kept as plain bytes (a redirected one can't answer a navigation)
const keep = (bytes, response) => new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers });

function withTimeout(promise, ms) {
    let timer;
    return Promise.race([promise, new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Timed out')), ms);
    })]).finally(() => clearTimeout(timer));
}

// The path of one of the game's files in offline.json ('' is index.html), or null for any other address
function pathOf(url) {
    if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return null;
    const path = decodeURIComponent(url.pathname.slice(root.pathname.length));
    return path === '' ? 'index.html' : path;
}

// The copy in use: { version, files, bridge, extras }, or null. Read without caches.open(), which would make an empty
// META, and GameHub takes META for a copy.
async function readMeta() {
    const response = await caches.match('meta', { cacheName: META });
    return response ? response.json() : null;
}

async function writeMeta(meta) {
    await (await caches.open(META)).put('meta', new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
}

async function fetchManifest() {
    const response = await withTimeout(fetch(keyOf('offline.json'), { cache: 'no-store' }), MANIFEST_WAIT);
    if (!response.ok) throw new Error(`offline.json: HTTP ${response.status}`);
    const manifest = await response.json();
    if (typeof manifest?.version !== 'string' || typeof manifest.files !== 'object' || manifest.files === null) {
        throw new Error('offline.json: not a list of files');
    }
    return manifest;
}

// ==========================================
// Answering the page
// ==========================================

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (FONT_HOSTS.includes(url.hostname)) {
        event.respondWith(font(request));
        return;
    }
    if (url.origin !== root.origin) {
        if (url.pathname.endsWith('/hub-bridge.js')) event.respondWith(bridgeScript(request));
        return; // anything else from another site goes on as usual
    }
    if (pathOf(url) === null) return;
    if (request.mode === 'navigate') event.waitUntil(check());
    event.respondWith(gameFile(request, url));
});

// The game's own files: from the copy at once (a file it doesn't have, from the network)
async function gameFile(request, url) {
    const meta = await readMeta();
    // A page opening now gets the newest copy: an update ready for the pages before isn't one for it
    if (meta && request.mode === 'navigate' && lastState === 'updated') lastState = 'current';
    if (meta) {
        const kept = await (await caches.open(`${PREFIX}-${meta.version}`)).match(keyOf(pathOf(url)));
        return kept ?? fetch(request);
    }
    if (await caches.has(LEGACY)) return fromLegacy(request);
    return fetch(request);
}

// An older GameHub's copy: the network first, but not for longer than LEGACY_WAIT
async function fromLegacy(request) {
    const cache = await caches.open(LEGACY);
    try {
        const response = await withTimeout(fetch(request), LEGACY_WAIT);
        if (response.ok) await cache.put(request, response.clone());
        return response;
    } catch (error) {
        const copy = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
        if (!copy) throw error;
        if (request.mode === 'navigate' && copy.redirected) return keep(await copy.arrayBuffer(), copy);
        return copy;
    }
}

// GameHub's script: the network's when it answers in time (kept for next time), else the copy. The first time a copy
// moved from an older GameHub asks for it, its address is learnt.
async function bridgeScript(request) {
    let meta = await readMeta();
    const address = request.url.split('?')[0];
    if (meta && !meta.bridge) {
        meta = { ...meta, bridge: address };
        await writeMeta(meta);
    }
    if (!meta || meta.bridge.split('?')[0] !== address) return fetch(request);
    const shared = await caches.open(SHARED);
    try {
        const response = await withTimeout(fetch(meta.bridge, { mode: 'cors', credentials: 'omit', cache: 'no-cache' }), BRIDGE_WAIT);
        if (response.ok) {
            await shared.put(meta.bridge, response.clone());
            return response;
        }
    } catch (error) {
        // a slow or missing network: the copy
    }
    return (await shared.match(meta.bridge)) ?? fetch(request);
}

// Fonts: kept ones first (in an older GameHub's copy too), else the network's, kept while the game is downloaded
async function font(request) {
    const kept = await caches.match(request, { ignoreVary: true });
    if (kept) return kept;
    const response = await fetch(request);
    if (response.ok && (await readMeta() || await caches.has(LEGACY))) {
        await (await caches.open(SHARED)).put(request, response.clone());
    }
    return response;
}

// ==========================================
// Keeping the copy up to date
// ==========================================

let checking = null;
let lastCheck = 0;
let lastState = null;
let busy = Promise.resolve(); // the copy changes one task at a time (a check, or a download GameHub asked for)

// Runs task once the tasks before it have finished: its result
function oneAtATime(task) {
    const result = busy.then(task, task);
    busy = result.catch(() => {});
    return result;
}

// Tells the game's pages how the check is going (GameHub's script passes it on)
async function tell(state, meta) {
    lastState = state;
    const message = { type: 'gamehub-offline:state', state, version: meta?.version ?? null, downloaded: Boolean(meta) || await caches.has(LEGACY) };
    for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) client.postMessage(message);
}

// A check of the copy against offline.json, one at a time and at most every CHECK_EVERY
function check() {
    if (checking) return checking;
    if (Date.now() - lastCheck < CHECK_EVERY) return Promise.resolve();
    lastCheck = Date.now();
    checking = oneAtATime(runCheck).finally(() => {
        checking = null;
    });
    return checking;
}

async function runCheck() {
    const meta = await readMeta();
    if (!meta && !(await caches.has(LEGACY))) return; // nothing downloaded
    await tell('checking', meta);
    let manifest;
    try {
        manifest = await fetchManifest();
    } catch (error) {
        await tell('offline', meta);
        return;
    }
    try {
        const result = await update(meta, manifest, () => tell('updating', meta));
        // An older GameHub's copy is moved over only online, and it was network first: the page open now is the newest
        await tell(result.changed && meta ? 'updated' : 'current', result.meta);
    } catch (error) {
        await tell('failed', meta);
    }
}

/**
 * Makes the copy match offline.json: the kept files whose hash is still right are reused, the others downloaded (each
 * checked against offline.json) into the new version's cache, which is used only once it's whole
 * @param {object|null} meta - the copy in use (null: none yet, or an older GameHub's)
 * @param {object} manifest - offline.json
 * @param {function} [starting] - called before anything is downloaded
 * @return {Promise<{meta: object, changed: boolean}>}
 */
async function update(meta, manifest, starting = () => {}) {
    const currentName = meta ? `${PREFIX}-${meta.version}` : null;
    const current = currentName ? await caches.open(currentName) : null;
    const good = new Map(); // path → its kept bytes, checked now
    if (current) {
        for (const [path, hash] of Object.entries(meta.files)) {
            const kept = await current.match(keyOf(path));
            if (!kept) continue;
            const bytes = await kept.arrayBuffer();
            if (await sha256(bytes) === hash) good.set(path, { bytes, kept });
        }
    }
    const same = meta?.version === manifest.version && Object.keys(manifest.files).every((path) => good.has(path));
    if (same) return { meta, changed: false };

    await starting();
    const name = `${PREFIX}-${manifest.version}`;
    const target = await caches.open(name); // the same version mended in place, or a new one
    try {
        for (const [path, hash] of Object.entries(manifest.files)) {
            const reuse = good.get(path);
            if (reuse && meta.files[path] === hash) {
                if (name !== currentName) await target.put(keyOf(path), keep(reuse.bytes, reuse.kept));
                continue;
            }
            const response = await fetch(keyOf(path), { cache: 'no-store' });
            if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
            const bytes = await response.arrayBuffer();
            if (await sha256(bytes) !== hash) throw new Error(`${path}: not the file offline.json lists`);
            await target.put(keyOf(path), keep(bytes, response));
        }
    } catch (error) {
        if (name !== currentName) await caches.delete(name); // no half copies
        throw error;
    }
    const next = { version: manifest.version, files: manifest.files, bridge: meta?.bridge ?? null, extras: meta?.extras ?? [] };
    if (await caches.has(LEGACY)) next.extras = [...new Set([...next.extras, ...await keepLegacyFonts()])];
    await writeMeta(next);
    for (const old of await caches.keys()) {
        if (old === LEGACY || (old.startsWith(`${PREFIX}-`) && ![name, META, SHARED].includes(old))) await caches.delete(old);
    }
    return { meta: next, changed: true };
}

// An older GameHub's copy is about to go: its fonts go on in the shared cache. Their addresses.
async function keepLegacyFonts() {
    const legacy = await caches.open(LEGACY);
    const shared = await caches.open(SHARED);
    const kept = [];
    for (const request of await legacy.keys()) {
        if (!FONT_HOSTS.includes(new URL(request.url).hostname)) continue;
        const response = await legacy.match(request);
        if (!response?.ok) continue; // an opaque one isn't kept
        await shared.put(request.url, response);
        kept.push(request.url);
    }
    return kept;
}

// ==========================================
// GameHub's script asking (answered on the message's port)
// ==========================================

self.addEventListener('message', (event) => {
    const port = event.ports[0];
    const data = event.data;
    if (!port || typeof data !== 'object' || data === null) return;
    if (data.type === 'gamehub-offline:status') {
        event.waitUntil(readMeta().then((meta) => port.postMessage({
            downloaded: Boolean(meta), version: meta?.version ?? null, state: meta ? lastState : null,
        })));
    } else if (data.type === 'gamehub-offline:download') {
        event.waitUntil(oneAtATime(() => download(data)).then(
            (version) => port.postMessage({ ok: true, version }),
            (error) => port.postMessage({ ok: false, error: error.code ?? 'failed' }),
        ));
    }
});

// Downloads the game (to its latest version), GameHub's script and the fonts: the game's version
async function download({ bridge, extras }) {
    let manifest;
    try {
        manifest = await fetchManifest();
    } catch (error) {
        throw Object.assign(error, { code: 'unavailable' });
    }
    const result = await update(await readMeta(), manifest);
    // GameHub's script and the fonts: wanted, but the game plays offline without them (as it did before)
    const shared = await caches.open(SHARED);
    const others = [bridge, ...(Array.isArray(extras) ? extras : [])].filter((address) => typeof address === 'string');
    await Promise.all(others.map(async (address) => {
        try {
            const response = await fetch(address, { mode: 'cors', credentials: 'omit', cache: 'no-cache' });
            if (response.ok) await shared.put(address, response);
        } catch (error) {
            // not kept: fetched again next time it's asked for
        }
    }));
    const meta = {
        ...result.meta,
        bridge: typeof bridge === 'string' ? bridge : result.meta.bridge,
        extras: (Array.isArray(extras) ? extras : []).filter((address) => typeof address === 'string'),
    };
    await writeMeta(meta);
    lastState = 'current';
    return meta.version;
}
