/**
 * Saved data
 *
 * The game saves one object:
 *     { "level": "medium", "wins": { "beginner": 0, "easy": 2, … }, "bestTimes": { "beginner": null, "easy": 412, … },
 *       "board": { … } | null }
 * level is the difficulty picked, wins counts the puzzles solved on each level, and bestTimes keeps the fastest solve on
 * each level, in seconds, or null before the first one. board is the puzzle in progress, or null: board, initialBoard and
 * solution (9×9 arrays of 0-9), its difficulty, and time (the seconds spent on it so far). The times aren't shown.
 * js/gamehub.js keeps it: in this browser (localStorage, key sudokuGameData), and in the player's GameHub account when
 * they play in GameHub signed in. This file knows what's in it: the defaults, and what to keep.
 */

// What a new player starts with
function defaultGameData() {
    return {
        level: 'medium',
        wins: { beginner: 0, easy: 0, medium: 0, hard: 0, expert: 0 },
        bestTimes: { beginner: null, easy: null, medium: null, hard: null, expert: null },
        board: null
    };
}

// Keep only what the game understands, and use the defaults for anything missing or broken
function checkGameData(saved) {
    const data = defaultGameData();
    const levels = Object.keys(data.wins);
    if (levels.includes(saved?.level)) {
        data.level = saved.level;
    }
    for (const level of levels) {
        const wins = saved?.wins?.[level];
        if (Number.isInteger(wins) && wins > 0) {
            data.wins[level] = wins;
        }
        const time = saved?.bestTimes?.[level];
        if (Number.isInteger(time) && time >= 0) {
            data.bestTimes[level] = time;
        }
    }

    // A 9×9 grid of whole numbers from 0 (empty) to 9
    const isGrid = (grid) => Array.isArray(grid) && grid.length === 9 && grid.every((row) =>
        Array.isArray(row) && row.length === 9 && row.every((value) => Number.isInteger(value) && value >= 0 && value <= 9));
    const puzzle = saved?.board;
    if (isGrid(puzzle?.board) && isGrid(puzzle.initialBoard) && isGrid(puzzle.solution) && levels.includes(puzzle.difficulty)) {
        const time = Number.isInteger(puzzle.time) && puzzle.time >= 0 ? puzzle.time : 0;
        data.board = { board: puzzle.board, initialBoard: puzzle.initialBoard, solution: puzzle.solution, difficulty: puzzle.difficulty, time };
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
