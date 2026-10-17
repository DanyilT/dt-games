package com.nokia.mid.appl.boun;

import com.nokia.mid.sound.Sound;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintStream;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.TimerTask;
import javax.microedition.lcdui.Command;
import javax.microedition.lcdui.Display;
import javax.microedition.lcdui.Displayable;
import javax.microedition.lcdui.Form;
import javax.microedition.rms.RecordStore;
import oracle.rt.Rt;

/**
 * Headless, deterministic driver for the ORIGINAL Bounce 1.24 class files (Bounce, a..f original;
 * only the timer class g replaced by a timer-less one that registers with oracle.rt.Rt).
 *
 * Class map (obfuscated -> role): Bounce = MIDlet, a = BounceUI, b = Ball, c = BounceCanvas (extends e),
 * d = hoop image tables, e = TileCanvas, f = Local (lang reader), g = the 40 ms TimerTask.
 *
 * One step = at most one game tick = one call of g.run() -> e.h() -> c.j() (c.java:223-346).
 * Key events for step s are delivered (c.keyPressed / c.keyReleased) just before that tick. In 1.24
 * both key handlers and the body of the step synchronise on the ball object (c.java:264, 359, 458),
 * so on the phone key changes also land between steps (except in the short unsynchronised tail
 * of c.j(), c.java:328-345, see README).
 *
 * Boot follows the real game from a fresh app: new Bounce() (the UI and the splash canvas are built in
 * the constructor, Bounce.java:20-24, a.java:75-83), startApp(), splash ticks until the main menu
 * (c.java:229-259), then "New game" and, when the best level is > 1, the level list (a.java:222-230,
 * a.java:119-130).
 *
 * Every run is a new JVM (run.sh), so all static and instance state (e.T, c.X/M/O, f's cached
 * stream, the record store) starts exactly as on a first launch.
 */
public final class OracleHarness {

    // ---------------------------------------------------------------- script
    static final class Ev {
        final int step; final String op; final int key; final int p1, p2; final String arg;
        Ev(int step, String op, int key, int p1, int p2, String arg) {
            this.step = step; this.op = op; this.key = key; this.p1 = p1; this.p2 = p2; this.arg = arg;
        }
        Ev(int step, String op, int key, int p1, int p2) { this(step, op, key, p1, p2, null); }
    }

    static int keyCode(String k) {
        switch (k.toUpperCase()) {
            case "UP": case "2": return 50;          // KEY_NUM2 -> game action UP
            case "LEFT": case "4": return 52;        // KEY_NUM4 -> LEFT
            case "RIGHT": case "6": return 54;       // KEY_NUM6 -> RIGHT
            case "DOWN": case "8": return 56;        // KEY_NUM8: 1.24 handles 56 as a cheat key only (c.java:384-397)
            case "FIRE": case "5": return 53;        // KEY_NUM5 -> FIRE (cheat: finish level, c.java:441-444)
            case "NUP": return -1;                   // navi up
            case "NDOWN": return -2;                 // navi down -> game action DOWN (direction bit 4)
            case "NLEFT": return -3;
            case "NRIGHT": return -4;
            case "NSEL": return -5;                  // navi select -> game action FIRE
            case "SOFTL": return -6;                 // soft keys: pause menu (c.java:417-422)
            case "SOFTR": return -7;
            case "0": return 48; case "1": return 49; case "3": return 51; case "7": return 55; case "9": return 57;
            case "STAR": return 42; case "POUND": case "#": return 35;
            default:
                if (k.startsWith("K") || k.startsWith("k")) return Integer.parseInt(k.substring(1));
                throw new IllegalArgumentException("unknown key " + k);
        }
    }

    /** "12:+RIGHT"  "40:-UP"  "100:warp=30/4"  "200:rings=all"  "300:menu=0"  "301:cmd=Continue" */
    static Ev parseEv(String tok) {
        tok = tok.trim();
        int col = tok.indexOf(':');
        if (col < 0) throw new IllegalArgumentException("bad event " + tok);
        int step = Integer.parseInt(tok.substring(0, col).trim());
        String rest = tok.substring(col + 1).trim();
        if (rest.startsWith("+")) return new Ev(step, "press", keyCode(rest.substring(1)), 0, 0);
        if (rest.startsWith("-")) return new Ev(step, "release", keyCode(rest.substring(1)), 0, 0);
        if (rest.startsWith("menu=")) return new Ev(step, "menu", 0, Integer.parseInt(rest.substring(5)), 0);
        if (rest.startsWith("cmd=")) return new Ev(step, "cmd", 0, 0, 0, rest.substring(4));
        if (rest.startsWith("warp=")) { // warp=<col>/<row>[@<level>]: with @level, only applied while that level is running
            String w = rest.substring(5), lv = null;
            int at = w.indexOf('@');
            if (at >= 0) { lv = w.substring(at + 1); w = w.substring(0, at); }
            String[] p = w.split("/");
            return new Ev(step, "warp", 0, Integer.parseInt(p[0]), Integer.parseInt(p[1]), lv);
        }
        if (rest.equals("rings=all")) return new Ev(step, "rings", 0, 0, 0);
        if (rest.startsWith("lives=")) return new Ev(step, "lives", 0, Integer.parseInt(rest.substring(6)), 0);
        if (rest.startsWith("bonus=")) { // bonus=<0 speed|1 grav|2 jump>/<counter>: pokes the ball's bonus counter
            String[] p = rest.substring(6).split("/");
            return new Ev(step, "bonus", 0, Integer.parseInt(p[0]), Integer.parseInt(p[1]));
        }
        throw new IllegalArgumentException("bad event " + tok);
    }

