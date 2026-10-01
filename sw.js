/**
 * GameHub offline play
 *
 * When a player downloads this game in GameHub (the Download button on its page there), GameHub's script in this page
 * (hub-bridge.js, loaded by js/gamehub.js) keeps the game's files in the cache below and registers this worker. From
 * then on, inside GameHub, the game's files come from the network when there is one (refreshing the copy), and from the
 * copy when there isn't. Removing the download deletes the copy and this worker. This file is the same in every game.
 */
const CACHE = 'gamehub-offline'; // the name GameHub's script fills
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']; // a game's Google Fonts, kept with it

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    // Only the game's own files and its fonts: anything else (GameHub's script included) goes on as usual
    if (url.origin !== self.location.origin && !FONT_HOSTS.includes(url.hostname)) return;
    event.respondWith(fromNetworkOrCopy(request));
});

// The network's answer (which also refreshes the copy), or the copy when there's no network
async function fromNetworkOrCopy(request) {
    const cache = await caches.open(CACHE);
    try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
    } catch (error) {
        const copy = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
        if (!copy) throw error;
        // A page can't be answered with a redirect: give its copy without that mark
        if (request.mode === 'navigate' && copy.redirected) {
            return new Response(await copy.blob(), { status: copy.status, statusText: copy.statusText, headers: copy.headers });
        }
        return copy;
    }
}
