# Tic-Tac-Toe

Noughts and crosses against a bot that plays by minimax, drawn in pencil on a sheet of notebook paper. Three levels; on Hard, a draw is the best you can do.

![Tic-Tac-Toe on a computer](img/desktop-screenshot.png)

**[Play in GameHub](https://gamehub.foo/g/tic-tac-toe)** · [Play directly](https://tic-tac-toe.dt-games.pages.dev) · [Source code](https://github.com/DanyilT/dt-games/tree/tic-tac-toe)

## 📜 How it plays

- A match is **5 rounds**. X always goes first: you're X in rounds 1, 3 and 5, and O in rounds 2 and 4 (then the bot opens).
- Three in a row wins the round: **2 points**. A draw is **1 point** each.
- Most points after 5 rounds wins the match.
- **Easy** slips more often than not, **Medium** now and then, and **Hard** never: it plays every move perfectly, so you can't beat it, only hold it to draws (5 points).

## 🕹️️ Controls

| Keys | Action |
| --- | --- |
| Click / tap a square | Play there |
| <kbd>1</kbd> … <kbd>9</kbd> | Play a square: 1 is the top left, 9 the bottom right (row by row) |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>, then <kbd>Enter</kbd> | Move between the squares, and play one |
| <kbd>N</kbd> | New match |
| <kbd>E</kbd> / <kbd>M</kbd> / <kbd>H</kbd> | Level: Easy / Medium / Hard (a match under way is dropped, after asking) |
| <kbd>I</kbd> | Show or hide the instructions |

A click while the bot is still "thinking", or while a round's end is up, shows it all at once.

## ✨ Features

- A minimax bot: on Hard it never loses
- Three levels, each with its own record: matches won, drawn and lost, and the most points in a match
- Pencil on notebook paper: the grid, each X and O, and the line through three in a row are drawn as you watch
- Carries on where you left off: the match under way is saved after each move
- Works with the keyboard and screen readers: the squares are buttons that say what's in them
- Mobile-friendly
- Easter Egg

## 💾 Saved data

The game saves one object: `{ "level": "medium", "stats": { "easy": { … }, "medium": { … }, "hard": { … } }, "match": { … } | null }`.
`level` is the level you picked; `stats` has, for each level, the matches you `won`, `drawn` and `lost`, and your `best` points in a match (`null` until you've played one). `match` is the match under way, saved after each move so it carries on next time: the board, the round and the points (`state`), and the run so far for GameHub (`run`, see below). It's taken out when the match ends.
It's kept in the browser, in `localStorage` under `tic-tac-toeGameData`, and in your GameHub account when you play in GameHub signed in (see below).
If the browser blocks storage (some do inside an iframe), the game still plays, but it doesn't remember anything.

## 👾 GameHub

[GameHub](https://gamehub.foo) plays this game in a frame. `js/gamehub.js` connects the two: it's the same file in every game, loaded before the game's own scripts.

- **Saves:** the game saves only through `window.GameHub`. Every save stays in this browser, as before. When you play in GameHub signed in, your progress also goes to your GameHub account, and the game loads the account's copy, so it follows you from device to device. The first time you play signed in on a device, if your account has no save for this game yet, this device's goes up.
- **The play area:** GameHub asks the game to put its play area in the middle of the frame (the `gamehub:center` message).
- **The frame view:** in GameHub's frame, the game shows only what's needed to play: the level, the score, the board, what's going on and New match, on the sheet of paper. In full screen it shows the whole page. `js/gamehub.js` sets `data-gamehub-view` on the page (`frame`, or `full` when GameHub's `gamehub:view` message says so), and `css/page.css` says what the frame shows.
- **Loading:** the game tells GameHub when its board is up (`GameHub.playable()`, the `gamehub:playable` message). It doesn't move by itself, so it has nothing to pause when GameHub asks (`gamehub:pause`).
- **Offline:** you can download the game in GameHub (the Download button on its page there) to play it offline. The game's worker (`sw.js`, the same in every game) then keeps a copy of it: every file `offline.json` lists, each checked against its SHA-256. From then on the game opens from its copy at once, even on a slow network, and each time it opens, the worker checks the copy against the deployed game in the background: a new version, or a file that's changed or broken, is downloaded again, and the copy switches only once it's whole. It keeps GameHub's script too, so offline the game still connects to GameHub (tickets, runs, saves). `offline.json` isn't in git: `tools/offline-json.mjs` writes it at each deploy (Cloudflare Pages' build command).
- **The panel and replays:** under the game, GameHub shows what the game tells it with `GameHub.status()` (the level, the points, the round, and each level's record behind its More button), and each match you finish is kept as a run, so you can watch it again there: the run's random seed and your moves, never a video. A match's run starts with your first move (so a board nobody plays takes no ticket), and it's saved with the match in progress, so it carries on after a reload. Runs stay in your browser.
- **Checked runs:** signed in, GameHub hands the game a few tickets, each a seed its server chose, and each run takes one. GameHub then plays the run again on its server with this game's own rules (`js/rules.js`, the code the game plays by), so only results it got itself count as your records (it does this offline too, once you're back online). A run holds your moves only: the bot's answers are worked out again from the rules and the seed, so changing them in the page changes nothing, and the server's replay says how the match really went. The bot's random choices (which of its best moves, and when Easy and Medium slip) come from the ticket's seed, which the player doesn't pick.
- **Only GameHub:** it loads GameHub's script (`/hub-bridge.js`) only when the game is in a frame on GameHub's own address.

The game works without it: played on its own, or when GameHub can't be reached (the game gives it 3 seconds at most), everything stays in this browser.

## 👀️ Links

- **Play in GameHub:** https://gamehub.foo/g/tic-tac-toe
- **Play directly:** https://tic-tac-toe.dt-games.pages.dev
- **Source code:** https://github.com/DanyilT/dt-games/tree/tic-tac-toe
- **The other games:** [Snake](https://github.com/DanyilT/dt-games/tree/snake), [Tetris](https://github.com/DanyilT/dt-games/tree/tetris), [Minesweeper](https://github.com/DanyilT/dt-games/tree/minesweeper), [Sudoku](https://github.com/DanyilT/dt-games/tree/sudoku) and [Flappy Bird](https://github.com/DanyilT/dt-games/tree/flappy-bird), each on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games)
- **GameHub**, the site with all my games: https://github.com/DanyilT/game-hub

## 🔌 Run it locally

It's plain HTML, CSS and JavaScript: no build step, nothing to install. Serve the folder with any static server, for example:

```bash
python3 -m http.server
```

Then open http://localhost:8000.

## 🔬 Test it

`test/index.html` is a replay test: a bot plays matches through the page's own squares and keys, and each run it finishes is played again with `js/rules.js` (what GameHub's server checks runs with), which must come out as the game said; the board the page shows must also be the match's. Serve the folder as above and open http://localhost:8000/test/ (or http://localhost:8000/test/?start to start at once). The game there saves under a name of its own, so your record and match in progress stay as they were. *Copy the runs as JSON* gives the runs in the shape of GameHub's test fixtures.

## 💿 Get just this game

Every game lives on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games). To clone only this one:

```bash
git clone --branch tic-tac-toe --single-branch https://github.com/DanyilT/dt-games.git tic-tac-toe
```

## 🧻 License

This game is licensed under the [MIT License](LICENSE).
