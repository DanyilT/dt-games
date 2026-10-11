# Sudoku Game
[![sudoku@v1.0.0](https://img.shields.io/badge/sudoku-v1.0.0-blue)](https://github.com/DanyilT/dt-games/releases/tag/sudoku@v1.0.0)

Challenge your mind with this classic Japanese number puzzle game. Fill the grid following Sudoku rules.

![Sudoku Game on a computer](img/desktop-screenshot.png)

**[Play in GameHub](https://gamehub.foo/g/sudoku)** · [Play directly](https://sudoku.dt-games.pages.dev) · [Source code](https://github.com/DanyilT/dt-games/tree/sudoku)

## 🕹️ Controls

| Keys | Action |
| --- | --- |
| Click | Select a cell |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> / <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | Move around the grid |
| <kbd>1</kbd> … <kbd>9</kbd> | Fill in the number |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Clear the cell |
| <kbd>Enter</kbd> | Check the solution (when no cell is selected) |
| <kbd>Shift</kbd> + <kbd>Enter</kbd> | Check the solution |
| <kbd>Shift</kbd> + <kbd>1</kbd> … <kbd>5</kbd> | Difficulty: For a Bread / Easy / Medium / Hard / Expert |
| <kbd>R</kbd> | New game |
| <kbd>I</kbd> | Show or hide the info (your wins and the instructions) |

On a phone or tablet:

- **Tap** a cell, then a number on the pad (✕ clears the cell).

## ✨ Features

- Multiple difficulty levels, from For a Bread (61 numbers given) to Expert (11 given)
- Auto-save progress: the puzzle is kept from the moment it starts, so close the page and carry on later
- Validation: numbers that clash turn red
- Number highlighting: select a given number to see where else it is
- Achievement tracking: your wins for each level
- Modern neumorphic design
- Mobile-friendly: a number pad instead of the phone's keyboard
- Easter Egg

## 💾 Saved data

The game saves everything as one object: `{ "level": "medium", "wins": { … }, "bestTimes": { … }, "board": { … } }`.
`level` is the difficulty you picked, `wins` counts the puzzles you solved on each of the 5 levels, and `bestTimes` keeps your fastest solve on each level, in seconds (`null` until you've solved one). `board` is the puzzle in progress (or `null`), with `time`: the seconds you've spent on it so far, and `run`: GameHub's record of it so far, to watch it again once it's solved (see below).
The game times you without showing a timer: the clock runs only while the page is on screen, and a saved puzzle carries on from its time.
It's kept in the browser, in `localStorage` under `sudokuGameData`, and in your GameHub account when you play in GameHub signed in (see below).
If the browser blocks storage (some do inside an iframe), the game still plays, but it doesn't remember anything.

## 👾 GameHub

[GameHub](https://gamehub.foo) plays this game in a frame. `js/gamehub.js` connects the two: it's the same file in every game, loaded before the game's own scripts.

- **Saves:** the game saves only through `window.GameHub`. Every save stays in this browser, as before. When you play in GameHub signed in, your progress also goes to your GameHub account, and the game loads the account's copy, so it follows you from device to device. The first time you play signed in on a device, if your account has no save for this game yet, this device's goes up.
- **The play area:** GameHub asks the game to put its play area in the middle of the frame (the `gamehub:center` message).
- **The frame view:** in GameHub's frame, the game shows only what's needed to play: the grid, the number pad, and New Game, Check Solution and the level. In full screen it shows the whole page. `js/gamehub.js` sets `data-gamehub-view` on the page (`frame`, or `full` when GameHub's `gamehub:view` message says so), and `css/page.css` says what the frame shows.
- **Loading:** the game tells GameHub when its puzzle is up (`GameHub.playable()`, the `gamehub:playable` message). It doesn't move by itself, so it has nothing to pause when GameHub asks (`gamehub:pause`): its clock already stops while the page is hidden.
- **Offline:** you can download the game in GameHub (the Download button on its page there) to play it offline.
- **The panel and replays:** under the game, GameHub shows what the game tells it with `GameHub.status()` (the score now, your best, and more behind its More button), and each game you finish is kept as a run, so you can watch it again there: the run's random seed and your moves, never a video. The puzzle is made from the run's seed, and each number you enter or clear is recorded with its time. The run is saved with the puzzle in progress, so it carries on after a reload, or on another device. Runs stay in your browser. A cheat (the console, the Easter egg) means that game isn't kept.
- **Checked runs:** signed in, GameHub hands the game a few tickets, each a seed its server chose, and each run takes one. GameHub then plays the run again on its server with this game's own rules (`js/rules.js`, the code the game plays by), so only results it got itself count as your records (it does this offline too, once you're back online). A new puzzle waits for them (`GameHub.ready()`), so it gets one too; a puzzle in progress keeps its own.
- **Only GameHub:** it loads GameHub's script (`/hub-bridge.js`) only when the game is in a frame on GameHub's own address.

The game works without it: played on its own, or when GameHub can't be reached (the game gives it 3 seconds at most), everything stays in this browser.

## 👀️ Links

- **Play in GameHub:** https://gamehub.foo/g/sudoku
- **Play directly:** https://sudoku.dt-games.pages.dev
- **Source code:** https://github.com/DanyilT/dt-games/tree/sudoku
- **The other games:** [Snake](https://github.com/DanyilT/dt-games/tree/snake), [Tetris](https://github.com/DanyilT/dt-games/tree/tetris) and [Minesweeper](https://github.com/DanyilT/dt-games/tree/minesweeper), each on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games)
- **GameHub**, the site with all my games: https://github.com/DanyilT/game-hub
- **Where it came from:** the `sudoku/` folder of [DanyilT/WebDev](https://github.com/DanyilT/WebDev/tree/page/games/sudoku), branch `page/games`

## 🔌 Run it locally

It's plain HTML, CSS and JavaScript: no build step, nothing to install. Serve the folder with any static server, for example:

```bash
python3 -m http.server
```

Then open http://localhost:8000.

## 🔬 Test it

`test/index.html` is a replay test: a bot plays Sudoku through the page's own controls, and each run it finishes is played again with `js/rules.js` (what GameHub's server checks runs with), which must come out as the game said. Serve the folder as above and open http://localhost:8000/test/ (or http://localhost:8000/test/?start to start at once). The game there saves under a name of its own, so your best score and game in progress stay as they were. *Copy the runs as JSON* gives the runs in the shape of GameHub's test fixtures.

## 💿 Get just this game

Every game lives on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games). To clone only this one:

```bash
git clone --branch sudoku --single-branch https://github.com/DanyilT/dt-games.git sudoku
```

## 🧻 License

This game is licensed under the [MIT License](LICENSE).
