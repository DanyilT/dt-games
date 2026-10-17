"""
Bounce: puts what we found out about the original game into the remake's .research/ folder (the bounce branch): the
ball's spec, the comparison of the versions (as JSON and as versions.md), the routes found, the tools, and the 1.24
reference's harness (our stand-ins for the phone, without Nokia's class files). It leaves out everything that is Nokia's
or made by running Nokia's code: the JARs, class files, decompiled or disassembled code, and the traces.

    python3 -I make-research-folder.py <bounce-research folder> <the game's .research folder>

README.md and game.md are written by hand; levels.md and the level pictures are made separately (tools/levels-md.mjs,
and the page's sprites in the browser).
"""
import json
import os
import shutil
import sys

TOOLS = ['get-jars.sh', 'levels.mjs', 'draw-levels.mjs', 'levels-to-rules.mjs', 'test-rules.mjs', 'test-simulate.mjs',
         'search-routes.mjs', 'record-routes.mjs', 'routes-to-bot.mjs', 'levels-md.mjs', 'make-fixtures.py',
         'check-fixture-on-oracle.py', 'pixel-svg.py', 'nocache-server.py', 'page-screenshot.js', 'make-research-folder.py']
REFERENCE = ['README.txt', 'build.sh', 'run.sh', 'fuzz.sh', 'harness-src', 'stubs-src', 'timer-src', 'orig-classes/SHA256SUMS']

# 1.24 against 1.8, each difference confirmed in 1.24's bytecode
DIFFERENCES_124 = [
    ('The step', '30 ms', '40 ms'),
    ('Where the ball is', 'on the screen, in a 156 px scroll buffer', 'in the level\'s pixels; the view is apart from it'),
    ('A popped ball', '5 steps', '7 steps'),
    ('A ceiling', 'ySpeed = 20', 'ySpeed = (−ySpeed) >> 1 (−67 gives 33)'),
    ('The slowest fall', 'none (speeds 1–9 hang at the top of a jump)',
     '0 < ySpeed < 10, out of water, gravity not upside down: 10'),
    ('Ramps', 'swap both speeds (brick halves them)',
     'xSpeed kept when it already runs along the slope faster; ySpeed never halved (`ball-1.24.md`)'),
    ('Brick\'s touch flag', 'only on a near miss', 'on any brick a test reaches'),
    ('A collision test', 'every tile, every effect', 'stops at the first tile that blocks'),
    ('Thin bands (spikes, hoops, the exit, pumps)', 'tile pixels 3–8', '4–7'),
    ('Moving spikes', '26 × 26', '22 × 22'),
    ('The gravity power-up', 'doesn\'t clear grounded', 'clears grounded'),
    ('Growing', 'looks for room from 2 px away', 'from 1 px'),
    ('Shrinking', 'moves the ball 2 px down, else up', 'doesn\'t move it'),
    ('A big ball\'s start', 'top-left on the tile, nudged only if it overlaps',
     'centre at the tile + 6, then the search for room (it always moves)'),
    ('The screen jumping', 'when the centre leaves the view; the ball can jump 336 px (a bug)',
     'when the ball\'s edge is within 6 px of the view\'s; the ball never moves'),
    ('The view across', 'follows the ball\'s movement, stops at the map\'s ends',
     'the ball at x 64, held to 0 … 12 × width − 144 (a level\'s last 16 px never show)'),
    ('The exit opening', 'a remembered buffer position against the drawn edges: it can open far off screen',
     'a "drawn" flag, and the exit\'s columns in the view (`game.md`)'),
    ('Levels', 'the game ends after level 10', 'all 11; "Congrats!" at the end'),
    ('Keys', 'from the phone\'s thread, even in the middle of a step',
     'never in the middle of a step; held keys cleared on every resume (a tap between steps is lost in both)'),
    ('Level 11, column 91, row 42', 'brick', 'a wet ramp (33)'),
]


# A copy of a file or a folder, its folders made as needed
def copy(source, target):
    os.makedirs(os.path.dirname(target), exist_ok=True)
    if os.path.isdir(source):
        shutil.copytree(source, target, dirs_exist_ok=True)
    else:
        shutil.copy2(source, target)


# versions.md: the comparison of every version with 1.8, as text
def versions_md(diff):
    synth = diff['synth']
    out = ['# The versions', '',
           'Every Bounce JAR found (the eight in archive.org\'s "J2ME Personal Archive": see `README.md`), compared with '
           '1.8 by its bytecode (`javap`) and decompiled code (CFR). Made from `versions.json` (`synth`, the summary '
           'below; `diffs`, each version\'s differences with the code lines they come from).', '',
           '## 1.24 against 1.8', '',
           'The last version against 1.8, the first one read in full: each difference confirmed in 1.24\'s bytecode and '
           'by running it (`game.md` and `ball-1.24.md` have 1.24 in full).', '',
           '| | 1.8 | 1.24 |', '| --- | --- | --- |']
    out += [f'| {what} | {old} | {new} |' for what, old, new in DIFFERENCES_124]
    out += ['', '## Lineage', '', synth['lineage'], '', '## Each version', '']
    for row in synth['versionTable']:
        out.append(f"### {row['version']}")
        out.append('')
        out.append(f"- **Step:** {row['tickMs']} ms. **Obfuscated:** {'yes' if row['obfuscated'] else 'no'}.")
        out.append(f"- **Made by:** {row['maker']}")
        out.append('')
        if row['playDifferencesFrom18']:
            out.append('How it plays differently from 1.8:')
            out.append('')
            out += [f'- {item}' for item in row['playDifferencesFrom18']]
            out.append('')
        if row.get('otherDifferences'):
            out.append('Other differences:')
            out.append('')
            out += [f'- {item}' for item in row['otherDifferences']]
            out.append('')
    out += ['## Spot checks', '', 'What was checked again in the bytecode, where the version reports disagreed:', '']
    out += [f'- {item}' for item in synth['spotChecks']]
    out += ['', '## The comparison\'s recommendation', '',
            'What the comparison recommended for a remake, as it stood then (the remake was made from 1.24 in the end):',
            '', synth['recommendation'], '']
    return '\n'.join(out)


def main():
    research, target = sys.argv[1], sys.argv[2]
    os.makedirs(target, exist_ok=True)
    copy(os.path.join(research, 'SPEC-1.24-ball.md'), os.path.join(target, 'ball-1.24.md'))
    copy(os.path.join(research, 'versions-diff.json'), os.path.join(target, 'versions.json'))
    diff = json.load(open(os.path.join(research, 'versions-diff.json')))
    with open(os.path.join(target, 'versions.md'), 'w') as file:
        file.write(versions_md(diff))
    copy(os.path.join(research, 'work/routes-1.24/search.json'), os.path.join(target, 'routes/routes.json'))
    for name in TOOLS:
        copy(os.path.join(research, 'tools', name), os.path.join(target, 'tools', name))
    for name in REFERENCE:
        copy(os.path.join(research, 'work/oracle-1.24', name), os.path.join(target, 'reference', name))
    print(f'{target}: written')


main()
