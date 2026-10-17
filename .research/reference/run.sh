#!/bin/bash
# usage: run.sh [harness args...]      (run.sh --help lists them)
# One run = one fresh JVM = one fresh phone: all game state (statics, the record store, e.T ...) starts
# as on a first launch. Class path order: stubs, the timer-less g (shadows only the original g.class),
# the ORIGINAL 1.24 classes, the harness, then the JAR's resources (levels, icons, sounds, lang.*).
W=$(cd "$(dirname "$0")" && pwd)
RES="${BOUNCE_RES:-$W/res}"
CP="$W/build/stubs:$W/build/timer-override:$W/orig-classes:$W/build/harness:$RES"
exec java -Xshare:auto -XX:TieredStopAtLevel=1 -cp "$CP" com.nokia.mid.appl.boun.OracleHarness "$@" 2> >(grep -v '^Picked up JAVA_TOOL_OPTIONS' >&2)
