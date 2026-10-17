# Bounce 1.24: how the game works

Nokia's Bounce 1.24 (`Bounce_1.24_LockedRes_128x128_EnMulti.jar`, 16 Aug 2004), as its code does it: the original class files run in the reference (`reference/`), and their decompiled code read line by line. This page is everything around the ball; the ball's own update (gravity, water, ramps, rubber, jumps, popping, growing) is in `ball-1.24.md`, the levels and their tiles in `levels.md`, and how the other versions differ in `versions.md`.

Numbers are whole: positions in pixels (the ball's centre, in the level's pixels), speeds in tenths of a pixel a step.

## The step

A timer runs one step every **40 ms** (25 a second). Each step, in this order:

1. **A level to load** (the step after a level was completed, or a cheat changed it): it's loaded, and nothing else happens this step.
2. **The splash**, while it shows (31 steps; any key skips it).
3. **The "Level N" banner** counts down: it's 120 when a level loads and shows while it isn't 0 (119 steps, 4.8 s).
4. **The screen jumps, or the ball moves.** If the ball's edge is within 6 px of the view's top or bottom (`y − 6 < top`, `y + 6 > top + 96`), the view jumps 7 rows (84 px) and the ball isn't updated this step: everything it counts (the popped countdown, the power-ups, the slide counter) waits. Otherwise the ball updates (`ball-1.24.md`).
5. **A popped ball that's gone:** with no spare ball left (fewer than 0), the game is over; otherwise a new ball (below).
6. **The moving spikes** move, each in turn, across then down: the offset moves by its speed, is held between 0 and its end, and turns at either (at 0 too, even where it starts).
7. **Every hoop through:** the exit is unlocked.
8. **The exit's door** slides (below).
9. **The power-up bar** is redrawn when the longest power-up left is a multiple of 30 steps, or 1.
10. **The view follows the ball across**, the screen is drawn, and if the ball went through the open exit this step, the level is done: +5000, the next level is due, and "Level N completed!" shows (after level 11, "Congrats!").

Keys come between steps, never in the middle of one: the step and the key handlers both lock the ball.

## The screen and the view

The screen is 128 × 128:

- **The game:** rows 0–95, 128 × 96 px of the level (8 rows of tiles, 10⅔ across).
- **A white row** (96), never drawn over.
- **The status bar:** rows 97–127, blue `#0853aa`:
  - a ball for each spare ball, at (5 + 11k, 99);
  - a hoop for each hoop still to pass, at (5 + 8k, 112), so all 15 of level 11's fit;
  - the score at (64, 100) in white `#fffffe`, 8 digits with zeros in front (the code pads under 100 with seven zeros, so 10–99 would show 9 digits, but every score is a multiple of 100);
  - the power-up bar on the left, orange `#ff9813`, x 1–5, `3 × steps left / 30` px tall from the bottom, redrawn only every 30 steps (so it drops 3 px at a time).
- **"Level N"** in white at (44, 84), over the game, while the banner counts.

**The view across:** its left edge is the ball's x − 64, held between 0 and `12 × width − 144`. So the view's right edge stops 16 px before the level's end, and **a level's last 16 px never show**: on levels 1, 2 and 5 the exit is in the last two columns, and only its left 8 px are ever on screen. (A new ball's recentring holds it at `12 × width − 156`, but the same step's scroll moves it on.)

**The view down** moves only in jumps of 7 rows, when the ball nears its top or bottom edge (step 4). A new ball recentres the view on it, across and down.

**The scroll buffer:** the game draws the level into a 156 × 96 buffer (13 tiles) that wraps round, drawing only the columns coming into view and the tiles marked "draw again" (in bit 7 of a tile). It's only drawing, except for one thing: the exit can open only once an exit tile has been drawn into it (below).

## The exit

- Two by two tiles, striped red, with a door over the top half: closed, a band through each exit tile's middle (pixels 4–7 across, the whole height) blocks the ball.
- **Unlocked** once every hoop of the level is through.
- **Opening:** on each step that the exit is unlocked, an exit tile has been drawn, and the exit's columns overlap the view as it was before this step's scroll (`(exit + 1) × 12 > left`, `exit × 12 < left + 128`), the door slides up 4 px; after 6 such steps it's open. Its four tiles are marked to be drawn again each time.
- **The "drawn" flag** is set whenever an exit tile is drawn, and cleared only when the door has opened (the next step the test passes). Loading a level doesn't clear it: it carries over from level to level and game to game, for as long as the app runs. On levels 3 and 7 the exit is on the first screen, so it's set as the level starts.
- **Through it:** the ball touching the open band ends the level at the end of that step: +5000 and the "pickup" tune.

## Dying and coming back

- **A pop** (spikes, moving spikes): unless the ball is invincible, it shows popped for 7 ball updates (more if the screen jumps meanwhile), a spare ball goes at once, the power-ups end, and the "pop" tune plays. The popped ball keeps its place and speeds, and every test fails, so it doesn't move.
- **Gone:** with fewer than 0 spare balls the game is over; otherwise a new ball appears at the last crystal (or the start): its centre at the tile × 12 + 6, still, the size it was when that crystal was touched, a big one moved to the nearest free spot. **It has no keys:** a key held through a pop does nothing until it's pressed again. The view recentres on it.
- **What stays:** the map (hoops passed, crystals and crystal balls taken), the exit and the moving spikes.

## Keys

