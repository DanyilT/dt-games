/**
 * Bounce: writes the winning routes search-routes.mjs found into the remake's test/bot.js (its ROUTES), one per level,
 * as "keys*steps,…" (the keys held: 1 left, 2 right, 4 jump).
 *
 * Usage: node routes-to-bot.mjs <search.json> <path/to/test/bot.js>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [searchPath, botPath] = process.argv.slice(2);
if (!searchPath || !botPath) {
    console.error('usage: node routes-to-bot.mjs <search.json> <path/to/test/bot.js>');
    process.exit(2);
}
const search = JSON.parse(readFileSync(searchPath, 'utf8'));
const lines = ['    const ROUTES = {'];
for (let level = 1; level <= 11; level++) {
    const win = search[level]?.win;
    if (!win) throw new Error(`level ${level} has no winning route`);
    lines.push(`        ${level}: '${win.runs.map(([keys, steps]) => `${keys}*${steps}`).join(',')}',`);
}
lines.push('    };');
const source = readFileSync(botPath, 'utf8');
const found = /^ {4}const ROUTES = \{(\};|\n(?: {8}\d+: '[^']*',\n)* {4}\};)$/m.exec(source);
if (!found) throw new Error(`${botPath} has no "const ROUTES = {…};"`);
writeFileSync(botPath, source.slice(0, found.index) + lines.join('\n') + source.slice(found.index + found[0].length));
console.log(`wrote 11 routes into ${botPath}`);
