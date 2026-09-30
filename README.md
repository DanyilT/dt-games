# Tetris Game
[![tetris@v1.0.0](https://img.shields.io/badge/tetris-v1.0.0-blue)](https://github.com/DanyilT/dt-games/releases/tag/tetris@v1.0.0)

The classic block-stacking puzzle game. Rotate and move falling blocks to create complete lines.

![Tetris Game on a computer](img/desktop-screenshot.png)

**[Play in GameHub](https://game-hub.danyt.workers.dev/g/tetris)** · [Play directly](https://tetris.dt-games.pages.dev) · [Source code](https://github.com/DanyilT/dt-games/tree/tetris)

## 🕹️ Controls

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
- Best score, kept in the browser and shown next to the score
- Level progression: a new level every 10 lines, and the pieces fall faster
- Mobile-friendly: swipes and on-screen buttons
- Easter Egg

## 💾 Saved data

The game saves your best score as one object: `{ "highScore": <int> }`.
It's kept in the browser, in `localStorage` under `tetrisGameData`, and in your GameHub account when you play in GameHub signed in (see below).
If the browser blocks storage (some do inside an iframe), the game still plays, but it doesn't remember your best score.

## 👾 GameHub

[GameHub](https://game-hub.danyt.workers.dev) plays this game in a frame. `js/gamehub.js` connects the two: it's the same file in every game, loaded before the game's own scripts.

- **Saves:** the game saves only through `window.GameHub`. Every save stays in this browser, as before. When you play in GameHub signed in, your progress also goes to your GameHub account, and the game loads the account's copy, so it follows you from device to device. The first time you play signed in on a device, if your account has no save for this game yet, this device's goes up.
- **The play area:** GameHub asks the game to put its play area in the middle of the frame (the `gamehub:center` message).
- **Only GameHub:** it loads GameHub's script (`/hub-bridge.js`) only when the game is in a frame on GameHub's own address.

The game works without it: played on its own, or when GameHub can't be reached (the game gives it 3 seconds at most), everything stays in this browser.

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
