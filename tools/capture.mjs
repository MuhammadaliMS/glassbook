// Film a book frame by frame on a virtual clock and encode it with ffmpeg.
// node tools/capture.mjs <subject> [--seconds=6] [--out=heart.mp4] [--w=1080] [--h=1920] [--fps=30]
// The book opens, the model rises, then the control sweeps from 0 to 1 and back, with one tap.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const flag = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const subject = args.find((x) => !x.startsWith('--')) ?? 'heart';
const SECONDS = Number(flag('seconds', '8')), FPS = Number(flag('fps', '30'));
const W = Number(flag('w', '1080')), H = Number(flag('h', '1920'));
const OUT = path.resolve(flag('out', `${subject}.mp4`));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);

const virtualClock = () => {
  let now = 0, next = 1; const queue = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => { const id = next++; queue.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => queue.delete(id);
  window.__step = (ms) => { now += ms; const due = [...queue.values()]; queue.clear(); for (const cb of due) cb(now); };
};

const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('page:', e.message));
await page.addInitScript(virtualClock);
await page.goto(`http://localhost:${server.address().port}/book/index.html?s=${subject}&w=${W}&h=${H}&dpr=1`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000, polling: 200 });

const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = Math.round(SECONDS * FPS);
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
let tapped = false;
for (let i = 0; i < frames; i++) {
  const t = i / FPS, k = t / SECONDS;
  await page.evaluate(({ open, rise, u }) => { window.book.pose({ open, rise }); window.book.drive(u); },
    { open: smooth(t / 1.4), rise: smooth((t - 1.2) / 1.1), u: 0.15 + 0.8 * Math.sin(Math.PI * smooth((k - 0.3) / 0.7)) });
  if (!tapped && k > 0.6) { tapped = true; await page.evaluate(() => window.book.action()); }
  await page.evaluate((ms) => window.__step(ms), 1000 / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
}
ff.stdin.end(); await new Promise((r) => ff.on('close', r));
console.log(OUT);
await browser.close(); server.close();
