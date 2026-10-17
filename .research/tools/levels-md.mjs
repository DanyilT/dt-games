/**
 * Bounce: writes the research folder's levels.md from the remake's js/rules.js (the levels as the game has them) and
 * the winning routes the search found: a table of every level, then each level's numbers and its picture.
 *
 * Usage: node levels-md.mjs <path/to/js/rules.js> <routes.json> > levels.md
 */
import { readFileSync } from 'node:fs';
import { loadRules } from './test-rules.mjs';

const [rulesPath, routesPath] = process.argv.slice(2);
const rules = loadRules(rulesPath);
const routes = JSON.parse(readFileSync(routesPath, 'utf8'));

// How many tiles of each kind a level has (by tile id, water or not), and how many are in water
function count(level) {
    const { tiles } = rules.levelData(level);
    const ids = {};
    let wet = 0;
    for (const tile of tiles) {
        const id = tile & 0x3F;
        ids[id] = (ids[id] ?? 0) + 1;
        if (tile & 0x40) wet++;
    }
    const sum = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => ids[from + i] ?? 0).reduce((a, b) => a + b, 0);
    return {
        wet, brick: ids[1] ?? 0, rubber: ids[2] ?? 0, spikes: sum(3, 6), crystals: ids[7] ?? 0, crystalBalls: ids[29] ?? 0,
        ramps: sum(30, 33), rubberRamps: sum(34, 37), speed: ids[38] ?? 0, deflaters: sum(39, 42), pumps: sum(43, 46),
        gravity: sum(47, 50), jump: sum(51, 54),
    };
}

