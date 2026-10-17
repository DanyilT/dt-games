/**
 * Bounce 1.24: turns the JAR's level files (levels/J2MElvl.001 … 011) into the LEVELS block of the remake's js/rules.js,
 * and writes it into that file (between "const LEVELS = Object.freeze([" and its closing "]);"), or prints it.
 *
 * Usage: node levels-to-rules.mjs <folder with levels/> [path/to/js/rules.js]
 *
 * Each level becomes { start, big, exit, hoops, map, spikes }: map is its rows, one letter per tile (LEGEND below, the
 * same table as rules.js's), spikes the moving spikes' 8 bytes each, as the file has them (unsigned).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The letter for each tile byte (the tile's id, + 64 in water): the same as LEGEND in js/rules.js
export const LEGEND = Object.freeze({
    0: ' ', 64: '~', 1: '#', 2: '%',
    3: 'a', 4: 'b', 5: 'c', 6: 'd', 67: 'A', 68: 'B', 69: 'C', 70: 'D',
    7: '*', 9: '=', 10: '.', 29: '+', 38: '!',
    13: 'e', 14: 'f', 15: 'g', 16: 'h', 77: 'E', 78: 'F', 79: 'G', 80: 'H',
    21: 'i', 22: 'j', 23: 'k', 24: 'l', 85: 'I', 86: 'J', 87: 'K', 88: 'L',
    30: 'm', 31: 'n', 32: 'o', 33: 'p', 94: 'M', 96: 'O', 97: 'P',
    34: 'q', 35: 'r', 36: 's', 37: 't', 100: 'S', 101: 'T',
    39: 'u', 40: 'v', 41: 'w', 42: 'x', 105: 'W', 106: 'X',
    43: 'y', 44: 'z', 45: '$', 46: '&', 107: 'Y',
    47: '1', 48: '2', 49: '3', 50: '4', 51: '5', 52: '6', 53: '7', 54: '8',
});

// One level file, decoded
export function parseLevel(bytes) {
    let at = 0;
    const next = () => {
        if (at >= bytes.length) throw new Error(`the file ends at byte ${at}`);
        return bytes[at++];
    };
    const [startCol, startRow, size, exitCol, exitRow, hoops, width, height] = Array.from({ length: 8 }, next);
    if (size > 1) throw new Error(`ball size byte ${size}: only 0 and 1 are known`);
    const map = [];
    for (let row = 0; row < height; row++) {
        let line = '';
        for (let col = 0; col < width; col++) {
            const byte = next();
            if (!(byte in LEGEND)) throw new Error(`tile byte ${byte} at ${col},${row} has no letter`);
            line += LEGEND[byte];
        }
        map.push(line);
    }
    const spikes = Array.from({ length: next() }, () => Array.from({ length: 8 }, next));
    if (at !== bytes.length) throw new Error(`${bytes.length - at} bytes left over`);
    return { start: [startCol, startRow], big: size === 1, exit: [exitCol, exitRow], hoops, map, spikes };
}

// The LEVELS block, as rules.js has it (4 spaces in, inside GameRules)
export function levelsBlock(levels) {
    const lines = ['    const LEVELS = Object.freeze(['];
    levels.forEach((level, i) => {
        lines.push(`        { // Level ${i + 1}: ${level.map[0].length} × ${level.map.length} tiles`);
        lines.push(`            start: [${level.start.join(', ')}], big: ${level.big}, exit: [${level.exit.join(', ')}], hoops: ${level.hoops},`);
        lines.push('            map: [');
        level.map.forEach((row) => lines.push(`                '${row}',`));
        lines.push('            ],');
        if (level.spikes.length === 0) {
            lines.push('            spikes: [],');
        } else {
            lines.push('            spikes: [');
            level.spikes.forEach((spike) => lines.push(`                [${spike.join(', ')}],`));
            lines.push('            ],');
        }
        lines.push('        },');
    });
    lines.push('    ]);');
    return lines.join('\n');
}

function main() {
    const [folder, rulesPath] = process.argv.slice(2);
    if (!folder) {
        console.error('usage: node levels-to-rules.mjs <folder with levels/> [path/to/js/rules.js]');
        process.exit(2);
    }
    const levels = Array.from({ length: 11 }, (_, i) => {
        const name = `J2MElvl.${String(i + 1).padStart(3, '0')}`;
        try {
            return parseLevel(readFileSync(join(folder, 'levels', name)));
        } catch (error) {
            throw new Error(`${name}: ${error.message}`);
        }
    });
    const block = levelsBlock(levels);
    if (!rulesPath) {
        console.log(block);
        return;
    }
    const source = readFileSync(rulesPath, 'utf8');
    const begin = source.indexOf('    const LEVELS = Object.freeze([');
    const end = source.indexOf('\n    ]);', begin);
    if (begin < 0 || end < 0) throw new Error(`${rulesPath} has no "const LEVELS = Object.freeze([" … "]);" block`);
    writeFileSync(rulesPath, source.slice(0, begin) + block + source.slice(end + '\n    ]);'.length));
    console.log(`wrote 11 levels into ${rulesPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