| Key | In the game |
| --- | --- |
| 4, navi ← | left |
| 6, navi → | right |
| 2, navi ↑ | jump |
| navi ↓ | sets a direction nothing reads |
| either soft key | the menu (the game stops until Continue) |
| 5, navi select | finishes the level, with the level cheat on |
| 7, 8, 9 | the cheats' sequence (below) |
| 1, 3, # | with the level cheat on: the level before, the level after, gravity upside down |

A key changes the ball's directions when it's pressed and when it's let go, so one pressed and let go between two steps does nothing. Coming back from the menu clears the keys held, so a key held through it must be pressed again.

## Menus, screens and saves

- **The splash:** the Bounce picture on black, 31 steps.
- **The menu** ("Bounce"): Continue (with a game paused, or one saved), New game, High score, Instructions; Exit on a soft key. Continue is chosen first when it's there.
- **New game:** with only level 1 reached, level 1 at once; otherwise a list, "New game", of "Level 1" to the furthest level reached. Either way the score is 0, with 3 spare balls (4 balls in all).
- **"Level N completed!"**, the score, and Continue. **The next level is already loaded behind it, and runs**, with no keys, until Continue: the ball falls and bounces, the spikes move and the banner counts down.
- **The end of the game:** a "Game over" screen saying "Game over", or "Congrats!" after level 11, then "New high score!" if it is one, and the score; OK goes back to the menu.
- **High score:** the best score. **Instructions:** the text below, with the phone's keys in it.
- **Saved** in the record store `bounceRMS`, 3 records:
  1. the furthest level reached (1 byte; set at each level's end, at most 11);
  2. the high score (set when a level ends or the game does);
  3. the game in progress, written when the app is closed with Exit: the time, whether a game was under way (or on "Level completed"), the spare balls, hoops passed, level, ball size, score, view, the ball's position and speeds, its last crystal, the power-ups' counters, every crystal, crystal ball and hoop still on the map (up to 50), the moving spikes' offsets and speeds, and `0xDEADBEEF` at the end (a save without it is ignored).
  A saved game carries on with Continue. One quirk: its last crystal shows as taken only when both its column and its row differ from the start's.

## Cheats

Typed in the game, on the number keys:

- **7 8 7 8 9 8:** the ball can't pop (the "hoop" tune says so).
- **7 8 7 8 9 9:** the level cheat (the "pop" tune): then 1 and 3 load the level before and after (keeping the score and the spare balls), # turns gravity upside down for 300 steps, and 5 or the navi key's select finishes the level.

Both last as long as the app runs. Any other 7, 8 or 9 starts the sequence again; other keys don't break it.

## Timing

| | Steps | Time at 40 ms |
| --- | --- | --- |
| A power-up | 300 | 12 s |
| The "Level N" banner | 119 | 4.8 s |
| The exit opening | 6 | 0.24 s |
| A popped ball | 7 (+ any screen jumps) | 0.28 s |
| The splash | 31 | 1.24 s |

## The look

- **Colours:** the sky `#b0e0f0`, water `#1060b0`, the status bar `#0853aa`, writing `#fffffe`, the power-up bar `#ff9813`.
- **The sprites:** one sheet, `icons/objects_nm.png`, 48 × 72 px (4 × 6 pictures of 12 × 12), with a see-through colour. Everything else is made from it as the game starts, by flipping and turning (anticlockwise): the spikes and brick ramps in a sky and a water version, the deflaters, pumps and power-ups for each wall, the four hoops in each state (a back half drawn into the level, a front half drawn again over the ball, so it goes through), the big ball (16 × 16, from a quarter), the moving spikes (24 × 24, from a quarter), and the exit (24 × 48: stripes `#fc9d9e`, `#e33a3f`, `#c2848e`, with the door, a quarter mirrored four ways, over the top half).
- **The writing:** the phone's own small font (`Font.getFont(MONOSPACE, PLAIN, SMALL)`), which isn't in the game.
- **The JAR's other pictures:** `icons/icon.png` (the app's 16 × 16 icon, a red ball), `icons/bouncesplash.png` (the splash) and `icons/nokiagames.png` (a "Nokia Games" splash the code loads but never shows).

## The sound

Three ringtones in Nokia's OTT format (`sounds/*.ott`), played one at a time, at 125 bpm:

| Tune | When | Notes |
| --- | --- | --- |
| `up.ott` | a hoop | C6 E5 G5 C6, 120 ms each (480 ms) |
| `pickup.ott` | a crystal, a crystal ball, a power-up, the exit | C6 240 ms, G5 120 ms, C6 240 ms (600 ms) |
| `pop.ott` | a pop | G6 60 ms, B6 60 ms, C5 120 ms (240 ms) |

## The words

`lang.xx` (English; the JAR also has `lang.es-US`, `fr-CA`, `pt-BR`, `th-TH`, `zh-CN` and `zh-TW`, picked by the phone's language) has 14: Bounce, the instructions, Back, Congrats!, Continue, Exit, Game over, High score, Instructions, Level %U, Level %U completed!, New game, New high score!, OK. The instructions:

> Guide the ball past many obstacles to pass through all the hoops and open the door to the next level. Use key %0U to move the ball left, key %1U to move the ball right and key %2U to bounce the ball. Watch out for spikes. Use deflators to shrink the ball and inflators to return to normal size. Large balls float in water, small balls don’t. Collect crystals for extra points and to store your game position. Collect crystal balls to give your ball an extra life. Jump and speed boosts temporarily boost your powers while rubber floors give you extra bounce.

The game fills in the keys' names from the phone (4, 6 and 2 on a Nokia).
