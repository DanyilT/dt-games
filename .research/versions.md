# The versions

Every Bounce JAR found (the eight in archive.org's "J2ME Personal Archive": see `README.md`), compared with 1.8 by its bytecode (`javap`) and decompiled code (CFR). Made from `versions.json` (`synth`, the summary below; `diffs`, each version's differences with the code lines they come from).

## 1.24 against 1.8

The last version against 1.8, the first one read in full: each difference confirmed in 1.24's bytecode and by running it (`game.md` and `ball-1.24.md` have 1.24 in full).

| | 1.8 | 1.24 |
| --- | --- | --- |
| The step | 30 ms | 40 ms |
| Where the ball is | on the screen, in a 156 px scroll buffer | in the level's pixels; the view is apart from it |
| A popped ball | 5 steps | 7 steps |
| A ceiling | ySpeed = 20 | ySpeed = (−ySpeed) >> 1 (−67 gives 33) |
| The slowest fall | none (speeds 1–9 hang at the top of a jump) | 0 < ySpeed < 10, out of water, gravity not upside down: 10 |
| Ramps | swap both speeds (brick halves them) | xSpeed kept when it already runs along the slope faster; ySpeed never halved (`ball-1.24.md`) |
| Brick's touch flag | only on a near miss | on any brick a test reaches |
| A collision test | every tile, every effect | stops at the first tile that blocks |
| Thin bands (spikes, hoops, the exit, pumps) | tile pixels 3–8 | 4–7 |
| Moving spikes | 26 × 26 | 22 × 22 |
| The gravity power-up | doesn't clear grounded | clears grounded |
| Growing | looks for room from 2 px away | from 1 px |
| Shrinking | moves the ball 2 px down, else up | doesn't move it |
| A big ball's start | top-left on the tile, nudged only if it overlaps | centre at the tile + 6, then the search for room (it always moves) |
| The screen jumping | when the centre leaves the view; the ball can jump 336 px (a bug) | when the ball's edge is within 6 px of the view's; the ball never moves |
| The view across | follows the ball's movement, stops at the map's ends | the ball at x 64, held to 0 … 12 × width − 144 (a level's last 16 px never show) |
| The exit opening | a remembered buffer position against the drawn edges: it can open far off screen | a "drawn" flag, and the exit's columns in the view (`game.md`) |
| Levels | the game ends after level 10 | all 11; "Congrats!" at the end |
| Keys | from the phone's thread, even in the middle of a step | never in the middle of a step; held keys cleared on every resume (a tap between steps is lost in both) |
| Level 11, column 91, row 42 | brick | a wet ramp (33) |

## Lineage

One Nokia source line, plus one third-party port branched from 1.8. The evidence is file dates, shared renames and resources, and method-level bytecode diffs.

1. 1.01 (2 Oct 2002, 40 ms) is the earliest. It is the same unobfuscated com.nokia.mid.appl.boun code, without BounceConst.

2. 1.8 (10 Dec 2002, 30 ms) is a bug-fix release of 1.01 on the same HP toolchain. It adds the +/-150 clamp, the loop exit after a landing, the ceiling 20, the wall bounce, halved plain ramps, hoop rims, a solid closed exit, the water bit kept on hoops, the 0x80 mask, the left-flip fix and the pause-on-hide.

3. 1.9 (12 Dec 2002, 30 ms, Sun JDK) is 1.8 with fields renamed to an m-prefix style. It adds the save/resume system, a level select, the -1 px spawn, removal of the nudge, and clipped exit drawing. Ball physics are byte-identical to 1.8.

4. 1.12 (14 Feb 2003, 30 ms) continues 1.9: the same renames, save code, resetTiles and -1 spawn. It adds the new redirectBall, the (-v)>>1 ceiling, the 11-level campaign, the FIRE cheat, spike state in the save, and the 8-px HUD ring row with a new sprite sheet. That sheet is byte-identical in 1.12, 1.18, 1.21 and 1.24. 1.12 also returns to the HP toolchain.

5. 1.18 (10 Oct 2003) is the first obfuscated build and switches to 40 ms. A normalised opcode diff against 1.12 shows only two Ball changes: the minimum fall speed (water check only) and the brick ramp flag. It also adds the '#' and FIRE cheats, runs the next level behind the level-complete form, re-indexes the lang files, and introduces the mState=5 bug.

6. 1.21 (23 Jan 2004) uses the same obfuscation names as 1.18, and its CFR diff is small. Changes: thinCollide, the bottom edge rims and the spike box shrink by 1-2 px; the antigravity pickup clears grounded; the minimum fall speed skips antigravity; the screenFlip clamp is fixed; Continue resets the state; directions are cleared on resume; the save gets a timestamp and DEADBEEF; one level 11 tile changes.

7. 1.24 (16 Aug 2004, Sun JDK 1.4.2) rewrites the engine in world coordinates. It inherits the 1.21-only rules (hit boxes, grounded on the antigravity pickup, minimum fall speed guard, DEADBEEF save, level 11 tile), but reverts the edgeCollide change and the -1 small-ball spawn. It adds pop 7, enlarge from 1 px, no shrink nudge, early-exit collision, and a new flip and camera.

Side branch: the 1.8 132x176 build (2005) is iceman345's Siemens port, made from the 1.8 128x128 code. It keeps 1.8's physics, RMS and lang files; adds lang.ru; widens the left-end camera to 132; and replaces the sounds, keys and sprites.

The 1.18 and 1.21 JARs were repacked later (Created-By 14.0.1 Oracle). Their class files keep their original dates.

## Each version

### 1.01 (128x128, MIDlet-Version 1.01, files dated 2002-10-02)

- **Step:** 40 ms. **Obfuscated:** no.
- **Made by:** Nokia official build (com.nokia.mid.appl.boun, Created-By 1.3.1.02 Hewlett-Packard, same toolchain as 1.8); earliest build in the set

How it plays differently from 1.8:

- Game timer 40 ms instead of 30 ms. The step sequence is unchanged, but the game runs 25% slower in real time.
- No +/-150 clamp on xSpeed/ySpeed before the vertical loop, so stacked rubber jumps, jump bonus and ramp redirects can go past 150.
- A landing does not end the vertical loop (javap: goto 854 = i++, where 1.8 has goto 946 = loop exit). The loop bound |ySpeed|/10 is re-read, so the ball can rebound upward in the same step. That clears grounded, so there is no jump on that landing.
- Ceiling rebound ySpeed is 6 instead of 20, so the rest of that step's vertical loop is skipped.
- When a big ball leaves water, ySpeed is halved with idiv (rounds toward 0) instead of ishr; this differs for odd negative speeds.
- No wall bounce: when blocked horizontally with the ramp flag set, xSpeed is kept (1.8 sets xSpeed = -(xSpeed>>1)).
- Plain ramps 30-33 redirect at full speed (x=y, y=x or x=-y, y=-x); 1.8 halves both on 30-33.
- collisionDetection with the centre above the buffer (y<0) snaps the mask to -12*(|y|/12+1), so hits above the top edge are tested at the wrong height.
- No hoop rims (no edgeCollide). Active hoops 21-24 always collect. 13-16 collect for the small ball and are solid for the big one. Collected 17-20 are solid only for the big ball; 25-28 can be passed through.
- Collecting a hoop writes plain 145-156, which drops the tile's 0x40 water bit (wet hoops in levels 3, 5, 7, 8, 11 turn into air).
- The closed exit door (tile 9) can be passed through; 1.8 makes it solid until it is open.
- testTile masks only 0x40 (bipush -65), not the 0x80 dirty bit. Any tile with a stale 0x80 counts as empty: off-buffer moving-spike tiles, the exit tile while it opens, tiles left behind after a respawn elsewhere.
- A vertical screen flip in the parked left-edge state with divisorLine<156 leaves a ball left of the divisor at its old xPos, (156-divisorLine) px too far left.
- When xPos wraps by 156, scrollOffset is not shifted, so the point where scrolling resumes at map edges differs.

Other differences:

- No BounceConst class; constants are inlined in Ball, TileCanvas and BounceCanvas. Field names myParent/myBall.
- Moving-spike redraw is throttled by mMODrawFlag (drawing only, but it is what leaves stale 0x80 on spike tiles).
- No hoop sound on the second half of a hoop (tiles 24, 16, 22, 14); different pickup.ott and up.ott tones.
- The left soft key (-6) does nothing in game. There is no hideNotify pause and no resetDirections.
- pauseApp stops the timer and writes RMS, and startApp does not restart it. The RMS layout is the same 2-record format as 1.8.
- Static-spike sprite cell differs (blue-grey thorn); lang.xx says 'High scores'; different language set.
- Same as 1.8: all 11 level files, masks, gravity/jump/speed constants, scoring, the run() step order, camera scroll code, and 10-level campaign end (mLevelNum >= 11).

### 1.8 (128x128, MIDlet-Version 1.8, files dated 2002-12-10): BASELINE

- **Step:** 30 ms. **Obfuscated:** no.
- **Made by:** Nokia official build (HP JDK 1.3.1.02 toolchain), unobfuscated with LineNumberTables; JD-GUI decompilation with original names available

Other differences:

- Baseline reference for js/rules.js.
- Quirks a step-exact port must keep: the run ends after level 10 (++mLevelNum >= 11 leads to Game over). Level 11 is reachable only through menu Continue (restarts at level 11 with 3 lives, 0 points) or the 7-8-7-8-9-9 cheat with keys 1/3.
- screenFlip right-edge clamp bug: n2 += (tileX - W - 13 - 1)*12. A vertical flip while scrolling within about 7 columns of the right map edge moves the ball about 336 px left of where it should be.
- mCDRampFlag is sticky: it is set by near-miss bricks, rubber and ramps and cleared only when the slide or step-up consumes it.
- The reversed-gravity '-20' ceiling arm is unreachable: with gravity reversed, every blocked vertical move takes the landing branch.
- The HUD draws one ring icon per remaining ring at 11 px spacing, so more than about 11 overflow (levels 9-11 have 12, 12 and 15).
- No saved game. RMS 'bounceRMS' has 2 records: best level (1 byte) and best score (8 decimal-digit bytes).

### 1.9 (128x128, MIDlet-Version 1.9, files dated 2002-12-12)

- **Step:** 30 ms. **Obfuscated:** no.
- **Made by:** Nokia official build, same source tree as 1.8 with some m-prefix renames; built with Sun JDK 1.3.1_02

How it plays differently from 1.8:

- Ball physics (update, testTile, all collide routines, masks), screenFlip, scrolling, spikes, run() order and keys/cheats are the same bytecode as 1.8.
- Spawn, respawn and resume put the ball 1 px higher (centre y = row*12 + size/2 - 1). At 7 of 11 level starts the ball begins 1 px inside the ceiling brick, and every later step is offset.
- The big-ball spawn test and 4-px nudge are removed. No shipped spawn point ever triggers the nudge, so this matters only for custom levels.
- After winning (finishing level 10), mState stays 1, so the main-menu Continue loads level 11 with the current score and lives (1.8 restarts level 11 with 3 lives and 0 points).
- New feature: the game state is saved on exit (destroyApp) and Continue resumes the snapshot. It does not restore jumpOffset, grounded, ramp/rubber flags, slideCntr or spike phases, and the ball comes back 1 px higher.
- Save bugs: exiting after Game over saves lives=-1 as a valid save. The 40-entry item array overflows on level 11 (50 items), so level 11 is never saved.
- New game opens a level-select list (1..best level) once best level > 1.

Other differences:

- RMS now has 3 records: byte best level, int best score, and the snapshot. A 1.8 store is never read.
- All 4 exit tiles are redrawn while the door opens, each clipped to 12x12 (the opening timing is unchanged).
- No black clear frame after level complete.
- Different language packs (tl-PH, vi-VN, zh-CN, zh-TW); lang.xx, sprites, sounds and levels are identical to 1.8.

### 1.12 (128x128, MIDlet-Version 1.12, files dated 2003-02-14)

- **Step:** 30 ms. **Obfuscated:** no.
- **Made by:** Nokia official build (HP JDK 1.3.1.02), continues the 1.9 source (same renames, save system and -1 spawn)

How it plays differently from 1.8:

- Inherits every 1.9 change: spawn 1 px higher, no big-ball nudge, save-on-exit and resume, level select.
- redirectBall rewritten. The ball keeps its xSpeed when it already points along the slope faster than the deflected value, and the new ySpeed is never halved, also on plain ramps 30-33. Examples: tile 32 at (x50, y10) gives (50, -50) where 1.8 gives (-5, -25); tile 36 gives (50, -50) where 1.8 gives (-10, -50).
- Ceiling hit under normal gravity: ySpeed = (-ySpeed)>>1 instead of 20, so -67 rebounds at 33. The loop keeps running on the new speed.
- All 11 levels are played: the test is mLevelNum > 11. Score and lives carry into level 11, and the end screen says 'Congrats!'.
- Cheat: with the 7-8-7-8-9-9 cheat on, game action FIRE (keypad 5) finishes the level (+5000). Key code -5 is still swallowed.
- Save also stores moving-spike offsets and directions. Game over invalidates the save. The item array holds 50, so level 11 fits.

Other differences:

- HUD ring icons at 8 px spacing, with the ring sprite cell shifted 3 px left, so all 15 rings fit. New sprite sheet (the same file is used by 1.18, 1.21 and 1.24).
- White clear on level load instead of a black frame after level complete.
- Best level capped at 11.
- Different language packs; lang.xx and lang.de identical to 1.8.

### 1.18 (128x128, MIDlet-Version 1.18, class files dated 2003-10-10)

- **Step:** 40 ms. **Obfuscated:** yes.
- **Made by:** Nokia build, obfuscated (a=BounceUI, b=TileCanvas, c=Local, d=BounceCanvas, e=Ball, f=GameTimer). JAR later repacked (Created-By 14.0.1 Oracle).

How it plays differently from 1.8:

- Game timer 40 ms: 25% slower in real time.
- Inherits the 1.9 and 1.12 changes: spawn 1 px higher, no nudge, the 1.12 redirect formulas, the ceiling (-v)>>1, 11 levels, save/resume and level select.
- New minimum fall speed: if 0 < ySpeed < 10 and the ball is not in water, ySpeed = 10. Antigravity is not checked, so with antigravity on the ball sinks about 1 px per step after a ceiling rebound instead of settling on the ceiling. The jump apex hovers 2 steps instead of 5, and a held-jump cycle on flat ground takes 33 steps instead of 35.
- Brick (tile 1) sets mCDRampFlag on a real hit as well as on a near miss, so 1-px slides, step-ups and the wall bounce happen more often against bricks.
- The next level loads and runs, with no input, behind the 'Level completed' form. The number of steps depends on wall-clock time (spike phase, level banner, settling ball).
- Cheats: '#' sets antigravity for 300 steps. FIRE, including the centre key -5, finishes the level.
- Bug: Continue on the level-complete form leaves mState=5, so after the first completed level a pause or incoming call gives a menu without Continue.

Other differences:

- The save adds a kind byte (1 in game, 2 on the level-complete screen) and is otherwise the 1.12 layout.
- lang files re-indexed, with 'Next' and 'Pause' dropped. The main menu has an Exit command.
- The 'Level N' banner is drawn in paint(); white clear on load; exit clip.
- Levels, sounds and sprite sheet identical to 1.12.

### 1.21 (128x128, MIDlet-Version 1.21, class files dated 2004-01-23)

- **Step:** 40 ms. **Obfuscated:** yes.
- **Made by:** Nokia build, same obfuscation mapping as 1.18. JAR later repacked (Created-By 14.0.1 Oracle).

How it plays differently from 1.8:

- Game timer 40 ms.
- Inherits the 1.18 changes (spawn -1, no nudge, 1.12 redirect, ceiling (-v)>>1, brick ramp flag, 11 levels, the next level running behind the level-complete form, '#' and FIRE cheats). Two of them are adjusted: the minimum fall speed now also skips antigravity, which fixes the 1.18 sinking, and level-complete Continue sets the state back to 1.
- thinCollide (spikes 3-6, exit 9, hoops 13-24, inflators 43-46) needs a real pixel overlap, which makes the thin axis 1 px narrower on each side.
- edgeCollide bottom rims (tiles 14, 18, 22, 26) use a ball box 1 px smaller.
- Moving-spike hit box: the ball must overlap the 24x24 block by at least 2 px, where 1.8 counts touching.
- Touching the antigravity pickup (47-50) also clears grounded.
- screenFlip right-edge clamp fixed: tileX > W-13 gives n2 += 156-(W-tileX)*12, removing the 1.8 teleport.
- Level 11: row 42, col 91 changes from brick 0x01 to 0x61 (water + ramp 33).
- Held directions are cleared on every resume.

Other differences:

- Save gains a timestamp and a 0xDEADBEEF trailer check.
- Unused debug menu items 'Read RMS' and 'Write RMS'.
- Different language set; German Exit text changed; Local caches the stream.

### 1.24 (128x128, MIDlet-Version 1.24, files dated 2004-08-16)

- **Step:** 40 ms. **Obfuscated:** yes.
- **Made by:** Nokia build, rewritten engine (world coordinates), obfuscated, Sun JDK 1.4.2_02

How it plays differently from 1.8:

- Game timer 40 ms.
- Keeps the later rules: 1.12 redirect, ceiling (-v)>>1, minimum fall speed (skips water and antigravity), brick ramp flag, the 1.21 thin and spike hit boxes, grounded cleared on the antigravity pickup, 11 levels, next level running behind the level-complete form, '#' and FIRE cheats, the 1.21 level 11 tile, directions cleared on resume.
- Does not keep two of them: the 1.21 smaller edgeCollide box is reverted to the 1.8 size, and the small ball spawns at row*12+6 again (no -1).
- Ball, camera and collisions use world pixels: there is no 156-px ring-buffer wrap, and a flip never moves the ball, so the 1.8 336-px clamp bug is gone.
- collisionDetection returns at the first blocking tile, so side effects of the remaining tiles (pickups, flags, rings, pops) are skipped that call.
- The pop (death) lasts 7 steps instead of 5.
- enlargeBall searches from 1 px instead of 2. shrinkBall no longer nudges the ball.
- A big ball spawns at tile*12+6 and is then enlarged, so it always moves at least 1 px. Level 3 start is (630,29), against (632,32) in 1.8.
- A vertical flip happens when the centre is within 6 px of the view edge, with about 2 px of hysteresis. Rows that are non-zero multiples of 7 are framed on the bottom row of the screen above.
- The camera keeps the ball at x 64 and clamps at 12W-144, so the last 16 px of every level are never shown.
- The exit starts opening about 10 px earlier when approached from the left, because the test uses the previous step's camera.
- Key events are synchronised with the game step.

Other differences:

- Hoop fronts are drawn from a table and the ball is drawn on the screen image. Off-map tiles draw as brick.
- Instruction text is one string with key names; lang.xx has 14 strings; locales es-US, fr-CA, pt-BR, th-TH, zh-CN, zh-TW.
- Save layout as 1.21 (timestamp + DEADBEEF).

### 1.8 132x176 (manifest says MIDlet-Version 1.8 / Nokia, MIDP-2.0; files dated 2005-01-29)

- **Step:** 30 ms. **Obfuscated:** yes.
- **Made by:** Third-party Siemens x65 port of 1.8 by iceman345 [IHT], 2005 (About screen and splash), recompiled and re-obfuscated

How it plays differently from 1.8:

- Ball physics, testTile, collision, scrolling code and run() order are equal to 1.8: pop 5, +/-150 clamp, ceiling 20, halved plain ramps, break after landing, same masks and levels.
- The camera's right edge is 132 instead of 128 in the left-end branches of createBufferFocused and screenFlip (levels 1 and 7 start there). The 132-px window persists through scrolling, so the right-end scroll stop and resume and the left-end stop shift by about 4 px. In those bands a vertical flip can take the other screenFlip branch.
- The exit can start opening up to about 4 px earlier, because the visibility test uses the wider right edge.

Other differences:

- 132x176 layout: banner on top, play strip at y=48, HUD at y=144. HUD capped at 11 ring icons.
- MIDI sounds through MMAPI; Siemens soft-key and joystick codes; 100 ms vibration on death (Siemens API).
- Tiles loaded as separate redrawn PNGs (crystal becomes a floppy disk, HUD ring a key); rubber ramps lose transparency.
- Menu adds About and Exit; lang.ru added; RMS layout as 1.8.

## Spot checks

What was checked again in the bytecode, where the version reports disagreed:

- Timer periods, from javap of every GameTimer: ldc2_w 40 in 1.01, 1.18 (f), 1.21 (f) and 1.24 (g); 30 in 1.8, 1.9, 1.12 and the port (a$a). Confirmed. The reports disagreed on whether 40 ms affects play (1.01 and 1.21 said yes, 1.18 and 1.24 said no). The table treats it the same way everywhere: the step sequence is unchanged, but real-time speed is 25% slower.
- 1.01 vertical loop (javap Ball.update). 1.8 jumps to 946 (loop exit) after a landing; 1.01 jumps to 854 (i++). Ceiling: bipush -20/20 against -6/6. No clamp in 1.01: offset 415 goes straight to the loop test. Water halving: idiv at 1.01 offset 524, ishr at 1.8 offset 598. All confirmed.
- 1.01 testTile mask: bipush -65 iand only, where 1.8 has bipush -65 iand sipush -129 iand. Confirmed. Also confirmed in CFR: plain hoop values 145-156, no edgeCollide calls, closed exit with no else branch, full-speed plain ramps, no wall-bounce else, no scrollOffset shift, the left-edge flip branch, and soft key -6 swallowed.
- Floor versus ceiling looked like a disagreement: 1.01's report says 1.8 breaks after a bounce, while 1.12/1.18 say the loop continues after a ceiling hit. Both are right. 1.8 breaks only after a landing; a ceiling hit continues the loop on the new speed.
- Correction: the reversed-gravity arms (1.01 '-6', 1.8 '-20', and the -20 that 1.18 and 1.24 describe as 'unchanged') are unreachable. With gravity reversed, both n2>0 and n2<0 enter the landing branch first. The 1.01 entry's 'or the floor under reversed gravity' should be dropped.
- 1.01 left-edge flip: with xPos == divisorLine the claim of a divisorLine-px error holds against the true world position. 1.8 itself is off by 156 there, because collisionDetection maps xPos == divisorLine to the right segment. Kept, with that caveat.
- -1 px spawn: 'n2 - tileY*12 - 1' is in 1.9 (BounceCanvas.java:142), 1.12 (:145), 1.18 and 1.21 (d.java:146). Confirmed. 1.24 spawns at row*12+6 with no -1. Minor correction to 1.9: a ball under a ceiling first moves on the 4th update (ySpeed 0, 4, 8, 12), not on frame 3. With the minimum fall speed (1.18+) it moves on the 2nd.
- Big-ball nudge removal: confirmed absent in 1.9 through 1.21. Its effect is corrected to 'none with the shipped levels'. The only candidate, the L11 checkpoint (143,45), is boxed in by deflators 39-42 (map dump). Deflators shrink on bounding-box contact, and tiles are tested column-major and top-down, so a 16-px ball always touches a deflator before or while it first overlaps the checkpoint. A big respawn there therefore looks unreachable, and the 1.18 report's 'deflator shrinks the ball before frame 1' should not occur in practice. This was reasoned from the code and the map, not run.
- 1.9 win path: displayGameOver no longer sets mState, and gameOver() is used only on death. Continue then calls displayGame(false); run() sees mLoadLevelFlag and createNewLevel keeps lives and score. Confirmed in CFR.
- 1.9 save: destroyApp calls saveGameData(3), which always writes -6 and uses an int[40][3] buffer. My level scan: L1-L10 have 15-35 save-relevant tiles at the start and L11 has exactly 50. So 1.9 can never save level 11, and the 50-entry array in 1.12+ just fits. Confirmed.
- 1.9 to 1.12 Ball CFR diff: only redirectBall and the ceiling line change (javap ineg/iconst_1/ishr). 1.12 has neither the minimum fall speed nor the brick flag change. Checked the 1.12 ramp examples by hand: tile 32 at (50,10) gives 1.8 (-5,-25) and 1.12 (50,-50). Confirmed.
- End-of-game test: >= 11 in 1.01, 1.8, 1.9 and the port; > 11 in 1.12, 1.18, 1.21 and 1.24. Level files load as J2MElvl.%03d of mLevelNum, starting at 1. Confirmed.
- Cheats: 1.12 has case 8 (FIRE) and still swallows -5. 1.18, 1.21 and 1.24 drop the -5 case and add case 35 ('#', antigravity counter = 300). Confirmed. Correction to the 1.21 report: invincibility is 7-8-7-8-9 then 8 (not 7-8-7-8-8), the same in every version.
- 1.12 to 1.18 normalised opcode diff (my ops.py) of update, testTile, thinCollide and collisionDetection: the only additions are the water bool with the minimum fall speed, and putfield w=true in the tile-1 hit branch (javap offsets 334-336). Confirmed.
- Minimum fall speed disagreement: 1.18 has 's<10 && s>0 && !water'; 1.21 and 1.24 add '&& !antigravity'. Both reports are right. The 1.18 antigravity sinking follows from the code.
- 1.18 to 1.21 CFR diff, same obfuscation names: thinCollide size-1 and tile-1; bottom-rim edgeCollide size-1; spike box +1/-1; antigravity pickup sets grounded=false; the minimum fall speed guard; the screenFlip clamp fix (W-13, n2 += 156-(W-tileX)*12); level-complete Continue sets state 1; resetDirections in displayGame; save timestamp and DEADBEEF. So the 1.18 report's 'screenFlip identical to 1.8' is also right.
- Edge-rim disagreement: 1.24's edgeCollide uses (x-g, y-g, x+g, y+g) for every case, the 1.8 size. 1.21's smaller bottom-rim box was reverted in 1.24. Both reports are right; the table lists it as not inherited.
- 1.24, all in CFR: pop l=7; enlarge from n=1; shrink only resizes; collisionDetection returns false at the first failing tile, and testTile keeps a local bl; spawn at tile*12+6 followed by enlarge for 16 px; flip test y-6 < R*12 or y+6 > R*12+96 with 7-row steps; camera clamp (W+1)*12-156 in scrolling and W*12-156 in recentre; exit test (al+1)*12 > camL && al*12 < camL+128 before the scroll call. That works out to opening when camL >= al*12-127, against about al*12-117 in 1.8, so 10 px earlier from the left and the same from the right. Level 1: W=112, exit col 110, so the camera stops at 1200 and only 8 px of the exit show. Confirmed.
- Level 11 difference: cmp shows one byte, 1-based 7576 = 0-based 7575, 0x01 to 0x61, at row 42 col 91 (W=178). The two reports' offsets agree; one is 1-based. Level md5s: all other files are identical across all 8 builds, and .011 matches between 1.21 and 1.24.
- Jump timing: my vertical-loop sim gives a held-jump cycle of 35 steps without the minimum fall speed and 33 with it, both with a 51-px apex. The apex hovers 5 steps against 2. This matches the 1.21 and 1.24 reports.
- 1.18 level-complete: the Continue command only calls setCurrent (state stays 5), and displayMainMenu shows Continue only if L==1 or a save exists. Confirmed. In 1.21 the same command sets M=1, so the bug is fixed there. Both builds, and 1.24, restart the timer under the form (stop, then a(false,0)). Confirmed.
- 132x176 port: r=132 in the left-end branches of createBufferFocused and screenFlip (e.java:114, :182). testScroll and scrollBuffer shift both edges, so the 132 width persists. Ball constants and the landing break match 1.8, and the HUD cap is 11. The mechanism is confirmed. The exact step numbers in the report (stop at step 76 vs 77, left stop at ball 67 vs 62) come from the reporter's own camera sim and were not re-run here.
- HUD and resources: ring spacing (w-1) in 1.01, 1.8 and 1.9, (w-4) in 1.12, 1.18, 1.21 and 1.24. objects_nm.png md5: 1.8 = 1.9, and 1.12 = 1.18 = 1.21 = 1.24, which supports the lineage. OTT sounds are identical from 1.8 to 1.24; 1.01's up and pickup differ. Confirmed. My javap dumps and helper scripts (hdr.py, count.py, jump.py, ops.py) are in /tmp/claude-0/-home-user/9e293dcf-c6a7-5416-93b2-b9c9546fbcbb/scratchpad/work/versions/synth/.

## The comparison's recommendation

What the comparison recommended for a remake, as it stood then (the remake was made from 1.24 in the end):

Make Nokia 1.8 128x128 (30 ms tick) the reference for js/rules.js. Use the 1.8 level files: they are byte-identical in 1.01-1.18 and in the port.

Why 1.8:
1. Its code is the most reliable source: unobfuscated, with original names from JD-GUI and a full CFR/javap match.
2. Its per-step code is shared exactly by 1.9 (only the spawn y differs) and by the Siemens port (only the camera width differs). The same engine therefore covers three of the eight builds and the whole Dec 2002 line.
3. It is the first build with 1.01's collision bugs fixed: passable closed exit, no hoop rims, bounce-loop rebound, ceiling 6, 0x80 mask, lost water bits.
4. It has no wall-clock-dependent behaviour. From 1.18 on, the next level runs behind the level-complete form for as many ticks as the player takes to press Continue, which a deterministic remake cannot reproduce faithfully.

What most players had cannot be settled from these JARs. The dates suggest 1.8/1.9 for the early-2003 128x128 Series 40 phones and 1.18-1.24 for 2004 handsets; confirming that needs outside evidence such as firmware dumps.

Trade-offs of 1.8 the remake inherits:
- The campaign ends after level 10. Level 11 is reachable only via Continue after Game over (3 lives, 0 points) or the cheat.
- The HUD overflows past about 11 rings on levels 9-11.
- Rare screenFlip clamp teleport near the right map edge while scrolling.
- Touch-counts spike and thin hit boxes, and a sticky ramp flag.
- No saved game.
Keep all of these in strict mode. If fixes are wanted, offer them as explicit opt-in flags, not as defaults.

If a later ruleset is wanted, make it a separate, labelled mode built as deltas on 1.8:
- 1.9: spawnYOffset -1 and no nudge.
- 1.12: also the new redirectBall, the (-v)>>1 ceiling and 11 levels.
- 1.18: also the minimum fall speed (water check only) and the brick ramp flag.
- 1.21: also the thin, edge and spike box changes, grounded cleared on the antigravity pickup, the antigravity guard on the minimum fall speed, the flip-clamp fix, the level 11 tile and 40 ms.

1.24 cannot be expressed as a delta (world coordinates, early-exit collisions, 7-step pop, new camera and flips) and would need its own engine. 1.01 is a buggy pre-release. The 132x176 build is a third-party port.
