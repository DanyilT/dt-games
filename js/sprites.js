/**
 * Bounce: the sprites. The phone's game has one small sheet of 12 × 12 px pictures (img/objects.png, Nokia's: see
 * README.md), and makes everything else from it by flipping and turning, as this file does (the original's
 * loadTileImages(), createExitImage(), createLargeBallImage() and createMovingObj()). drawTile() draws a tile as the
 * original's drawTile() does.
 */
const Sprites = (() => {
    const SKY = '#b0e0f0';
    const WATER = '#1060b0';
    const T = 12; // px: a tile
    const images = []; // The phone's tileImages[], by its numbers
    let life = null; // The status bar's ball and hoop
    let hoop = null;
    let spikes = null; // The moving spikes, 24 × 24
    let exitDoor = null; // The exit, 24 × 48: the door, and the open doorway under it
    let ready = false;

    // The hoops' halves: for each hoop tile (13 to 28), the picture behind the ball and the one in front of it
    const HOOP_BACK = [35, 36, 17, 19, 43, 44, 25, 27, 31, 32, 13, 15, 39, 40, 21, 23];
    const HOOP_FRONT = [33, 34, 18, 20, 41, 42, 26, 28, 29, 30, 14, 16, 37, 38, 22, 24];

    // A blank picture, w × h px, filled with a colour if given
    function blank(w, h, color) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        if (color) {
            const g = canvas.getContext('2d');
            g.fillStyle = color;
            g.fillRect(0, 0, w, h);
        }
        return canvas;
    }

    // The sheet's picture at (col, row), over a colour (or see-through)
    function cut(sheet, col, row, color) {
        const canvas = blank(T, T, color);
        canvas.getContext('2d').drawImage(sheet, -col * T, -row * T);
        return canvas;
    }

    // A picture flipped or turned: 0 flipped across, 1 upside down, 2 both, 3/4/5 turned 90/180/270° anticlockwise
    function turn(image, how) {
        const canvas = blank(image.width, image.height);
        const g = canvas.getContext('2d');
        g.translate(image.width / 2, image.height / 2);
        if (how === 0) g.scale(-1, 1);
        if (how === 1) g.scale(1, -1);
        if (how === 2) g.scale(-1, -1);
        if (how === 3) g.rotate(-Math.PI / 2);
        if (how === 4) g.rotate(Math.PI);
        if (how === 5) g.rotate(Math.PI / 2);
        g.drawImage(image, -image.width / 2, -image.height / 2);
        return canvas;
    }

    // The four ways a floor thing turns onto the left wall, the ceiling and the right wall
    function fourWays(image) {
        return [image, turn(image, 5), turn(image, 4), turn(image, 3)];
    }

    // The exit: red stripes, and the shut door over the top half (a quarter, mirrored four ways)
    function makeExit(quarter) {
        const canvas = blank(24, 48, SKY);
        const g = canvas.getContext('2d');
        [['#fc9d9e', 4, 16], ['#e33a3f', 6, 10], ['#c2848e', 10, 4]].forEach(([color, x, w]) => {
            g.fillStyle = color;
            g.fillRect(x, 0, w, 48);
        });
        g.drawImage(quarter, 0, 0);
        g.drawImage(turn(quarter, 0), 12, 0);
        g.drawImage(turn(quarter, 1), 0, 12);
        g.drawImage(turn(quarter, 2), 12, 12);
        return canvas;
    }

    // The big ball, 16 × 16, from a quarter
    function makeBigBall(quarter) {
        const canvas = blank(16, 16);
        const g = canvas.getContext('2d');
        g.drawImage(quarter, -4, -4);
        g.drawImage(turn(quarter, 0), 8, -4);
        g.drawImage(turn(quarter, 1), -4, 8);
        g.drawImage(turn(quarter, 4), 8, 8);
        return canvas;
    }

    // The moving spikes, 24 × 24, from a quarter
    function makeSpikes(quarter) {
        const canvas = blank(24, 24);
        const g = canvas.getContext('2d');
        g.drawImage(quarter, 0, 0);
        g.drawImage(turn(quarter, 0), 12, 0);
        g.drawImage(turn(quarter, 4), 12, 12);
        g.drawImage(turn(quarter, 1), 0, 12);
        return canvas;
    }

    // Every picture, from the sheet (the phone's loadTileImages())
    function build(sheet) {
        const t = images;
        t[0] = cut(sheet, 1, 0);
        t[1] = cut(sheet, 1, 2);
        t[2] = cut(sheet, 0, 3, SKY);
        t[3] = turn(t[2], 1);
        t[4] = turn(t[2], 3);
        t[5] = turn(t[2], 5);
        t[6] = cut(sheet, 0, 3, WATER);
        t[7] = turn(t[6], 1);
        t[8] = turn(t[6], 3);
        t[9] = turn(t[6], 5);
        t[10] = cut(sheet, 0, 4);
        t[11] = cut(sheet, 3, 4);
        t[14] = cut(sheet, 0, 5);
        t[13] = turn(t[14], 1);
        t[15] = turn(t[13], 0);
        t[16] = turn(t[14], 0);
        t[18] = cut(sheet, 1, 5);
        t[17] = turn(t[18], 1);
        t[19] = turn(t[17], 0);
        t[20] = turn(t[18], 0);
        t[22] = cut(sheet, 2, 5);
        t[21] = turn(t[22], 1);
        t[23] = turn(t[21], 0);
        t[24] = turn(t[22], 0);
        t[26] = cut(sheet, 3, 5);
        t[25] = turn(t[26], 1);
        t[27] = turn(t[25], 0);
        t[28] = turn(t[26], 0);
        t[29] = turn(t[14], 5);
        t[30] = turn(t[29], 1);
        t[31] = turn(t[29], 0);
        t[32] = turn(t[30], 0);
        t[33] = turn(t[18], 5);
        t[34] = turn(t[33], 1);
        t[35] = turn(t[33], 0);
        t[36] = turn(t[34], 0);
        t[37] = turn(t[22], 5);
        t[38] = turn(t[37], 1);
        t[39] = turn(t[37], 0);
        t[40] = turn(t[38], 0);
        t[41] = turn(t[26], 5);
        t[42] = turn(t[41], 1);
        t[43] = turn(t[41], 0);
        t[44] = turn(t[42], 0);
        t[45] = cut(sheet, 3, 3);
        t[46] = cut(sheet, 1, 3);
        t[47] = cut(sheet, 2, 0);
        t[48] = cut(sheet, 0, 1);
        t[49] = makeBigBall(cut(sheet, 3, 0));
        t[50] = cut(sheet, 3, 1);
        t[51] = cut(sheet, 2, 4);
        t[52] = cut(sheet, 3, 2);
        t[53] = cut(sheet, 1, 1);
        t[54] = cut(sheet, 2, 2);
        t[55] = cut(sheet, 0, 0, SKY);
        t[56] = turn(t[55], 3);
        t[57] = turn(t[55], 4);
        t[58] = turn(t[55], 5);
        t[59] = cut(sheet, 0, 0, WATER);
        t[60] = turn(t[59], 3);
        t[61] = turn(t[59], 4);
        t[62] = turn(t[59], 5);
        t[63] = cut(sheet, 0, 2);
        t[64] = turn(t[63], 3);
        t[65] = turn(t[63], 4);
        t[66] = turn(t[63], 5);
        exitDoor = makeExit(cut(sheet, 2, 3));
        spikes = makeSpikes(t[46]);
        life = cut(sheet, 2, 1);
        hoop = cut(sheet, 1, 4);
    }

    // The picture for each simple tile (not a hoop, the exit or moving spikes), dry and wet
    let simple = null;
    function makeSimple() {
        const t = images;
        const [deflater, pump, gravity, jump] = [t[50], t[51], t[52], t[54]].map(fourWays);
        const table = (wet) => ({
            1: t[0], 2: t[1], 3: t[wet ? 6 : 2], 4: t[wet ? 9 : 5], 5: t[wet ? 7 : 3], 6: t[wet ? 8 : 4], 7: t[10], 8: t[11],
            29: t[45], 30: t[wet ? 61 : 57], 31: t[wet ? 60 : 56], 32: t[wet ? 59 : 55], 33: t[wet ? 62 : 58],
            34: t[65], 35: t[64], 36: t[63], 37: t[66], 38: t[53],
            39: deflater[0], 40: deflater[1], 41: deflater[2], 42: deflater[3],
            43: pump[0], 44: pump[1], 45: pump[2], 46: pump[3],
            47: gravity[0], 48: gravity[1], 49: gravity[2], 50: gravity[3],
            51: jump[0], 52: jump[1], 53: jump[2], 54: jump[3],
        });
        simple = { false: table(false), true: table(true) };
    }

    // Loads the sheet and makes every picture: a Promise
    function load(src) {
        return new Promise((resolve, reject) => {
            const sheet = new Image();
            sheet.onload = () => {
                build(sheet);
                makeSimple();
                ready = true;
                resolve();
            };
            sheet.onerror = () => reject(new Error(`${src} didn't load`));
            sheet.src = src;
        });
    }

    /**
     * Draws a tile with its top-left at (x, y), as the phone draws it
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} game - the level (js/rules.js): the exit's door, and the moving spikes
     * @param {number} col - the tile's column and row in the level
     * @param {number} row
     */
    function drawTile(ctx, game, col, row, x, y) {
        if (col < 0 || row < 0 || col >= game.width || row >= game.height) {
            ctx.drawImage(images[0], x, y); // Outside the map: brick
            return;
        }
        const byte = game.map[row * game.width + col];
        const wet = (byte & 0x40) !== 0;
        const id = byte & 0x3F;
        ctx.fillStyle = wet ? WATER : SKY;
        if (id >= 13 && id <= 28) {
            ctx.fillRect(x, y, T, T);
            ctx.drawImage(images[HOOP_BACK[id - 13]], x, y);
            ctx.drawImage(images[HOOP_FRONT[id - 13]], x, y);
            return;
        }
        if (id === 9) {
            // The exit: its 24 × 24 window on the door, the door slid up by the opening so far
            const [exitCol, exitRow] = GameRules.levelData(game.level).exit;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, T, T);
            ctx.clip();
            ctx.drawImage(exitDoor, 0, game.exitOffset, 24, 24, x - (col - exitCol) * T, y - (row - exitRow) * T, 24, 24);
            ctx.restore();
            return;
        }
        if (id === 10) {
            // Where moving spikes go: the sky, and the spikes of this tile's area where they cover it
            ctx.fillStyle = SKY;
            ctx.fillRect(x, y, T, T);
            const s = GameRules.spikeAt(game, col, row);
            if (s === -1) return;
            const spike = game.spikes[s];
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, T, T);
            ctx.clip();
            ctx.drawImage(spikes, x + (spike.left - col) * T + spike.x, y + (spike.top - row) * T + spike.y);
            ctx.restore();
            return;
        }
        ctx.fillRect(x, y, T, T);
        const sprite = simple[wet][id];
        if (sprite) ctx.drawImage(sprite, x, y);
    }

    // The front half of a hoop tile, drawn again over the ball (so it goes through the hoop)
    function drawHoopFront(ctx, id, x, y) {
        if (id >= 13 && id <= 28) ctx.drawImage(images[HOOP_FRONT[id - 13]], x, y);
    }

    return Object.freeze({
        SKY, WATER, load, drawTile, drawHoopFront,
        get ready() {
            return ready;
        },
        get smallBall() {
            return images[47];
        },
        get poppedBall() {
            return images[48];
        },
        get bigBall() {
            return images[49];
        },
        get life() {
            return life;
        },
        get hoop() {
            return hoop;
        },
        image(n) {
            return images[n];
        },
    });
})();
