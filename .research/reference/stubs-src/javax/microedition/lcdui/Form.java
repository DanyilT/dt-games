package javax.microedition.lcdui;

import java.util.ArrayList;

public class Form extends Screen {
    private final ArrayList<String> texts = new ArrayList<>();
    public Form(String title) { super(title); }
    public int append(String s) { texts.add(s); return texts.size() - 1; }
    public int size() { return texts.size(); }
    public String oracleText() { return String.join("", texts); }
}
