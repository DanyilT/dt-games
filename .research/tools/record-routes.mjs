/**
 * Bounce 1.24: records the routes search-routes.mjs found on the reference (the original 1.24 code), as trace files in
 * the golden traces' format, so test-rules.mjs can check js/rules.js against them.
 * A win stops at "Level completed"; the other routes go on for EXTRA steps with the last keys held, to cover what
 * follows (a power-up running out, the bigger ball rolling on).
 *
 * Usage: node record-routes.mjs <oracle-1.24 folder> <search.json> <out folder>
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const EXTRA = 330;

// The runs as the remake records them: [wait, mask, wait, mask, ...]
function remakeInputs(runs) {
    const inputs = [];
    let at = 0;
    let lastAt = 0;
    runs.forEach(([mask, length], i) => {
        if (i === 0 && mask === 0) {
            at += length;
            return;
        }
        inputs.push(at - lastAt, mask);
        lastAt = at;
        at += length;
    });
    return inputs;
}

function main() {
    const [oracle, searchPath, outDir] = process.argv.slice(2);
    if (!oracle || !searchPath || !outDir) {
        console.error('usage: node record-routes.mjs <oracle-1.24 folder> <search.json> <out folder>');
        process.exit(2);
    }
    mkdirSync(outDir, { recursive: true });
    const search = JSON.parse(readFileSync(searchPath, 'utf8'));
    for (const [level, routes] of Object.entries(search)) {
        for (const [name, route] of Object.entries(routes)) {
            const runs = route.runs.map((run) => run.slice());
            const win = name === 'win';
            if (!win) runs[runs.length - 1][1] += EXTRA;
            const steps = runs.reduce((total, [, length]) => total + length, 0);
            const spec = runs.map(([mask, length]) => `${mask}*${length}`).join(',');
            const out = execFileSync(join(oracle, 'run.sh'), ['--level', level, '--mask', spec, '--steps', String(steps), '--stop-on-complete'],
                { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
            const lines = out.split('\n');
            const trace = lines.filter((line) => line.startsWith('s='));
            const end = lines.find((line) => line.startsWith('# s=') && /stopped|EXCEPTION/.test(line))?.slice(2) ?? `ran all ${steps} steps`;
            const file = join(outDir, `level${String(level).padStart(2, '0')}-${name}.json`);
            writeFileSync(file, `${JSON.stringify({ level: Number(level), tick: 40, name, mask: runs, inputs: remakeInputs(runs), end, trace })}\n`);
            console.log(`${file}: ${trace.length - 1} steps, ${end}`);
        }
    }
}

main();
