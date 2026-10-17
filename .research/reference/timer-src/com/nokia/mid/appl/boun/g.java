package com.nokia.mid.appl.boun;

import java.util.TimerTask;

/**
 * Timer-less stand-in for Bounce 1.24's game timer, obfuscated class g (the ONLY class replaced).
 *
 * The original g is a TimerTask: made with two references to the canvas (class e), it keeps them and
 * schedules itself on a new java.util.Timer every 40 ms, from 0; run() calls the canvas's e.h(),
 * which runs the game step c.j(); a() cancels the task and its timer. e.k() creates it
 * (e.java:803-808, only when e.aq == null) and e.f() calls a() and clears e.aq (e.java:810-816).
 * Nothing else touches g's fields.
 *
 * Here the constructor registers the task with oracle.rt.Rt instead of a java.util.Timer, and the
 * harness calls run() itself, once per step. a() unregisters it. Same name, same constructor
 * signature, same methods.
 */
public class g extends TimerTask {
    e b;
    private final e a;
    private boolean scheduled;

    public g(e e1, e e2) {
        this.a = e1;
        this.b = e2;
        this.scheduled = true;
        oracle.rt.Rt.registerTimer(this, 0L, 40L);
    }

    public void run() {
        this.b.h();
    }

    void a() {
        if (!this.scheduled) return;
        this.scheduled = false;
        this.cancel();
        oracle.rt.Rt.unregisterTimer(this);
    }
}