    static List<Ev> parseScript(String text) {
        List<Ev> out = new ArrayList<>();
        for (String ln : text.split("\n")) {
            int hash = ln.indexOf('#');
            // '#' starts a comment unless it is the POUND key written as "+#"/"-#"
            while (hash > 0 && (ln.charAt(hash - 1) == '+' || ln.charAt(hash - 1) == '-')) hash = ln.indexOf('#', hash + 1);
            if (hash >= 0) ln = ln.substring(0, hash);
            for (String tok : ln.split("[,;\\s]+")) if (!tok.trim().isEmpty()) out.add(parseEv(tok));
        }
        return out;
    }

    /**
     * Held-keys mask, one value per step (bit 1 = left, 2 = right, 4 = jump), value i (0-based) = keys held
     * during step i+1. Syntax: a run of digits "0022226" (one step per digit), or tokens separated by commas or
     * white space, each "v" or "v*n" (n steps). '#' starts a comment. Changes become key events before the step:
     * releases first, then presses, each in bit order 1, 2, 4 (left = '4' 52, right = '6' 54, jump = '2' 50).
     */
    static int[] parseMask(String text) {
        List<Integer> v = new ArrayList<>();
        for (String ln : text.split("\n")) {
            int hash = ln.indexOf('#');
            if (hash >= 0) ln = ln.substring(0, hash);
            for (String tok : ln.split("[,;\\s]+")) {
                tok = tok.trim();
                if (tok.isEmpty()) continue;
                int star = tok.indexOf('*');
                if (star >= 0) {
                    int val = Integer.parseInt(tok.substring(0, star)), n = Integer.parseInt(tok.substring(star + 1));
                    for (int i = 0; i < n; i++) v.add(val);
                } else if (tok.length() > 1 && tok.matches("[0-7]+")) {
                    for (char ch : tok.toCharArray()) v.add(ch - '0');
                } else v.add(Integer.parseInt(tok));
            }
        }
        int[] r = new int[v.size()];
        for (int i = 0; i < r.length; i++) {
            r[i] = v.get(i);
            if (r[i] < 0 || r[i] > 7) throw new IllegalArgumentException("mask value " + r[i] + " at step " + (i + 1));
        }
        return r;
    }

    static final int[] MASK_BITS = { 1, 2, 4 };
    static final int[] MASK_KEYS = { 52, 54, 50 };

    static List<Ev> maskEvents(int[] mask) {
        List<Ev> evs = new ArrayList<>();
        int prev = 0;
        for (int i = 0; i < mask.length; i++) {
            int now = mask[i], step = i + 1;
            for (int k = 0; k < 3; k++)
                if ((prev & MASK_BITS[k]) != 0 && (now & MASK_BITS[k]) == 0) evs.add(new Ev(step, "release", MASK_KEYS[k], 0, 0));
            for (int k = 0; k < 3; k++)
                if ((prev & MASK_BITS[k]) == 0 && (now & MASK_BITS[k]) != 0) evs.add(new Ev(step, "press", MASK_KEYS[k], 0, 0));
            prev = now;
        }
        return evs;
    }

    // ---------------------------------------------------------------- state
    final PrintStream out;
    Bounce midlet;
    a ui;
    c canvas;
    Display display;
    int[][] lastTiles;
    short[][] lastMapRef;
    /** Steps that run behind the "Level completed" form before Continue is pressed; -1 = never press it. */
    int behind = 0;
    boolean stopOnComplete = false;
    boolean dumpRms = false;
    /** Step in which the current level-complete form appeared, or -1. */
    int formStep = -1;
    List<Ev> script = new ArrayList<>();
    static Field fPopCntr, fCheat, fCheatSeq;

    OracleHarness(PrintStream out) { this.out = out; }

    static byte[] readRes(String name, int max) throws IOException {
        InputStream in = OracleHarness.class.getResourceAsStream(name);
        if (in == null) throw new IOException("missing resource " + name + " (is the res folder on the class path?)");
        try {
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int r;
            while (bo.size() < max && (r = in.read(buf, 0, Math.min(buf.length, max - bo.size()))) > 0) bo.write(buf, 0, r);
            return bo.toByteArray();
        } finally { in.close(); }
    }