const lines = [];
lines.push('# The levels');
lines.push('');
lines.push('The 11 levels are Nokia\'s, the same in every version from 1.01 to 1.24 except one tile: level 11\'s column 91, row 42 is brick up to 1.18 and a wet ramp (33) from 1.21. The remake has them in `js/rules.js` (`LEVELS`: a row of letters for each row of tiles, from `LEGEND`), made from the 1.24 JAR\'s files by `tools/levels-to-rules.mjs`, and turned back into those bytes by `tools/test-rules.mjs`.');
lines.push('');
lines.push('## The files');
lines.push('');
lines.push('`levels/J2MElvl.001` to `J2MElvl.011` in the JAR, one byte each, read unsigned, in this order:');
lines.push('');
lines.push('| Bytes | What |');
lines.push('| --- | --- |');
lines.push('| 0, 1 | the ball\'s start tile (column, row) |');
lines.push('| 2 | the ball\'s size at the start: 0 small, anything else big (the files have 0 and 1) |');
lines.push('| 3, 4 | the exit\'s top-left tile (it\'s 2 × 2) |');
lines.push('| 5 | how many hoops there are |');
lines.push('| 6, 7 | the width and the height, in tiles |');
lines.push('| width × height | the tiles, a row at a time: the tile\'s id in bits 0–5, water in bit 6 (64). While the game runs, bit 7 (128) marks a tile to draw again |');
lines.push('| 1 | how many moving spikes there are |');
lines.push('| 8 each | the spike\'s area: left and top (tiles, included), right and bottom (tiles, not included); its speed across and down (px a step, read unsigned, so 255 is +255, not −1); where it starts, across and down (px from the area\'s top-left) |');
lines.push('');
lines.push('A moving spike\'s 24 × 24 px box goes at most (right − left − 2) × 12 px across and (bottom − top − 2) × 12 px down. That can be less than 0 (level 9\'s fourth spike has an area one tile wide), and the spike then jumps back and forth. The 11 levels use 62 different tile bytes: 41 ids, 21 of them in water too.');
lines.push('');
lines.push('## The tiles');
lines.push('');
lines.push('Each tile is 12 × 12 px. What each one does in 1.24 (brick, rubber and the ramps are tested against the ball\'s round shape, 12 or 16 px across; the others against the box round it):');
lines.push('');
lines.push('| Id | Tile | What it does |');
lines.push('| --- | --- | --- |');
lines.push('| 0 | sky (64: water) | nothing |');
lines.push('| 1 | brick | solid; any brick a test reaches sets the ball\'s touch flag (it slides and climbs) |');
lines.push('| 2 | rubber | solid; a hit sets the rubber flag (the next jump is higher) |');
lines.push('| 3–6 | spikes on the floor, the left wall, the ceiling, the right wall | a band through the middle, pixels 4–7 across the spikes, along the whole tile: pops the ball, and blocks |');
lines.push('| 7 | crystal | passed through; +200, and the ball comes back here (at its size then); the last crystal touched (or the start) empties, and this one becomes 8 |');
lines.push('| 8 | a crystal taken (an arrow) | nothing |');
lines.push('| 9 | the exit | a band through each tile\'s middle (pixels 4–7 across): blocks until the door is open; through it, the level is done (`game.md`) |');
lines.push('| 10 | where moving spikes go | the spike\'s 24 × 24 box, less 1 px all round, against the ball\'s box, less 1 px: pops the ball. Where two spikes\' areas overlap, the first spike counts |');
lines.push('| 13, 14 | small hoop standing: top, bottom half | the band through the middle (pixels 4–7) passes it: +500, the "up" tune, both halves become passed (+4, keeping the touched half\'s water). Posts at the ends of the band (the rims) block, on top halves of standing hoops and both halves of lying ones. Small hoops are too small for the big ball: their band blocks it |');
lines.push('| 15, 16 | small hoop lying: left, right half | the same |');
lines.push('| 21–24 | big hoops, the same four | the same, for either ball; on 23, a rim blocks without passing the hoop |');
lines.push('| 17–20, 25–28 | the hoops passed | their rims still block, and small ones still block the big ball |');
lines.push('| 29 | crystal ball | passed through; +1000, a spare ball (up to 5), and the tile empties |');
lines.push('| 30–33 | brick ramps, solid in the top-left, top-right, bottom-right, bottom-left half | a triangle; hit in the air, it turns the ball (`ball-1.24.md`) |');
lines.push('| 34–37 | rubber ramps, the same | the same, and the rubber flag |');
lines.push('| 38 | speed | solid; each step it\'s touched: 300 steps of a top speed of 100 (not 50) |');
lines.push('| 39–42 | deflater on the floor, the left wall, the ceiling, the right wall | solid; a big ball touching it becomes small, where it is |');
lines.push('| 43–46 | pump, the same | a 4 px post (the band) that blocks; a small ball touching it becomes big and moves to the nearest free spot |');
lines.push('| 47–50 | gravity, the same | solid; 300 steps of gravity upside down |');
lines.push('| 51–54 | jump, the same | solid; 300 steps of a higher jump (−147 instead of −67) |');
lines.push('');
lines.push('Outside the map is solid, and while the ball pops every tile is. A test applies the effect of every tile it reaches until one blocks, whether or not the ball then moves there.');
lines.push('');
lines.push('## Each level');
lines.push('');
lines.push('The pictures are each level at its start, drawn with the game\'s own `js/sprites.js` (Nokia\'s sprites): the ball at its start, the moving spikes where they start, the exit shut. A tile is 12 × 12 px. The phone\'s screen shows 128 × 96 px of it at a time, and never a level\'s last 16 px on the right.');
lines.push('');
lines.push('"Win" is the shortest winning route the search found (`tools/search-routes.mjs`; the routes are in `routes/routes.json`), in steps of 40 ms: what the replay test\'s bot plays.');
lines.push('');
lines.push('| Level | Tiles | Ball | Hoops | Moving spikes | Crystals | Crystal balls | Water tiles | Pumps / deflaters | Power-ups (speed, gravity, jump) | Win |');
lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (let level = 1; level <= rules.LEVEL_COUNT; level++) {
    const data = rules.levelData(level);
    const n = count(level);
    const win = routes[level]?.win;
    const time = win ? `${win.steps} steps (${Math.round((win.steps * rules.TICK) / 1000)} s)` : '—';
    lines.push(`| ${level} | ${data.width} × ${data.height} | ${data.big ? 'big' : 'small'} | ${data.hoops} | ${data.spikes.length} | ${n.crystals} | ${n.crystalBalls} | ${n.wet} | ${n.pumps} / ${n.deflaters} | ${n.speed}, ${n.gravity}, ${n.jump} | ${time} |`);
}
lines.push('');
for (let level = 1; level <= rules.LEVEL_COUNT; level++) {
    const data = rules.levelData(level);
    const n = count(level);
    const found = Object.entries(routes[level] ?? {}).map(([name, route]) => `${name} at step ${route.steps}`).join(', ');
    lines.push(`### Level ${level}`);
    lines.push('');
    lines.push(`![Level ${level}](levels/level-${String(level).padStart(2, '0')}.png)`);
    lines.push('');
    lines.push(`- **Size:** ${data.width} × ${data.height} tiles (${data.width * 12} × ${data.height * 12} px).`);
    lines.push(`- **The ball** starts ${data.big ? 'big' : 'small'} at tile ${data.start.join(', ')}; **the exit** is at tile ${data.exit.join(', ')} (2 × 2).`);
    lines.push(`- **Hoops:** ${data.hoops}. **Crystals:** ${n.crystals}. **Crystal balls:** ${n.crystalBalls}.`);
    lines.push(`- **Tiles:** ${n.brick} brick, ${n.rubber} rubber, ${n.spikes} spikes, ${n.ramps} brick and ${n.rubberRamps} rubber ramps, ${n.wet} in water.`);
    lines.push(`- **Pumps:** ${n.pumps}. **Deflaters:** ${n.deflaters}. **Power-ups:** ${n.speed} speed, ${n.gravity} gravity, ${n.jump} jump.`);
    if (data.spikes.length) {
        lines.push(`- **Moving spikes** (area left, top, right, bottom in tiles; speed across, down in px a step; start offset in px):`);
        data.spikes.forEach((spike, i) => lines.push(`  ${i + 1}. ${spike.slice(0, 4).join(', ')}; ${spike[4]}, ${spike[5]}; ${spike[6]}, ${spike[7]}`));
    }
    if (found) lines.push(`- **Routes found:** ${found}.`);
    lines.push('');
}
console.log(lines.join('\n'));
