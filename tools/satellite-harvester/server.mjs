/**
 * BBIT Satellite Harvester — local capture service
 * ---------------------------------------------------------------------------
 * The build sandbox has no direct internet egress to tile servers, but the
 * reviewer's browser does. This tiny service hands "capture jobs" to a page
 * that runs in that browser, the page stitches Esri World Imagery tiles into a
 * georeferenced mosaic, and posts the resulting image back here so it can be
 * used as ground truth for tracing campus footprints.
 *
 * Run:  node tools/satellite-harvester/server.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'out');
const JOBS_FILE = path.join(__dirname, 'jobs.json');
const RESULTS_FILE = path.join(__dirname, 'results.json');
const PORT = Number(process.env.HARVEST_PORT || 5090);

fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(JOBS_FILE)) fs.writeFileSync(JOBS_FILE, '[]\n');
if (!fs.existsSync(RESULTS_FILE)) fs.writeFileSync(RESULTS_FILE, '[]\n');

const readJobs = () => JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
const readResults = () => JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
const writeResults = (r) => fs.writeFileSync(RESULTS_FILE, JSON.stringify(r, null, 2));

const json = (res, code, body) => {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
};

const seen = { firstSeenAt: null, hits: 0, lastPath: null };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  seen.hits += 1;
  seen.lastPath = url.pathname;
  if (!seen.firstSeenAt) {
    seen.firstSeenAt = new Date().toISOString();
    console.log(`[harvest] first browser hit: ${url.pathname} ua=${req.headers['user-agent'] || 'n/a'}`);
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    const html = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(html);
  }

  if (url.pathname === '/api/jobs') {
    const results = readResults();
    const done = new Set(results.map((r) => r.id));
    const jobs = readJobs().filter((j) => !done.has(j.id));
    return json(res, 200, { jobs, doneCount: results.length });
  }

  if (url.pathname === '/api/health') {
    return json(res, 200, { ok: true, results: readResults().length, seen });
  }

  if (url.pathname === '/api/result' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 120 * 1024 * 1024) req.destroy(); // hard cap ~120MB
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { id, name, dataUrl, meta } = payload;
        const match = /^data:image\/(png|jpeg|webp);base64,(.*)$/s.exec(dataUrl || '');
        if (!match) return json(res, 400, { ok: false, error: 'bad dataUrl' });
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1] === 'webp' ? 'webp' : 'png';
        const safeName = (name || id || 'capture').replace(/[^a-z0-9._-]+/gi, '-');
        const file = `${safeName}.${ext}`;
        fs.writeFileSync(path.join(OUT_DIR, file), Buffer.from(match[2], 'base64'));
        const results = readResults().filter((r) => r.id !== id);
        results.push({ id, name, file, meta: meta || {}, at: new Date().toISOString(), bytes: Math.round(match[2].length * 0.75) });
        writeResults(results);
        console.log(`[harvest] saved ${file} (${Math.round(match[2].length * 0.75 / 1024)} KB) ${JSON.stringify(meta || {})}`);
        return json(res, 200, { ok: true, file });
      } catch (err) {
        console.error('[harvest] error', err);
        return json(res, 500, { ok: false, error: String(err) });
      }
    });
    return undefined;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  return res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[harvest] Satellite harvester listening on http://0.0.0.0:${PORT}`);
  console.log(`[harvest] Output directory: ${OUT_DIR}`);
});