    /** lang.xx string n, read the way f.a(int) reads it (f.java:83-130), without touching f's static stream. */
    static String lang(int n) throws IOException {
        // f.b = System.getProperty("microedition.locale") is null on a JVM, so f falls back to /lang.xx
        DataInputStream in = new DataInputStream(new java.io.ByteArrayInputStream(readRes("/lang.xx", 1 << 16)));
        in.skipBytes(n * 2);
        int off = in.readShort();
        in.skipBytes(off - n * 2 - 2);
        return in.readUTF();
    }

    static Command findCommand(Displayable d, String label) {
        for (Command cm : d.oracleCommands()) if (cm.getLabel().equalsIgnoreCase(label)) return cm;
        return null;
    }

    String txtContinue, txtOk, txtNewGame;

    void boot(int level, int best) throws Exception {
        final byte[] up = readRes("/sounds/up.ott", 100), pickup = readRes("/sounds/pickup.ott", 100), pop = readRes("/sounds/pop.ott", 100);
        // c.b(String) reads at most 100 bytes of each tune (c.java:485-501)
        Sound.oracleNamer = dat -> Arrays.equals(dat, up) ? "hoop" : Arrays.equals(dat, pickup) ? "pickup" : Arrays.equals(dat, pop) ? "pop" : null;
        txtContinue = lang(4); txtOk = lang(13); txtNewGame = lang(11);

        RecordStore.oracleReset();
        if (best > 0) {
            // a phone where the player has reached level `best`: a.g() (a.java:256-325) reads record 1 as the best
            // level E when the store has exactly 3 records. Record 2 = best score (int 0). Record 3 = the save blob;
            // 255 zero bytes fail the 0xDEADBEEF check (a.java:316), so F = 0: no saved game, as after a game over.
            RecordStore rs = RecordStore.openRecordStore("bounceRMS", true);
            rs.addRecord(new byte[] { (byte) best }, 0, 1);
            rs.addRecord(new byte[4], 0, 4);
            rs.addRecord(new byte[255], 0, 255);
        }
        Rt.events.clear();

        midlet = new Bounce();          // builds a, c (splash), starts the timer (c.java:65)
        midlet.oracleStartApp();        // only DeviceControl.setLights (Bounce.java:26-28)
        display = Display.getDisplay(midlet);
        canvas = (c) display.getCurrent();
        ui = canvas.z;
        String bootEvents = String.join("|", Rt.events);
        Rt.events.clear();

        int splashTicks = 0;
        while (Rt.activeTimer != null && display.getCurrent() == canvas && splashTicks < 1000) {
            Rt.ticks++;
            Rt.activeTimer.run();
            splashTicks++;
        }
        Displayable cur = display.getCurrent();
        if (!(cur instanceof javax.microedition.lcdui.List)) throw new IllegalStateException("no main menu after splash");
        javax.microedition.lcdui.List menu = (javax.microedition.lcdui.List) cur;
        int idx = -1;
        StringBuilder items = new StringBuilder();
        for (int i = 0; i < menu.size(); i++) {
            if (menu.getString(i).equals(txtNewGame)) idx = i;
            items.append(i == 0 ? "" : "/").append(menu.getString(i));
        }
        if (idx < 0) throw new IllegalStateException("menu item '" + txtNewGame + "' not found");
        menu.setSelectedIndex(idx, true);
        menu.oracleListener().commandAction(javax.microedition.lcdui.List.SELECT_COMMAND, menu);
        String how = "menu item " + idx + " '" + txtNewGame + "' of [" + items + "]";
        cur = display.getCurrent();
        if (cur instanceof javax.microedition.lcdui.List) {
            javax.microedition.lcdui.List lst = (javax.microedition.lcdui.List) cur;
            if (level < 1 || level > lst.size()) throw new IllegalStateException("level " + level + " not in the level list (" + lst.size() + " entries; use --best)");
            lst.setSelectedIndex(level - 1, true);
            lst.oracleListener().commandAction(javax.microedition.lcdui.List.SELECT_COMMAND, lst);
            how += ", then level list item " + (level - 1) + " '" + lst.getString(level - 1) + "' of " + lst.size();
        } else if (level != 1) {
            throw new IllegalStateException("no level list (best level " + best + "); level " + level + " needs --best >= " + level);
        }
        if (display.getCurrent() != canvas || Rt.activeTimer == null) throw new IllegalStateException("game did not start");
        if (canvas.ab != level) throw new IllegalStateException("started level " + canvas.ab + " instead of " + level);
        out.println("# boot: constructor events " + bootEvents + "; splash ticks=" + splashTicks + "; " + how
                + "; level " + canvas.ab + " (" + canvas.b + "x" + canvas.t + " tiles, start " + canvas.o + "/" + canvas.W
                + " size " + canvas.u + ", exit " + canvas.al + "/" + canvas.aj + ", rings " + canvas.ag + ", moving spikes " + canvas.g
                + "); timer period " + Rt.timerPeriod + " ms; T=" + (canvas.T ? 1 : 0) + "; events " + String.join("|", Rt.events));
        Rt.events.clear();
    }

