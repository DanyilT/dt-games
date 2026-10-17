package javax.microedition.lcdui;

import java.io.IOException;
import java.io.InputStream;

/**
 * Stub image: only a size. createImage(String) reads the PNG resource through the class
 * path (like MIDP does from the JAR) and takes width/height from the IHDR chunk.
 */
public class Image {
    private final int width, height;
    private final boolean mutable;
    public final String oracleName;

    private Image(int w, int h, boolean mutable, String name) {
        this.width = w; this.height = h; this.mutable = mutable; this.oracleName = name;
    }

    /** for com.nokia.mid.ui.DirectUtils (not MIDP API) */
    public static Image oracleMutable(int w, int h) { return new Image(w, h, true, null); }

    public static Image createImage(int w, int h) {
        if (w <= 0 || h <= 0) throw new IllegalArgumentException("createImage " + w + "x" + h);
        return new Image(w, h, true, null);
    }

    public static Image createImage(String name) throws IOException {
        if (name == null) throw new NullPointerException();
        InputStream in = Image.class.getResourceAsStream(name);
        if (in == null) throw new IOException("resource not found: " + name);
        try {
            byte[] head = new byte[24];
            int n = 0;
            while (n < 24) {
                int r = in.read(head, n, 24 - n);
                if (r < 0) break;
                n += r;
            }
            if (n < 24 || (head[1] != 'P' || head[2] != 'N' || head[3] != 'G'))
                throw new IOException("not a PNG: " + name);
            int w = ((head[16] & 255) << 24) | ((head[17] & 255) << 16) | ((head[18] & 255) << 8) | (head[19] & 255);
            int h = ((head[20] & 255) << 24) | ((head[21] & 255) << 16) | ((head[22] & 255) << 8) | (head[23] & 255);
            return new Image(w, h, false, name);
        } finally {
            in.close();
        }
    }

    public static Image createImage(Image src) { return new Image(src.width, src.height, false, src.oracleName); }

    public static Image createImage(byte[] data, int off, int len) { return new Image(1, 1, false, null); }

    public Graphics getGraphics() {
        if (!mutable) throw new IllegalStateException("getGraphics() on an immutable image");
        return new Graphics(this);
    }

    public int getWidth() { return width; }
    public int getHeight() { return height; }
    public boolean isMutable() { return mutable; }
}
