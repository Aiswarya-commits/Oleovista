/*
  Optional: run Olivia's API on ANY Node host (VPS, Render, Railway, cPanel Node app...)
  without Vercel. Serves the built site from ./dist and the AI at /api/olivia-chat.

    npm run build
    ANTHROPIC_API_KEY=sk-ant-... PORT=3000 node server/standalone.mjs
*/
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { oliviaNodeHandler } from './olivia-core.mjs';

const ROOT = join(process.cwd(), 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/olivia-chat') return oliviaNodeHandler(req, res);
  let file = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch { file = join(ROOT, 'index.html'); }
  try {
    const data = await readFile(file);
    res.setHeader('content-type', TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
    res.end(data);
  } catch { res.statusCode = 404; res.end('Not found'); }
}).listen(process.env.PORT || 3000, () => console.log('Oleovista site + Olivia on port', process.env.PORT || 3000));