    // ---------------------------------------------------------------- trace
    int[][] snapshot() {
        short[][] m = canvas.s;
        if (m == null) return null;
        int[][] r = new int[m.length][];
        for (int y = 0; y < m.length; y++) {
            r[y] = new int[m[y].length];
            for (int x = 0; x < m[y].length; x++) r[y][x] = m[y][x] & 0x7F; // ignore the 0x80 "redraw" bit
        }
        return r;
    }

    String tileChanges() {
        int[][] now = snapshot();
        String res;
        if (now == null) res = "nomap";
        else if (lastTiles == null || lastMapRef != canvas.s) res = "newmap";
        else {
            StringBuilder sb = new StringBuilder();
            for (int y = 0; y < now.length; y++)
                for (int x = 0; x < now[y].length; x++)
                    if (now[y][x] != lastTiles[y][x]) {
                        if (sb.length() > 0) sb.append(';');
                        sb.append(x).append('/').append(y).append(':').append(lastTiles[y][x]).append('>').append(now[y][x]);
                    }
            res = sb.length() == 0 ? "-" : sb.toString();
        }
        lastTiles = now;
        lastMapRef = canvas.s;
        return res;
    }

    static int getInt(Field fl, Object o) { try { return fl.getInt(o); } catch (IllegalAccessException ex) { throw new RuntimeException(ex); } }
    static boolean getBool(Field fl, Object o) { try { return fl.getBoolean(o); } catch (IllegalAccessException ex) { throw new RuntimeException(ex); } }

    void header() {
        out.println("# s=step (ticks since the level started; keys for step s are delivered before its tick);"
                + " x,y=ball centre in WORLD px (b.o,b.n); vx,vy=xSpeed,ySpeed (b.w,b.B); sz=ballSize (b.i: 12 small, 16 big);"
                + " st=ballState (b.h: 0 alive, 1 dead->respawn, 2 popping); pc=popCntr (b.l, 7..0); lv=lives (c.n); sc=score (c.C);"
                + " hp=rings/total (c.am/e.ag); dir=direction bits (b.z: 8 up, 4 down, 2 right, 1 left); g=grounded (b.v);"
                + " jo=jumpOffset (b.a); sl=slideCntr (b.m); rf=ramp,rubber flags (b.u,b.t); bon=speed/grav/jump bonus counters (b.d/b.c/b.A);"
                + " rsp=respawn col,row,size (b.s,b.q,b.C); cam=V,R,af (e.V ring-buffer base column, e.R top tile row, e.af pixel offset);"
                + " camL=camera left world px (V*12-af = e.g()); buf=an,ao (ring-buffer write position, column bound);"
                + " ex=r,open,T,P (exit image offset e.r, open flag e.i, exit-drawn flag e.T, openExit flag c.P); ad=level-text counter (c.ad);"
                + " mo=moving-spike offsets (e.h[i]); lvl=level (e.ab); ch=cheat seq,cheat,invincible (c.X,c.M,c.O; only when set);"
                + " tiles=col/row:old>new (low 7 bits, water bit 0x40 included); ev=events (+k/-k keys delivered, k(dropped) keys not"
                + " delivered, snd:hoop|pickup|pop, show:<screen>, timer:start|stop, rms:set<n>, notick = no tick this step, POKE:* = non-game test pokes)");
    }

    void line(int s) {
        b ball = canvas.c;
        StringBuilder sb = new StringBuilder();
        sb.append("s=").append(s);
        if (ball == null) {
            sb.append(" ball=null");
        } else {
            sb.append(" x=").append(ball.o).append(" y=").append(ball.n)
              .append(" vx=").append(ball.w).append(" vy=").append(ball.B)
              .append(" sz=").append(ball.i)
              .append(" st=").append(ball.h).append(" pc=").append(getInt(fPopCntr, ball));
        }
        sb.append(" lv=").append(canvas.n).append(" sc=").append(canvas.C)
          .append(" hp=").append(canvas.am).append('/').append(canvas.ag);
        if (ball != null) {
            sb.append(" dir=").append(ball.z)
              .append(" g=").append(ball.v ? 1 : 0).append(" jo=").append(ball.a)
              .append(" sl=").append(ball.m)
              .append(" rf=").append(ball.u ? 1 : 0).append(ball.t ? 1 : 0)
              .append(" bon=").append(ball.d).append('/').append(ball.c).append('/').append(ball.A)
              .append(" rsp=").append(ball.s).append(',').append(ball.q).append(',').append(ball.C);
        }
        sb.append(" cam=").append(canvas.V).append(',').append(canvas.R).append(',').append(canvas.af)
          .append(" camL=").append(canvas.V * 12 - canvas.af)
          .append(" buf=").append(canvas.an).append(',').append(canvas.ao);
        sb.append(" ex=").append(canvas.r).append(',').append(canvas.i ? 1 : 0).append(',').append(canvas.T ? 1 : 0)
          .append(',').append(canvas.P ? 1 : 0);
        sb.append(" ad=").append(canvas.ad);
        if (canvas.g != 0 && canvas.h != null) {
            sb.append(" mo=");
            for (int k = 0; k < canvas.g; k++) {
                if (k > 0) sb.append(';');
                sb.append(canvas.h[k][0]).append(',').append(canvas.h[k][1]);
            }
        }
        sb.append(" lvl=").append(canvas.ab);
        int cheatSeq = getInt(fCheatSeq, canvas);
        boolean cheat = getBool(fCheat, canvas);
        if (cheatSeq != 0 || cheat || canvas.O)
            sb.append(" ch=").append(cheatSeq).append(',').append(cheat ? 1 : 0).append(',').append(canvas.O ? 1 : 0);
        sb.append(" tiles=").append(tileChanges());
        sb.append(" ev=").append(Rt.events.isEmpty() ? "-" : String.join("|", Rt.events));
        Rt.events.clear();
        out.println(sb);
    }

