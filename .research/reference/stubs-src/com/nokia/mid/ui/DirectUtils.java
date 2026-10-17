package com.nokia.mid.ui;

import javax.microedition.lcdui.Graphics;
import javax.microedition.lcdui.Image;

/** Stub: images are size-only, drawing does nothing. createImage never returns null (as on a Nokia). */
public class DirectUtils {
    private DirectUtils() {}

    public static Image createImage(int w, int h, int argb) { return Image.oracleMutable(w, h); }

    public static Image createImage(byte[] data, int off, int len) { return Image.createImage(data, off, len); }

    public static DirectGraphics getDirectGraphics(final Graphics g) {
        if (g == null) throw new NullPointerException();
        return new DirectGraphics() {
            public void drawImage(Image img, int x, int y, int anchor, int manipulation) {
                if (img == null) throw new NullPointerException("drawImage(null)");
            }
            public void setARGBColor(int argb) {}
            public void fillPolygon(int[] xs, int xo, int[] ys, int yo, int n, int argb) {}
            public void fillTriangle(int x1, int y1, int x2, int y2, int x3, int y3, int argb) {}
            public int getAlphaComponent() { return 255; }
            public int getNativePixelFormat() { return 4444; }
        };
    }
}
