# Snake Game
[![snake@v1.0.0](https://img.shields.io/badge/snake-v1.0.0-blue)](https://github.com/DanyilT/dt-games/releases/tag/snake@v1.0.0)

Classic Snake game where you control a snake to eat food and grow longer. Avoid hitting the walls or yourself!

![Snake Game on a computer](img/desktop-screenshot.png)

**[Play in GameHub](https://game-hub.danyt.workers.dev/g/snake)** · [Play directly](https://snake.dt-games.pages.dev) · [Source code](https://github.com/DanyilT/dt-games/tree/snake)

## 🕹️ Controls

Press an arrow key (or tap/swipe on a phone) to start.

| Keys | Action |
| --- | --- |
| <kbd>W</kbd> / <kbd>↑</kbd> | Go up |
| <kbd>A</kbd> / <kbd>←</kbd> | Go left |
| <kbd>S</kbd> / <kbd>↓</kbd> | Go down |
| <kbd>D</kbd> / <kbd>→</kbd> | Go right |
| <kbd>Space</kbd> | Pause or resume |
| <kbd>R</kbd> | Restart |
| <kbd>I</kbd> | Show or hide the instructions |

On a phone or tablet:

- **Swipe** on the board to turn the snake.
- **Tap** the buttons under the board to restart, pause and show the instructions.

## ✨ Features

- Responsive controls
- Score tracking
- High score system (kept in the browser)
- Mobile-friendly: swipe to turn
- Easter Egg

## 💾 Saved data

The game saves your high score as one object: `{ "highScore": <int> }`.
It's kept in the browser, in `localStorage` under `snakeGameData`, and in your GameHub account when you play in GameHub signed in (see below).
If the browser blocks storage (some do inside an iframe), the game still plays, but it doesn't remember your high score.

## 👾 GameHub

[GameHub](https://game-hub.danyt.workers.dev) plays this game in a frame. `js/gamehub.js` connects the two: it's the same file in every game, loaded before the game's own scripts.

- **Saves:** the game saves only through `window.GameHub`. Every save stays in this browser, as before. When you play in GameHub signed in, your progress also goes to your GameHub account, and the game loads the account's copy, so it follows you from device to device. The first time you play signed in on a device, if your account has no save for this game yet, this device's goes up.
- **The play area:** GameHub asks the game to put its play area in the middle of the frame (the `gamehub:center` message).
- **Offline:** you can download the game in GameHub (the Download button on its page there) to play it offline.
- **Only GameHub:** it loads GameHub's script (`/hub-bridge.js`) only when the game is in a frame on GameHub's own address.

The game works without it: played on its own, or when GameHub can't be reached (the game gives it 3 seconds at most), everything stays in this browser.

## 👀️ Links

- **Play in GameHub:** https://game-hub.danyt.workers.dev/g/snake
- **Play directly:** https://snake.dt-games.pages.dev
- **Source code:** https://github.com/DanyilT/dt-games/tree/snake
- **The other games:** [Tetris](https://github.com/DanyilT/dt-games/tree/tetris), [Minesweeper](https://github.com/DanyilT/dt-games/tree/minesweeper) and [Sudoku](https://github.com/DanyilT/dt-games/tree/sudoku), each on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games)
- **GameHub**, the site with all my games: https://github.com/DanyilT/game-hub
- **Where it came from:** the `snake/` folder of [DanyilT/WebDev](https://github.com/DanyilT/WebDev/tree/page/games/snake), branch `page/games`

## 🔌 Run it locally

It's plain HTML, CSS and JavaScript: no build step, nothing to install. Serve the folder with any static server, for example:

```bash
python3 -m http.server
```

Then open http://localhost:8000.

## 💿 Get just this game

Every game lives on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games). To clone only this one:

```bash
git clone --branch snake --single-branch https://github.com/DanyilT/dt-games.git snake
```

## 🧻 License

This game is licensed under the [MIT License](LICENSE).
