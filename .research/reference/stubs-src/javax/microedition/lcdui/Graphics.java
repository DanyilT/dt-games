package javax.microedition.lcdui;

/** Stub: drawing does nothing (the game's logic never reads pixels back). */
public class Graphics {
    public static final int HCENTER = 1, VCENTER = 2, LEFT = 4, RIGHT = 8, TOP = 16, BOTTOM = 32, BASELINE = 64;
    public static final int SOLID = 0, DOTTED = 1;
    final Image target;
    private int color;
    private Font font;
    Graphics(Image target) { this.target = target; }
    public void setColor(int rgb) { color = rgb & 0xFFFFFF; }
    public void setColor(int r, int g, int b) { color = (r << 16) | (g << 8) | b; }
    public int getColor() { return color; }
    public void setFont(Font f) { font = f; }
    public Font getFont() { return font; }
    public void fillRect(int x, int y, int w, int h) {}
    public void drawRect(int x, int y, int w, int h) {}
    public void drawLine(int x1, int y1, int x2, int y2) {}
    public void drawImage(Image img, int x, int y, int anchor) {
        if (img == null) throw new NullPointerException("drawImage(null)"); // as MIDP
    }
    public void drawString(String s, int x, int y, int anchor) {
        if (s == null) throw new NullPointerException("drawString(null)"); // as MIDP
    }
    public void setClip(int x, int y, int w, int h) {}
    public void clipRect(int x, int y, int w, int h) {}
    public void translate(int x, int y) {}
}
