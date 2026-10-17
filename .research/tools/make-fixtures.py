"""
Bounce 1.24: golden traces for the remake's rules.js, recorded from the original game's code (the 1.24 reference).

Each fixture is one level played from a fresh start with random held keys (no test pokes), in the remake's input
format, and the original's state after every step. Usage:

    python3 -I make-fixtures.py <oracle-1.24 folder> <out folder> [seeds per level] [steps]
"""
import json
import os
import random
import subprocess
import sys

# Held-key masks (1 left, 2 right, 4 jump) and how often random play picks each
MASKS = [(0, 2), (1, 3), (2, 6), (4, 2), (5, 3), (6, 6)]


# A random held-keys sequence of `steps` values, as runs of (mask, length)
def random_runs(rng, steps):
    runs = []
    total = 0
    weights = [w for _, w in MASKS]
    while total < steps:
        mask = rng.choices([m for m, _ in MASKS], weights)[0]
        length = min(rng.randint(2, 45), steps - total)
        if runs and runs[-1][0] == mask:
            runs[-1][1] += length
        else:
            runs.append([mask, length])
        total += length
    return runs


# The runs as the remake records them: [wait, mask, wait, mask, ...], each wait the steps since the change before
def remake_inputs(runs):
    inputs = []
    at = 0
    last_at = 0
    for i, (mask, length) in enumerate(runs):
        if i == 0 and mask == 0:
            at += length
            continue
        inputs += [at - last_at, mask]
        last_at = at
        at += length
    return inputs


# One fixture: run the reference on the level with these held keys, and keep its trace lines
def record(oracle, level, runs, steps):
    spec = ','.join(f'{mask}*{length}' for mask, length in runs)
    out = subprocess.run([os.path.join(oracle, 'run.sh'), '--level', str(level), '--mask', spec, '--steps', str(steps),
                          '--stop-on-complete'], capture_output=True, text=True, check=True).stdout
    lines = out.splitlines()
    trace = [line for line in lines if line.startswith('s=')]
    end = next((line[2:] for line in lines if line.startswith('# s=') and ('stopped' in line or 'EXCEPTION' in line)),
               f'ran all {steps} steps')
    return trace, end


def main():
    oracle, out_dir = sys.argv[1], sys.argv[2]
    seeds = int(sys.argv[3]) if len(sys.argv) > 3 else 8
    steps = int(sys.argv[4]) if len(sys.argv) > 4 else 3000
    os.makedirs(out_dir, exist_ok=True)
    index = []
    for level in range(1, 12):
        for seed in range(1, seeds + 1):
            rng = random.Random(level * 1000 + seed)
            runs = random_runs(rng, steps)
            trace, end = record(oracle, level, runs, steps)
            name = f'level{level:02d}-seed{seed}.json'
            fixture = {
                'level': level,
                'tick': 40,
                'mask': runs,
                'inputs': remake_inputs(runs),
                'end': end,
                'trace': trace,
            }
            with open(os.path.join(out_dir, name), 'w') as f:
                json.dump(fixture, f, separators=(',', ':'))
                f.write('\n')
            index.append(f'{name}\t{len(trace)} lines\t{end}')
            print(index[-1], flush=True)
    with open(os.path.join(out_dir, 'index.txt'), 'w') as f:
        f.write('\n'.join(index) + '\n')


if __name__ == '__main__':
    main()
