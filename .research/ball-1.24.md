## The ball in 1.24 (class `b`) [1.24: b.java, c.java; confirmed by replaying the reference]

**How it was checked.** `work/spec-1.24-ball/ball124.py` is a line-by-line port of `b`: the update, the collision tests, growing, shrinking and popping. `replay.py` rebuilds the ball, the map and the canvas flags from each trace line of the 1.24 reference. It then runs one tick and compares every ball field, lives, score, rings and changed tiles with the next line. Results:
- **The 220 fuzz traces:** 566,312 update ticks, 1,435 respawn ticks and 3,491 flip ticks, with **0 differences**.
- **12 scripted traces:** 887 update ticks, also 0 differences.
- **Re-running:** `run-checks.sh` repeats all of it.

Items marked **[code]** come from the bytecode and never happened in a run.

### Units and rounding
- **Position:** x, y is the ball's centre, in level pixels.
- **Speeds:** xSpeed and ySpeed are in tenths of a pixel per update. Right and down are positive.
- **`a / b`:** Java division, which rounds toward 0.
- **`>>`:** an arithmetic shift, which rounds down: −15 >> 1 = −8, and −27 >> 1 = −14.
- **sign(v):** −1, 0 or +1.

### The ball's state, and what a new ball starts with
| Field | `b.` | New ball |
| --- | --- | --- |
| x, y | o, n | the spawn point (see Spawning) |
| xSpeed, ySpeed | w, B | 0, 0 |
| size, half | i, g | 12 / 6 or 16 / 8 |
| direction bits (8 jump, 4 down, 2 right, 1 left) | z | **0: keys held are forgotten** |
| grounded | v | false |
| touch flag | u | false |
| rubber flag | t | false |
| jumpOffset | a | 0 |
| slideCntr | m | 0 |
| speed, gravity, jump counters | d, c, A | 0, 0, 0 |
| state (0 alive, 1 dead, 2 popping) | h | 0 |
| popCntr | l | 0 |
| respawn column, row, size | s, q, C | set by the caller |

