Bounce 1.24 reference ("oracle"): the ORIGINAL 1.24 class files, run step by step
====================================================================================

What it is
----------
A headless, deterministic Java harness that runs Nokia's own Bounce 1.24 bytecode (Bounce_1.24_LockedRes_128x128_EnMulti,
MIDlet-Version 1.24) and prints one trace line per game step. It is the reference for js/rules.js's 1.24 mode.

  orig-classes/      Bounce, a, b, c, d, e, f, g .class copied unchanged from the JAR (SHA256SUMS; build.sh checks them)
  res/               the JAR's resources: levels/, icons/, sounds/, lang.*  (no classes)
  stubs-src/         MIDP 1.0 / RMS / Nokia UI + Sound stubs, plus oracle.rt.Rt (timer registry, event log, fake clock)
  timer-src/         the ONLY replaced game class: g (the 40 ms TimerTask), same name and constructor g(e, e)
  harness-src/       com.nokia.mid.appl.boun.OracleHarness (main class)
  build.sh run.sh fuzz.sh

Needs: Java 8+ (tested with OpenJDK 21; javac --release 8). No network.

Setting it up from the JAR (orig-classes/ and res/ are Nokia's files: keep them out of any repo)
  unzip Bounce_1.24_LockedRes_128x128_EnMulti.jar -d ~/bounce/1.24
  mkdir -p orig-classes res
  cp -R ~/bounce/1.24/com orig-classes/
  cp -R ~/bounce/1.24/levels ~/bounce/1.24/icons ~/bounce/1.24/sounds ~/bounce/1.24/lang.* res/
  (or leave res/ empty and run with BOUNCE_RES=<a folder holding levels/ icons/ sounds/ lang.*>; do not point it at
  the unzipped JAR root itself, because that also holds the original g.class)
  build.sh checks orig-classes/ against orig-classes/SHA256SUMS (the 1.24 JAR's class files, 2004-08-16).

Exact commands
--------------
  cd <this folder>                                  # any folder works; scripts find their own location
  ./build.sh                                        # stubs + timer g + harness into build/
  ./run.sh --level 1 --steps 100 --keys "1:+RIGHT,61:+UP"            # the sample below
  ./run.sh --level 3 --mask "0*10 2*50 6*20 2*40"                    # held-keys mask, one value per step
  ./run.sh --level 5 --mask-file run.mask --stop-on-complete         # a GameHub-style one-level run
  ./run.sh --level 2 --script keys.txt --steps 3000 --behind 40       # next level runs 40 steps behind the form
  ./run.sh --level 7 --fuzz 12 --steps 4000 --dump-script /tmp/s.txt  # random play (seeded)
  ./fuzz.sh 20 4000                                 # 20 seeds x 11 levels x 4000 steps, every seed run twice
  ./fuzz.sh 50 4000 1 2                             # 50 seeds on levels 1 and 2 only
  ./run.sh --help

Determinism check (two fresh JVMs, byte-identical output):
  ./run.sh --level 1 --steps 100 --keys "1:+RIGHT,61:+UP" > a.txt
  ./run.sh --level 1 --steps 100 --keys "1:+RIGHT,61:+UP" > b.txt && cmp a.txt b.txt && echo identical

Options
-------
  --level N        1..11 (default 1)
  --best B         the record store's best level before the app starts. Default: 0 for level 1 (a fresh phone: the store
                   is empty, a.g() creates 3 empty records, a.java:263-266), else B = N. With B > 1, "New game" opens the
                   level list "Level 1..Level B" (a.java:222-230, 119-130) and the harness picks item N-1.
  --steps N        steps to run (default 100; mask mode: the mask length; fuzz: 4000)
  --keys "..."     script events, comma/space separated; --script FILE the same from a file ('#' starts a comment)
  --mask "..." / --mask-file FILE   held-keys mask (see below); --keys can be combined with it (e.g. for pokes)
  --behind N       steps that run behind the "Level N completed!" form before Continue is pressed (default 0)
  --no-continue    never press Continue (the next level keeps running behind the form, with no input)
  --stop-on-complete   end the run at the step that shows the level-complete form
  --fuzz SEED      random script (see fuzz.sh); --dump-script FILE writes it in --keys syntax
  --dump-rms       print the record store at the end (record 3 = the save written by Exit/destroyApp)

Script events (<step>:<event>; several per step run in script order)
  +KEY / -KEY      press / release. KEY: UP/2 LEFT/4 RIGHT/6 FIRE/5 DOWN/8 (8 is only a cheat key in 1.24: c.java:384-397;
                   NDOWN is the down direction), NUP NDOWN NLEFT NRIGHT NSEL (navi keys -1..-5), SOFTL SOFTR (-6/-7: pause
                   menu, c.java:417-422), 0 1 3 7 9 STAR POUND/#, K<keycode>
  menu=<i>         select item i of the list on screen (pause menu: 0 Continue, 1 New game, 2 High score, 3 Instructions)
  cmd=<label>      fire a command of the screen on screen (Continue, OK, Back, Exit)
  non-game test pokes, printed as POKE:... in the trace:
  warp=<col>/<row>[@<level>]  ball centre to (col*12+6, row*12+6), speeds kept, then c.a() (camera recentre + redraw);
                   with @level only while that level runs
  rings=all        c.am = e.ag (all rings collected)
  lives=<n>        c.n = n
  bonus=<k>/<n>    ball bonus counter k (0 speed b.d, 1 gravity b.c, 2 jump b.A) = n

Mask format (the format the remake's runs use)
  One value per step, bit 1 = left, 2 = right, 4 = jump. Value i (0-based) = keys held during step i+1; before step 1
  nothing is held. Written as a run of digits ("0222266") or tokens separated by commas/white space, each "v" or "v*n"
  (n steps of v). Each change becomes key events delivered before that step's tick: releases first, then presses, each
  in bit order left, right, jump, with the keys '4' (52), '6' (54), '2' (50). After the mask ends nothing changes.
  A press that lands while another screen has the focus (pause menu, level-complete form) is dropped, as on the phone,
  and the mask does not re-send it.

How a run works (the modelling choices)
---------------------------------------
* One run = one fresh JVM = a phone that has just been switched on: every static and every field of the game starts
  as on a first launch. That matters in 1.24 because state lives across levels inside one app session: e.T (the
  "exit drawn" flag, set only by drawTile for tile 9, e.java:376, cleared only at c.java:293-295, never at level load),
  the cheat state c.X/c.M/c.O, and f's cached lang stream. The boot line prints T=0 for every level except where the
  level's first screen already shows the exit (levels 3 and 7: T=1 at step 0, set by the first full redraw).
* Boot = the real start-up: new Bounce() builds the UI in the constructor (Bounce.java:20-24; a.java:75-83 reads the
  record store, creates the canvas c, which starts the timer c.java:65, and shows the splash); startApp() only sets the
  lights (Bounce.java:26-28). The harness then fires the timer until the main menu appears: 32 splash ticks (c.p counts
  0..31, c.java:233-257; no key is pressed). Main menu on a fresh phone: [New game, High score, Instructions].
  "New game" (a.java:222-230): with best level <= 1 it starts level 1 directly (a = 4; a(true,1)), otherwise it shows
  the level list and the harness picks the level. Both call a.a(true, n) (a.java:132-141): c.a(n,0,3) (score 0,
  3 lives, the level loaded and the ball created by c.o(), c.java:107-116), timer started, directions cleared, canvas
  shown. Level 1 through the list (--best 5) gives a byte-identical trace to the fresh-phone path.
* The timer: the original g (javap: constructor schedules itself on a java.util.Timer with delay 0, period 40 ms;
  run() calls e.h() = c.j()) is replaced by timer-src/g.java, which registers with oracle.rt.Rt instead. The harness
  calls run() itself: one call per step, whatever is on screen, as long as the game has a timer started. The class path
  puts build/timer-override (only g.class) before orig-classes, and the trace's first line names where c and g came from.
* A step s: (1) if the level-complete form is up and its wait is over, press Continue; (2) deliver step s's script
  events (keys only reach the canvas while it is on screen, otherwise "(dropped)"); (3) one tick (c.j(),
  c.java:223-346), or "notick" when no timer runs (pause menu); (4) print the line. Step 0 is the state right after the
  level was created, before any tick. With the timer running, s = ticks since the level started.
* Keys: c.keyPressed/keyReleased (c.java:351-478) are called directly between ticks. In 1.24 both handlers and the
  step synchronise on the ball object (javap c.j(): monitorenter at 207, monitorexit at 303/715), so on a phone key
  events also land between the locked parts of steps. The tail of c.j() after the lock (c.java:328-345: camera scroll
  b(I), paint m(), the level-complete check of c.f) is not locked; a key event landing there behaves as if it came
  just after the step, except the FIRE cheat (sets c.f), which on a phone could end the level one tick earlier. Held
  keys produce no repeated keyPressed (c has no keyRepeated). Resuming from the pause menu clears the direction bits
  (a.java:137-138, Ball.f()), so a key held through a pause must be pressed again.
* Level complete (c.java:331-345). In step S the ball enters the open exit (b.java:608-614 sets c.f), the step
  finishes, then: level+1, +5000, best level/score saved (rms:set1/2), and a.f() (a.java:184-199) stops the timer,
  calls a(false,0), which STARTS IT AGAIN (javap a.f(): invokevirtual a(ZI)V at offset 10) and clears the old ball's
  directions, then shows the form "Level N completed!" with a Continue command. Line S shows the old level's ball and
  map with lvl already N+1 and ev=...|timer:stop|timer:start|show:form[][Level_N_completed!_<score>].
  The next level then runs behind the form. Tick S+1: c.m is set, so c.j() only calls c.o() (c.java:224-227): the
  next level's map is loaded (tiles=newmap), new ball at the start with no direction bits (a big ball is nudged by
  enlargeBall), camera recentred and the whole buffer redrawn (this can set T), rings 0, ad=120, respawn = start;
  there is no ball update in that tick. Ticks S+2...: ordinary steps with no input: ad counts down, the ball falls and
  bounces, moving spikes move, the camera follows. Lives and score carry over; T and the cheat state carry over too.
  Continue (a.java:250-252) only sets a = 1 and shows the canvas again; nothing is reset.
  --behind N (default 0): ticks S+1..S+N run behind the form (script keys in those steps are dropped), and Continue is
  pressed at the start of step S+N+1, before that step's keys. With the default 0, Continue comes at the start of
  S+1 and S+1's tick loads the level, so keys scripted for S+1 reach the canvas but go to the OLD ball and are lost;
  the first tick that can see input is S+2. The new level's state when the player gets control does depend on N
  (N-1 input-free update ticks have run). On a phone N is however long the player takes to press Continue.
  --stop-on-complete ends the run at S (what a one-level GameHub run needs).
* Death: popBall (b.java:153-164) sets the pop counter to 7; b.c() counts it down (b.java:688-697) and the ball is
  respawned in the tick where it reaches 0 (c.java:278-284). With lives < 0 that tick instead saves the best
  level/score, stops the timer and shows "Game over" (c.java:272-276, a.java:423-428): the run stops there
  ("# s=N stopped: ... 'Game over|...'"). After level 11 the same form says "Congrats!" (c.java:338-339).
* The pause menu (soft keys) stops the timer; the run idles ("notick") while a scripted menu=/cmd= event is still
  ahead, otherwise it stops. A game-over or win form always stops the run.
* Clock: 1.24 reads System.currentTimeMillis() twice: c.B (field initialiser, javap c.<init> offset 46) and the save
  record a.a(3) (a.java:352). Neither value is ever read back for play (javap: c.B and a.m are only written). The RMS
  stub still replaces the first 8 bytes of record 3 with a fake clock (2004-08-16 00:00 UTC + 40 ms per tick fired),
  so even --dump-rms output is deterministic. Nothing else is time- or thread-dependent: no real Timer, no threads,
  repaint() only counts, paint() is never called (it only draws). drawTile and the buffer code DO run (they set T).
* Stubs: the screen is 128x128, getGameAction is Series 40's (2/4/6/8/5 and the navi keys; 1/3/7/9 = GAME_A..D),
  images are size-only (PNG header), drawing does nothing but drawImage/drawString(null) throw as on MIDP,
  DirectUtils.createImage never returns null (as on a Nokia), Display.setCurrent calls hideNotify/showNotify
  synchronously (1.24 always clears c.ai before hiding the canvas itself, so its hideNotify only sets ai back to true),
  the locale property is unset so f reads lang.xx (English), sounds are named from their bytes (up.ott = hoop,
  pickup.ott = pickup, pop.ott = pop). Not modelled: incoming calls / system screens (hideNotify with c.ai true).

Trace line (one per step)
-------------------------
  s       step (see above)
  x y     ball centre in world pixels (b.o, b.n)             vx vy   xSpeed, ySpeed (b.w, b.B)
  sz      ball size b.i (12 small, 16 big)                   st      ballState b.h (0 alive, 1 dead -> respawn, 2 popping)
  pc      pop counter b.l (7..1 while popping)               lv      lives c.n (game over below 0)
  sc      score c.C                                          hp      rings collected/total (c.am/e.ag)
  dir     direction bits b.z (8 up, 4 down, 2 right, 1 left) g       grounded b.v
  jo      jumpOffset b.a                                     sl      slideCntr b.m (0,1,2 cycling)
  rf      ramp flag b.u, rubber flag b.t                     bon     bonus counters speed/gravity/jump (b.d/b.c/b.A)
  rsp     respawn tile column,row and size (b.s, b.q, b.C)
  cam     e.V,e.R,e.af: ring-buffer base column, top tile row of the view (multiple of 7), pixel offset
  camL    camera left edge in world px = V*12 - af (= e.g()); the view is camL..camL+127, rows R..R+7 (96 px)
  buf     e.an,e.ao: ring-buffer write position and column bound (they decide which tiles get drawn, hence T)
  ex      exit: image offset e.r (0..24, +4 per opening step), open flag e.i, exit-drawn flag e.T, openExit flag c.P
  ad      level-text counter c.ad (120 at load)
  mo      moving-spike offsets e.h[i] (x,y; ';' between spikes), only on levels with moving spikes
  lvl     level number e.ab
  ch      cheat sequence c.X, cheat on c.M, invincible c.O; printed only when any is set
  tiles   map cells changed in this step: col/row:old>new (low 7 bits, so the water bit 0x40 is included and the
          0x80 redraw bit is ignored); "newmap" when a level was (re)loaded; "-" none
  ev      events in order, '|' separated: +k / -k key delivered (k = key code), +k(dropped), snd:hoop|pickup|pop,
          show:canvas|list[title]|form[title][text], timer:start|stop, rms:add<n>|set<n>, menu:<i>:<item>,
          cmd:<label>, notick, notifyDestroyed, POKE:<poke>; "-" none
  Lines starting with '#' are comments: the class sources, the script, the field legend, the boot summary, and why a
  run stopped ("# s=N stopped: ...", "# s=N EXCEPTION ...").

Notes for the remake
--------------------
* 30 ms vs 40 ms: that is the timer period, the real time between two game steps. Bounce 1.8's timer runs every 30 ms
  (about 33 steps a second); 1.24's g runs every 40 ms (25 steps a second; javap g.<init>: ldc2_w 40, Timer.schedule).
  The harness has no clock: a step is a step. The period only matters for how fast the game plays in real time and
  how many steps fit into a real-time wait (the splash, the time a player takes to press Continue).
* The last 16 px of every level are never on screen. The step's scroll clamps the camera to
  0..(W+1)*12-156 = 12W-144 (e.java:591-596), so the right screen edge stops at 12W-16 and the map's last 16 px
  (the last column and the last 4 px of the one before it) are never shown. The recentre clamps to 12W-156 instead
  (c.java:131), but the scroll later in the same tick (c.java:328) moves it to 12W-144 again; only the tick that loads a
  level (c.o() returns before the scroll, c.java:224-227) can end with the recentre's value.
  Check it in the trace: level 1 (W=112), warped to the exit: camL=1200 = 12*112-144.
  The level-1 exit (columns 110-111) shows only its left 8 px. This is a display matter: physics uses the whole map.
* The levels are not closed at the map edge: every level but 1 has open (non-brick) cells on its map border, outside
  the walls. Normal play cannot get out there: a flood fill from each start through everything but brick/rubber
  reaches the border only at exits (levels 1, 5, 11), at level 2's bottom-row deflators (tile 39, always blocking,
  b.java:628-635) and at the bottom of level 7's moving-spike shafts (row 35 of 36, where the camera still fits:
  R=28 shows rows 28..35). A ball put out there by a warp poke, though, can poke up to 11 px above the map (collision
  computes the top row as (y-half)/12 and Java's (-1)/12 == 0, so row 0 is tested instead of the off-map row -1; the
  bottom is safe, (y-1+half)/12+1 does reach the off-map row), after which the recentre picks camera row -7 and
  e.l() throws ArrayIndexOutOfBounds; on level 10 (35 rows, not 7k+1) a ball below row 28 makes the camera row 28,
  whose row 35 does not exist. An earlier fuzz run with unrestricted warps (unreachable tiles, and tiles picked on the
  start level's map applied after a level cheat had changed the level, which put the ball outside the map: b.c()
  then throws) produced exactly these exceptions. fuzz.sh now warps only to tiles reachable from the start, and only
  while the level the tile was picked on is running.

fuzz.sh
-------
  ./fuzz.sh [seeds-per-level] [steps] [levels...]      (defaults 20, 4000, 1..11)
  Random scripts per seed: direction keys toggling, navi keys, misc keys, soft-key pauses resumed with menu=0 a few
  steps later, warps to reachable tiles near special tiles, occasional rings=all; seed&3 = 0: lives=99 poke,
  1: invincibility cheat (7 8 7 8 9 8), 2: level cheat (7 8 7 8 9 9) plus 1/3 (change level), # (antigravity),
  5 (finish level), 3: plain; seed&4 adds bonus-counter pokes. Every seed runs twice in fresh JVMs and the two traces
  must be identical. Prints one summary line per run and the totals; exits 1 on any exception or difference.
  Last result: 220 runs (20 seeds x 11 levels x 4000 steps): 0 exceptions, 0 differences; 115 ran all 4000 steps,
  96 ended in game over, 9 won the game, about 105 level completions and 890 pause/resume cycles along the way.
