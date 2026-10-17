"""
Bounce: draws a part of a palette PNG (the JAR's icons/icon.png, icons/objects_nm.png) as an SVG, one rect per run of
same-coloured pixels in a row, for the remake's icons.

    python3 -I pixel-svg.py <png> <x> <y> <width> <height> [--size N] [--background COLOUR] [--comment TEXT]

The SVG's viewBox is N × N (default: the part's size), the pixels in its middle, on the background colour if given.
"""
import argparse
import struct
import zlib


# A palette PNG's pixels: rows of (r, g, b, a)
def read_png(path):
    data = open(path, 'rb').read()
    at = 8
    chunks = {}
    while at < len(data):
        length = struct.unpack('>I', data[at:at + 4])[0]
        kind = data[at + 4:at + 8].decode()
        chunks.setdefault(kind, b'')
        chunks[kind] += data[at + 8:at + 8 + length]
        at += 12 + length
    width, height, depth, colour = struct.unpack('>IIBB', chunks['IHDR'][:10])
    if colour != 3 or depth != 8:
        raise SystemExit(f'{path}: only 8-bit palette PNGs (colour type 3) are read here')
    palette = chunks['PLTE']
    alpha = chunks.get('tRNS', b'')
    raw = zlib.decompress(chunks['IDAT'])
    rows = []
    previous = bytearray(width)
    p = 0
    for _ in range(height):
        kind = raw[p]
        line = bytearray(raw[p + 1:p + 1 + width])
        p += 1 + width
        for x in range(width):
            left = line[x - 1] if x else 0
            up = previous[x]
            corner = previous[x - 1] if x else 0
            if kind == 1:
                line[x] = (line[x] + left) & 255
            elif kind == 2:
                line[x] = (line[x] + up) & 255
            elif kind == 3:
                line[x] = (line[x] + (left + up) // 2) & 255
            elif kind == 4:
                guess = left + up - corner
                pa, pb, pc = abs(guess - left), abs(guess - up), abs(guess - corner)
                line[x] = (line[x] + (left if pa <= pb and pa <= pc else up if pb <= pc else corner)) & 255
        rows.append([(palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2], alpha[i] if i < len(alpha) else 255) for i in line])
        previous = line
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('png')
    parser.add_argument('x', type=int)
    parser.add_argument('y', type=int)
    parser.add_argument('width', type=int)
    parser.add_argument('height', type=int)
    parser.add_argument('--size', type=int)
    parser.add_argument('--background')
    parser.add_argument('--comment', default='')
    args = parser.parse_args()
    rows = read_png(args.png)
    size = args.size or max(args.width, args.height)
    left = (size - args.width) // 2
    top = (size - args.height) // 2
    lines = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" shape-rendering="crispEdges">']
    if args.comment:
        lines.append(f'    <!-- {args.comment} -->')
    if args.background:
        lines.append(f'    <rect width="{size}" height="{size}" fill="{args.background}"/>')
    for y in range(args.height):
        x = 0
        while x < args.width:
            r, g, b, a = rows[args.y + y][args.x + x]
            run = 1
            while x + run < args.width and rows[args.y + y][args.x + x + run] == (r, g, b, a):
                run += 1
            if a:
                opacity = '' if a == 255 else f' fill-opacity="{a / 255:.2f}"'
                lines.append(f'    <rect x="{left + x}" y="{top + y}" width="{run}" height="1" fill="#{r:02x}{g:02x}{b:02x}"{opacity}/>')
            x += run
    lines.append('</svg>')
    print('\n'.join(lines))


main()
