# Bounce: the original

What we found out about Nokia's Bounce, the original J2ME game, while remaking it, kept with the remake but not part of it. The game's site doesn't serve this folder (`_redirects` sends every address in it to the game), and GameHub's Download leaves it out (`tools/offline-json.mjs` skips folders whose names start with a dot).

## The JARs

Bounce came on Nokia's phones from 2001, and there were several builds of it. Eight are known, all in the Internet Archive's "J2ME Personal Archive" (`j2me-hipnosis`), in one zip: **https://archive.org/download/j2me-hipnosis/Bounce.zip** (394,315 bytes). `tools/get-jars.sh <folder>` downloads it and checks every file:

| JAR | Built (its class files) | Step | |
| --- | --- | --- | --- |
| `Bounce [1.01] [LockedRes] [128x128] [En,Multi].jar` | 2 Oct 2002 | 40 ms | the earliest, with readable names; many collision bugs |
| `Bounce [1.8] [LockedRes] [128x128] [En,Multi].jar` | 10 Dec 2002 | 30 ms | 1.01's bugs fixed; the game ends after level 10 |
| `Bounce [1.9] [LockedRes] [128x128] [En,Multi].jar` | 12 Dec 2002 | 30 ms | 1.8 with a saved game and a level list |
| `Bounce [1.12] [LockedRes] [128x128] [En,Multi].jar` | 14 Feb 2003 | 30 ms | all 11 levels, new ramps and ceilings, a status bar for 15 hoops |
| `Bounce [1.18] [LockedRes] [128x128] [En,Multi].jar` | 10 Oct 2003 | 40 ms | the first with obfuscated names; a slowest fall; more cheats |
| `Bounce [1.21] [LockedRes] [128x128] [En,Multi].jar` | 23 Jan 2004 | 40 ms | smaller hit boxes; one tile of level 11 changed |
| `Bounce [1.24] [LockedRes] [128x128] [En,Multi].jar` | 16 Aug 2004 | 40 ms | the engine rewritten in the level's pixels: **the version the remake plays** |
| `Bounce [1.8] [LockedRes] [132x176] [En,Multi].jar` | 29 Jan 2005 | 30 ms | not Nokia's, though its manifest says so: a port of 1.8 to a 132 × 176 screen, with redrawn sprites and MIDI sounds |

Every one is `com.nokia.mid.appl.boun`, MIDP 1.0, with the same 11 level files (but for one tile). How each plays differently is in `versions.md`.

SHA-256:

```
0f9b34da51ff81bc01cf8e41deea8b7d9876c746befed48373d9bfa77a575855  Bounce.zip
0c032fa4ae2a8e89627d41be703da1af6185c2aa4e3ece24372cc5173dc1f61d  Bounce [1.01] [LockedRes] [128x128] [En,Multi].jar
a9c4811a0720cd872acc17da7f65845de5d452094f489b7172f917b93675944b  Bounce [1.8] [LockedRes] [128x128] [En,Multi].jar
3d2ab60413ea94c913914ecd0f99640ad8a5a36ace2fe4478284b85fa6006633  Bounce [1.9] [LockedRes] [128x128] [En,Multi].jar
091afc45ee6231b4194dc0b29538bab4deea9cfda178bebed9dd70b3986db594  Bounce [1.12] [LockedRes] [128x128] [En,Multi].jar
53bb986a769eaf9dbef63c25910f50a2a420db550705e6917f15d51275db6ce2  Bounce [1.18] [LockedRes] [128x128] [En,Multi].jar
56dc233ee8769ac7f6805b5237ef440672edaec884ac006280bf19f06100b29c  Bounce [1.21] [LockedRes] [128x128] [En,Multi].jar
50d7779422b9496e3e50afe8acfa8a38af0f4a5b5873710324ab5fb2bb0fad50  Bounce [1.24] [LockedRes] [128x128] [En,Multi].jar
730b6581457e08c041bcda05ed7337d316243454b9b0026cb6cfd46c24d6dad5  Bounce [1.8] [LockedRes] [132x176] [En,Multi].jar
```

## What's here

