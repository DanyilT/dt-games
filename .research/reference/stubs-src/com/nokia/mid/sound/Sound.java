package com.nokia.mid.sound;

/** Stub: plays nothing; each play() is logged as an event (named by the harness from the data). */
public class Sound {
    public static final int FORMAT_TONE = 1, FORMAT_WAV = 5;
    public static final int SOUND_PLAYING = 0, SOUND_STOPPED = 1, SOUND_UNINITIALIZED = 3;
    public static java.util.function.Function<byte[], String> oracleNamer = null;

    private final String name;

    public Sound(byte[] data, int type) {
        String n = oracleNamer == null ? null : oracleNamer.apply(data);
        this.name = n != null ? n : ("data" + data.length);
    }

    public Sound(int freq, long duration) { this.name = "tone" + freq + "/" + duration; }

    public void play(int loop) { oracle.rt.Rt.event("snd:" + name); }
    public void stop() {}
    public void release() {}
    public int getState() { return SOUND_STOPPED; }
    public void init(byte[] data, int type) {}
    public void init(int freq, long duration) {}
    public void setGain(int gain) {}
    public int getGain() { return 0; }
    public static int[] getSupportedFormats() { return new int[] { FORMAT_TONE }; }
}
