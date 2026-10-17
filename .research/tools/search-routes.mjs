/**
 * Bounce 1.24: searches with the remake's js/rules.js for held-key routes through a level, Go-Explore style: it keeps
 * an archive of places reached (hoops passed, the ball's tile and size, power-ups), and keeps going on from them with
 * random keys. Routes that pop the ball are dropped, so every route is played on one ball.
 *
 * It writes, for each level, the first route it finds to each of: a pump (the ball grows), a deflater (it shrinks), the
 * speed, gravity and jump power-ups, the exit opening, and the exit (a win; the shortest found within the time).
 *
 * Usage: node search-routes.mjs <path/to/js/rules.js> <out.json> [levels, e.g. 1-11 or 3,5] [seconds per level]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { loadRules } from './test-rules.mjs';

const MASKS = [0, 1, 2, 4, 5, 6];
const MASK_WEIGHTS = [1, 2, 3, 2, 3, 4];

// A seeded random number generator (mulberry32), so a search can be repeated
function seededRandom(seed) {
    let state = seed | 0;
    return () => {
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// A copy of a game to carry on from
function clone(game) {
    return {
        ...game, map: game.map.slice(), ball: { ...game.ball }, spikes: game.spikes.map((spike) => ({ ...spike })), sounds: [],
    };
}

// The held keys, step by step, of a route: its runs [[mask, steps], ...] from the start
function runsOf(node) {
    const parts = [];
    for (let n = node; n; n = n.parent) parts.push(n.runs);
    const runs = [];
    for (const part of parts.reverse()) {
        for (const [mask, length] of part) {
            if (runs.length && runs[runs.length - 1][0] === mask) runs[runs.length - 1][1] += length;
            else runs.push([mask, length]);
        }
    }
    return runs;
}

// The hoop tiles of a level (the top or left half of each), to tell which have been passed
function hoopCells(rules, level) {
    const { width, tiles } = rules.levelData(level);
    const cells = [];
    tiles.forEach((tile, i) => {
        const id = tile & 0x3F;
        if ([13, 15, 21, 23].includes(id)) cells.push(i);
    });
    void width;
    return cells;
}

// One level's search
function searchLevel(rules, level, seconds, seed) {
    const random = seededRandom(seed);
    const hoops = hoopCells(rules, level);
    const start = rules.newGame(level);
    const archive = new Map();
    const found = {};
    let best = null;
    let maxHoops = 0;
    let steps = 0;

    const buckets = []; // the places by hoops passed (with the exit open counted as one more)
    const rank = (game) => game.hoopsPassed + (game.exitOpen ? 1 : 0);
    const keyOf = (game) => {
        const b = game.ball;
        let passed = '';
        for (const i of hoops) passed += (game.map[i] & 0x3F) > 16 && (game.map[i] & 0x3F) !== 21 && (game.map[i] & 0x3F) !== 23 ? '1' : '0';
        const power = (b.gravCntr ? 1 : 0) | (b.speedCntr ? 2 : 0) | (b.jumpCntr ? 4 : 0);
        return `${passed}|${b.size}|${Math.floor(b.x / 12)}|${Math.floor(b.y / 12)}|${power}|${game.exitOpen ? 1 : 0}`;
    };
    const add = (game, node) => {
        const key = keyOf(game);
        const old = archive.get(key);
        if (old && old.game.steps <= game.steps) {
            old.seen++;
            return;
        }
        if (old) {
            old.game = clone(game);
            old.node = node;
            old.seen++;
            return;
        }
        const cell = { game: clone(game), node, chosen: 0, seen: 1, rank: rank(game) };
        archive.set(key, cell);
        (buckets[cell.rank] ??= []).push(cell);
        if (cell.rank > maxHoops) maxHoops = cell.rank;
    };
    // A place to go on from: mostly from those furthest on, the one picked least of a few drawn at random
    const pick = () => {
        let r = maxHoops;
        const roll = random();
        if (roll > 0.6) r = maxHoops - 1;
        if (roll > 0.85) r = Math.floor(random() * (maxHoops + 1));
        while (r > 0 && !buckets[r]) r--;
        const bucket = buckets[Math.max(0, r)] ?? buckets[0];
        let best = null;
        for (let k = 0; k < 6; k++) {
            const cell = bucket[Math.floor(random() * bucket.length)];
            if (!best || cell.chosen < best.chosen) best = cell;
        }
        return best;
    };
    const note = (name, game, node, extra) => {
        if (found[name]) return;
        found[name] = { steps: game.steps, runs: runsOf(node), extra };
    };
    add(start, { parent: null, runs: [] });

    const until = Date.now() + seconds * 1000;
    let rounds = 0;
    while (Date.now() < until) {
        rounds++;
        const cell = pick();
        cell.chosen++;

        // Go on from it with random keys, for up to about 120 steps
        const game = clone(cell.game);
        let node = cell.node;
        for (let segment = 0; segment < 8; segment++) {
            let r = random() * MASK_WEIGHTS.reduce((a, b) => a + b, 0);
            let mask = MASKS[0];
            for (let i = 0; i < MASKS.length; i++) {
                r -= MASK_WEIGHTS[i];
                if (r <= 0) {
                    mask = MASKS[i];
                    break;
                }
            }
            const length = 1 + Math.floor(random() * 20);
            const runs = [];
            let dead = false;
            for (let s = 0; s < length; s++) {
                const sizeBefore = game.ball.size;
                const before = { speed: game.ball.speedCntr, grav: game.ball.gravCntr, jump: game.ball.jumpCntr, offset: game.exitOffset };
                rules.setKeys(game, mask);
                rules.step(game);
                steps++;
                if (runs.length && runs[runs.length - 1][0] === mask) runs[runs.length - 1][1]++;
                else runs.push([mask, 1]);
                if (game.ballsLost > 0 || (game.over && !game.won)) {
                    dead = true;
                    break;
                }
                const here = { parent: node, runs: runs.slice().map((run) => run.slice()) };
                if (game.ball.size > sizeBefore) note('pump', game, here);
                if (game.ball.size < sizeBefore) note('deflater', game, here);
                if (game.ball.speedCntr === 300 && before.speed !== 300) note('speed', game, here);
                if (game.ball.gravCntr === 300 && before.grav !== 300) note('gravity', game, here);
                if (game.ball.jumpCntr === 300 && before.jump !== 300) note('jump', game, here);
                if (game.exitOffset > 0 && before.offset === 0) note('exit-opening', game, here);
                if (game.won) {
                    if (!best || game.steps < best.steps) best = { steps: game.steps, runs: runsOf(here) };
                    dead = true;
                    break;
                }
            }
            if (dead) break;
            node = { parent: node, runs };
            add(game, node);
        }
    }
    if (best) found.win = best;
    return { found, cells: archive.size, rounds, steps, maxHoops };
}

function parseLevels(text, count) {
    if (!text) return Array.from({ length: count }, (_, i) => i + 1);
    return text.split(',').flatMap((part) => {
        const [a, b] = part.split('-').map(Number);
        return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
    });
}

function main() {
    const [rulesPath, outPath, levelText, secondsText] = process.argv.slice(2);
    if (!rulesPath || !outPath) {
        console.error('usage: node search-routes.mjs <path/to/js/rules.js> <out.json> [levels] [seconds per level]');
        process.exit(2);
    }
    const rules = loadRules(rulesPath);
    const seconds = Number(secondsText) || 120;
    const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {};
    for (const level of parseLevels(levelText, rules.LEVEL_COUNT)) {
        const result = searchLevel(rules, level, seconds, level * 7919);
        const old = out[level] ?? {};
        for (const [name, route] of Object.entries(result.found)) {
            if (!old[name] || route.steps < old[name].steps) old[name] = route;
        }
        out[level] = old;
        writeFileSync(outPath, `${JSON.stringify(out, null, 1)}\n`);
        const names = Object.entries(old).map(([name, route]) => `${name} ${route.steps}`).join(', ');
        console.log(`level ${level}: ${result.cells} places, ${result.steps} steps in ${result.rounds} rounds, furthest ${result.maxHoops} (hoops + exit open) of ${rules.levelData(level).hoops + 1}; found: ${names || 'nothing'}`);
    }
}

main();
