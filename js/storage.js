/**
 * Saved data
 *
 * The game saves one object: { "draw": 3, "scoring": "standard", "timed": true, "cumulative": false,
 * "animations": true, "sounds": true, "back": "blue", "faces": "classic", "background": "green", "vegasTotal": 0,
 * "stats": { "standard-1": { … }, … }, "game": { … } | null }.
 * draw (1 or 3), scoring ('standard', 'vegas' or 'none'), timed, cumulative (Vegas dollars carry on from game to game,
 * in vegasTotal), animations and sounds are the Options picked; back, faces (the court cards' design) and background
 * the appearance picked (Change Appearance). The next game is dealt at the level the Options say (js/rules.js MODES).
 * stats has, for each level: the games played and won, the best score (a win's; with Vegas, any game's dollars; null
 * until there's one), the fastest win in seconds (null until one), the streak now (wins in a row, or losses as a
 * negative number) and the longest winning streak.
 * game is the game under way, kept after each move so it carries on next time: its state (js/rules.js saveState()) and
 * its run so far (js/gamehub.js run.save()).
 * js/gamehub.js keeps it: in this browser (localStorage, key solitaireGameData), and in the player's GameHub account when
 * they play in GameHub signed in. This file knows what's in it: the defaults, and what to keep.
 */

const BACKGROUNDS = Object.freeze({ green: 'Green', blue: 'Blue', red: 'Red', purple: 'Purple' });

// What a new player starts with
function defaultGameData() {
    const stats = Object.fromEntries(Object.keys(GameRules.MODES).map((mode) => [mode, {
        played: 0, won: 0, best: null, bestTime: null, streak: 0, longestStreak: 0,
    }]));
    return {
        draw: 3, scoring: 'standard', timed: true, cumulative: false, animations: true, sounds: true,
        back: 'blue', faces: 'classic', background: 'green', vegasTotal: 0, stats, game: null,
    };
}

// Keep only what the game understands, and use the defaults for anything missing or broken
function checkGameData(saved) {
    const data = defaultGameData();
    if (saved?.draw === 1 || saved?.draw === 3) data.draw = saved.draw;
    if (['standard', 'vegas', 'none'].includes(saved?.scoring)) data.scoring = saved.scoring;
    for (const key of ['timed', 'cumulative', 'animations', 'sounds']) {
        if (typeof saved?.[key] === 'boolean') data[key] = saved[key];
    }
    if (Cards.BACKS.some(({ name }) => name === saved?.back)) data.back = saved.back;
    if (Cards.FACES.includes(saved?.faces)) data.faces = saved.faces;
    if (Object.hasOwn(BACKGROUNDS, saved?.background ?? '')) data.background = saved.background;
    if (Number.isSafeInteger(saved?.vegasTotal)) data.vegasTotal = saved.vegasTotal;
    for (const mode of Object.keys(data.stats)) {
        const stats = saved?.stats?.[mode];
        for (const key of ['played', 'won', 'longestStreak']) {
            if (Number.isInteger(stats?.[key]) && stats[key] > 0) data.stats[mode][key] = stats[key];
        }
        if (Number.isSafeInteger(stats?.best)) data.stats[mode].best = stats.best;
        if (Number.isInteger(stats?.bestTime) && stats.bestTime >= 0) data.stats[mode].bestTime = stats.bestTime;
        if (Number.isSafeInteger(stats?.streak)) data.stats[mode].streak = stats.streak;
    }
    // The game under way: checked in full when it's loaded (GameRules.loadState(), GameHub.resumeRun())
    const game = saved?.game;
    if (game !== null && typeof game === 'object' && game.state !== null && typeof game.state === 'object') {
        data.game = { state: game.state, run: game.run ?? null };
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
