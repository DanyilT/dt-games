# Snake Game
[![snake@v1.0.0](https://img.shields.io/badge/snake-v1.0.0-blue)](https://github.com/DanyilT/dt-games/releases/tag/snake@v1.0.0)

Classic Snake game where you control a snake to eat food and grow longer. Avoid hitting the walls or yourself!

![Snake Game on a computer](img/desktop-screenshot.png)

**[Play in GameHub](https://gamehub.foo/g/snake)** · [Play directly](https://snake.dt-games.pages.dev) · [Source code](https://github.com/DanyilT/dt-games/tree/snake)

## 🕹️ Controls

Press an arrow key (or swipe on a phone) to start. In GameHub, click the game first, so it has the keyboard: it says so.

| Keys | Action |
| --- | --- |
| <kbd>W</kbd> / <kbd>↑</kbd> | Go up |
| <kbd>A</kbd> / <kbd>←</kbd> | Go left |
| <kbd>S</kbd> / <kbd>↓</kbd> | Go down |
| <kbd>D</kbd> / <kbd>→</kbd> | Go right |
| <kbd>Space</kbd> | Pause or resume (an arrow key or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> resumes too, and turns) |
| <kbd>R</kbd> | Restart |
| <kbd>I</kbd> | Show or hide the instructions |

On a phone or tablet:

- **Swipe** on the board to turn the snake (or start a game, or resume a paused one).
- **Tap** the board to pause or resume.
- **Tap** the buttons under the board to restart, pause and show the instructions.

## ✨ Features

- Responsive controls
- Score tracking
- High score system (kept in the browser)
- Mobile-friendly: swipe to turn, tap to pause
- Pauses by itself when you switch away (another tab, a locked phone, a click outside GameHub's frame), and carries on where you left off next time
- Easter Egg

## 💾 Saved data

The game saves your high score, and the game you're playing, as one object: `{ "highScore": <int>, "game": { … } | null }`.
`game` is kept when the game pauses, or when you switch away or close the page, so it comes back next time, paused: the snake, the food and the score (`state`), the run so far for GameHub (`run`, see below), the speed and your best before it. It's taken out when the game ends.
It's kept in the browser, in `localStorage` under `snakeGameData`, and in your GameHub account when you play in GameHub signed in (see below).
If the browser blocks storage (some do inside an iframe), the game still plays, but it doesn't remember your high score.

## 👾 GameHub

[GameHub](https://gamehub.foo) plays this game in a frame. `js/gamehub.js` connects the two: it's the same file in every game, loaded before the game's own scripts.

- **Saves:** the game saves only through `window.GameHub`. Every save stays in this browser, as before. When you play in GameHub signed in, your progress also goes to your GameHub account, and the game loads the account's copy, so it follows you from device to device. The first time you play signed in on a device, if your account has no save for this game yet, this device's goes up.
- **The play area:** GameHub asks the game to put its play area in the middle of the frame (the `gamehub:center` message).
- **The frame view:** in GameHub's frame, the game shows only what's needed to play: the canvas alone (a tap pauses, a swipe starts a new game). In full screen it shows the whole page. `js/gamehub.js` sets `data-gamehub-view` on the page (`frame`, or `full` when GameHub's `gamehub:view` message says so), and `css/page.css` says what the frame shows.
- **Pausing and loading:** the game pauses when GameHub asks (the `gamehub:pause` message) and when its frame loses the keyboard, and it tells GameHub when it's ready to play (`GameHub.playable()`, the `gamehub:playable` message).
- **Offline:** you can download the game in GameHub (the Download button on its page there) to play it offline.
- **The panel and replays:** under the game, GameHub shows what the game tells it with `GameHub.status()` (the score now, your best, and more behind its More button), and each game you finish is kept as a run, so you can watch it again there: the run's random seed and your moves, never a video. The food is placed from the run's seed, and each turn is recorded with the step it came after. Runs stay in your browser. A cheat (the console, the Easter egg) means that game isn't kept.
- **Checked runs:** signed in, GameHub hands the game a few tickets, each a seed its server chose, and each run takes one. GameHub then plays the run again on its server with this game's own rules (`js/rules.js`, the code the game plays by), so only results it got itself count as your records (it does this offline too, once you're back online).
- **Only GameHub:** it loads GameHub's script (`/hub-bridge.js`) only when the game is in a frame on GameHub's own address.

The game works without it: played on its own, or when GameHub can't be reached (the game gives it 3 seconds at most), everything stays in this browser.

## 👀️ Links

- **Play in GameHub:** https://gamehub.foo/g/snake
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
