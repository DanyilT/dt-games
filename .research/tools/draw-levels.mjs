/**
 * Bounce: draws every level of a Bounce JAR's files with the game's own sprites, as Bounce 1.8 draws its tiles
 * (TileCanvas.drawTile(), loadTileImages(), createExitImage(), createLargeBallImage(), createMovingObj()), and saves
 * each level as a PNG.
 *
 * Usage: node draw-levels.mjs <folder with levels/ and icons/objects_nm.png> <out folder> [scale]
 *
 * A level is drawn as it starts: the ball at its start, the exit shut, every hoop, checkpoint and extra ball in place,
 * and the moving spikes at their start offsets. The front halves of the hoops are drawn over the ball, as in the game.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');

// One level file, decoded (the format: see levels.mjs)
function parseLevel(name, bytes) {
    let at = 0;
    const next = () => bytes[at++];
    const level = {
        name, ballX: next(), ballY: next(), ballBig: next() !== 0, exitX: next(), exitY: next(), hoops: next(),
        width: next(), height: next(), rows: [], movers: [],
    };
    for (let y = 0; y < level.height; y++) {
        level.rows.push(Array.from({ length: level.width }, () => next()));
    }
    const count = at < bytes.length ? next() : 0;
    for (let i = 0; i < count; i++) {
        level.movers.push({ left: next(), top: next(), right: next(), bottom: next(), speedX: next(), speedY: next(),
            offsetX: next(), offsetY: next() });
    }
    return level;
}

// The page that draws the levels: the sprites are cut and turned as TileCanvas.loadTileImages() does
function pageHtml(sheetDataUrl, levels, scale) {
    return `<!doctype html>
<meta charset="utf-8">
<title>Bounce levels</title>
<style>body { margin: 0; background: #222; color: #eee; font: 14px system-ui; } canvas { display: block; image-rendering: pixelated; margin: 0 0 16px; }</style>
<body>
<script>
const LEVELS = ${JSON.stringify(levels)};
const SCALE = ${scale};
const SKY = '#b0e0f0';
const WATER = '#1060b0';

// A blank 12 × 12 (or w × h) image, filled with colour if given
function blank(w, h, colour) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    if (colour) {
        const g = c.getContext('2d');
        g.fillStyle = colour;
        g.fillRect(0, 0, w, h);
    }
    return c;
}

// TileCanvas.extractImageBG(): the sprite at (col, row) of the sheet, over colour (or transparent)
function extract(sheet, col, row, colour) {
    const c = blank(12, 12, colour);
    c.getContext('2d').drawImage(sheet, -col * 12, -row * 12);
    return c;
}

// TileCanvas.manipulateImage(): 0 flip across, 1 flip up and down, 2 both, 3/4/5 turn 90/180/270 degrees anticlockwise
function manipulate(image, how) {
    const c = blank(image.width, image.height);
    const g = c.getContext('2d');
    g.translate(image.width / 2, image.height / 2);
    if (how === 0) g.scale(-1, 1);
    if (how === 1) g.scale(1, -1);
    if (how === 2) g.scale(-1, -1);
    if (how === 3) g.rotate(-Math.PI / 2);
    if (how === 4) g.rotate(Math.PI);
    if (how === 5) g.rotate(Math.PI / 2);
    g.drawImage(image, -image.width / 2, -image.height / 2);
    return c;
}

// TileCanvas.loadTileImages()
function tileImages(sheet) {
    const t = [];
    t[0] = extract(sheet, 1, 0);
    t[1] = extract(sheet, 1, 2);
    t[2] = extract(sheet, 0, 3, SKY);
    t[3] = manipulate(t[2], 1);
    t[4] = manipulate(t[2], 3);
    t[5] = manipulate(t[2], 5);
    t[6] = extract(sheet, 0, 3, WATER);
    t[7] = manipulate(t[6], 1);
    t[8] = manipulate(t[6], 3);
    t[9] = manipulate(t[6], 5);
    t[10] = extract(sheet, 0, 4);
    t[11] = extract(sheet, 3, 4);
    t[12] = exitImage(extract(sheet, 2, 3));
    t[14] = extract(sheet, 0, 5);
    t[13] = manipulate(t[14], 1);
    t[15] = manipulate(t[13], 0);
    t[16] = manipulate(t[14], 0);
    t[18] = extract(sheet, 1, 5);
    t[17] = manipulate(t[18], 1);
    t[19] = manipulate(t[17], 0);
    t[20] = manipulate(t[18], 0);
    t[22] = extract(sheet, 2, 5);
    t[21] = manipulate(t[22], 1);
    t[23] = manipulate(t[21], 0);
    t[24] = manipulate(t[22], 0);
    t[26] = extract(sheet, 3, 5);
    t[25] = manipulate(t[26], 1);
    t[27] = manipulate(t[25], 0);
    t[28] = manipulate(t[26], 0);
    t[29] = manipulate(t[14], 5);
    t[30] = manipulate(t[29], 1);
    t[31] = manipulate(t[29], 0);
    t[32] = manipulate(t[30], 0);
    t[33] = manipulate(t[18], 5);
    t[34] = manipulate(t[33], 1);
    t[35] = manipulate(t[33], 0);
    t[36] = manipulate(t[34], 0);
    t[37] = manipulate(t[22], 5);
    t[38] = manipulate(t[37], 1);
    t[39] = manipulate(t[37], 0);
    t[40] = manipulate(t[38], 0);
    t[41] = manipulate(t[26], 5);
    t[42] = manipulate(t[41], 1);
    t[43] = manipulate(t[41], 0);
    t[44] = manipulate(t[42], 0);
    t[45] = extract(sheet, 3, 3);
    t[46] = extract(sheet, 1, 3);
    t[47] = extract(sheet, 2, 0);
    t[48] = extract(sheet, 0, 1);
    t[49] = largeBall(extract(sheet, 3, 0));
    t[50] = extract(sheet, 3, 1);
    t[51] = extract(sheet, 2, 4);
    t[52] = extract(sheet, 3, 2);
    t[53] = extract(sheet, 1, 1);
    t[54] = extract(sheet, 2, 2);
    t[55] = extract(sheet, 0, 0, SKY);
    t[56] = manipulate(t[55], 3);
    t[57] = manipulate(t[55], 4);
    t[58] = manipulate(t[55], 5);
    t[59] = extract(sheet, 0, 0, WATER);
    t[60] = manipulate(t[59], 3);
    t[61] = manipulate(t[59], 4);
    t[62] = manipulate(t[59], 5);
    t[63] = extract(sheet, 0, 2);
    t[64] = manipulate(t[63], 3);
    t[65] = manipulate(t[63], 4);
    t[66] = manipulate(t[63], 5);
    return t;
}

// TileCanvas.createExitImage(): 24 × 48, the shut door (a quarter mirrored four ways) over red stripes
function exitImage(quarter) {
    const c = blank(24, 48, SKY);
    const g = c.getContext('2d');
    [['#fc9d9e', 4, 16], ['#e33a3f', 6, 10], ['#c2848e', 10, 4]].forEach(([colour, x, w]) => {
        g.fillStyle = colour;
        g.fillRect(x, 0, w, 48);
    });
    g.drawImage(quarter, 0, 0);
    g.drawImage(manipulate(quarter, 0), 12, 0);
    g.drawImage(manipulate(quarter, 1), 0, 12);
    g.drawImage(manipulate(quarter, 2), 12, 12);
    return c;
}

// TileCanvas.createLargeBallImage(): 16 × 16 from a quarter
function largeBall(quarter) {
    const c = blank(16, 16);
    const g = c.getContext('2d');
    g.drawImage(quarter, -4, -4);
    g.drawImage(manipulate(quarter, 0), 8, -4);
    g.drawImage(manipulate(quarter, 1), -4, 8);
    g.drawImage(manipulate(quarter, 4), 8, 8);
    return c;
}

// TileCanvas.createMovingObj(): the 24 × 24 spikes from a quarter
function spikesImage(t) {
    const c = blank(24, 24);
    const g = c.getContext('2d');
    g.drawImage(t[46], 0, 0);
    g.drawImage(manipulate(t[46], 0), 12, 0);
    g.drawImage(manipulate(t[46], 4), 12, 12);
    g.drawImage(manipulate(t[46], 1), 0, 12);
    return c;
}

// The sprite (back, front) for each tile id, as TileCanvas.drawTile() picks them; fill: the tile's colour first
const HOOPS = { 23: [13, 14], 24: [15, 16], 15: [17, 18], 16: [19, 20], 27: [21, 22], 28: [23, 24], 19: [25, 26],
    20: [27, 28], 21: [31, 29], 22: [32, 30], 13: [35, 33], 14: [36, 34], 25: [39, 37], 26: [40, 38], 17: [43, 41],
    18: [44, 42] };

// The sprite TileCanvas.drawTile() draws for each simple tile id, on dry land (false) and in water (true)
function simpleSprites(t) {
    const table = (water) => ({ 1: t[0], 2: t[1], 3: t[water ? 6 : 2], 4: t[water ? 9 : 5], 5: t[water ? 7 : 3],
        6: t[water ? 8 : 4], 7: t[10], 8: t[11], 29: t[45], 30: t[water ? 61 : 57], 31: t[water ? 60 : 56],
        32: t[water ? 59 : 55], 33: t[water ? 62 : 58], 34: t[65], 35: t[64], 36: t[63], 37: t[66], 38: t[53],
        39: t[50], 40: manipulate(t[50], 5), 41: manipulate(t[50], 4), 42: manipulate(t[50], 3), 43: t[51],
        44: manipulate(t[51], 5), 45: manipulate(t[51], 4), 46: manipulate(t[51], 3), 47: t[52],
        48: manipulate(t[52], 5), 49: manipulate(t[52], 4), 50: manipulate(t[52], 3), 51: t[54],
        52: manipulate(t[54], 5), 53: manipulate(t[54], 4), 54: manipulate(t[54], 3) });
    return { false: table(false), true: table(true) };
}

// One level, drawn on a canvas of its own
function drawLevel(level, t, simple) {
    const canvas = blank(level.width * 12, level.height * 12);
    const g = canvas.getContext('2d');
    const fronts = [];
    level.rows.forEach((row, ty) => row.forEach((tile, tx) => {
        const x = tx * 12;
        const y = ty * 12;
        const water = (tile & 0x40) !== 0;
        const id = tile & 0x3f;
        g.fillStyle = water ? WATER : SKY;
        g.fillRect(x, y, 12, 12);
        const sprite = simple[water][id];
        if (sprite) g.drawImage(sprite, x, y);
        if (HOOPS[id]) {
            g.drawImage(t[HOOPS[id][0]], x, y);
            fronts.push([t[HOOPS[id][1]], x, y]);
        }
        if (id === 9) {
            const ex = (tx - level.exitX) * 12;
            const ey = (ty - level.exitY) * 12;
            g.drawImage(t[12], ex, ey, 12, 12, x, y, 12, 12);
        }
        if (id === 10) {
            g.fillStyle = SKY;
            g.fillRect(x, y, 12, 12);
        }
    }));
    const spikes = spikesImage(t);
    level.movers.forEach((m) => g.drawImage(spikes, m.left * 12 + m.offsetX, m.top * 12 + m.offsetY));
    const ball = level.ballBig ? t[49] : t[47];
    const half = ball.width / 2;
    g.drawImage(ball, level.ballX * 12 + 6 - half, level.ballY * 12 + 6 - half);
    fronts.forEach(([image, x, y]) => g.drawImage(image, x, y));
    return canvas;
}

const sheet = new Image();
sheet.onload = () => {
    const t = tileImages(sheet);
    const simple = simpleSprites(t);
    window.drawn = LEVELS.map((level) => {
        const canvas = drawLevel(level, t, simple);
        canvas.id = level.name.replace('.', '-');
        canvas.style.width = canvas.width * SCALE + 'px';
        const title = document.createElement('h2');
        title.textContent = level.name + ': ' + level.width + ' × ' + level.height + ' tiles, ' + level.hoops + ' hoops';
        document.body.append(title, canvas);
        return { id: canvas.id, png: canvas.toDataURL('image/png') };
    });
};
sheet.src = '${sheetDataUrl}';
</script>
`;
}

const [source, out, scale = '2'] = process.argv.slice(2);
if (!source || !out) {
    console.error('Usage: node draw-levels.mjs <folder with levels/ and icons/> <out folder> [scale]');
    process.exit(1);
}
mkdirSync(out, { recursive: true });
const levels = readdirSync(join(source, 'levels')).filter((name) => /^J2MElvl\.\d{3}$/.test(name)).sort()
    .map((name) => parseLevel(name, readFileSync(join(source, 'levels', name))));
const sheetDataUrl = 'data:image/png;base64,' + readFileSync(join(source, 'icons', 'objects_nm.png')).toString('base64');
const htmlPath = join(out, 'levels.html');
writeFileSync(htmlPath, pageHtml(sheetDataUrl, levels, Number(scale)));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath);
await page.waitForFunction(() => window.drawn);
const drawn = await page.evaluate(() => window.drawn);
await browser.close();
drawn.forEach(({ id, png }) => {
    writeFileSync(join(out, `${id}.png`), Buffer.from(png.split(',')[1], 'base64'));
});
console.log(`${drawn.length} levels drawn: ${htmlPath} and ${drawn.map(({ id }) => id + '.png').join(', ')}`);