    // ---------------------------------------------------------------- run
    boolean hasUiEventAfter(int s) {
        for (Ev e : script) if (e.step > s && (e.op.equals("menu") || e.op.equals("cmd"))) return true;
        return false;
    }

    boolean isLevelCompleteForm(Displayable d) { return d instanceof Form && findCommand(d, txtContinue) != null; }

    void apply(Ev e) {
        boolean onCanvas = display.getCurrent() == canvas;
        b ball = canvas.c;
        switch (e.op) {
            // keys reach the canvas only while it is on screen (as on the phone); others are logged as dropped
            case "press":
                if (onCanvas) { Rt.event("+" + e.key); canvas.keyPressed(e.key); }
                else Rt.event("+" + e.key + "(dropped)");
                break;
            case "release":
                if (onCanvas) { Rt.event("-" + e.key); canvas.keyReleased(e.key); }
                else Rt.event("-" + e.key + "(dropped)");
                break;
            case "menu": {
                Displayable cur = display.getCurrent();
                if (cur instanceof javax.microedition.lcdui.List && e.p1 >= 0 && e.p1 < ((javax.microedition.lcdui.List) cur).size()) {
                    javax.microedition.lcdui.List lst = (javax.microedition.lcdui.List) cur;
                    lst.setSelectedIndex(e.p1, true);
                    Rt.event("menu:" + e.p1 + ":" + lst.getString(e.p1).replaceAll("\\s+", "_"));
                    lst.oracleListener().commandAction(javax.microedition.lcdui.List.SELECT_COMMAND, lst);
                } else Rt.event("menu=" + e.p1 + "(no-such-item)");
                break;
            }
            case "cmd": {
                Displayable cur = display.getCurrent();
                Command cm = cur == null ? null : findCommand(cur, e.arg);
                if (cm != null && cur.oracleListener() != null) {
                    Rt.event("cmd:" + cm.getLabel().replaceAll("\\s+", "_"));
                    if (isLevelCompleteForm(cur)) formStep = -1;
                    cur.oracleListener().commandAction(cm, cur);
                } else Rt.event("cmd=" + e.arg + "(no-such-command)");
                break;
            }
            // ---- non-game test pokes
            case "warp":
                if (e.arg != null && canvas.ab != Integer.parseInt(e.arg)) { // fuzz warp picked on another level's map
                    Rt.event("POKE:warp=" + e.p1 + "/" + e.p2 + "(skipped:level" + canvas.ab + ")");
                    break;
                }
                if (ball != null) {
                    ball.o = e.p1 * 12 + 6;
                    ball.n = e.p2 * 12 + 6;
                    canvas.a(); // recentre the camera and redraw the tile buffer (c.java:127-145)
                }
                Rt.event("POKE:warp=" + e.p1 + "/" + e.p2);
                break;
            case "rings": canvas.am = canvas.ag; canvas.G = true; Rt.event("POKE:rings=all"); break;
            case "lives": canvas.n = e.p1; canvas.G = true; Rt.event("POKE:lives=" + e.p1); break;
            case "bonus":
                if (ball != null) {
                    if (e.p1 == 0) ball.d = e.p2;
                    else if (e.p1 == 1) ball.c = e.p2;
                    else ball.A = e.p2;
                }
                Rt.event("POKE:bonus=" + e.p1 + "/" + e.p2);
                break;
            default: throw new IllegalStateException(e.op);
        }
    }

