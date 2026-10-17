"""
A static server for testing the remake in the Browser pane: like python3 -m http.server, but every answer says
"Cache-Control: no-store", so the page always loads its newest files. With an out folder, a PUT to /__save/<name>
(a plain file name) writes the request's body there: how the page's PNGs (icons, screenshots) get onto the disk.

    python3 -I nocache-server.py <port> <folder> [out folder]
"""
import functools
import http.server
import os
import re
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    out = None

    # Every answer: never kept by the browser
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    # A file from the page, saved into the out folder
    def do_PUT(self):
        found = re.fullmatch(r'/__save/([A-Za-z0-9._-]+)', self.path)
        if not self.out or not found or found.group(1).startswith('.'):
            self.send_error(404)
            return
        length = int(self.headers.get('Content-Length', 0))
        with open(os.path.join(self.out, found.group(1)), 'wb') as file:
            file.write(self.rfile.read(length))
        self.send_response(204)
        self.end_headers()

    # Quiet: no line per request
    def log_message(self, format, *args):
        pass


def main():
    port, folder = int(sys.argv[1]), sys.argv[2]
    NoCacheHandler.out = sys.argv[3] if len(sys.argv) > 3 else None
    if NoCacheHandler.out:
        os.makedirs(NoCacheHandler.out, exist_ok=True)
    handler = functools.partial(NoCacheHandler, directory=folder)
    with http.server.ThreadingHTTPServer(('127.0.0.1', port), handler) as server:
        server.serve_forever()


main()
