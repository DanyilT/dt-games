/**
 * Bounce: checks js/rules.js's runs and saves.
 * - simulate() plays each winning route (search.json) and the golden traces to the same end as stepping the game
 *   directly, with the same outcome, points, time and balls lost.
 * - saveState() and loadState() change nothing: a level saved (through JSON) and loaded at random steps plays on
 *   exactly as the one never saved.
 * - simulate() refuses runs that aren't right (a wrong mode or tick, keys that aren't keys or don't change, two
 *   changes in one step, inputs after the end, a run that ends too early or doesn't end).
 * - How long simulate() takes on each winning route.
 *
 * Usage: node test-simulate.mjs <path/to/js/rules.js> <search.json> <golden traces folder>
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRules, traceLine } from './test-rules.mjs';

// The runs as the remake records them: [wait, keys, wait, keys, …]
function inputsOf(runs) {
    const inputs = [];
    let at = 0;
    let last = 0;
    let keys = 0;
    for (const [mask, length] of runs) {
        if (mask !== keys) {
            inputs.push(at - last, mask);
            last = at;
            keys = mask;
        }
        at += length;
    }
    return inputs;
}

// Plays held-key runs on a level until it's over (or the runs and `extra` steps run out): the game
function play(rules, level, runs, extra = 0, saveEvery = null, random = null, lives = 3) {
    let game = rules.newGame(level, lives);
    const keys = runs.flatMap(([mask, length]) => Array(length).fill(mask));
    for (let s = 0; s < keys.length + extra && !game.over; s++) {
        if (saveEvery && random() < saveEvery) game = rules.loadState(JSON.parse(JSON.stringify(rules.saveState(game))));
        rules.setKeys(game, keys[Math.min(s, keys.length - 1)]);
        rules.step(game);
    }
    return game;
}

function main() {
    const [rulesPath, searchPath, goldenDir] = process.argv.slice(2);
    const rules = loadRules(rulesPath);
    const search = JSON.parse(readFileSync(searchPath, 'utf8'));
    let failures = 0;
    let checked = 0;
    const fail = (text) => {
        failures++;
        console.log(`FAIL ${text}`);
    };

    // simulate() against the game stepped directly
    const cases = [];
    const won = Array.from({ length: 11 }, (_, i) => i + 1).filter((level) => search[level]?.win);
    if (won.length < 11) fail(`no winning route for level ${Array.from({ length: 11 }, (_, i) => i + 1).filter((level) => !won.includes(level)).join(', ')}`);
    for (const level of won) cases.push({ name: `level ${level} win`, level, runs: search[level].win.runs });
    for (const name of readdirSync(goldenDir).filter((file) => file.endsWith('.json')).sort()) {
        const fixture = JSON.parse(readFileSync(join(goldenDir, name), 'utf8'));
        if (!/Game over/.test(fixture.end)) continue;
        for (const lives of [3, 0, 5]) cases.push({ name: `${name} with ${lives} spare balls`, level: fixture.level, runs: fixture.mask, lives });
    }
    for (const { name, level, runs, lives = 3 } of cases) {
        const game = play(rules, level, runs, 20000, null, null, lives);
        if (!game.over) continue; // Still going when the keys ran out: not a finished run
        const keys = inputsOf(runs).filter((_, i, all) => {
            // Only the inputs before the end
            let at = 0;
            for (let k = 0; k <= i - (i % 2); k += 2) at += all[k];
            return at < game.steps;
        });
        const run = { seed: 1, mode: String(level), tick: 40, length: game.steps, inputs: lives === 3 ? keys : [0, `b${lives}`, ...keys] };
        checked++;
        const found = rules.simulate(run);
        const want = { outcome: game.won ? 'won' : 'lost', score: game.score, ballsLost: game.ballsLost, steps: game.steps };
        if (!found.ok) {
            fail(`${name}: simulate() refused it (${found.reason})`);
        } else if (found.outcome !== want.outcome || found.score !== want.score
            || found.result.find((item) => item.label === 'Balls lost').value !== want.ballsLost
            || (game.won && found.timeMs !== want.steps * 40)) {
            fail(`${name}: simulate() gave ${JSON.stringify(found)}, the game ${JSON.stringify(want)}`);
        }
    }
    console.log(`simulate(): ${checked} runs (${won.length} wins, ${checked - won.length} game overs, with 0, 3 and 5 spare balls) checked`);

    // Saving and loading at random steps changes nothing
    let random = 1;
    const next = () => {
        random = (random * 1103515245 + 12345) % 2147483648;
        return random / 2147483648;
    };
    let saves = 0;
    for (const level of won) {
        const runs = search[level].win.runs;
        const plain = play(rules, level, runs);
        const saved = play(rules, level, runs, 0, 0.01, () => {
            const value = next();
            if (value < 0.01) saves++;
            return value;
        });
        const a = traceLine(rules, plain, plain.steps, '-');
        const b = traceLine(rules, saved, saved.steps, '-');
        if (a !== b || plain.map.some((tile, i) => tile !== saved.map[i])) fail(`level ${level}: saving and loading changed it\n  ${a}\n  ${b}`);
    }
    console.log(`saveState()/loadState(): ${saves} saves and loads on the ${won.length} winning routes changed nothing`);

    // Refusals
    const win1 = { seed: 1, mode: '1', tick: 40, length: play(rules, 1, search[1].win.runs).steps, inputs: inputsOf(search[1].win.runs) };
    const refusals = [
        ['mode 0', { ...win1, mode: '0' }, 'mode'],
        ['mode 12', { ...win1, mode: '12' }, 'mode'],
        ['mode as a number', { ...win1, mode: 1 }, 'mode'],
        ['tick 30', { ...win1, tick: 30 }, 'tick'],
        ['keys 8', { ...win1, inputs: [0, 8] }, 'input'],
        ['keys that don\'t change', { ...win1, inputs: [0, 2, 5, 2] }, 'input'],
        ['a first input of no keys', { ...win1, inputs: [0, 0] }, 'input'],
        ['two inputs in one step', { ...win1, inputs: [0, 2, 0, 6] }, 'input'],
        ['keys as text', { ...win1, inputs: [0, '2'] }, 'input'],
        ['a negative wait', { ...win1, inputs: [-1, 2] }, 'input'],
        ['an odd input list', { ...win1, inputs: [0] }, 'input'],
        ['an input after the end', { ...win1, inputs: [...win1.inputs, win1.length, 1] }, 'after-end'],
        ['a run longer than the game', { ...win1, length: win1.length + 1 }, 'ended-early'],
        ['a run that stops before the end', { ...win1, length: win1.length - 1 }, 'not-over'],
        ['no inputs', { ...win1, inputs: [], length: 100 }, 'not-over'],
        ['a length too long', { ...win1, length: 1e7 }, 'length'],
        ['6 spare balls', { ...win1, inputs: [0, 'b6', ...win1.inputs] }, 'input'],
        ['spare balls after a step', { ...win1, inputs: [1, 'b5', ...win1.inputs] }, 'input'],
        ['spare balls twice', { ...win1, inputs: [0, 'b5', 0, 'b4', ...win1.inputs] }, 'input'],
    ];
    for (const [name, run, reason] of refusals) {
        const found = rules.simulate(run);
        if (found.ok || found.reason !== reason) fail(`${name}: ${JSON.stringify(found)}, wanted the reason ${reason}`);
    }
    if (!rules.simulate(win1).ok) fail('level 1 win: refused');
    if (!rules.simulate({ ...win1, inputs: [0, 'b1', ...win1.inputs] }).ok) fail('level 1 win with 1 spare ball: refused');
    console.log(`refusals: ${refusals.length} checked`);

    // Speed
    const times = [];
    for (const level of won) {
        const steps = play(rules, level, search[level].win.runs).steps;
        const run = { seed: 1, mode: String(level), tick: 40, length: steps, inputs: inputsOf(search[level].win.runs) };
        const started = performance.now();
        for (let i = 0; i < 5; i++) rules.simulate(run);
        times.push(`${level}: ${steps} steps ${((performance.now() - started) / 5).toFixed(1)} ms`);
    }
    console.log(`simulate() on each win: ${times.join(', ')}`);
    console.log(failures ? `${failures} failed` : 'all passed');
    process.exit(failures ? 1 : 0);
}

main();