    /** @return false when the run cannot go on (game over, won, menu with nothing scripted, --stop-on-complete) */
    boolean step(int s, List<Ev> evsHere) {
        // 1. the level-complete form: press its Continue command once `behind` steps have run behind it
        Displayable cur = display.getCurrent();
        if (formStep >= 0 && behind >= 0 && s > formStep + behind && isLevelCompleteForm(cur)) {
            Command cont = findCommand(cur, txtContinue);
            Rt.event("cmd:" + cont.getLabel().replaceAll("\\s+", "_"));
            formStep = -1;
            cur.oracleListener().commandAction(cont, cur); // a.java:250-252: a = 1; setCurrent(canvas)
        }
        // 2. scripted key / UI / poke events for this step, in script order
        for (Ev e : evsHere) apply(e);
        // 3. one timer tick, whatever is on screen (the 1.24 timer keeps running behind the level-complete form)
        TimerTask t = Rt.activeTimer;
        if (t != null) {
            Rt.ticks++;
            t.run();
        } else Rt.event("notick");
        cur = display.getCurrent();
        if (formStep < 0 && isLevelCompleteForm(cur) && t != null) formStep = s;
        line(s);
        // 4. stop conditions
        if (formStep == s && stopOnComplete) { out.println("# s=" + s + " stopped: level complete (--stop-on-complete)"); return false; }
        // the game-over / "Congrats!" form (a.java:161-182: an OK command, timer stopped) ends the game: stop at once.
        // Any other screen with the timer stopped (the pause menu after a soft key, High score, Instructions) idles
        // only while a scripted menu=/cmd= event is still ahead.
        boolean endForm = cur instanceof Form && findCommand(cur, txtOk) != null;
        if (Rt.activeTimer == null && cur != canvas && (endForm || !hasUiEventAfter(s))) {
            String what = cur instanceof Form ? "form '" + ((Form) cur).getTitle() + "|" + ((Form) cur).oracleText().replace('\n', ' ') + "'" : Display.describe(cur);
            out.println("# s=" + s + " stopped: timer stopped, showing " + what);
            return false;
        }
        return true;
    }

    void run(int level, int best, int steps, List<Ev> evs) throws Exception {
        script = evs;
        @SuppressWarnings("unchecked") List<Ev>[] byStep = new List[steps + 2];
        for (Ev e : evs) if (e.step >= 0 && e.step <= steps) {
            if (byStep[e.step] == null) byStep[e.step] = new ArrayList<>();
            byStep[e.step].add(e);
        }
        header();
        boot(level, best);
        if (byStep[0] != null) for (Ev e : byStep[0]) apply(e); // step-0 events: after boot, before the first tick
        line(0);
        for (int s = 1; s <= steps; s++) {
            try {
                if (!step(s, byStep[s] == null ? new ArrayList<>() : byStep[s])) break;
            } catch (RuntimeException ex) {
                // the game itself threw (on a phone this kills the MIDlet's timer thread)
                StringBuilder sb = new StringBuilder("# s=" + s + " EXCEPTION " + ex);
                for (StackTraceElement el : ex.getStackTrace()) {
                    if (el.getClassName().endsWith("OracleHarness")) break;
                    sb.append(" at ").append(el.getClassName().replace("com.nokia.mid.appl.boun.", "")).append('.').append(el.getMethodName());
                }
                out.println(sb);
                break;
            }
        }
        if (dumpRms) {
            // the in-memory record store at the end of the run (record 3's first 8 bytes = the faked save time)
            try {
                RecordStore rs = RecordStore.openRecordStore("bounceRMS", false);
                for (int id = 1; id <= rs.getNextRecordID() - 1; id++) {
                    byte[] r = rs.oracleRaw(id);
                    StringBuilder hx = new StringBuilder();
                    if (r != null) for (byte x : r) hx.append(String.format("%02x", x & 255));
                    out.println("# rms bounceRMS record " + id + " (" + (r == null ? "deleted" : r.length + " bytes") + "): " + hx);
                }
            } catch (Exception ex) { out.println("# rms: " + ex); }
        }
    }

    static String formatScript(List<Ev> evs) {
        StringBuilder sb = new StringBuilder();
        for (Ev e : evs) {
            if (sb.length() > 0) sb.append(',');
            sb.append(e.step).append(':');
            switch (e.op) {
                case "press": sb.append("+K").append(e.key); break;
                case "release": sb.append("-K").append(e.key); break;
                case "menu": sb.append("menu=").append(e.p1); break;
                case "cmd": sb.append("cmd=").append(e.arg); break;
                case "warp": sb.append("warp=").append(e.p1).append('/').append(e.p2).append(e.arg != null ? "@" + e.arg : ""); break;
                case "rings": sb.append("rings=all"); break;
                case "lives": sb.append("lives=").append(e.p1); break;
                case "bonus": sb.append("bonus=").append(e.p1).append('/').append(e.p2); break;
            }
        }
        return sb.toString();
    }

