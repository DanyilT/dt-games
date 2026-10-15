/**
 * Saved data
 *
 * The game saves one object: { "highScore": 34, "medals": { "bronze": 3, "silver": 1, "gold": 1, "platinum": 0 },
 * "sound": true, "game": { … } | null }. highScore is the best score, shown as Best; medals counts the medals won; sound
 * says whether the sounds are on. game is the game under way, kept when it pauses (or the page is hidden or closed) so it
 * carries on next time: its state (js/rules.js saveState()), its run so far (js/gamehub.js run.save()), and the best
 * score before it.
 * js/gamehub.js keeps it: in this browser (localStorage, key flappy-birdGameData), and in the player's GameHub account
 * when they play in GameHub signed in. This file knows what's in it: the defaults, and what to keep.
 */

// What a new player starts with
function defaultGameData() {
    return { highScore: 0, medals: { bronze: 0, silver: 0, gold: 0, platinum: 0 }, sound: true, game: null };
}

// Keep only what the game understands, and use the defaults for anything missing or broken
function checkGameData(saved) {
    const data = defaultGameData();
    if (Number.isInteger(saved?.highScore) && saved.highScore > 0) {
        data.highScore = saved.highScore;
    }
    for (const medal of Object.keys(data.medals)) {
        const count = saved?.medals?.[medal];
        if (Number.isInteger(count) && count > 0) data.medals[medal] = count;
    }
    if (typeof saved?.sound === 'boolean') {
        data.sound = saved.sound;
    }
    // The game under way: checked in full when it's loaded (GameRules.loadState(), GameHub.resumeRun())
    const game = saved?.game;
    if (game !== null && typeof game === 'object' && game.state !== null && typeof game.state === 'object'
        && Number.isInteger(game.best) && game.best >= 0) {
        data.game = { state: game.state, run: game.run ?? null, best: game.best };
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
