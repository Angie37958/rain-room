import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const folder of ['src', 'scripts', 'test']) {
  for (const file of await readdir(path.join(root, folder))) if (/\.(js|mjs)$/.test(file)) execFileSync(process.execPath, ['--check', path.join(root, folder, file)], { stdio: 'inherit' });
}
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const app = await readFile(path.join(root, 'src/app.js'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML IDs');
for (const [, id] of app.matchAll(/\$\('([^']+)'\)/g)) if (!ids.includes(id)) throw new Error(`Missing HTML element: ${id}`);
for (const [, resource] of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) await readFile(path.resolve(root, resource));
console.log('JavaScript syntax, HTML IDs and entry assets checked.');
