package com.nokia.mid.ui;

import javax.microedition.lcdui.Image;

public interface DirectGraphics {
    int FLIP_HORIZONTAL = 8192, FLIP_VERTICAL = 16384, ROTATE_90 = 90, ROTATE_180 = 180, ROTATE_270 = 270;
    int TYPE_BYTE_1_GRAY = 1, TYPE_USHORT_4444_ARGB = 4444, TYPE_INT_8888_ARGB = 888;
    void drawImage(Image img, int x, int y, int anchor, int manipulation);
    void setARGBColor(int argb);
    void fillPolygon(int[] xs, int xo, int[] ys, int yo, int n, int argb);
    void fillTriangle(int x1, int y1, int x2, int y2, int x3, int y3, int argb);
    int getAlphaComponent();
    int getNativePixelFormat();
}
