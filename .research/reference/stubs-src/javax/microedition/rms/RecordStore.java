package javax.microedition.rms;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Stub: record stores live in memory (static map, empty in a fresh JVM = a fresh phone),
 * record ids start at 1, never reused.
 *
 * Determinism: Bounce 1.24 writes System.currentTimeMillis() as the first 8 bytes of record 3
 * of "bounceRMS" (a.java:352, the save written by destroyApp). The game never reads that value
 * back for anything (a.java:280 stores it in a.m, which no code reads; checked with javap), but to
 * keep every byte deterministic this stub replaces those 8 bytes with oracle.rt.Rt.fakeMillis().
 */
public class RecordStore {
    private static final Map<String, RecordStore> stores = new HashMap<>();
    private final String name;
    private final ArrayList<byte[]> records = new ArrayList<>(); // index = id - 1; null = deleted

    private RecordStore(String name) { this.name = name; }

    public static RecordStore openRecordStore(String name, boolean create) throws RecordStoreException {
        RecordStore rs = stores.get(name);
        if (rs == null) {
            if (!create) throw new RecordStoreNotFoundException(name);
            rs = new RecordStore(name);
            stores.put(name, rs);
        }
        return rs;
    }

    public static void deleteRecordStore(String name) throws RecordStoreException {
        if (stores.remove(name) == null) throw new RecordStoreNotFoundException(name);
    }

    public static String[] listRecordStores() { return stores.keySet().toArray(new String[0]); }

    public void closeRecordStore() {}
    public String getName() { return name; }

    public int getNumRecords() {
        int n = 0;
        for (byte[] r : records) if (r != null) n++;
        return n;
    }

    public int getNextRecordID() { return records.size() + 1; }

    private byte[] copyOf(int id, byte[] data, int off, int len) {
        byte[] copy = new byte[len];
        if (len > 0) System.arraycopy(data, off, copy, 0, len);
        if (name.equals("bounceRMS") && id == 3 && len >= 8) {
            long t = oracle.rt.Rt.fakeMillis();
            for (int i = 0; i < 8; i++) copy[i] = (byte) (t >>> (56 - 8 * i));
        }
        return copy;
    }

    public int addRecord(byte[] data, int off, int len) {
        int id = records.size() + 1;
        records.add(copyOf(id, data, off, len));
        oracle.rt.Rt.event("rms:add" + id);
        return id;
    }

    private byte[] rec(int id) throws InvalidRecordIDException {
        if (id < 1 || id > records.size() || records.get(id - 1) == null)
            throw new InvalidRecordIDException("record " + id);
        return records.get(id - 1);
    }

    public byte[] getRecord(int id) throws RecordStoreException {
        byte[] r = rec(id);
        return r.length == 0 ? null : r.clone();
    }

    public int getRecordSize(int id) throws RecordStoreException { return rec(id).length; }

    public void setRecord(int id, byte[] data, int off, int len) throws RecordStoreException {
        rec(id);
        records.set(id - 1, copyOf(id, data, off, len));
        oracle.rt.Rt.event("rms:set" + id);
    }

    public void deleteRecord(int id) throws RecordStoreException {
        rec(id);
        records.set(id - 1, null);
    }

    // harness helpers (not MIDP API)
    public static void oracleReset() { stores.clear(); }
    public byte[] oracleRaw(int id) { return id >= 1 && id <= records.size() ? records.get(id - 1) : null; }
}
