/**
 * Saved data
 *
 * The game saves one object: { "level": "medium", "stats": { "easy": { … }, "medium": { … }, "hard": { … } },
 * "match": { … } | null }. level is the level picked. stats has, for each level, the matches won, drawn and lost, and
 * the most points in a match (null until one is played). match is the match under way, kept after each move so it
 * carries on next time: its state (js/rules.js saveState()) and its run so far (js/gamehub.js run.save()).
 * js/gamehub.js keeps it: in this browser (localStorage, key tic-tac-toeGameData), and in the player's GameHub account
 * when they play in GameHub signed in. This file knows what's in it: the defaults, and what to keep.
 */

// What a new player starts with
function defaultGameData() {
    const stats = () => ({ won: 0, drawn: 0, lost: 0, best: null });
    return { level: 'medium', stats: { easy: stats(), medium: stats(), hard: stats() }, match: null };
}

// Keep only what the game understands, and use the defaults for anything missing or broken
function checkGameData(saved) {
    const data = defaultGameData();
    if (Object.hasOwn(data.stats, saved?.level)) {
        data.level = saved.level;
    }
    for (const level of Object.keys(data.stats)) {
        const stats = saved?.stats?.[level];
        for (const key of ['won', 'drawn', 'lost']) {
            if (Number.isInteger(stats?.[key]) && stats[key] > 0) data.stats[level][key] = stats[key];
        }
        if (Number.isInteger(stats?.best) && stats.best >= 0) data.stats[level].best = stats.best;
    }
    // The match under way: checked in full when it's loaded (GameRules.loadState(), GameHub.resumeRun())
    const match = saved?.match;
    if (match !== null && typeof match === 'object' && match.state !== null && typeof match.state === 'object') {
        data.match = { state: match.state, run: match.run ?? null };
    }
    return data;
}

// What's saved (GameHub's copy, or the defaults), as a Promise that never fails
function loadGameData() {
    return GameHub.load()
        .then((saved) => checkGameData(saved))
        .catch(() => defaultGameData());
}

// Save the whole object: in this browser, and in the GameHub account when signed in; true if this browser kept it
function saveGameData(data) {
    return GameHub.save(data);
}
