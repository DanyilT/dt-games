/**
 * Saved data
 *
 * The game saves one object: { "highScore": 12400, "game": { … } | null }. highScore is the best score, shown as Best.
 * game is the game under way, kept when it pauses (or the page is hidden or closed) so it carries on next time: its
 * state (js/rules.js saveState()), its run so far (js/gamehub.js run.save()), and the best score before it.
 * js/gamehub.js keeps it: in this browser (localStorage, key tetrisGameData), and in the player's GameHub account when
 * they play in GameHub signed in. This file knows what's in it: the defaults, and what to keep.
 *
 * To do (a known limit): the saved game carries its whole run, every input (about 7 bytes each), so a very long game
 * (some 9,000 inputs, roughly 2,000 pieces) makes the save bigger than GameHub's 64 KB. GameHub.save() then keeps the
 * whole save (the best score too) in this browser only, until that game ends. The fix: keep the inputs more compactly
 * (e.g. one string, a character a move), or leave the run out of a saved game that's too big.
 */

// What a new player starts with
function defaultGameData() {
    return { highScore: 0, game: null };
}

// Keep only what the game understands, and use the defaults for anything missing or broken
function checkGameData(saved) {
    const data = defaultGameData();
    if (Number.isInteger(saved?.highScore) && saved.highScore > 0) {
        data.highScore = saved.highScore;
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
