# Solitaire
[![solitaire@v1.0.0](https://img.shields.io/badge/solitaire-v1.0.0-blue)](https://github.com/DanyilT/dt-games/releases/tag/solitaire@v1.0.0)

Klondike solitaire as Windows 7 played it: the felt table, Draw one or Draw three, Standard or Vegas scoring, hints and statistics, and the cards bouncing off the foundations when you win, with Windows 7's own cards. Every sound is made in the browser.

![Solitaire on a computer](img/desktop-screenshot.png)

**[Play in GameHub](https://gamehub.foo/g/solitaire)** · [Play directly](https://solitaire.dt-games.pages.dev) · [Source code](https://github.com/DanyilT/dt-games/tree/solitaire)

## 🃏 How it plays

- Move all 52 cards onto the four **foundations** (top right), each suit from the ace up to the king.
- On the seven **columns**, build down in alternating colours (a red 6 on a black 7), and move a whole run of face-up cards at once. A face-down card left on top turns over by itself. Only a king, or a run starting with one, goes into an empty column.
- The **stock** (top left) deals 1 card, or 3, onto the waste. Empty, it turns the waste over for another pass.
- **Undo** takes back the last move, as in Windows (one level).
- When no useful move is left (nothing goes home, nothing the stock brings fits anywhere, and no move turns a card over, even after moving cards about), the game is **lost**: it ends by itself, and says so.

### Scoring (Game › Options)

- **Standard:** +10 for each card onto a foundation; +5 for a card from the waste onto a column, or a card turned over; −15 for a card taken back off a foundation. Each new pass through the deck costs 100 with Draw one, and 20 after the third with Draw three. The points never go below 0. In a **timed** game you also lose 2 points every 10 seconds, and a win that takes more than 30 seconds earns a bonus of 700,000 ÷ its seconds.
- **Vegas:** each game costs $52 and every card onto a foundation wins $5 (and loses it again if you take the card back off). One pass through the deck with Draw one, three with Draw three. With **Cumulative**, your dollars carry on from game to game.
- **No scoring:** just the time.

These follow the commonly cited rules of Microsoft's Solitaire; Microsoft's own help isn't online anymore. A new player starts with Draw three and timed Standard scoring. Draw, scoring and timing take effect in the next game (at once, if this one hasn't been played yet).

## 🕹️️ Controls

| Keys | Action |
| --- | --- |
| Drag a card | Move it (and the cards on it) to where it goes |
| Click a card, then where it goes | The same |
| Double-click a card | Send it to its foundation |
| Right-click the table | Send every card that can go to the foundations |
| <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> | Move between the piles |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Pick up, put down (as many cards as fit), or deal from the stock; <kbd>Esc</kbd> puts back |
| <kbd>D</kbd> | Deal from the stock |
| <kbd>A</kbd> | Send every card that can go to the foundations |
| <kbd>H</kbd> | A hint: what to move, and where, glows for a moment |
| <kbd>U</kbd> / <kbd>Ctrl</kbd>+<kbd>Z</kbd> | Undo |
| <kbd>F2</kbd> / <kbd>N</kbd> | New game |
| <kbd>F4</kbd> / <kbd>S</kbd> | Statistics |
| <kbd>O</kbd> | Options |
| <kbd>C</kbd> | Change Appearance |
| <kbd>I</kbd> | Help |
| <kbd>Esc</kbd> | Put picked-up cards back; with none, open the Game menu (or close a menu or a dialog) |

On a phone or tablet:

- **Drag** a card, or **tap** it and then tap where it goes.
- **Double-tap** a card to send it to its foundation, or an empty spot on the table to send every card that can go.

## ✨ Features

- Windows 7's look: the window with its glass-like frame and caption buttons, the menus with their keys, the felt table, the status bar with the time and the score
- Options as in Windows 7: Draw one or three; no, Standard or Vegas scoring (and Cumulative); a timed game; animations; sounds
- Windows 7's own cards; on a small screen (a phone), its big-symbol faces, which can be read at a glance
- Change Appearance: Windows 7's three card backs, three designs of court cards (classic, cartoon, nature), and four backgrounds
- The game knows when there are no more moves, and ends as lost
- Statistics for each kind of game: games played and won, the win percentage, the high score or the most money, the fastest win, and winning streaks
- Hints, and one undo
- Cards glide into place, and the deal flies out from the stock
- The cards bounce off the foundations when you win
- Carries on where you left off: the game under way is saved after each move
- Works with the keyboard and screen readers: each pile is a button that says what's on it, and each move is read out
- Mobile-friendly
- Easter Egg

## 💾 Saved data

The game saves one object: `{ "draw": 3, "scoring": "standard", "timed": true, "cumulative": false, "animations": true, "sounds": true, "back": "blue", "faces": "classic", "background": "green", "vegasTotal": 0, "stats": { … }, "game": { … } | null }`.
The first six are the Options; `back`, `faces` (the court cards' design: `classic`, `cartoon` or `nature`) and `background` the appearance; and `vegasTotal` the dollars Cumulative carries on. `stats` has, for each kind of game (`standard-1`, `standard-3-untimed`, `vegas-3`, …): the games `played` and `won`, the `best` score (a win's; with Vegas, any game's dollars), the fastest win (`bestTime`, in seconds), the `streak` now (wins in a row, or losses as a negative number) and the `longestStreak`. `game` is the game under way, saved after each move so it carries on next time: the cards (`state`) and the run so far for GameHub (`run`, see below). It's taken out when the game ends.
It's kept in the browser, in `localStorage` under `solitaireGameData`, and in your GameHub account when you play in GameHub signed in (see below).
If the browser blocks storage (some do inside an iframe), the game still plays, but it doesn't remember anything.

## 👾 GameHub

[GameHub](https://gamehub.foo) plays this game in a frame. `js/gamehub.js` connects the two: it's the same file in every game, loaded before the game's own scripts.

- **Saves:** the game saves only through `window.GameHub`. Every save stays in this browser, as before. When you play in GameHub signed in, your progress also goes to your GameHub account, and the game loads the account's copy, so it follows you from device to device. The first time you play signed in on a device, if your account has no save for this game yet, this device's goes up.
- **The play area:** GameHub asks the game to put its play area in the middle of the frame (the `gamehub:center` message).
- **The frame view:** in GameHub's frame, the game shows its window on the desktop, as big as the frame allows: the cards fit the frame's width and its height. In full screen the window has the whole screen, so the cards grow (up to the card sheet's own 71 px wide). `js/gamehub.js` sets `data-gamehub-view` on the page (`frame`, or `full` when GameHub's `gamehub:view` message says so), and `css/page.css` says what the frame shows.
- **Loading:** the game tells GameHub when its cards are on the table (`GameHub.playable()`, the `gamehub:playable` message). It doesn't move by itself, so it has nothing to pause when GameHub asks (`gamehub:pause`).
- **Offline:** you can download the game in GameHub (the Download button on its page there) to play it offline. The game's worker (`sw.js`, the same in every game) then keeps a copy of it: every file `offline.json` lists, each checked against its SHA-256. From then on the game opens from its copy at once, even on a slow network, and each time it opens, the worker checks the copy against the deployed game in the background: a new version, or a file that's changed or broken, is downloaded again, and the copy switches only once it's whole. It keeps GameHub's script too, so offline the game still connects to GameHub (tickets, runs, saves). `offline.json` isn't in git: `tools/offline-json.mjs` writes it at each deploy (Cloudflare Pages' build command).
- **The panel and replays:** under the game, GameHub shows what the game tells it with `GameHub.status()` (the score or the money, the time, the wins, and each kind of game's numbers behind its More button), and each game you finish (won; lost, with no moves left; or given up with a new game) is kept as a run, so you can watch it again there: the run's random seed and your moves, never a video. The deal is shuffled from the run's seed, and each move is recorded with its time. A game's run starts with the deal, and it's saved with the game in progress, so it carries on after a reload. Runs stay in your browser.
- **Checked runs:** signed in, GameHub hands the game a few tickets, each a seed its server chose, and each run takes one (the first deal waits for them: `GameHub.ready()`). GameHub then plays the run again on its server with this game's own rules (`js/rules.js`, the code the game plays by), so only results it got itself count as your records (it does this offline too, once you're back online): with Standard scoring the highest score of a win, with Vegas the most money in a game, without scoring the fastest win. The score and the time come from the run's own clock, so the server works them out exactly as the game did.
- **Only GameHub:** it loads GameHub's script (`/hub-bridge.js`) only when the game is in a frame on GameHub's own address.

The game works without it: played on its own, or when GameHub can't be reached (the game gives it 3 seconds at most), everything stays in this browser.

## 👀️ Links

- **Play in GameHub:** https://gamehub.foo/g/solitaire
- **Play directly:** https://solitaire.dt-games.pages.dev
- **Source code:** https://github.com/DanyilT/dt-games/tree/solitaire
- **The other games:** [Snake](https://github.com/DanyilT/dt-games/tree/snake), [Tetris](https://github.com/DanyilT/dt-games/tree/tetris), [Minesweeper](https://github.com/DanyilT/dt-games/tree/minesweeper), [Sudoku](https://github.com/DanyilT/dt-games/tree/sudoku), [Flappy Bird](https://github.com/DanyilT/dt-games/tree/flappy-bird) and [Tic-Tac-Toe](https://github.com/DanyilT/dt-games/tree/tic-tac-toe), each on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games)
- **GameHub**, the site with all my games: https://github.com/DanyilT/game-hub
- **The original:** Solitaire by Wes Cherry (Microsoft, 1990), redone for Windows Vista and 7. This is a fan remake: its cards are Windows 7's own (see the License), and its sounds are made in the browser.

## 🔌 Run it locally

It's plain HTML, CSS and JavaScript: no build step, nothing to install. Serve the folder with any static server, for example:

```bash
python3 -m http.server
```

Then open http://localhost:8000.

## 🔬 Test it

`test/index.html` is a replay test: a bot plays Solitaire through the page's own controls (the keyboard, clicks, drags, double-clicks, right-clicks, and the Options dialog to pick each kind of game), and each run it finishes is played again with `js/rules.js` (what GameHub's server checks runs with), which must come out as the game said. Serve the folder as above and open http://localhost:8000/test/ (or http://localhost:8000/test/?start to start at once). The game there saves under a name of its own, so your statistics and game in progress stay as they were. *Copy the runs as JSON* gives the runs in the shape of GameHub's test fixtures.

## 💿 Get just this game

Every game lives on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games). To clone only this one:

```bash
git clone --branch solitaire --single-branch https://github.com/DanyilT/dt-games.git solitaire
```

## 🧻 License

This game is licensed under the [MIT License](LICENSE), except for the cards: `img/HIGHLIGHTSHEET1.jpg` is the card sheet from Microsoft's Windows 7 Solitaire, © Microsoft, and isn't covered by this license.