    // ---------------------------------------------------------------- fuzz script
    /** The level's tile map, read straight from the level file (e.java:107-125), so no probe boot is needed. */
    static int[][] levelMap(int level) throws IOException {
        byte[] f = readRes("/levels/J2MElvl." + (level < 10 ? "00" : "0") + level, 1 << 20);
        int w = f[6] & 255, h = f[7] & 255;
        int[][] m = new int[h][w];
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) m[y][x] = f[8 + y * w + x] & 255;
        return m;
    }

    /**
     * Tiles 4-connected to the start tile through anything but brick (1) and rubber (2): an over-approximation of
     * where the ball can go in real play. Fuzz warps only target these, because the levels are not closed at the
     * map edge (open space lies outside the walls) and a ball warped there can leave the map's top or bottom and
     * crash the camera code (e.l(), b.c()) in a way normal play cannot.
     */
    static boolean[][] reachable(int level, int[][] m) throws IOException {
        byte[] f = readRes("/levels/J2MElvl." + (level < 10 ? "00" : "0") + level, 16);
        int h = m.length, w = m[0].length;
        boolean[][] seen = new boolean[h][w];
        java.util.ArrayDeque<int[]> q = new java.util.ArrayDeque<>();
        seen[f[1] & 255][f[0] & 255] = true;
        q.add(new int[] { f[0] & 255, f[1] & 255 });
        int[][] dirs = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } };
        while (!q.isEmpty()) {
            int[] p = q.poll();
            for (int[] dd : dirs) {
                int x = p[0] + dd[0], y = p[1] + dd[1];
                if (x < 0 || y < 0 || x >= w || y >= h || seen[y][x]) continue;
                int t = m[y][x] & 0x3F;
                if (t == 1 || t == 2) continue;
                seen[y][x] = true;
                q.add(new int[] { x, y });
            }
        }
        return seen;
    }

    static List<Ev> fuzzScript(long seed, int steps, int level, int[][] map, boolean[][] reach) {
        Random r = new Random(seed);
        List<Ev> evs = new ArrayList<>();
        int[] keys = { 50, 52, 54, -1, -3, -4, -2 };
        boolean[] down = new boolean[keys.length];
        int[] misc = { 53, -5, 48, 42, 35, 56 };
        // variant by seed: 0 = 99 lives (poke), 1 = invincible cheat (7 8 7 8 9 8), 2 = cheat (7 8 7 8 9 9) + level keys
        // 1/3, '#' antigravity and FIRE finish, 3 = plain (3 lives; game over ends the run)
        int variant = (int) (seed & 3);
        if (variant == 0) evs.add(new Ev(1, "lives", 0, 99, 0));
        if (variant == 1 || variant == 2) {
            int[] seq = { 55, 56, 55, 56, 57, variant == 1 ? 56 : 57 };
            for (int i = 0; i < seq.length; i++) {
                evs.add(new Ev(1 + 2 * i, "press", seq[i], 0, 0));
                evs.add(new Ev(2 + 2 * i, "release", seq[i], 0, 0));
            }
        }
        for (int s = 1; s <= steps; s++) {
            if (variant == 2 && s > 20 && r.nextDouble() < 0.0015) {
                int[] ck = { 49, 51, 35, 53 };
                evs.add(new Ev(s, "press", ck[r.nextInt(ck.length)], 0, 0));
            }
            for (int k = 0; k < keys.length; k++) {
                double p = (k < 3) ? 0.06 : 0.01;
                if (r.nextDouble() < p) {
                    down[k] = !down[k];
                    evs.add(new Ev(s, down[k] ? "press" : "release", keys[k], 0, 0));
                }
            }
            if (r.nextDouble() < 0.004) evs.add(new Ev(s, "press", misc[r.nextInt(misc.length)], 0, 0));
            if (r.nextDouble() < 0.0015) {
                // pause with a soft key, resume from the menu's first item ("Continue") a few steps later
                evs.add(new Ev(s, "press", r.nextBoolean() ? -6 : -7, 0, 0));
                evs.add(new Ev(s + 1 + r.nextInt(5), "menu", 0, 0, 0));
            }
            if (r.nextDouble() < 0.004) {
                // warp next to a random non-empty, non-brick tile (hoops, ramps, bonuses, water, spikes, exit...)
                for (int tries = 0; tries < 200; tries++) {
                    int row = r.nextInt(map.length), col = r.nextInt(map[0].length);
                    int t = map[row][col] & 0x3F;
                    boolean nearSpecial = tries > 150 || (t != 0 && t != 1);
                    if (!nearSpecial) continue;
                    int dc = r.nextInt(5) - 2, dr = r.nextInt(5) - 2;
                    int c2 = col + dc, r2 = row + dr;
                    if (r2 < 1 || c2 < 1 || r2 >= map.length - 1 || c2 >= map[0].length - 1) continue;
                    if ((map[r2][c2] & 0x3F) != 0 || !reach[r2][c2]) continue;
                    evs.add(new Ev(s, "warp", 0, c2, r2, String.valueOf(level)));
                    break;
                }
            }
            if (r.nextDouble() < 0.001) evs.add(new Ev(s, "rings", 0, 0, 0));
            if ((seed & 4) != 0 && r.nextDouble() < 0.003) evs.add(new Ev(s, "bonus", 0, r.nextInt(3), 1 + r.nextInt(300)));
        }
        return evs;
    }

    // ---------------------------------------------------------------- main
    static String readFile(String path) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new FileReader(path))) {
            String l;
            while ((l = br.readLine()) != null) sb.append(l).append('\n');
        }
        return sb.toString();
    }

    static String where(Class<?> k) {
        String src = String.valueOf(k.getProtectionDomain().getCodeSource().getLocation());
        return src.replaceAll(".*/work/oracle-1\\.24/", "");
    }

    public static void main(String[] args) throws Exception {
        int level = 1, steps = -1, best = -1, behindSteps = 0;
        boolean h0DumpRms = false;
        String keys = null, scriptFile = null, mask = null, maskFile = null, dumpScript = null;
        Long fuzz = null;
        boolean stopOnComplete = false;
        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--level": level = Integer.parseInt(args[++i]); break;
                case "--best": best = Integer.parseInt(args[++i]); break;
                case "--steps": steps = Integer.parseInt(args[++i]); break;
                case "--keys": keys = args[++i]; break;
                case "--script": scriptFile = args[++i]; break;
                case "--mask": mask = args[++i]; break;
                case "--mask-file": maskFile = args[++i]; break;
                case "--fuzz": fuzz = Long.parseLong(args[++i]); break;
                case "--behind": behindSteps = Integer.parseInt(args[++i]); break;
                case "--no-continue": behindSteps = -1; break;
                case "--stop-on-complete": stopOnComplete = true; break;
                case "--dump-script": dumpScript = args[++i]; break;
                case "--dump-rms": h0DumpRms = true; break;
                case "-h": case "--help":
                    System.out.println("usage: OracleHarness [--level N] [--best B] [--steps N] [--keys \"1:+RIGHT,61:+UP,...\"] [--script file]\n"
                            + "                     [--mask \"0 2*60 6 ...\" | --mask-file file] [--fuzz seed [--dump-script file]]\n"
                            + "                     [--behind N | --no-continue] [--stop-on-complete] [--dump-rms]\n"
                            + "keys: UP/2 LEFT/4 RIGHT/6 DOWN/8 FIRE/5 NUP NDOWN NLEFT NRIGHT NSEL SOFTL SOFTR 0 1 3 7 9 STAR POUND K<code>\n"
                            + "UI:   <step>:menu=<item index> (select on the current list), <step>:cmd=<label> (a command of the current screen)\n"
                            + "non-game pokes: <step>:warp=<col>/<row>, <step>:rings=all, <step>:lives=<n>, <step>:bonus=<0 speed|1 grav|2 jump>/<n>\n"
                            + "mask: one value per step, bit 1 left, 2 right, 4 jump; '0226' or '0,2*60,6'; --keys may be combined with it\n"
                            + "--best B: preset the record store's best level (default: 0 for level 1 = fresh phone, else the level)\n"
                            + "--behind N: steps that run behind the 'Level completed' form before Continue (default 0)");
                    return;
                default: throw new IllegalArgumentException("unknown arg " + args[i]);
            }
        }
        if (best < 0) best = level > 1 ? level : 0;
        fPopCntr = b.class.getDeclaredField("l"); fPopCntr.setAccessible(true);
        fCheat = c.class.getDeclaredField("M"); fCheat.setAccessible(true);
        fCheatSeq = c.class.getDeclaredField("X"); fCheatSeq.setAccessible(true);

        PrintStream out = new PrintStream(new java.io.BufferedOutputStream(System.out, 1 << 16), false);
        OracleHarness h = new OracleHarness(out);
        h.behind = behindSteps;
        h.stopOnComplete = stopOnComplete;
        h.dumpRms = h0DumpRms;
        out.println("# Bounce 1.24 oracle; game classes c,b,e,a from " + where(c.class) + ", timer g from " + where(g.class)
                + "; level " + level + ", best level preset " + best + ", behind-form steps " + (behindSteps < 0 ? "never continue" : String.valueOf(behindSteps)));
        List<Ev> evs = new ArrayList<>();
        if (fuzz != null) {
            if (steps < 0) steps = 4000;
            int[][] map = levelMap(level);
            evs = fuzzScript(fuzz, steps, level, map, reachable(level, map));
            out.println("# fuzz seed " + fuzz + " (" + evs.size() + " events)");
            if (dumpScript != null) try (PrintStream ps = new PrintStream(dumpScript)) { ps.println(formatScript(evs)); }
        } else {
            String text = keys;
            if (scriptFile != null) text = readFile(scriptFile);
            if (text == null && mask == null && maskFile == null) text = "1:+RIGHT,61:+UP";
            if (text != null) {
                evs.addAll(parseScript(text));
                out.println("# script: " + text.replace('\n', ' '));
            }
            if (mask != null || maskFile != null) {
                int[] m = parseMask(mask != null ? mask : readFile(maskFile));
                evs.addAll(maskEvents(m));
                // stable: key events of the same step keep script order (script first, then mask)
                evs.sort((x, y) -> Integer.compare(x.step, y.step));
                if (steps < 0) steps = m.length;
                out.println("# mask: " + m.length + " steps");
            }
        }
        if (steps < 0) steps = 100;
        h.run(level, best, steps, evs);
        out.flush();
    }
}
