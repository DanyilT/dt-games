# Bounce

Nokia's Bounce (version 1.24, 2004): roll and jump the red rubber ball through 11 levels, through every hoop and out of the door. It plays on a phone's screen with a Nokia keypad under it, as it did on the phone: the same levels, the same sprites, the same physics step for step, and its three tunes, played as notes in the browser.

![Bounce on a computer](img/desktop-screenshot.png)

**[Play in GameHub](https://gamehub.foo/g/bounce)** · [Play directly](https://bounce.dt-games.pages.dev) · [Source code](https://github.com/DanyilT/dt-games/tree/bounce)

## 💫 How it plays

- Roll the ball through **every hoop** in the level. The **exit** (the striped door) opens once they're all through, and the ball rolls out of it to the next level.
- **Spikes** pop the ball, and so do the **moving spikes**. A popped ball comes back at the last **crystal** it touched; a **crystal ball** is a spare ball (up to 5). With no spare ball left, the game is over.
- **Rubber** floors bounce the ball higher, and holding jump on them bounces it higher each time.
- A **pump** makes the ball big, and a **deflater** small again. Big balls float in water and jump further, but small hoops are too small for them; small balls sink.
- **Power-ups** last 12 seconds: speed, a higher jump, and gravity upside down.
- Points: a hoop 500, a crystal 200, a crystal ball 1000, and the exit 5000.

After level 11, **Congrats!** The menu (the top-left key, the left soft key, or <kbd>Esc</kbd>) has Continue, the levels you've reached, New game, the high score, the phone's instructions, and the sound.

## 🕹️️ Controls

| Keypad | Keyboard | Action |
| --- | --- | --- |
| <kbd>4</kbd> / navi <kbd>◀</kbd> | <kbd>←</kbd> / <kbd>A</kbd> | Roll left |
| <kbd>6</kbd> / navi <kbd>▶</kbd> | <kbd>→</kbd> / <kbd>D</kbd> | Roll right |
| <kbd>2</kbd> / navi <kbd>▲</kbd> | <kbd>↑</kbd> / <kbd>W</kbd> / <kbd>Space</kbd> | Jump (hold it to keep bouncing) |
| Left soft key (top left) | <kbd>Esc</kbd> | The menu (the game waits); on a menu, choose |
| Navi <kbd>▲</kbd> <kbd>▼</kbd>, select | <kbd>↑</kbd> <kbd>↓</kbd>, <kbd>Enter</kbd> | Move on a menu, and choose |
| Right soft key (top right) | <kbd>Backspace</kbd> | Back |
| | <kbd>M</kbd> | Sound on or off |
| <kbd>0</kbd> | <kbd>I</kbd> | The instructions under the phone, shown or hidden (or their ✕ (I) button) |
| Call (green) | | A field to type a code in (the game waits) |

The keypad works with the mouse and with touch, several fingers at once: hold 6 and 2 together to jump to the right. A finger that slides onto another key presses that one instead. Every key lights up while it's held, from the keyboard too. On the menus, tap or click what you want.

As on the phone, a key works when it's pressed: one held through a pop (or a pause) does nothing until it's pressed again.

## ✨ Features

- Nokia's own sprites and levels, cut, turned and drawn as the phone drew them, on its 128 × 128 px screen, scaled up whole so every pixel stays sharp
- The physics of Bounce 1.24, checked against the original game's own code, step for step (see Test it)
- The phone's menus, its "Level 1" banner, its status bar (spare balls, hoops to go, the score, the power-up's time), and a small pixel font drawn in code
- The phone's three tunes (a hoop, a pickup, a pop), played as square waves
- A Nokia keypad: soft keys, the navi key, call and end, 1 to 9, \*, 0, #; touch with several fingers, and keys that light up
- The phone's own cheats, which the Easter egg tells (a game with a cheat isn't kept in GameHub)
- Pauses by itself when you switch away, and carries on where you left off next time
- Mobile-friendly
- Easter Egg

