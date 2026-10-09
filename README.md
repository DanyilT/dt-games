# dt-games

Classic browser games in plain HTML, CSS and JavaScript: **Snake**, **Tetris**, **Minesweeper** and **Sudoku**. No frameworks, no build step, nothing to install. They play on a computer (keyboard and mouse) or on a phone (touch), and they're all in my **[GameHub](https://gamehub.foo)**. <u>dt</u> stands for <u>DanyilT</u> (me).

Every game lives on its own branch, at the root of that branch, with no history shared with the others. This branch, `main`, only has this overview.

## 🎮 Games

| Game        | Branch                                                                | Play                                                                                                           | Clone just this game                                                                                 |
|-------------|-----------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| Snake       | [`snake`](https://github.com/DanyilT/dt-games/tree/snake)             | [GameHub](https://gamehub.foo/g/snake) · [direct](https://snake.dt-games.pages.dev)             | `git clone --branch snake --single-branch https://github.com/DanyilT/dt-games.git snake`             |
| Tetris      | [`tetris`](https://github.com/DanyilT/dt-games/tree/tetris)           | [GameHub](https://gamehub.foo/g/tetris) · [direct](https://tetris.dt-games.pages.dev)           | `git clone --branch tetris --single-branch https://github.com/DanyilT/dt-games.git tetris`           |
| Minesweeper | [`minesweeper`](https://github.com/DanyilT/dt-games/tree/minesweeper) | [GameHub](https://gamehub.foo/g/minesweeper) · [direct](https://minesweeper.dt-games.pages.dev) | `git clone --branch minesweeper --single-branch https://github.com/DanyilT/dt-games.git minesweeper` |
| Sudoku      | [`sudoku`](https://github.com/DanyilT/dt-games/tree/sudoku)           | [GameHub](https://gamehub.foo/g/sudoku) · [direct](https://sudoku.dt-games.pages.dev)           | `git clone --branch sudoku --single-branch https://github.com/DanyilT/dt-games.git sudoku`           |

Each branch's README has the game's controls and features.

The games were first made in [DanyilT/WebDev](https://github.com/DanyilT/WebDev/tree/page/games) (branch `page/games`, one folder per game). Each branch here starts with a copy of its folder, moved to the root.

## ☁️ How it's deployed

A Cloudflare Pages project, `dt-games`, is connected to this repo. Pages deploys every branch to an address of its own:

- `main` is the production branch: https://dt-games.pages.dev is the overview, `index.html` (a list of the games, with links to play them).
- Every game branch is served at `https://<branch>.dt-games.pages.dev`, so the `snake` branch is https://snake.dt-games.pages.dev.
- There's no build command, and the output directory is the repo root: each branch is served exactly as it is.

That's why the branch names are the game ids GameHub uses (`snake`, `tetris`, `minesweeper`, `sudoku`): the addresses come from them, and GameHub embeds the games from those addresses. Renaming a branch moves its game.

## 🗂️ Shared structure

Every game branch is laid out the same way:

```
index.html              the page (the entry point)
sw.js                   offline play in GameHub (its Download button)
css/page.css            the page around the game, and what GameHub's frame shows of it
css/game.css            the game itself: its canvas or board, and its own on-screen controls
js/rules.js             the rules: everything a game needs to play out (GameHub checks runs with it)
js/<game>.js            the rest of the game: drawing, keys and touch, the timer, saving; it plays by js/rules.js
js/storage.js           what the game saves: its shape and the defaults
js/buttons-handler.js   the buttons on the page, and their shortcut keys
js/extend-controls.js   more ways to play: W A S D, touch, keyboard selection
js/gamehub.js           GameHub support: saves, runs and replays, the frame view; loaded first
js/qwerty.js            the Easter egg
img/                    the icons (icon.svg, icon-no-bg.svg, and PNGs drawn from icon.svg) and the screenshots
README.md               about the game: controls, features, links
LICENSE                 MIT
```

And follows the same rules:

- **The same `<head>` basics:** charset, viewport, title, description, the icons (`img/icon.svg`, with `img/icon-32.png` for browsers without SVG icons, and `img/apple-touch-icon.png`; Minesweeper keeps `img/mine.png`), and the two stylesheets, `css/page.css` first.
- **Relative paths only**, so a game runs from any address: its branch's root, a subfolder, or `localhost`.
- **Plain scripts:** `<script>` tags, no modules, no build step, no dependencies. (Sudoku's font and Tetris's GAME OVER font come from Google Fonts; without them, the page falls back to a system font.)
- **One code style:** 4 spaces, LF line endings, UTF-8, a newline at the end of every file (`.editorconfig`). In JavaScript: semicolons, single quotes, `const` or `let` for every variable, and a comment above each function.
- **Saved data:** each game saves one object, through `window.GameHub` (`js/gamehub.js`): `snakeGameData` = `{ "highScore": 12 }`. It's kept in the browser under `<game>GameData`, and in the player's GameHub account when they play in GameHub signed in. If the browser blocks storage (some browsers do inside an iframe), the game still plays, it just doesn't remember anything.
- **GameHub:** `js/gamehub.js` is the same file in every game, loaded first in `<head>` with the game's id (`<script src="js/gamehub.js" data-game="snake">`). Inside a GameHub frame, and only there, it loads GameHub's `/hub-bridge.js`, so a signed-in player's saves also go to their account; without it (played on its own, or GameHub can't be reached within 3 seconds), the game plays and saves in the browser as before. It also answers `{ type: 'gamehub:center' }`, GameHub's request to put the play area (the element marked `data-play-area`) in the middle of the frame.
  - **The frame view:** inside GameHub's frame, `js/gamehub.js` sets `data-gamehub-view="frame"` on `<html>` (in `<head>`, before anything is drawn), then follows GameHub's `{ type: 'gamehub:view', view: 'frame' | 'full' }` (`full` in full screen). Each game's `css/page.css` hides what the frame doesn't need with `[data-gamehub-view="frame"]` rules, and fits the game to whatever frame GameHub gives it (in the frame, `vw` and `vh` are the frame's), on the game's own background; the frame's height (in GameHub's games table) decides how big it gets. Played on its own, the page has no attribute and shows as it is.
  - **The rules:** `js/rules.js` is a plain script declaring one name, `GameRules`, with no page, timers, storage, `Math.random` or `Date`. The game plays through it, and GameHub's server plays runs again with its `simulate(run)` (GameHub adds `export const { simulate } = GameRules;` to make it a module). When a game's rules, timing or random numbers change, GameHub has to take the file again.

## 🌳 All the branches side by side

One way to have every branch checked out at once is a bare clone with a worktree per branch:

```bash
git clone --bare https://github.com/DanyilT/dt-games.git dt-games/.bare
cd dt-games
echo "gitdir: ./.bare" > .git
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
git fetch origin
for branch in main snake tetris minesweeper sudoku; do git worktree add "$branch" "$branch"; done
```

## 📄 License

All the games are licensed under the [MIT License](LICENSE).
