/**
 * Bounce: reads the level files of Nokia's J2ME Bounce (levels/J2MElvl.001 …) from a .jar or a folder, prints each
 * level's header and map as text, and writes an HTML page with every level drawn out.
 *
 * Usage: node levels.mjs <Bounce.jar | folder with levels/> [out.html]
 *
 * The format (from the decompiled game, b.LoadLevelId(), and amdray/bounce_zero's level.c), one byte each:
 * - ballX, ballY (tiles), ballBig (0 small, else big), exitX, exitY (tiles, the exit's top left: it's 2 × 2), hoops,
 *   width, height;
 * - width × height tiles, a row at a time: the tile's id in bits 0–5, water in bit 6 (0x40);
 * - moving spikes: a count, then 8 bytes each: the area's left, top, right, bottom (tiles), the speed across and down
 *   (signed, px a step) and the start offset across and down (px).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const WATER = 0x40;

// Each tile id: [a letter for the text map, a colour for the drawing, a name]
const TILES = {
    0: [' ', null, 'empty'],
    1: ['#', '#b03020', 'brick'],
    2: ['%', '#2050c0', 'rubber'],
    3: ['^', '#606060', 'spikes up'],
    4: ['>', '#606060', 'spikes right'],
    5: ['v', '#606060', 'spikes down'],
    6: ['<', '#606060', 'spikes left'],
    7: ['C', '#e0c000', 'checkpoint'],
    8: ['c', '#a08000', 'checkpoint (active)'],
    9: ['E', '#e33a3f', 'exit'],
    10: ['m', '#c0c0c0', 'moving spikes area'],
    29: ['+', '#ff60a0', 'extra life'],
    38: ['S', '#40c040', 'speed'],
};
for (let id = 13; id <= 28; id++) TILES[id] = [id >= 21 ? 'O' : 'o', '#f0a000', `hoop ${id}`];
for (let id = 30; id <= 33; id++) TILES[id] = ['/', '#b03020', `ramp ${id}`];
for (let id = 34; id <= 37; id++) TILES[id] = ['/', '#2050c0', `rubber ramp ${id}`];
for (let id = 39; id <= 42; id++) TILES[id] = ['d', '#8040c0', `deflater ${id}`];
for (let id = 43; id <= 46; id++) TILES[id] = ['P', '#c040c0', `pump ${id}`];
for (let id = 47; id <= 50; id++) TILES[id] = ['G', '#00a0a0', `gravity ${id}`];
for (let id = 51; id <= 54; id++) TILES[id] = ['J', '#a0a000', `jump ${id}`];

// The level files, as [name, bytes], from a .jar (through unzip) or a folder
function readLevelFiles(source) {
    if (statSync(source).isDirectory()) {
        const dir = existsSync(join(source, 'levels')) ? join(source, 'levels') : source;
        return readdirSync(dir).filter((name) => /^J2MElvl\.\d{3}$/.test(name)).sort()
            .map((name) => [name, readFileSync(join(dir, name))]);
    }
    const list = execFileSync('unzip', ['-Z1', source], { encoding: 'utf8' }).split('\n');
    return list.filter((path) => /(^|\/)J2MElvl\.\d{3}$/.test(path)).sort()
        .map((path) => [path.split('/').pop(), execFileSync('unzip', ['-p', source, path])]);
}

// One level file, decoded
function parseLevel(name, bytes) {
    let at = 0;
    const next = () => {
        if (at >= bytes.length) throw new Error(`${name}: ends at byte ${at}`);
        return bytes[at++];
    };
    const level = {
        name,
        ballX: next(), ballY: next(), ballBig: next() !== 0,
        exitX: next(), exitY: next(), hoops: next(),
        width: next(), height: next(),
        rows: [], movers: [],
    };
    for (let y = 0; y < level.height; y++) {
        const row = [];
        for (let x = 0; x < level.width; x++) row.push(next());
        level.rows.push(row);
    }
    const count = at < bytes.length ? next() : 0;
    const signed = (byte) => (byte > 127 ? byte - 256 : byte);
    for (let i = 0; i < count; i++) {
        level.movers.push({
            left: next(), top: next(), right: next(), bottom: next(),
            speedX: signed(next()), speedY: signed(next()), offsetX: next(), offsetY: next(),
        });
    }
    level.trailing = bytes.length - at;
    return level;
}

// A level as text: its header, then its map (water as ~ where nothing else is, the ball's start as B)
function levelText(level) {
    const counts = {};
    level.rows.flat().forEach((tile) => {
        const id = tile & ~WATER;
        counts[id] = (counts[id] ?? 0) + 1;
    });
    const hoopTiles = Object.entries(counts).filter(([id]) => id >= 13 && id <= 16 || id >= 21 && id <= 24)
        .reduce((sum, [, n]) => sum + n, 0);
    const lines = [
        `${level.name}: ${level.width} × ${level.height} tiles (${level.width * 12} × ${level.height * 12} px), ball at `
        + `${level.ballX},${level.ballY} (${level.ballBig ? 'big' : 'small'}), exit at ${level.exitX},${level.exitY}, `
        + `${level.hoops} hoops (${hoopTiles} hoop tiles), ${level.movers.length} moving spikes`
        + (level.trailing ? `, ${level.trailing} bytes left over` : ''),
        ...level.movers.map((m, i) => `  spikes ${i + 1}: area ${m.left},${m.top} to ${m.right},${m.bottom}, `
            + `speed ${m.speedX},${m.speedY}, start ${m.offsetX},${m.offsetY}`),
        '  tiles: ' + Object.entries(counts).map(([id, n]) => `${TILES[id]?.[2] ?? `? ${id}`} ×${n}`).join(', '),
    ];
    level.rows.forEach((row, y) => {
        lines.push(row.map((tile, x) => {
            if (x === level.ballX && y === level.ballY) return 'B';
            const id = tile & ~WATER;
            const letter = TILES[id]?.[0] ?? '?';
            return letter === ' ' && tile & WATER ? '~' : letter;
        }).join(''));
    });
    return lines.join('\n');
}

// An HTML page with every level drawn: a 12 px square for each tile, water blue, the sky light blue
function levelsPage(levels) {
    const data = JSON.stringify(levels.map(({ name, width, height, rows, ballX, ballY, exitX, exitY, movers }) =>
        ({ name, width, height, rows, ballX, ballY, exitX, exitY, movers })));
    const colours = JSON.stringify(Object.fromEntries(Object.entries(TILES).map(([id, [letter, colour]]) =>
        [id, [letter, colour]])));
    return `<!doctype html>
<meta charset="utf-8">
<title>Bounce levels</title>
<style>body { font: 14px system-ui; background: #222; color: #eee; } canvas { image-rendering: pixelated; display: block; margin: 4px 0 24px; }</style>
<body>
<script>
const LEVELS = ${data};
const TILES = ${colours};
for (const level of LEVELS) {
    const title = document.createElement('h2');
    title.textContent = level.name + ': ' + level.width + ' × ' + level.height;
    document.body.append(title);
    const canvas = document.createElement('canvas');
    canvas.width = level.width * 12;
    canvas.height = level.height * 12;
    canvas.style.width = canvas.width * 2 + 'px';
    const g = canvas.getContext('2d');
    g.font = '9px monospace';
    g.textAlign = 'center';
    level.rows.forEach((row, y) => row.forEach((tile, x) => {
        const id = tile & ~${WATER};
        g.fillStyle = tile & ${WATER} ? '#1060b0' : '#b0e0f0';
        g.fillRect(x * 12, y * 12, 12, 12);
        const [letter, colour] = TILES[id] ?? ['?', '#ff00ff'];
        if (colour) {
            g.fillStyle = colour;
            g.fillRect(x * 12 + 1, y * 12 + 1, 10, 10);
            g.fillStyle = '#fff';
            if (id !== 1) g.fillText(letter, x * 12 + 6, y * 12 + 9);
        }
    }));
    level.movers.forEach((m) => {
        g.strokeStyle = '#000';
        g.strokeRect(m.left * 12 + 0.5, m.top * 12 + 0.5, (m.right - m.left) * 12 - 1, (m.bottom - m.top) * 12 - 1);
        g.fillStyle = '#000';
        g.fillRect(m.left * 12 + m.offsetX, m.top * 12 + m.offsetY, 24, 24);
    });
    g.strokeStyle = '#e33a3f';
    g.strokeRect(level.exitX * 12 + 0.5, level.exitY * 12 + 0.5, 23, 23);
    g.fillStyle = '#d00000';
    g.beginPath();
    g.arc(level.ballX * 12 + 6, level.ballY * 12 + 6, 6, 0, Math.PI * 2);
    g.fill();
    document.body.append(canvas);
}
</script>
`;
}

const [source, out = 'levels.html'] = process.argv.slice(2);
if (!source) {
    console.error('Usage: node levels.mjs <Bounce.jar | folder> [out.html]');
    process.exit(1);
}
const levels = readLevelFiles(source).map(([name, bytes]) => parseLevel(name, bytes));
levels.forEach((level) => console.log(levelText(level) + '\n'));
writeFileSync(out, levelsPage(levels));
console.log(`${levels.length} levels, drawn in ${out}`);
