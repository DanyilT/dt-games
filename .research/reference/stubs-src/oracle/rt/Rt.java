package oracle.rt;

import java.util.ArrayList;
import java.util.List;
import java.util.TimerTask;

/**
 * Shared state between the API stubs and the harness (not part of any real API).
 * - the game timer task that is "scheduled" (the harness fires it by hand, one call = one tick)
 * - events the stubs observe (sounds played, displays shown, timer start/stop) so the harness can print them
 * - a fake, deterministic wall clock (Bounce 1.24 stores System.currentTimeMillis() in its save record)
 */
public final class Rt {
    private Rt() {}

    /** The TimerTask the game registered with its (replaced) timer class g, or null when stopped. */
    public static TimerTask activeTimer = null;
    /** Period the game asked for (ms), for information only. */
    public static long timerPeriod = -1;
    public static int timerStarts = 0;
    public static int timerStops = 0;
    /** Ticks fired so far in this JVM (splash included); drives the fake clock. */
    public static long ticks = 0;

    public static final List<String> events = new ArrayList<>();
    public static int repaints = 0;

    public static void event(String s) { events.add(s); }

    public static void registerTimer(TimerTask t, long delay, long period) {
        activeTimer = t;
        timerPeriod = period;
        timerStarts++;
        event("timer:start");
    }

    public static void unregisterTimer(TimerTask t) {
        if (activeTimer == t) activeTimer = null;
        timerStops++;
        event("timer:stop");
    }

    /** Fake wall clock: 2004-08-16 00:00:00 UTC (the JAR's file date) + 40 ms per tick fired. */
    public static long fakeMillis() { return 1092614400000L + 40L * ticks; }
}
