/**
 * Writes offline.json: every file the game needs to play, each with its SHA-256, and a version made from them (the
 * SHA-256 of the lines "<path> <hash>\n", sorted by path), so it changes when any file does, and only then. sw.js
 * downloads the game from it when GameHub's Download button asks, checking each file, and keeps the copy up to date.
 *
 * Cloudflare Pages runs it at each deploy (the project's build command), so offline.json lists the files as deployed:
 *     node tools/offline-json.mjs
 * It isn't kept in git. Run it in the game's folder to try a download locally.
 *
 * Left out, as nothing the game needs to play: offline.json itself; sw.js (the browser fetches the worker itself);
 * test/ and tools/; README.md, LICENSE and the README's screenshots (img/…screenshot…); Pages' own files (_headers,
 * _redirects: Pages doesn't serve them); dotfiles and folders. This file is the same in every game.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const folder = fileURLToPath(new URL('..', import.meta.url)); // the game's folder, wherever this runs from
const LEFT_OUT = new Set(['offline.json', 'sw.js', 'README.md', 'LICENSE', '_headers', '_redirects']);
const LEFT_OUT_FOLDERS = new Set(['test', 'tools']);
const sha256 = (data) => createHash('sha256').update(data).digest('hex');

// Whether the game needs this file to play (path: from the game's folder, with /)
function needed(path) {
    const name = path.split('/').pop();
    return !LEFT_OUT.has(path) && !(path.startsWith('img/') && name.includes('screenshot'));
}

// The files in dir and its folders, as paths from the game's folder
async function filesIn(dir) {
    const found = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue; // dotfiles and folders
        const full = join(dir, entry.name);
        const path = relative(folder, full).split(sep).join('/');
        if (entry.isDirectory()) {
            if (!LEFT_OUT_FOLDERS.has(path)) found.push(...await filesIn(full));
        } else if (entry.isFile() && needed(path)) {
            found.push(path);
        }
    }
    return found;
}

const paths = (await filesIn(folder)).sort();
const files = {};
for (const path of paths) files[path] = sha256(await readFile(join(folder, path)));
const version = sha256(paths.map((path) => `${path} ${files[path]}\n`).join(''));
await writeFile(join(folder, 'offline.json'), `${JSON.stringify({ version, files }, null, 2)}\n`);
console.log(`offline.json: ${paths.length} files, version ${version.slice(0, 12)}`);
