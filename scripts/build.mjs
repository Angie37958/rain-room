import { mkdir, cp, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
if (path.relative(root, output) !== 'dist' || path.dirname(output) !== root) throw new Error('Unsafe build output path');
// A fixed project-relative output is the only folder removed by this script.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of ['index.html', 'manifest.webmanifest', 'src', 'assets']) await cp(path.join(root, entry), path.join(output, entry), {
  recursive: true,
  // Retain the previous prototype image in source history, but never ship or load it.
  filter: source => path.basename(source) !== 'window-night.png'
});
const htmlPath = path.join(output, 'index.html');
const html = await readFile(htmlPath, 'utf8');
await writeFile(htmlPath, html.replace('</head>', '<meta name="rain-room-build" content="production">\n</head>'));
async function publicFiles(folder, prefix = '') {
  const files = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await publicFiles(path.join(folder, entry.name), relative + '/'));
    else files.push(relative);
  }
  return files.sort();
}
const files = await publicFiles(output);
const template = await readFile(path.join(root, 'sw.js'), 'utf8');
const hash = createHash('sha256').update(template);
for (const file of files) hash.update(file).update(await readFile(path.join(output, file)));
const worker = template.replace('__RAIN_ROOM_BUILD__', hash.digest('hex').slice(0, 16))
  .replace(/\/\* PRECACHE_FILES \*\/ \[[\s\S]*?\];/, `/* PRECACHE_FILES */ ${JSON.stringify(files.map(file => './' + file), null, 2)};`);
await writeFile(path.join(output, 'sw.js'), worker);
console.log('Built dist/ — static assets only, no server or runtime dependencies.');
