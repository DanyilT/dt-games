/**
 * Saved data
 *
 * The game saves one object: { "highScore": 23400, "maxLevel": 3, "levels": { "1": { "score": 9400, "time": 20 }, … },
 * "sound": true, "instructions": true, "game": { … } | null }.
 * highScore is the best score of a whole game (as the phone kept it), maxLevel the furthest level reached (the level
 * list goes up to it), levels each level's best: the most points won on it, and the fastest win (seconds), each from a
 * level that was won. sound says whether the sounds are on, and instructions whether the page shows its instructions
 * (it does the first time; I or their close button hides them).
 * game is the game under way, kept at each level's start, when the menu opens, and when the page is hidden or closed,
 * so it carries on next time: { state, run } while a level is played (js/rules.js saveState(), and the run so far,
 * js/gamehub.js run.save()), or { next: { level, lives, score } } on "Level completed", before the next level. A game
 * a cheat was used in has cheats too: { invincible, levels } (which are on), and its run isn't kept.
 * js/gamehub.js keeps it: in this browser (localStorage, key bounceGameData), and in the player's GameHub account when
 * they play in GameHub signed in. This file knows what's in it: the defaults, and what to keep.
 */

// What a new player starts with
function defaultGameData() {
    return { highScore: 0, maxLevel: 1, levels: {}, sound: true, instructions: true, game: null };
}

// Keep only what the game understands, and use the defaults for anything missing or broken
function checkGameData(saved) {
    const data = defaultGameData();
    const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
    if (isCount(saved?.highScore)) data.highScore = saved.highScore;
    if (Number.isInteger(saved?.maxLevel) && saved.maxLevel >= 1) data.maxLevel = Math.min(saved.maxLevel, GameRules.LEVEL_COUNT);
    for (let level = 1; level <= GameRules.LEVEL_COUNT; level++) {
        const best = saved?.levels?.[level];
        if (isCount(best?.score) && isCount(best?.time)) data.levels[level] = { score: best.score, time: best.time };
    }
    if (typeof saved?.sound === 'boolean') data.sound = saved.sound;
    if (typeof saved?.instructions === 'boolean') data.instructions = saved.instructions;

    // The game under way: checked in full when it's loaded (GameRules.loadState(), GameHub.resumeRun())
    const game = saved?.game;
    const next = game?.next;
    if (game !== null && typeof game === 'object' && game.state !== null && typeof game.state === 'object') {
        data.game = { state: game.state, run: game.run ?? null };
    } else if (Number.isInteger(next?.level) && next.level >= 1 && next.level <= GameRules.LEVEL_COUNT
        && Number.isInteger(next.lives) && next.lives >= 0 && next.lives <= GameRules.MAX_LIVES && isCount(next.score)) {
        data.game = { next: { level: next.level, lives: next.lives, score: next.score } };
    }
    const cheats = game?.cheats;
    if (data.game && (cheats?.invincible === true || cheats?.levels === true)) {
        data.game.cheats = { invincible: cheats.invincible === true, levels: cheats.levels === true };
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
