# dt-games

Classic browser games in plain HTML, CSS and JavaScript: **Snake**, **Tetris**, **Minesweeper** and **Sudoku**. No frameworks, no build step, nothing to install. They play on a computer (keyboard and mouse) or on a phone (touch), and they're all in my **[GameHub](https://gamehub.foo)**. <u>dt</u> stands for <u>DanyilT</u> (me).

Every game lives on its own branch, at the root of that branch, with no history shared with the others. This branch, `main`, only has this overview: this README, and the overview page, `index.html`, with its icons and link-preview picture in `img/`.

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

- `main` is the production branch: https://dt-games.pages.dev is the overview, `index.html`: a card for each game, with its icon (taken from the game's own address, so it's always the game's current one) and links to play it, in GameHub too, and to its source code.
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
test/index.html         the replay test: a bot plays the game, and each run is checked with js/rules.js (see below)
test/check.js           the replay test's harness (the same file in every game)
test/bot.js             the game's bot, for the replay test
img/                    the icons (icon.svg, icon-no-bg.svg, and PNGs drawn from icon.svg) and the screenshots
README.md               about the game: controls, features, links
LICENSE                 MIT
```

And follows the same rules:

- **The same `<head>` basics:** charset, viewport, title, description, `theme-color` (the page's background, for the browser's bar on phones), the link-preview tags (`og:` and `twitter:card`, with `img/desktop-screenshot.png` as the picture), the icons (`img/icon.svg`, with `img/icon-32.png` for browsers without SVG icons, and `img/apple-touch-icon.png`; Minesweeper keeps `img/mine.png`), and the two stylesheets, `css/page.css` first.
- **Relative paths only**, so a game runs from any address: its branch's root, a subfolder, or `localhost`. The one exception is the link-preview tags (`og:url`, `og:image`), which need the game's full address; they're only read by the sites that show previews.
- **Plain scripts:** `<script>` tags, no modules, no build step, no dependencies. (Sudoku's font and Tetris's GAME OVER font come from Google Fonts; without them, the page falls back to a system font.)
- **One code style:** 4 spaces, LF line endings, UTF-8, a newline at the end of every file (`.editorconfig`). In JavaScript: semicolons, single quotes, `const` or `let` for every variable, and a comment above each function.
- **Saved data:** each game saves one object, through `window.GameHub` (`js/gamehub.js`): `snakeGameData` = `{ "highScore": 12, "game": null }`, with the game in progress (if any) in `game`, so it carries on next time. It's kept in the browser under `<game>GameData`, and in the player's GameHub account when they play in GameHub signed in. If the browser blocks storage (some browsers do inside an iframe), the game still plays, it just doesn't remember anything.
- **GameHub:** `js/gamehub.js` is the same file in every game, loaded first in `<head>` with the game's id (`<script src="js/gamehub.js" data-game="snake">`). Inside a GameHub frame, and only there, it loads GameHub's `/hub-bridge.js`, so a signed-in player's saves also go to their account; without it (played on its own, or GameHub can't be reached within 3 seconds), the game plays and saves in the browser as before. It also answers `{ type: 'gamehub:center' }`, GameHub's request to put the play area (the element marked `data-play-area`) in the middle of the frame.
  - **The frame view:** inside GameHub's frame, `js/gamehub.js` sets `data-gamehub-view="frame"` on `<html>` (in `<head>`, before anything is drawn), then follows GameHub's `{ type: 'gamehub:view', view: 'frame' | 'full' }` (`full` in full screen). Each game's `css/page.css` hides what the frame doesn't need with `[data-gamehub-view="frame"]` rules, and fits the game to whatever frame GameHub gives it (in the frame, `vw` and `vh` are the frame's), on the game's own background; the frame's height (in GameHub's games table) decides how big it gets. Played on its own, the page has no attribute and shows as it is.
  - **Full screen, pausing and loading:** GameHub has its own full-screen buttons. A game's own controls can call `GameHub.fullScreen()` (Minesweeper's window buttons do), which puts the page itself in full screen; full screen GameHub started only GameHub can end, so then the game sends it `{ type: 'gamehub:fullscreen', full: false }`. GameHub's `{ type: 'gamehub:pause' }` reaches the game as a `gamehub:pause` event (Snake and Tetris pause, and also when their frame loses the keyboard), and `GameHub.playable()` sends `{ type: 'gamehub:playable' }` once the game is ready to play.
  - **The rules:** `js/rules.js` is a plain script declaring one name, `GameRules`, with no page, timers, storage, `Math.random` or `Date`. The game plays through it, and GameHub's server plays runs again with its `simulate(run)` (GameHub adds `export const { simulate } = GameRules;` to make it a module). When a game's rules, timing or random numbers change, GameHub has to take the file again.

## 🔬 Testing

- **The replay test, in each game:** `test/index.html` loads the game's own page in a frame, and a bot (`test/bot.js`) plays it through the page's own keys, clicks and buttons. Each run the game finishes is played again with the game's `GameRules.simulate()` (`js/rules.js`, what GameHub's server checks runs with), and must come out as the game said: the same outcome and result. Serve the branch (any static server) and open `/test/` (`/test/?start` starts at once). The frame saves under a name of its own (`<game>-replay-testGameData`), so a player's best score and game in progress are left alone. *Copy the runs as JSON* gives the runs in the shape of GameHub's test fixtures (`worker/games/fixtures.json`). Run it after any change to a game's rules or to how it records runs.
- **The shared files:** `js/gamehub.js`, `sw.js`, `test/check.js`, `LICENSE` and `.editorconfig` must be the same in every game (the last two in `main` too). From the folder with all the branches (below), this prints how many versions of each there are, which should be 1:

  ```bash
  for f in js/gamehub.js sw.js test/check.js LICENSE .editorconfig; do echo "$f: $(for b in snake tetris minesweeper sudoku; do git -C main rev-parse --short "$b:$f"; done | sort -u | wc -l | tr -d ' ') version(s)"; done
  ```

  It compares the committed files, so commit first (or compare the working copies with `md5`).

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
