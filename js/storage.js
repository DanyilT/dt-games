/**
 * Saved data
 *
 * The game saves one object:
 *     { "level": "beginner", "wins": { "beginner": 3, "intermediate": 1, "expert": 0 },
 *       "bestTimes": { "beginner": 42, "intermediate": 187, "expert": null } }
 * level is the difficulty picked, wins counts the wins on each level (the ⭐ in the Game menu), and bestTimes keeps the
 * fastest win on each level, in seconds (the timer's time), or null before the first win.
 * js/gamehub.js keeps it: in this browser (localStorage, key minesweeperGameData), and in the player's GameHub account
 * when they play in GameHub signed in. This file knows what's in it: the defaults, and what to keep.
 */

// What a new player starts with
function defaultGameData() {
    return {
        level: 'beginner',
        wins: { beginner: 0, intermediate: 0, expert: 0 },
        bestTimes: { beginner: null, intermediate: null, expert: null }
    };
}

// Keep only what the game understands, and use the defaults for anything missing or broken
function checkGameData(saved) {
    const data = defaultGameData();
    if (Object.keys(data.wins).includes(saved?.level)) {
        data.level = saved.level;
    }
    for (const level in data.wins) {
        const wins = saved?.wins?.[level];
        if (Number.isInteger(wins) && wins > 0) {
            data.wins[level] = wins;
        }
        const time = saved?.bestTimes?.[level];
        if (Number.isInteger(time) && time >= 0) {
            data.bestTimes[level] = time;
        }
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
