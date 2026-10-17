package javax.microedition.lcdui;

public class Font {
    public static final int FACE_SYSTEM = 0, FACE_MONOSPACE = 32, FACE_PROPORTIONAL = 64;
    public static final int STYLE_PLAIN = 0, STYLE_BOLD = 1, STYLE_ITALIC = 2, STYLE_UNDERLINED = 4;
    public static final int SIZE_SMALL = 8, SIZE_MEDIUM = 0, SIZE_LARGE = 16;
    private final int face, style, size;
    private Font(int face, int style, int size) { this.face = face; this.style = style; this.size = size; }
    public static Font getFont(int face, int style, int size) { return new Font(face, style, size); }
    public static Font getDefaultFont() { return new Font(0, 0, 0); }
    public int getHeight() { return 10; }
    public int stringWidth(String s) { return s == null ? 0 : 5 * s.length(); }
}
