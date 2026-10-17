package javax.microedition.lcdui;

import java.util.ArrayList;
import java.util.List;

/** Stub: remembers commands and the listener so the harness can "press" soft keys. */
public abstract class Displayable {
    final List<Command> commands = new ArrayList<>();
    CommandListener listener;

    public void addCommand(Command cmd) { if (cmd != null && !commands.contains(cmd)) commands.add(cmd); }
    public void removeCommand(Command cmd) { commands.remove(cmd); }
    public void setCommandListener(CommandListener l) { listener = l; }
    public boolean isShown() { return false; }

    // harness helpers (not MIDP API)
    public List<Command> oracleCommands() { return commands; }
    public CommandListener oracleListener() { return listener; }
}
