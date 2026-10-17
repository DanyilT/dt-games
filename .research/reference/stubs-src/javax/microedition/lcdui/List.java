package javax.microedition.lcdui;

import java.util.ArrayList;

public class List extends Screen implements Choice {
    public static final Command SELECT_COMMAND = new Command("", Command.SCREEN, 0);
    private final ArrayList<String> items = new ArrayList<>();
    private int selected = 0;
    private final int listType;

    public List(String title, int listType) { super(title); this.listType = listType; }
    /** MIDP 1.0: List(title, type, stringElements, imageElements); imageElements may be null. */
    public List(String title, int listType, String[] stringElements, Image[] imageElements) {
        super(title);
        this.listType = listType;
        if (stringElements == null) throw new NullPointerException();
        if (imageElements != null && imageElements.length != stringElements.length) throw new IllegalArgumentException();
        for (String s : stringElements) {
            if (s == null) throw new NullPointerException();
            items.add(s);
        }
    }
    public int append(String s, Image img) {
        if (s == null) throw new NullPointerException();
        items.add(s);
        return items.size() - 1;
    }
    public String getString(int i) { return items.get(i); }
    public int size() { return items.size(); }
    public int getSelectedIndex() { return items.isEmpty() ? -1 : selected; }
    public void setSelectedIndex(int i, boolean sel) {
        // MIDP: IndexOutOfBoundsException if i is not a valid element index
        if (i < 0 || i >= items.size()) throw new IndexOutOfBoundsException("setSelectedIndex " + i);
        if (sel) selected = i;
    }
}