### When the update runs (c.java:261-285)
Each game tick, after the level-text counter:
1. **A flip tick.** If y − 6 < R × 12 or y + 6 > R × 12 + 96 (R is the camera's top row), the camera recentres and **the ball isn't updated**. Nothing in the ball changes, so popCntr, slideCntr and the power-up counters all pause.
2. **Otherwise** the update below runs once.
3. **After it:** if the state is 1 (dead), the game ends when lives < 0; otherwise the ball respawns (see Spawning).

Keys change only the direction bits, and only between ticks. The update never changes them.

### The update, in order (b.java:678-872)
**test(px, py)** is the collision test with the ball's centre at (px, py) (see the collision section); it returns true for free. Each test applies the effects of every tile it reaches **at once**: collecting, popping, power-ups, size changes, flags and ramp redirects. It does this even when the ball never moves there.

**0. Popping (state 2):** popCntr −= 1. If it is now 0, state = 1. The update stops here.

**1. Water and gravity.**
- **The tile:** col0 = x / 12 and row0 = y / 12. The ball is "in water" if that tile has the water bit (0x40).
- **The numbers:** pick (acceleration, top) from this table:

| | Air | Water |
| --- | --- | --- |
| Small ball | +4, 80 | +6, 42 |
| Big ball | +3, 38 | −2, −30 |

- **A big ball in water that is grounded** gets ySpeed = −10 right away.

**2. Gravity power-up:** if gravCntr ≠ 0:
- gravity is flipped: negate the acceleration and the top speed;
- gravCntr −= 1;
- if it is now 0: not flipped, grounded = false, and both numbers go back to normal.

**3. Jump power-up:** if jumpCntr ≠ 0:
- if |jumpOffset| < 80, set jumpOffset to +80 when flipped, −80 otherwise;
- jumpCntr −= 1.

**4. Slide counter:** slideCntr = (slideCntr + 1) mod 3.

**5. Clamp:** ySpeed, then xSpeed, to −150…150. This is the only clamp.

**6. Minimum fall speed (new in 1.24):** if 0 < ySpeed < 10, the ball isn't in water and gravity isn't flipped, ySpeed = 10.

**7. The vertical move.** k = 0. While k < |ySpeed| / 10, with the bound **re-read every time round**: dy = sign(ySpeed), then:

- **a. Free:** if test(x, y + dy) is free:
  - y += dy, and grounded = false;
  - **leaving water:** if the top speed is −30 (a big ball, in water at step 1, gravity not flipped) and tile (col0, y / 12) isn't water, then ySpeed >>= 1. If −10 ≤ ySpeed ≤ 10 after that, ySpeed = 0;
  - k += 1, and go round again.
- **b. Blocked: the slide first.** If the touch flag is set, xSpeed < 10 (signed) and slideCntr = 0:
  - if test(x + 1, y + dy) is free: x += 1, y += dy, and the touch flag is cleared;
  - else if test(x − 1, y + dy) is free: x −= 1, y += dy, and the touch flag is cleared.
- **c. Landing:** if dy = +1, or gravity is flipped and dy = −1:
  - ySpeed = (−ySpeed) / 2, rounded toward 0; grounded = true;
  - if the rubber flag is set and jump is held: the rubber flag is cleared and jumpOffset −= 10 (+= 10 when flipped);
  - otherwise, if jumpCntr = 0: jumpOffset = 0;
  - if −10 < ySpeed < 10: ySpeed = +10 (−10 when flipped);
  - **the move ends.**
- **d. Ceiling** (dy = −1, gravity not flipped):
  - ySpeed = (−ySpeed) >> 1;
  - k += 1, and the loop **goes on with the new speed**. For example, −42 blocked at the third pixel becomes 21; the bound is now 2, so the loop stops.

Notes on step 7:
- The slide runs before c or d, whether it succeeds or not.
- A ramp hit inside any test here has already changed the speeds, and c and d use the changed values.
- **Under flipped gravity, every blocked pixel is a landing,** because dy = +1 always lands. The flipped-ceiling code (ySpeed = −20) can never run [code; the same in 1.8].

**8. Gravity.**
- **Not flipped:**
  - if the acceleration is −2 (a big ball in water) and ySpeed > −30: ySpeed −= 2, but not below −30. This happens even when grounded;
  - otherwise, if not grounded and ySpeed < top: ySpeed += acceleration, but not past the top.
  - So a big ball in water rising faster than 30, and not grounded, gains another −2 each update.
- **Flipped:** if not grounded and ySpeed > top: ySpeed += acceleration, but not past the top.
  - A flipped big ball in water has acceleration +2 and top +30. It only speeds up, by +2 an update, when ySpeed > 30 and it isn't grounded; otherwise it gets no gravity.
- **Never slows the ball:** gravity doesn't touch a ball that is already faster than the top speed in that direction.

**9. Top speed:** 100 if speedCntr ≠ 0 (then speedCntr −= 1); otherwise 50.

**10. Rolling.**
- **The rule:** right held and xSpeed < top: +6. Otherwise, left held and xSpeed > −top: −6. Otherwise friction: −4 if xSpeed > 0, +4 if xSpeed < 0.
- **Holding right:** 54, 50, 46, 52, 48, repeating (23 px every 5 updates). With top 100: 102, 98, 104, 100, 96.
- **Nothing held:** friction overshoots 0, so a stopped ball keeps alternating between two values 4 apart: 2/−2, 1/−3 or 3/−1. It stays at 0 only if it lands on exactly 0.

**11. Big ball:** if the size is 16 and jumpCntr = 0, jumpOffset −= 5 (+= 5 when flipped). This happens every update, in the air too. jumpOffset has no limit.

**12. Jump:** if grounded and jump is held:
- ySpeed = −67 + jumpOffset (flipped: 67 + jumpOffset);
- grounded = false.
- This comes after the clamp, so ySpeed can stay past ±150 until the next update clamps it. The trace shows −262 and −362.

**13. The horizontal move.** n = |xSpeed| / 10, fixed at this point. Repeat n times, with dx = sign(xSpeed) **re-read for each pixel**:
- **Free:** if test(x + dx, y) is free, x += dx.
- **Blocked, touch flag set:** clear the touch flag; ey = +1 when flipped, −1 otherwise.
  - Step up: if test(x + dx, y + ey) is free, x += dx and y += ey.
  - Otherwise, if test(x + dx, y − ey) is free, x += dx and y −= ey.
  - Otherwise, **a wall bounce:** xSpeed = −(xSpeed >> 1), so the remaining pixels go the other way.
- **Blocked, touch flag clear:** the ball stays where it is and keeps its speed.

The blocked test can itself set the touch flag (every brick tile it reaches does). So against brick, the step-up and bounce always apply. The diagonal tests can set the flag again straight away, so one update can bounce several times.

### What sets the flags (from the tile tests)
- **Touch flag:**
  - set by any brick tile a test reaches, hit or not; by rubber when the box overlaps but the mask misses; and by any ramp (30–37) that is hit;
  - cleared only by a successful slide or a blocked horizontal pixel.
- **Rubber flag:**
  - set by hitting rubber (2) or a rubber ramp (34–37). Resting on rubber sets it every update;
  - cleared only by a landing with jump held.
- **Grounded cleared by:** a free vertical pixel, the jump, the gravity power-up running out, or touching a gravity power-up.
- **Counters set to 300:** speed (38), gravity (47–50) and jump (51–54), on every update the ball touches one.
- **Lifetime:** the flags last through the air and across updates. Only a new ball resets them.

### Ramps: the redirect (b(I), b.java:172-215, called at b.java:308-310)
When a test hits a ramp's triangle and the ball isn't grounded at that moment, the speeds change at once. Here x = xSpeed and y = ySpeed before the hit:

| Ramp | Solid half | New xSpeed | New ySpeed |
| --- | --- | --- | --- |
| 30, brick | top-left | x if x < y, else −(y >> 1) | −x |
| 31, brick | top-right | x if x > −y, else y >> 1 | x |
| 32, brick | bottom-right | x if x > y, else −(y >> 1) | −x |
| 33, brick | bottom-left | x if −x > y, else y >> 1 | x |
| 34, rubber | top-left | x if x < y, else −y | −x |
| 35, rubber | top-right | x if x > −y, else y | x |
| 36, rubber | bottom-right | x if x > y, else −y | −x |
| 37, rubber | bottom-left | x if −x > y, else y | x |

- **The comparisons** are strict, and ySpeed is never halved.
- **How often:** one test redirects at most once, because it stops at the ramp. But one update makes many tests, and each one can redirect.
- **Example** (level 2, ramp 32, t-ramp.txt step 12). The ball starts at (894, 222) with xSpeed 0, ySpeed 50:
  1. it moves down 3 px;
  2. test (894, 226) hits the ramp: (0, 50) → (−25, 0);
  3. the slide's test (895, 226) hits it again: → (0, 25);
  4. the slide's test (893, 226) is free, so the ball moves there;
  5. the landing gives ySpeed −12, grounded.

  The reference shows x = 893, y = 226, vx = 0, vy = −12, g = 1.
- **A grounded ball is never redirected.** It climbs with the step-up rule, and it creeps down a slope through the slide: 1 px across and 1 px down every third update.

### Measured (confirmed in the reference)
| Case | Result |
| --- | --- |
| Small ball, brick, jump held | ySpeed −67. Up 51 px in 17 updates (6,6,5,5,5,4,4,3,3,3,2,2,1,1,1,0,0), down in 15 (1,1,1,2,2,3,3,3,4,4,5,5,5,6,6). **A hop takes 33 updates** (1.8: 35) |
| Small ball, first jump off rubber | −77, which is 68 px. Holding jump: −87, −97, … (−10 more each bounce) |
| Big ball, brick | −72 (jumpOffset −5); 79 px; 56 updates a hop; falls at most 38 |
| Big ball, rubber | −87 from rest. After a fall or a bounce it is far more, because jumpOffset keeps its −5 per update in the air and a rubber jump doesn't reset it: −162 after a 16-update fall, then −262 and −362, each clamped to −150 by the next update |
| Jump power-up | −147 (jumpOffset −80) |
| Ceiling | ySpeed = (−ySpeed) >> 1. For example −42 gives 21; the big ball's gravity of +3 then makes it 24 |

### Water
- **A big ball floats:**
  - from rest under water, ySpeed goes −2 an update down to −30 (3 px an update);
  - at the first pixel whose new row (in the start column) is dry: −30 becomes −15, which ends the move (the bound is now 1); water gravity then makes it −17;
  - out of the water, air gravity (+3) applies. It falls back in at about +22 and slows by 2 an update, so it bobs.
- **A big ball grounded in water** (it landed on the floor) starts its next update with ySpeed = −10.
- **A small ball sinks:** +6 an update up to 42, with no minimum fall speed.

### Flipped gravity
- **Both directions land.** The ceiling is now the floor, and the floor still counts as a landing too.
- **The jump points down,** away from the ceiling (67 + jumpOffset):
  - on a floor, flipped, with jump held, the ball keeps "landing" and "jumping" into it;
  - with rubber, ySpeed grows by 15 an update; 312 was printed in the test.
- **When the gravity power-up runs out during the jump power-up,** jumpOffset stays at +80 (|80| is not less than 80). Every jump then gives ySpeed = +13, so **the ball can't leave the floor until the jump power-up runs out.**

### Popping (d(), b.java:153-164)
- **What a pop does:** when a test touches spikes or a moving spike, and the ball isn't invincible:
  - popCntr = 7 and state = 2;
  - lives −1;
  - the speed, gravity and jump counters are set to 0;
  - the "pop" sound plays.
- **What it keeps:** the ball's position, speeds, flags and jumpOffset.
- **The rest of that update still runs:**
  - every later test fails, because state 2 blocks everything, so the ball doesn't move again;
  - its speeds can still change (landing, ceiling, friction, jump, wall bounce). The reference showed vx −15 and vy 3.
- **The countdown:** the next 6 updates count popCntr 6…1. The 7th sets it to 0 and the state to 1, and **the same tick** respawns the ball or ends the game.
  - So the popped ball shows for 7 ticks, or more when a flip tick comes in between (a flip tick doesn't count).
- **With lives < 0** the update also sets the level-end flag. The game-over branch returns before reading it [code].

### Spawning and respawning (c.java:107-125, 271-285; b.java:45-74)
- **Where a new ball appears:** centre (col × 12 + 6, row × 12 + 6), for both sizes.
  - Size 12: nothing more.
  - Size 16 (any size other than 12): the growing search below, which always moves it.
- **At the start of a level:**
  - (col, row) is the level's start tile; the size is 12 if the header byte is 0, otherwise 16;
  - afterwards, respawn = the start tile, and the respawn size = the size after the search.
- **On a respawn** (in the tick where the dead state is seen):
  - a new ball appears at the respawn tile, with the respawn size and both speeds 0;
  - the respawn tile and size are copied over from the old ball;
  - the new ball isn't updated in that tick;
  - the camera recentres.
- **A checkpoint (7)** sets respawn = that tile, and the respawn size = the ball's size at that moment.
- **Start positions:**
  - big balls: level 3 (630, 29), level 5 (390, 392), level 11 (1710, 449). The search moved them by (0, −1), (0, +2) and (0, −1);
  - small balls: level 1 (30, 18), level 2 (114, 186).
- **A new ball has the values in the state table.** Keys held are forgotten and have to be pressed again.

### Growing and shrinking (a() and e(), b.java:106-151)
- **Growing** happens when a pump (43–46) touches a small ball, and when a big ball is created:
  - size 16, half 8;
  - then for d = 1, 2, 3, …, try (0, −d), (−d, −d), (+d, −d), (0, +d), (−d, +d), (+d, +d), in that order, and move to the first free one;
  - (0, 0) is never tried, and every try is a full test with its effects;
  - moves seen in the fuzz traces: (0, −1) 110 times, (0, +2) 37, (+2, −2) 31, (−2, −2) 28, (0, −2) 20, (−2, +2) 9, (+2, +2) 3.
- **Shrinking** happens when a deflator (39–42) touches a big ball: size 12, half 6. The ball doesn't move.
- **Both happen inside a test,** in the middle of an update. The test then reports "blocked", and the rest of the update uses the new size (and, after growing, the new position).