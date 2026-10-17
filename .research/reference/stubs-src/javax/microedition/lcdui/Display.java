package javax.microedition.lcdui;

import java.util.IdentityHashMap;
import javax.microedition.midlet.MIDlet;

/**
 * Stub: setCurrent switches immediately and calls hideNotify()/showNotify() on a Canvas
 * synchronously (a real phone does this later, from its event thread). Bounce 1.24 always
 * clears its "ai" flag before it hides the canvas itself, so its hideNotify() then only sets
 * ai back to true, whenever it runs.
 */
public class Display {
    private static final IdentityHashMap<MIDlet, Display> displays = new IdentityHashMap<>();
    private Displayable current;

    private Display() {}

    public static Display getDisplay(MIDlet m) {
        Display d = displays.get(m);
        if (d == null) { d = new Display(); displays.put(m, d); }
        return d;
    }

    public Displayable getCurrent() { return current; }

    public void setCurrent(Displayable next) {
        Displayable old = current;
        if (old == next) return;
        current = next;
        oracle.rt.Rt.event("show:" + describe(next));
        if (old instanceof Canvas) ((Canvas) old).hideNotify();
        if (next instanceof Canvas) ((Canvas) next).showNotify();
    }

    public boolean isColor() { return true; }
    public int numColors() { return 4096; }

    /** Short description for the trace, free of ' ' and '|': canvas, list[title], form[title][text]. */
    public static String describe(Displayable d) {
        if (d == null) return "null";
        if (d instanceof Canvas) return "canvas";
        if (d instanceof List) return "list[" + clean(((List) d).getTitle()) + "]";
        if (d instanceof Form) return "form[" + clean(((Form) d).getTitle()) + "][" + clean(((Form) d).oracleText()) + "]";
        return d.getClass().getSimpleName();
    }

    static String clean(String s) {
        if (s == null) return "";
        return s.trim().replaceAll("\\s+", "_").replace('|', '/');
    }
}
