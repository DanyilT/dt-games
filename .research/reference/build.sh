#!/bin/sh
# Build the Bounce 1.24 oracle: MIDP/RMS/Nokia API stubs, the timer-less replacement for class g,
# and the harness. The game itself is NOT compiled: it runs from the original class files in
# orig-classes/ (copied unchanged from the 1.24 JAR; see orig-classes/SHA256SUMS).
set -e
W=$(cd "$(dirname "$0")" && pwd)
J="javac --release 8 -Xlint:-options -nowarn -encoding UTF-8"
rm -rf "$W/build"
mkdir -p "$W/build/stubs" "$W/build/timer-override" "$W/build/harness"
(cd "$W/orig-classes" && sha256sum -c --quiet SHA256SUMS)
$J -d "$W/build/stubs" $(find "$W/stubs-src" -name '*.java')
$J -cp "$W/build/stubs:$W/orig-classes" -d "$W/build/timer-override" "$W/timer-src/com/nokia/mid/appl/boun/g.java"
$J -cp "$W/build/stubs:$W/build/timer-override:$W/orig-classes" -d "$W/build/harness" "$W"/harness-src/com/nokia/mid/appl/boun/*.java
# javac must not have written anything else into the override folder: only g.class may shadow the original
n=$(find "$W/build/timer-override" -name '*.class' | wc -l)
[ "$n" -eq 1 ] || { echo "timer-override holds $n classes, expected only g.class" >&2; exit 1; }
echo "built into $W/build"
