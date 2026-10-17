"""
Replays golden traces on the 1.24 reference and checks the reference gives the same lines.

    python3 -I check-fixture-on-oracle.py <oracle-1.24 folder> <fixture.json> [...]
"""
import json
import subprocess
import sys


def main():
    oracle = sys.argv[1]
    bad = 0
    for path in sys.argv[2:]:
        fixture = json.load(open(path))
        spec = ','.join(f'{mask}*{length}' for mask, length in fixture['mask'])
        out = subprocess.run([oracle + '/run.sh', '--level', str(fixture['level']), '--mask', spec, '--steps', '4000',
                              '--stop-on-complete'], capture_output=True, text=True, check=True).stdout
        trace = [line for line in out.splitlines() if line.startswith('s=')]
        same = trace == fixture['trace']
        bad += not same
        print(path, 'identical' if same else 'DIFFERENT', len(trace), len(fixture['trace']))
    sys.exit(1 if bad else 0)


main()
