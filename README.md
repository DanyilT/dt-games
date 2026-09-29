# Tetris Game

The classic block-stacking puzzle game. Rotate and move falling blocks to create complete lines.

![Tetris Game on a computer](img/desktop-screenshot.png)

**[Play in GameHub](https://game-hub.danyt.workers.dev/g/tetris)** · [Play directly](https://tetris.dt-games.pages.dev) · [Source code](https://github.com/DanyilT/dt-games/tree/tetris)

## 👾 Controls

The game starts as soon as the page opens.

| Keys | Action |
| --- | --- |
| <kbd>A</kbd> / <kbd>←</kbd> | Move left |
| <kbd>D</kbd> / <kbd>→</kbd> | Move right |
| <kbd>S</kbd> / <kbd>↓</kbd> | Move down |
| <kbd>W</kbd> / <kbd>↑</kbd> | Rotate |
| <kbd>Space</kbd> | Drop |
| <kbd>P</kbd> | Pause or resume |
| <kbd>R</kbd> | Reset the game |
| <kbd>I</kbd> | Show or hide the instructions |

On a phone or tablet:

- **Swipe** on the board: left or right to move, down to move down, up to rotate.
- **Tap** the board to rotate, or **hold** it for half a second to drop.
- **Tap** the on-screen buttons to move, rotate and drop the piece, and to pause, reset and show the instructions.

## ✨ Features

- Classic Tetris gameplay: the seven tetrominoes, each in its own colour
- Next piece preview
- Score system: 100, 300, 500 or 800 points for 1 to 4 lines (times the level), plus a point for every row a piece drops
- Level progression: a new level every 10 lines, and the pieces fall faster
- Mobile-friendly: swipes and on-screen buttons
- Easter Egg

## 👀 Links

- **Play in GameHub:** https://game-hub.danyt.workers.dev/g/tetris
- **Play directly:** https://tetris.dt-games.pages.dev
- **Source code:** https://github.com/DanyilT/dt-games/tree/tetris
- **The other games:** [Snake](https://github.com/DanyilT/dt-games/tree/snake), [Minesweeper](https://github.com/DanyilT/dt-games/tree/minesweeper) and [Sudoku](https://github.com/DanyilT/dt-games/tree/sudoku), each on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games)
- **GameHub**, the site with all my games: https://github.com/DanyilT/game-hub
- **Where it came from:** the `tetris/` folder of [DanyilT/WebDev](https://github.com/DanyilT/WebDev/tree/page/games/tetris), branch `page/games`

## 🔌 Run it locally

It's plain HTML, CSS and JavaScript: no build step, nothing to install. Serve the folder with any static server, for example:

```bash
python3 -m http.server
```

Then open http://localhost:8000.

## 💿 Get just this game

Every game lives on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games). To clone only this one:

```bash
git clone --branch tetris --single-branch https://github.com/DanyilT/dt-games.git tetris
```

## 🧻 License

This game is licensed under the [MIT License](LICENSE).
