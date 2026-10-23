import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = process.argv.includes('--dist') ? path.join(project, 'dist') : project;
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex === -1 ? process.env.PORT || 5173 : process.argv[portIndex + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.includes('\0') || pathname.includes('\\')) throw new Error('Invalid path');
    const relative = pathname.replace(/^\/+/, '') || 'index.html';
    // Serve only application assets, never .git, credentials, source tools, or metadata.
    if (!['index.html', 'manifest.webmanifest', 'sw.js'].includes(relative) && !relative.startsWith('src/') && !relative.startsWith('assets/')) throw new Error('Not public');
    const file = path.resolve(root, relative), rel = path.relative(root, file);
    if (rel.startsWith('..') || path.isAbsolute(rel) || !types[path.extname(file)] || !(await stat(file)).isFile()) throw new Error('Not found');
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Try npm run dev -- --port 5174` : error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Rain Room: http://127.0.0.1:${port}`));