## 💾 Saved data

The game saves one object: `{ "highScore": <int>, "maxLevel": <int>, "levels": { "1": { "score": <int>, "time": <int> }, … }, "sound": <bool>, "instructions": <bool>, "game": { … } | null }`: the best score of a whole game, the furthest level reached (the menu's level list goes up to it), each level's best (the most points won on it, and the fastest win, in seconds), whether the sound is on, whether the page shows its instructions (it does the first time; <kbd>I</kbd> or their ✕ (I) button hides them, and it stays as you left it), and the game you're playing.
`game` is kept at the start of each level, when the menu opens, and when you switch away or close the page, so it comes back next time: the level as it is (`state`) and its run so far for GameHub (`run`, see below), or, on "Level completed", the level to go on to. A game you used a cheat in has `cheats` too (`{ "invincible": <bool>, "levels": <bool> }`, the ones on): it carries on with them on, and its run isn't kept in GameHub, even after a reload. It's taken out when the game ends.
It's kept in the browser, in `localStorage` under `bounceGameData`, and in your GameHub account when you play in GameHub signed in (see below).
If the browser blocks storage (some do inside an iframe), the game still plays, but it doesn't remember anything.

## 👾 GameHub

[GameHub](https://gamehub.foo) plays this game in a frame. `js/gamehub.js` connects the two: it's the same file in every game, loaded before the game's own scripts.

- **Saves:** the game saves only through `window.GameHub`. Every save stays in this browser, as before. When you play in GameHub signed in, your progress also goes to your GameHub account, and the game loads the account's copy, so it follows you from device to device. The first time you play signed in on a device, if your account has no save for this game yet, this device's goes up.
- **The play area:** GameHub asks the game to put its play area in the middle of the frame (the `gamehub:center` message).
- **The frame view:** in GameHub's frame, the game shows the phone only: its screen, the Options button and the keypad, as big as the frame allows. `js/gamehub.js` sets `data-gamehub-view` on the page (`frame`, or `full` when GameHub's `gamehub:view` message says so), and `css/page.css` says what the frame shows.
- **Pausing and loading:** the game pauses when GameHub asks (the `gamehub:pause` message) and when its frame loses the keyboard, and it tells GameHub when it's ready to play (`GameHub.playable()`, the `gamehub:playable` message).
- **Offline:** you can download the game in GameHub (the Download button on its page there) to play it offline. The game's worker (`sw.js`, the same in every game) then keeps a copy of it: every file `offline.json` lists, each checked against its SHA-256. From then on the game opens from its copy at once, even on a slow network, and each time it opens, the worker checks the copy against the deployed game in the background: a new version, or a file that's changed or broken, is downloaded again, and the copy switches only once it's whole. It keeps GameHub's script too, so offline the game still connects to GameHub (tickets, runs, saves). `offline.json` isn't in git: `tools/offline-json.mjs` writes it at each deploy (Cloudflare Pages' build command).
- **The panel and replays:** under the game, GameHub shows what the game tells it with `GameHub.status()` (the score, the level and the high score, and each level's best score and fastest win behind its More button), and each level you finish is kept as a run, so you can watch it again there: the level and the keys you held, never a video. The game moves in fixed 40 ms steps, as the phone did, and each change in the keys held is recorded with the step it came after. A run is one level: won at the exit, lost when the last ball pops. The spare balls carry on from level to level, as on the phone, so a level that starts with other than 3 says how many first. Runs stay in your browser. A cheat means that game isn't kept.
- **Checked runs:** signed in, GameHub hands the game a few tickets, and each run takes one. GameHub then plays the run again on its server with this game's own rules (`js/rules.js`, the code the game plays by, in whole numbers with Java's rounding, so every browser and the server work it out exactly as the phone did), so only results it got itself count as your records (it does this offline too, once you're back online): each level's best score and fastest win. A level's run is saved with the game in progress, so it carries on after a reload.
- **Only GameHub:** it loads GameHub's script (`/hub-bridge.js`) only when the game is in a frame on GameHub's own address.

The game works without it: played on its own, or when GameHub can't be reached (the game gives it 3 seconds at most), everything stays in this browser.

### Where it differs from the phone

- On "Level completed", the phone already ran the next level behind that screen, with no keys, for as long as you took to press Continue. Here the next level starts when you go on, so every level starts the same way.
- The phone remembered, from level to level, whether it had drawn an exit yet (the exit only opens once it has been on screen). Here every level starts as on a phone just switched on, so a level plays out the same whichever way you got to it.
- The screen never shows a level's last 16 px, as on the phone, so on levels 1, 2 and 5 only the door's left edge shows.

## 👀️ Links

- **Play in GameHub:** https://gamehub.foo/g/bounce
- **Play directly:** https://bounce.dt-games.pages.dev
- **Source code:** https://github.com/DanyilT/dt-games/tree/bounce
- **The other games:** [Snake](https://github.com/DanyilT/dt-games/tree/snake), [Tetris](https://github.com/DanyilT/dt-games/tree/tetris), [Minesweeper](https://github.com/DanyilT/dt-games/tree/minesweeper), [Sudoku](https://github.com/DanyilT/dt-games/tree/sudoku), [Flappy Bird](https://github.com/DanyilT/dt-games/tree/flappy-bird), [Tic-Tac-Toe](https://github.com/DanyilT/dt-games/tree/tic-tac-toe) and [Solitaire](https://github.com/DanyilT/dt-games/tree/solitaire), each on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games)
- **GameHub**, the site with all my games: https://github.com/DanyilT/game-hub
- **The original:** Bounce by Nokia, on its phones from 2001; this is its version 1.24, from 2004. This is a fan remake: its sprites, levels and tunes are Nokia's (see the License), and its code is new.

## 🔌 Run it locally

It's plain HTML, CSS and JavaScript: no build step, nothing to install. Serve the folder with any static server, for example:

```bash
python3 -m http.server
```

Then open http://localhost:8000.

## 🔬 Test it

`test/index.html` is a replay test: a bot plays Bounce through the page's own keys and its keypad (often two fingers at once), each level along a route that wins it, and sometimes strays off it to lose, and each run it finishes is played again with `js/rules.js` (what GameHub's server checks runs with), which must come out as the game said. Serve the folder as above and open http://localhost:8000/test/ (or http://localhost:8000/test/?start to start at once). The game there saves under a name of its own, so your best scores and game in progress stay as they were. *Copy the runs as JSON* gives the runs in the shape of GameHub's test fixtures.

`js/rules.js` was also checked against the original game's own code, outside this repository: its class files run on Java with stand-ins for the phone, and `js/rules.js` had to give the same state after every step (the ball, the score, the camera, the exit, the moving spikes, every tile that changed) over 132 random plays and 50 routes that reach every pump, deflater, power-up and exit, and win every level.

## 💿 Get just this game

Every game lives on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games). To clone only this one:

```bash
git clone --branch bounce --single-branch https://github.com/DanyilT/dt-games.git bounce
```

## 🧻 License

This game's code is licensed under the [MIT License](LICENSE), except for what is Nokia's, © Nokia, which isn't covered by this license:

- `img/objects.png`, Bounce's sprite sheet, and the icons made from it (`img/icon.svg`, `img/icon-no-bg.svg` and `img/apple-touch-icon.png`: its ball, a pixel at a time);
- `img/favicon.svg` and `img/icon-32.png`, Bounce's own icon from the phone;
- the levels (the `LEVELS` maps and moving spikes in `js/rules.js`), and the shapes of the ball and the ramps there;
- the three tunes, as notes (`TUNES` in `js/bounce.js`), and the phone's words (`TEXT` there: the menus and the instructions).

This remake isn't made or endorsed by Nokia.
