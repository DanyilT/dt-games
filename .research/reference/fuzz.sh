#!/bin/bash
# Random play on the ORIGINAL 1.24 classes: many seeds per level, reports any exception the game throws
# and checks determinism (each seed is run twice, in two fresh JVMs, and the traces must be byte-identical).
# usage: fuzz.sh [seeds-per-level] [steps] [levels...]      defaults: 20 4000 1..11
# Seed variants (seed & 3): 0 = 99 lives (poke), 1 = invincibility cheat, 2 = level cheat + 1/3/#/FIRE, 3 = plain;
# seed & 4 adds bonus-counter pokes. All variants press soft keys now and then and resume from the pause menu.
# Output: out/fuzz/<level>-<seed>.txt, and a summary line per run; exit status 1 if any run threw or differed.
W=$(cd "$(dirname "$0")" && pwd)
N=${1:-20}; STEPS=${2:-4000}; shift 2 2>/dev/null
LEVELS=${*:-1 2 3 4 5 6 7 8 9 10 11}
OUT="$W/out/fuzz"; rm -rf "$OUT"; mkdir -p "$OUT"
jobs=()
for L in $LEVELS; do for S in $(seq 1 $N); do jobs+=("$L $S"); done; done
printf '%s\n' "${jobs[@]}" | xargs -P 8 -L 1 bash -c '
  L=$0; S=$1; W='"$W"'; OUT='"$OUT"'; STEPS='"$STEPS"'
  "$W/run.sh" --level $L --fuzz $S --steps $STEPS > "$OUT/$L-$S.txt" 2>&1
  "$W/run.sh" --level $L --fuzz $S --steps $STEPS > "$OUT/$L-$S.again.txt" 2>&1
  n=$(grep -c "^s=" "$OUT/$L-$S.txt"); end=$(grep "^# s=[0-9]" "$OUT/$L-$S.txt" | sed "s/^# //" | cut -c1-150)
  det=same; cmp -s "$OUT/$L-$S.txt" "$OUT/$L-$S.again.txt" || det=DIFFERENT
  rm -f "$OUT/$L-$S.again.txt"
  if grep -q "EXCEPTION\|^Exception\|at com\.nokia" "$OUT/$L-$S.txt"; then ex=EXCEPTION; else ex=ok; fi
  echo "L$L S$S steps=$n $ex determinism=$det ${end:-ran all $STEPS steps}"' | sort -t' ' -k1.2n -k2.2n | tee "$OUT/summary.txt"
echo "---"
echo "runs: $(wc -l < "$OUT/summary.txt"), exceptions: $(grep -c ' EXCEPTION ' "$OUT/summary.txt"), nondeterministic: $(grep -c DIFFERENT "$OUT/summary.txt")"
grep -q ' EXCEPTION \|DIFFERENT' "$OUT/summary.txt" && exit 1 || exit 0
