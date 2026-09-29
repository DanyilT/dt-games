# dt-games

Classic browser games in plain HTML, CSS and JavaScript: **Snake**, **Tetris**, **Minesweeper** and **Sudoku**. No frameworks, no build step, nothing to install. They play on a computer (keyboard and mouse) or on a phone (touch), and they're all in my **[GameHub](https://game-hub.danyt.workers.dev)**. <u>dt</u> stands for <u>DanyilT</u> (me).

Every game lives on its own branch, at the root of that branch, with no history shared with the others. This branch, `main`, only has this overview.

## 🎮 Games

| Game        | Branch                                                                | Play                                                                                                           | Clone just this game                                                                                 |
|-------------|-----------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| Snake       | [`snake`](https://github.com/DanyilT/dt-games/tree/snake)             | [GameHub](https://game-hub.danyt.workers.dev/g/snake) · [direct](https://snake.dt-games.pages.dev)             | `git clone --branch snake --single-branch https://github.com/DanyilT/dt-games.git snake`             |
| Tetris      | [`tetris`](https://github.com/DanyilT/dt-games/tree/tetris)           | [GameHub](https://game-hub.danyt.workers.dev/g/tetris) · [direct](https://tetris.dt-games.pages.dev)           | `git clone --branch tetris --single-branch https://github.com/DanyilT/dt-games.git tetris`           |
| Minesweeper | [`minesweeper`](https://github.com/DanyilT/dt-games/tree/minesweeper) | [GameHub](https://game-hub.danyt.workers.dev/g/minesweeper) · [direct](https://minesweeper.dt-games.pages.dev) | `git clone --branch minesweeper --single-branch https://github.com/DanyilT/dt-games.git minesweeper` |
| Sudoku      | [`sudoku`](https://github.com/DanyilT/dt-games/tree/sudoku)           | [GameHub](https://game-hub.danyt.workers.dev/g/sudoku) · [direct](https://sudoku.dt-games.pages.dev)           | `git clone --branch sudoku --single-branch https://github.com/DanyilT/dt-games.git sudoku`           |

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
css/style.css           the styles
js/<game>.js            the game itself
js/storage.js           what the game saves: its shape and the defaults
js/buttons-handler.js   the buttons on the page, and their shortcut keys
js/extend-controls.js   more ways to play: W A S D, touch, keyboard selection
js/gamehub.js           GameHub support: saves (window.GameHub) and the gamehub:center message; loaded first
js/qwerty.js            the Easter egg
img/                    the favicon and the screenshots
README.md               about the game: controls, features, links
LICENSE                 MIT
```

And follows the same rules:

- **The same `<head>` basics:** charset, viewport, title, description and favicon.
- **Relative paths only**, so a game runs from any address: its branch's root, a subfolder, or `localhost`.
- **Plain scripts:** `<script>` tags, no modules, no build step, no dependencies. (Sudoku's font comes from Google Fonts; without it, the page falls back to a system font.)
- **One code style:** 4 spaces, LF line endings, UTF-8, a newline at the end of every file (`.editorconfig`). In JavaScript: semicolons, single quotes, `const` or `let` for every variable, and a comment above each function.
- **Saved data:** each game saves one object, through `window.GameHub` (`js/gamehub.js`): `snakeGameData` = `{ "highScore": 12 }`. It's kept in the browser under `<game>GameData`, and in the player's GameHub account when they play in GameHub signed in. If the browser blocks storage (some browsers do inside an iframe), the game still plays, it just doesn't remember anything.
- **GameHub:** `js/gamehub.js` is the same file in every game, loaded first in `<head>` with the game's id (`<script src="js/gamehub.js" data-game="snake">`). Inside a GameHub frame, and only there, it loads GameHub's `/hub-bridge.js`, so a signed-in player's saves also go to their account; without it (played on its own, or GameHub can't be reached within 3 seconds), the game plays and saves in the browser as before. It also answers `{ type: 'gamehub:center' }`, GameHub's request to put the play area (the element marked `data-play-area`) in the middle of the frame.

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
