package javax.microedition.lcdui;

/** Stub Canvas with a Nokia Series 40 key-to-game-action map, 128x128 screen. */
public abstract class Canvas extends Displayable {
    public static final int UP = 1, DOWN = 6, LEFT = 2, RIGHT = 5, FIRE = 8;
    public static final int GAME_A = 9, GAME_B = 10, GAME_C = 11, GAME_D = 12;
    public static final int KEY_NUM0 = 48, KEY_NUM1 = 49, KEY_NUM2 = 50, KEY_NUM3 = 51, KEY_NUM4 = 52,
            KEY_NUM5 = 53, KEY_NUM6 = 54, KEY_NUM7 = 55, KEY_NUM8 = 56, KEY_NUM9 = 57,
            KEY_STAR = 42, KEY_POUND = 35;

    public static int oracleWidth = 128, oracleHeight = 128;

    protected Canvas() {}

    public int getWidth() { return oracleWidth; }
    public int getHeight() { return oracleHeight; }
    public boolean isDoubleBuffered() { return true; }
    public boolean hasPointerEvents() { return false; }
    public boolean hasPointerMotionEvents() { return false; }
    public boolean hasRepeatEvents() { return true; }

    /** Series 40: 2/4/6/8/5 and the navi keys (-1 up, -2 down, -3 left, -4 right, -5 select). */
    public int getGameAction(int keyCode) {
        switch (keyCode) {
            case KEY_NUM2: case -1: return UP;
            case KEY_NUM8: case -2: return DOWN;
            case KEY_NUM4: case -3: return LEFT;
            case KEY_NUM6: case -4: return RIGHT;
            case KEY_NUM5: case -5: return FIRE;
            case KEY_NUM1: return GAME_A;
            case KEY_NUM3: return GAME_B;
            case KEY_NUM7: return GAME_C;
            case KEY_NUM9: return GAME_D;
            default: return 0;
        }
    }

    public int getKeyCode(int gameAction) {
        switch (gameAction) {
            case UP: return KEY_NUM2;
            case DOWN: return KEY_NUM8;
            case LEFT: return KEY_NUM4;
            case RIGHT: return KEY_NUM6;
            case FIRE: return KEY_NUM5;
            case GAME_A: return KEY_NUM1;
            case GAME_B: return KEY_NUM3;
            case GAME_C: return KEY_NUM7;
            case GAME_D: return KEY_NUM9;
            default: throw new IllegalArgumentException();
        }
    }

    public String getKeyName(int keyCode) { return "K" + keyCode; }

    protected void keyPressed(int keyCode) {}
    protected void keyReleased(int keyCode) {}
    protected void keyRepeated(int keyCode) {}
    protected void pointerPressed(int x, int y) {}
    protected void pointerReleased(int x, int y) {}
    protected void pointerDragged(int x, int y) {}
    protected void showNotify() {}
    protected void hideNotify() {}
    protected abstract void paint(Graphics g);

    /** Stub: counts the request; nothing is painted (paint() only draws). */
    public final void repaint() { oracle.rt.Rt.repaints++; }
    public final void repaint(int x, int y, int w, int h) { oracle.rt.Rt.repaints++; }
    public final void serviceRepaints() {}

    // harness helpers (not MIDP API): deliver key events as the phone's event thread would
    public void oracleKeyPressed(int k) { keyPressed(k); }
    public void oracleKeyReleased(int k) { keyReleased(k); }
}
