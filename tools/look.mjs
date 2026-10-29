// Headless still of a book page for quick looks.
// node tools/look.mjs <subject> [out.jpg] [--t=2.5] [--u=0.3] [--cam='{"dist":80}'] [--pose='{"open":1,"rise":1}'] [--js='...']
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const flag = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const pos = args.filter((x) => !x.startsWith('--'));
const subject = pos[0] ?? 'heart';
const out = pos[1] ?? path.join(HERE, 'probe', `look-${subject}.jpg`);
const T = Number(flag('t', '2.5')), U = Number(flag('u', '0.2'));
const W = Number(flag('w', '1080')), H = Number(flag('h', '1920'));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const file = path.join(HERE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(HERE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const port = server.address().port;

const virtualClock = () => {
  let now = 0, next = 1; const queue = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => { const id = next++; queue.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => queue.delete(id);
  window.__step = (ms) => { now += ms; const due = [...queue.values()]; queue.clear(); for (const cb of due) cb(now); };
};

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
await page.addInitScript(virtualClock);
await page.goto(`http://localhost:${port}/book/index.html?s=${subject}&w=${W}&h=${H}&dpr=1&look=${flag("look", "")}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000, polling: 200 });
await page.evaluate(({ cam, pose, u, js }) => {
  if (cam) window.book.setCamera(JSON.parse(cam));
  if (pose) window.book.pose(JSON.parse(pose));
  window.book.snap(u);
  if (js) (0, eval)(js);
}, { cam: flag('cam'), pose: flag('pose'), u: U, js: flag('js') });
for (let i = 0; i < Math.round(T * 30); i++) await page.evaluate(() => window.__step(1000 / 30));
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
console.log(out, await page.evaluate(() => window.book.readout()));
await browser.close(); server.close();