| | |
| --- | --- |
| `game.md` | How 1.24 works around the ball: the step, the screen and the view, the exit and its hidden "drawn" flag, dying and coming back, keys, menus and saves, cheats, timing, the look, the sound, the words. |
| `ball-1.24.md` | 1.24's ball update in full: the order, the numbers, the rounding, ramps, water, flipped gravity, popping, spawning and growing, every claim checked by replaying the original. |
| `levels.md`, `levels/` | The 11 levels: the file format, every tile and what it does, each level's numbers (size, hoops, crystals, water, pumps, power-ups, moving spikes), each one drawn at its start, and the routes found through it. |
| `versions.md`, `versions.json` | Every version compared with 1.8: 1.24 against 1.8 in a table, the lineage, what each one plays differently, and (in the JSON) the code each difference comes from. |
| `routes/routes.json` | Held-key routes through each level from its start: a win (the remake's replay test plays these), and the first pump, deflater, power-up and exit opening. Each is `{ steps, runs: [[keys, steps], …] }`, keys 1 left, 2 right, 4 jump. |
| `tools/` | The scripts (below). |
| `reference/` | The 1.24 reference's own code: stand-ins for the phone (MIDP, RMS, Nokia's UI and sound), a timer-less stand-in for the game's timer, and the harness that steps the game and prints its state after every step. It runs the original class files from the JAR (`reference/README.txt`). |

## The tools

They run with Node 20+ (or Python 3, or a shell), from anywhere: each takes its folders as arguments.

1. **The JARs:** `get-jars.sh <folder> [reference folder]` downloads and checks them, and with `reference/` as the second argument, copies 1.24's class files and resources into it.
2. **The levels:** `levels.mjs` prints a JAR's levels as text, and `draw-levels.mjs` draws them (with Playwright). `levels-to-rules.mjs` writes them into the remake's `js/rules.js` as the `LEVELS` block; `test-rules.mjs` turns them back into the JAR's bytes.
3. **The reference:** `reference/build.sh`, then `reference/run.sh` (a JDK 8 or newer; `run.sh --help` lists its options). `make-fixtures.py` records traces on it (random held keys from a level's start), and `check-fixture-on-oracle.py` checks a trace replays the same.
4. **The remake against the original:** `test-rules.mjs` plays every trace with `js/rules.js` and compares its state with the original's after every step (the ball, the score, the view, the exit, the moving spikes, the tiles that changed, the sounds): they match on all 182 traces (132 random plays and 50 routes, 339,710 steps). `search-routes.mjs` finds routes with `js/rules.js` (fast, in Node), `record-routes.mjs` records them on the reference, and `routes-to-bot.mjs` writes the wins into `test/bot.js`; `test-simulate.mjs` checks runs and saves.
5. **The rest:** `levels-md.mjs` writes `levels.md`; `pixel-svg.py` drew the icons from the JAR's pictures, a pixel at a time; `nocache-server.py` and `page-screenshot.js` served the page and took its screenshots; `make-research-folder.py` made this folder.

So the reference runs again with: `tools/get-jars.sh ~/bounce-jars reference`, `reference/build.sh`, then for example `reference/run.sh --level 1 --mask "6*60,2*40" --steps 100`.

## What isn't here

Nokia's own files, and what was made from them: the JARs and what's in them (download them, above); the decompiled code (CFR's, renamed to readable names) and the bytecode dumps (`javap`); and the traces, each the original's state after every step.

**Before adding any of them here:**
- This repository is public, so everything in this folder is published on GitHub; only the site and GameHub's Download skip it.
- The JARs, class files and decompiled code are Nokia's code. The remake's license exception (README.md: the sprites, levels, tunes and words the game uses) doesn't cover them, and putting them up is a different matter from using the levels and sprites.
- Cloudflare Pages uploads the whole branch, this folder too, and stops the deploy at a file over 25 MiB.

## License

The writing, the tools and the reference's code here are ours, under the repository's [MIT License](../LICENSE).

The reference's code was written for the research, not taken from the game, and none of Nokia's code is in it. It does use Nokia's names, so that the game's class files run on it: its stand-ins are named after the APIs the game calls (MIDP's, and Nokia's own UI and sound API), and the harness and the timer stand-in after the game's own classes and fields (`com.nokia.mid.appl.boun`, `g`, `c.j()` …).

The level pictures in `levels/` show Nokia's levels and sprites, which are Nokia's (see README.md).
