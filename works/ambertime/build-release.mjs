// Build a standalone works/ambertime/ directory in a new, unused destination.
// Run: node works/ambertime/build-release.mjs /path/to/new/ambertime
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = dirname(fileURLToPath(import.meta.url));
const files = [
  'index.html',
  'v69/game.js',
  'v69/formal-storage.mjs',
  'v69/title-barrel.png',
  'v69/bgm.wav',
  'fonts/misaki_gothic_2nd.ttf',
  'fonts/misaki.txt',
  'fonts/readme.txt',
  'fonts/official-license-2026-10-19.html',
];

function replaceOnce(input, staging, production) {
  if (input.split(staging).length !== 2) {
    throw new Error('Expected one release marker: ' + staging);
  }
  return input.replace(staging, production);
}

if (process.argv.length !== 3) throw new Error('Pass the path of a new output directory.');
const destination = resolve(process.argv[2]);
const parent = await realpath(dirname(destination));
if (parent === source || parent.startsWith(source + sep)) {
  throw new Error('Choose a destination outside the AmberTime source directory.');
}
const contents = await Promise.all(files.map(file => readFile(join(source, file))));
const html = replaceOnce(contents[0].toString(),
  '<meta name="ambertime-channel" content="staging">',
  '<meta name="ambertime-channel" content="production">');
const previewLinks = /<!-- ambertime-preview-links -->[\s\S]*?<!-- \/ambertime-preview-links -->/g;
if (html.match(previewLinks)?.length !== 2) throw new Error('Check the debug-only link regions.');
const publicHtml = html.replace(previewLinks, '');
contents[0] = replaceOnce(publicHtml, '<meta name="robots" content="noindex,nofollow">',
  '<meta name="robots" content="noindex,follow">');
contents[1] = replaceOnce(contents[1].toString(),
  'const stagingDebugBuild = true;', 'const stagingDebugBuild = false;');

// Refusing existing directories prevents stale audit fixtures entering the release.
await mkdir(destination);
for (const [i, file] of files.entries()) {
  const target = join(destination, file);
  await mkdir(dirname(target), {recursive: true});
  await writeFile(target, contents[i], {flag: 'wx'});
}
console.log(`Packaged ${files.length} files in ${destination}`);
