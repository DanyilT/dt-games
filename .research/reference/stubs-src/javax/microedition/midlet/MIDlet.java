package javax.microedition.midlet;

public abstract class MIDlet {
    public boolean oracleDestroyed = false;
    protected MIDlet() {}
    protected abstract void startApp() throws MIDletStateChangeException;
    protected abstract void pauseApp();
    protected abstract void destroyApp(boolean unconditional) throws MIDletStateChangeException;
    public final void notifyDestroyed() { oracleDestroyed = true; oracle.rt.Rt.event("notifyDestroyed"); }
    public final void notifyPaused() {}
    public final void resumeRequest() {}
    public final String getAppProperty(String key) { return null; }
    // harness helper (not MIDP API)
    public void oracleStartApp() throws MIDletStateChangeException { startApp(); }
}
