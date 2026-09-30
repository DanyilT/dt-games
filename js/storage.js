/**
 * Saved data
 *
 * The game saves one object: { "highScore": 12 }.
 * js/gamehub.js keeps it: in this browser (localStorage, key snakeGameData), and in the player's GameHub account when they
 * play in GameHub signed in. This file knows what's in it: the defaults, and what to keep.
 */

// What a new player starts with
function defaultGameData() {
    return { highScore: 0 };
}

// Keep only what the game understands, and use the defaults for anything missing or broken
function checkGameData(saved) {
    const data = defaultGameData();
    if (Number.isInteger(saved?.highScore) && saved.highScore > 0) {
        data.highScore = saved.highScore;
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
