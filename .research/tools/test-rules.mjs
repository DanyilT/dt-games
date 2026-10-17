/**
 * Bounce 1.24: checks the remake's js/rules.js against the original.
 * - The levels: GameRules.levelBytes(n) must be the JAR's levels/J2MElvl.00n, byte for byte.
 * - The traces: each trace file (the golden ones in work/fixtures-1.24, and the routes in work/routes-1.24) is played
 *   with rules.js from the level's start, and its state after every step must give the reference's trace line exactly
 *   (all but the key events, which the remake doesn't have: the sounds in "ev" are compared).
 *
 * Usage: node test-rules.mjs <path/to/js/rules.js> <folder with levels/> <trace folder or .json> [...]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// js/rules.js's GameRules, as a page or GameHub's server would load it
export function loadRules(path) {
    return new Function(`${readFileSync(path, 'utf8')}\nreturn GameRules;`)();
}

// The reference's trace line for the remake's state after step s (see work/oracle-1.24/README.txt)
export function traceLine(rules, game, s, tiles) {
    const b = game.ball;
    const level = game.won ? game.level + 1 : game.level;
    let line = `s=${s} x=${b.x} y=${b.y} vx=${b.vx} vy=${b.vy} sz=${b.size} st=${b.state} pc=${b.popCntr}`
        + ` lv=${game.lives} sc=${game.score} hp=${game.hoopsPassed}/${game.hoops}`
        + ` dir=${b.dir} g=${Number(b.grounded)} jo=${b.jumpOffset} sl=${b.slide} rf=${Number(b.touch)}${Number(b.rubber)}`
        + ` bon=${b.speedCntr}/${b.gravCntr}/${b.jumpCntr} rsp=${b.respawnCol},${b.respawnRow},${b.respawnSize}`
        + ` cam=${game.tileX},${game.tileY},${game.viewOffset} camL=${game.tileX * 12 - game.viewOffset}`
        + ` buf=${game.divisorLine},${game.divTileX}`
        + ` ex=${game.exitOffset},${Number(game.exitOpen)},${Number(game.exitDrawn)},${Number(game.exitOpening)}`
        + ` ad=${game.levelText}`;
    if (game.spikes.length) line += ` mo=${game.spikes.map((spike) => `${spike.x},${spike.y}`).join(';')}`;
    line += ` lvl=${level} tiles=${tiles}`;
    return line;
}

// The map's changes since `before` (low 7 bits), as the reference prints them
export function tileChanges(game, before) {
    const changes = [];
    for (let row = 0; row < game.height; row++) {
        for (let col = 0; col < game.width; col++) {
            const i = row * game.width + col;
            const was = before[i] & 0x7F;
            const now = game.map[i] & 0x7F;
            if (was !== now) changes.push(`${col}/${row}:${was}>${now}`);
        }
    }
    return changes.length ? changes.join(';') : '-';
}

// A trace line without its events, and its sounds
function split(line) {
    const at = line.indexOf(' ev=');
    const events = line.slice(at + 4).split('|').filter((event) => event.startsWith('snd:')).map((event) => event.slice(4));
    return [line.slice(0, at), events];
}

// The held keys for each step (1-based) from a trace file's mask runs
function keysByStep(mask) {
    const keys = [0];
    for (const [value, length] of mask) for (let i = 0; i < length; i++) keys.push(value);
    return keys;
}

// Plays one trace file: null if every line matches, else the first difference
export function checkTrace(rules, fixture) {
    const sounds = { hoop: 'hoop', pickup: 'pickup', pop: 'pop' };
    const keys = keysByStep(fixture.mask);
    const game = rules.newGame(fixture.level);
    const first = split(fixture.trace[0])[0];
    const mine0 = traceLine(rules, game, 0, 'newmap');
    if (mine0 !== first) return { s: 0, want: first, got: mine0 };
    for (let s = 1; s < fixture.trace.length; s++) {
        const [want, wantSounds] = split(fixture.trace[s]);
        if (game.over) return { s, want, got: '(the remake\'s game is over)' };
        rules.setKeys(game, keys[s] ?? keys[keys.length - 1]);
        const before = game.map.slice();
        rules.step(game);
        const got = traceLine(rules, game, s, tileChanges(game, before));
        const gotSounds = game.sounds.map((sound) => sounds[sound]);
        if (got !== want || gotSounds.join('|') !== wantSounds.join('|')) {
            return { s, want: `${want} snd=${wantSounds.join('|')}`, got: `${got} snd=${gotSounds.join('|')}` };
        }
    }
    const end = fixture.end ?? '';
    const shouldEnd = /Game over|complete|Congrats/.test(end);
    if (shouldEnd && !game.over) return { s: fixture.trace.length, want: end, got: '(the remake\'s game goes on)' };
    if (!shouldEnd && game.over) return { s: fixture.trace.length, want: end, got: '(the remake\'s game is over)' };
    return null;
}

function main() {
    const [rulesPath, jarFolder, ...sources] = process.argv.slice(2);
    if (!rulesPath || !jarFolder || sources.length === 0) {
        console.error('usage: node test-rules.mjs <path/to/js/rules.js> <folder with levels/> <trace folder or .json> [...]');
        process.exit(2);
    }
    const rules = loadRules(rulesPath);
    let failed = 0;

    for (let level = 1; level <= rules.LEVEL_COUNT; level++) {
        const file = readFileSync(join(jarFolder, 'levels', `J2MElvl.${String(level).padStart(3, '0')}`));
        const mine = rules.levelBytes(level);
        const same = mine.length === file.length && mine.every((byte, i) => byte === file[i]);
        if (!same) failed++;
        console.log(`level ${level}: ${same ? 'the same bytes' : 'DIFFERENT'} (${file.length} bytes)`);
    }

    const files = sources.flatMap((source) => (statSync(source).isDirectory()
        ? readdirSync(source).filter((name) => name.endsWith('.json')).sort().map((name) => join(source, name))
        : [source]));
    let steps = 0;
    let passed = 0;
    const started = Date.now();
    for (const file of files) {
        const fixture = JSON.parse(readFileSync(file, 'utf8'));
        const difference = checkTrace(rules, fixture);
        steps += fixture.trace.length - 1;
        if (difference) {
            failed++;
            console.log(`${file}: differs at step ${difference.s}\n  reference: ${difference.want}\n  rules.js:  ${difference.got}`);
        } else {
            passed++;
        }
    }
    console.log(`${passed} of ${files.length} traces identical (${steps} steps, ${Date.now() - started} ms)`);
    process.exit(failed ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
