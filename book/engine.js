// Interactive book engine: an open hardcover on a desk in window light, a text page on the
// left and a working glass-and-ceramic model rising out of the right page.
// A subject module supplies the page text and builds the model (see subjects/heart.js).
// Motion runs on requestAnimationFrame + performance.now only, so the capture can step a virtual clock.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const PAGE = { w: 20, d: 27, thick: 1.1 }; // one page block, world units (~cm)
const COVER = { over: 0.5, t: 0.22 };

// ---------- materials ----------
export const M = {
  glass: (o = {}) => new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.06, thickness: 0.5, ior: 1.42, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 1, envMapIntensity: 1.2, ...o }),
  frosted: (o = {}) => new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.42, thickness: 1.2, ior: 1.4, clearcoat: 1, clearcoatRoughness: 0.25, envMapIntensity: 1, ...o }),
  ceramic: (o = {}) => new THREE.MeshPhysicalMaterial({ color: 0xf3f2ee, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.9, ...o }),
  alu: (o = {}) => new THREE.MeshStandardMaterial({ color: 0xdadce0, metalness: 1, roughness: 0.26, envMapIntensity: 1.3, ...o }),
  liquid: (color, o = {}) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color).multiplyScalar(0.7), emissive: color, emissiveIntensity: 1.0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, ...o }),
};

// ---------- geometry helpers ----------
export function smoothShape(pts, n = 96) {
  const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal');
  return new THREE.Shape(c.getSpacedPoints(n).slice(0, n).map((p) => new THREE.Vector2(p.x, p.y)));
}
// Shape drawn in page coordinates (x right, y = toward the top of the page) extruded upward.
export function slab(shape, depth, bevel = 0.2, curveSegments = 48) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 6, curveSegments });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return g;
}
export function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// page coords (x, y-up-the-page, height) -> world vector
export const P = (x, y, h = 0) => new THREE.Vector3(x, h, -y);
export function curve(pts, tension = 0.5) { return new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : P(...p))), false, 'catmullrom', tension); }

// A stripe texture whose scrolling reads as flow inside a liquid tube.
export function flowTexture(color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 16;
  const g = c.getContext('2d');
  const col = new THREE.Color(color);
  g.fillStyle = `#${col.getHexString()}`; g.fillRect(0, 0, 256, 16);
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.72, 'rgba(255,255,255,0)');
  grad.addColorStop(0.9, 'rgba(255,255,255,0.85)'); grad.addColorStop(0.94, 'rgba(255,255,255,0.0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 16);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- page and cover art ----------
const FONTS = ['600 10px "Inter Tight"', '400 10px "Inter"', '500 10px "Inter"', 'italic 400 10px "Newsreader"', '500 10px "Newsreader"', '500 10px "JetBrains Mono"'];
async function loadFonts() { await Promise.all(FONTS.map((f) => document.fonts.load(f).catch(() => {}))); }

function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t;
  }
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}

function paperBase(g, W, H, side) {
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, W, H);
  // gutter shading toward the spine
  const gx = side === 'left' ? W : 0;
  const grad = g.createLinearGradient(gx, 0, side === 'left' ? W - 260 : 260, 0);
  grad.addColorStop(0, 'rgba(120,110,95,0.30)'); grad.addColorStop(0.35, 'rgba(120,110,95,0.08)'); grad.addColorStop(1, 'rgba(120,110,95,0)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // faint paper fibre
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(90,80,60,${Math.random() * 0.025})`; g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1); }
}

function leftPageTexture(pg, accent) {
  const W = 1500, H = Math.round(W * PAGE.d / PAGE.w);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  paperBase(g, W, H, 'left');
  const L = 150, R = W - 190, mw = R - L;
  let y = 210;
  g.fillStyle = accent; g.font = '600 30px "Inter Tight"'; g.letterSpacing = '6px';
  g.fillText(pg.kicker.toUpperCase(), L, y); g.letterSpacing = '0px';
  y += 105;
  g.fillStyle = '#16171a'; g.font = '600 104px "Inter Tight"';
  for (const line of pg.title.split('\n')) { g.fillText(line, L - 4, y); y += 112; }
  y += 18;
  g.fillStyle = '#3a3c42'; g.font = 'italic 400 44px "Newsreader"';
  y = wrap(g, pg.lede, L, y, mw, 60) + 30;
  g.fillStyle = '#4a4c52'; g.font = '400 31px "Inter"';
  for (const p of pg.body) y = wrap(g, p, L, y, mw, 47) + 22;
  // key idea panel
  y += 14;
  const ph = 300;
  g.fillStyle = 'rgba(20,22,30,0.045)'; roundRectPath(g, L, y, mw, ph, 28); g.fill();
  g.fillStyle = accent; g.fillRect(L, y + 34, 8, ph - 68);
  g.fillStyle = accent; g.font = '600 26px "Inter Tight"'; g.letterSpacing = '5px'; g.fillText('KEY IDEA', L + 52, y + 74); g.letterSpacing = '0px';
  g.fillStyle = '#16171a'; g.font = '500 54px "Newsreader"'; g.fillText(pg.key, L + 52, y + 158);
  g.fillStyle = '#5a5c62'; g.font = '500 30px "JetBrains Mono"'; g.fillText(pg.keyNote, L + 52, y + 230);
  y += ph + 70;
  // try-it line with a drawn arrow toward the model
  g.fillStyle = '#16171a'; g.font = '600 36px "Inter Tight"'; g.fillText('Try it', L, y);
  g.fillStyle = '#4a4c52'; g.font = '400 31px "Inter"';
  y = wrap(g, pg.tryIt, L, y + 52, mw - 120, 46);
  g.strokeStyle = accent; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(R - 160, y - 50); g.bezierCurveTo(R - 60, y - 70, R - 20, y - 130, R + 40, y - 150); g.stroke();
  g.beginPath(); g.moveTo(R + 40, y - 150); g.lineTo(R + 4, y - 152); g.moveTo(R + 40, y - 150); g.lineTo(R + 30, y - 116); g.stroke();
  g.fillStyle = '#9a9ca2'; g.font = '500 26px "Inter"'; g.fillText(String(pg.pageNo), L, H - 110);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function rightPageTexture(pg) {
  const W = 1500, H = Math.round(W * PAGE.d / PAGE.w);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  paperBase(g, W, H, 'right');
  g.fillStyle = '#8a8c92'; g.font = '500 27px "Inter"';
  g.fillText(pg.caption, 190, H - 110);
  g.textAlign = 'right'; g.fillText(String(pg.pageNo + 1), W - 150, H - 110);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function coverTexture(pg, coverColor, accent) {
  const W = 1200, H = Math.round(W * (PAGE.d + 2 * COVER.over) / (PAGE.w + COVER.over));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = coverColor; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 1); }
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3; roundRectPath(g, 70, 70, W - 140, H - 140, 10); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.65)'; g.font = '600 30px "Inter Tight"'; g.letterSpacing = '8px';
  g.fillText(pg.kicker.toUpperCase(), 130, 220); g.letterSpacing = '0px';
  g.fillStyle = '#ffffff'; g.font = '600 112px "Inter Tight"';
  let y = 360; for (const line of pg.title.split('\n')) { g.fillText(line, 124, y); y += 122; }
  g.fillStyle = accent; g.beginPath(); g.arc(W - 220, H - 230, 70, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = '500 28px "Inter"'; g.fillText('An interactive book', 130, H - 210);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function roundRectPath(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

function pageEdgeTexture() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, 16, 256);
  for (let i = 0; i < 256; i += 2) { g.fillStyle = `rgba(120,110,90,${0.08 + Math.random() * 0.1})`; g.fillRect(0, i, 16, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A page block whose top surface sags into the gutter. side -1 = left page, +1 = right page.
function pageBlock(side, topTex, edgeTex) {
  const grp = new THREE.Group();
  const geo = new THREE.PlaneGeometry(PAGE.w, PAGE.d, 60, 4);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);                                // -w/2..w/2 ; spine at -side*w/2
    const fromSpine = side > 0 ? x + PAGE.w / 2 : PAGE.w / 2 - x;
    const sag = -0.75 * Math.exp(-fromSpine / 1.4) + 0.12 * Math.exp(-Math.pow((fromSpine - 4) / 5, 2));
    pos.setY(i, PAGE.thick + sag);
  }
  geo.computeVertexNormals();
  const top = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.92 }));
  top.receiveShadow = true;
  grp.add(top);
  const edgeMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.95 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(PAGE.w - 0.05, PAGE.thick - 0.02, PAGE.d - 0.02), edgeMat);
  box.position.y = (PAGE.thick - 0.02) / 2; box.castShadow = true; box.receiveShadow = true;
  grp.add(box);
  return grp;
}

// ---------- looks: the desk and the light it sits in ----------
const LOOKS = {
  oak: { desk: 'desk-oak.jpg', repeat: 2.2, rough: 0.55, bg: 0xd9c7a9, sun: [0xffeccc, 3.3], spot: [0xffe2b8, 70], hemi: [0xf4f1ff, 0xb08a60, 0.3], env: 0.38, exposure: 0.95, vignette: 0.55, warm: 0.6 },
  marble: { desk: 'desk-marble.jpg', repeat: 1.3, rough: 0.22, tint: 0xe9e8e5, bg: 0xe9e8e5, sun: [0xfff8ef, 2.5], spot: [0xfff6ea, 30], hemi: [0xf7f9ff, 0xcfcdc9, 0.35], env: 0.42, exposure: 0.95, vignette: 0.3, warm: 0, bloom: 1.9 },
  ash: { desk: 'desk-ash.jpg', repeat: 2.0, rough: 0.6, tint: 0xe6e4e0, bg: 0xe6e4e0, sun: [0xfff8ef, 2.5], spot: [0xfff6ea, 30], hemi: [0xf7f9ff, 0xcfcdc9, 0.35], env: 0.42, exposure: 0.95, vignette: 0.3, warm: 0, bloom: 1.9 },
  studio: { desk: null, color: 0xc9c7c3, rough: 0.8, bg: 0xc9c7c3, sun: [0xfffaf3, 2.5], spot: [0xffffff, 25], hemi: [0xf7f9ff, 0xbdbbb7, 0.35], env: 0.42, exposure: 0.95, vignette: 0.3, warm: 0, bloom: 1.9 },
};

// ---------- desk props: a plant, a pencil cup and a mug, kept to the edges ----------
function addProps(scene) {
  const sh = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  // plant: ceramic pot + glossy leaves
  const plant = new THREE.Group(); plant.position.set(-46, 0, -40); scene.add(plant);
  const pot = sh(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.6, 5.2, 48), M.ceramic({ color: 0xf1eee8 })));
  pot.position.y = 2.6; plant.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(2.95, 2.95, 0.2, 40), new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 1 }));
  soil.position.y = 5.0; plant.add(soil);
  const leafMat = new THREE.MeshPhysicalMaterial({ color: 0x3f8a3a, roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide });
  let sd = 3; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r() * 0.4, tilt = 0.5 + r() * 0.7, len = 3.2 + r() * 2.4;
    const stem = new THREE.Group(); stem.position.y = 5.0; stem.rotation.set(0, a, tilt); plant.add(stem);
    const leaf = sh(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), leafMat));
    leaf.scale.set(len * 0.5, 0.08, len * 0.26); leaf.position.x = len * 0.55; leaf.position.y = len * 0.35; leaf.rotation.z = -0.35;
    stem.add(leaf);
  }
  // pencil cup: brushed aluminium with pencils
  const cup = new THREE.Group(); cup.position.set(29, 0, -21); scene.add(cup);
  const can = sh(new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 6.5, 48, 1, true), M.ceramic({ color: 0xe9e4da, side: THREE.DoubleSide })));
  can.position.y = 3.25; cup.add(can);
  const cols = [0xf2c14e, 0x2f2f33, 0xe0e0e0, 0xf2c14e];
  cols.forEach((c, i) => {
    const pen = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 10, 6), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })));
    pen.position.set(Math.cos(i * 1.7) * 1.1, 5.5, Math.sin(i * 1.7) * 1.1); pen.rotation.set(Math.sin(i) * 0.12, 0, Math.cos(i * 2) * 0.14); cup.add(pen);
  });
  // mug: glossy ceramic with tea
  const mug = new THREE.Group(); mug.position.set(30, 0, 22); scene.add(mug);
  const body = sh(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.5, 5.6, 48, 1, true), M.ceramic({ side: THREE.DoubleSide })));
  body.position.y = 2.8; mug.add(body);
  const base = sh(new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.4, 48), M.ceramic())); base.position.y = 0.2; mug.add(base);
  const tea = new THREE.Mesh(new THREE.CircleGeometry(2.45, 48), new THREE.MeshPhysicalMaterial({ color: 0x6b3a12, roughness: 0.05, clearcoat: 1 }));
  tea.rotation.x = -Math.PI / 2; tea.position.y = 4.8; mug.add(tea);
  const handle = sh(new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.38, 16, 40, Math.PI * 1.2), M.ceramic()));
  handle.position.set(2.6, 2.9, 0); handle.rotation.z = -Math.PI * 0.6; mug.add(handle);
}

// ---------- the book ----------
export async function createBook(subject, opts = {}) {
  await loadFonts();
  const W = opts.width ?? innerWidth, H = opts.height ?? innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(opts.dpr ?? Math.min(devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const L = LOOKS[opts.look] ?? LOOKS.marble;
  scene.background = new THREE.Color(L.bg);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = L.env;

  const camera = new THREE.PerspectiveCamera(30, W / H, 1, 500);

  // desk
  renderer.toneMappingExposure = L.exposure;
  let deskTex = null;
  if (L.desk) {
    deskTex = await new THREE.TextureLoader().loadAsync(new URL(`./assets/${L.desk}`, import.meta.url).href);
    deskTex.colorSpace = THREE.SRGBColorSpace; deskTex.wrapS = deskTex.wrapT = THREE.RepeatWrapping; deskTex.repeat.set(L.repeat, L.repeat); deskTex.anisotropy = 8;
  }
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshPhysicalMaterial({ map: deskTex, color: L.color ?? L.tint ?? 0xffffff, roughness: L.rough, clearcoat: L.rough < 0.3 ? 0.6 : 0, clearcoatRoughness: 0.2, envMapIntensity: 0.4 }));
  desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true;
  scene.add(desk);

  // light: warm low sun through a window (blind stripes from a spot cookie) + sky fill
  const sun = new THREE.DirectionalLight(...L.sun);
  sun.position.set(-40, 55, -30); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); sun.shadow.camera.left = -40; sun.shadow.camera.right = 40; sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 6;
  scene.add(sun);
  const cookie = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
    const v = g.createRadialGradient(256, 256, 40, 256, 256, 256); v.addColorStop(0, '#fff'); v.addColorStop(1, '#000');
    for (let i = 0; i < 4; i++) { g.fillStyle = v; g.fillRect(40 + i * 112, 0, 70, 512); }
    const t = new THREE.CanvasTexture(c); return t;
  })();
  const window_ = new THREE.SpotLight(L.spot[0], L.spot[1], 0, 0.5, 0.6, 1.6);
  window_.position.set(-60, 75, -40); window_.target.position.set(-4, 0, 8); window_.map = cookie; window_.castShadow = false;
  scene.add(window_, window_.target);
  scene.add(new THREE.HemisphereLight(...L.hemi));

  if (opts.props !== false) addProps(scene);

  // book: left block fixed, right block hinged at the spine (x = 0)
  const accent = subject.page.accent ?? '#e2392f';
  const edgeTex = pageEdgeTexture();
  const book = new THREE.Group(); scene.add(book);
  const coverMat = new THREE.MeshStandardMaterial({ color: subject.page.cover ?? '#1f2c4a', roughness: 0.7 });
  const coverL = new THREE.Mesh(new THREE.BoxGeometry(PAGE.w + COVER.over, COVER.t, PAGE.d + 2 * COVER.over), coverMat);
  coverL.position.set(-(PAGE.w + COVER.over) / 2, COVER.t / 2, 0); coverL.receiveShadow = coverL.castShadow = true;
  book.add(coverL);
  const left = pageBlock(-1, leftPageTexture(subject.page, accent), edgeTex);
  left.position.set(-PAGE.w / 2 - 0.15, COVER.t, 0);
  book.add(left);

  const hinge = new THREE.Group(); hinge.position.set(0, COVER.t, 0); book.add(hinge);
  const right = new THREE.Group(); hinge.add(right);
  const rightBlock = pageBlock(1, rightPageTexture(subject.page), edgeTex);
  rightBlock.position.set(PAGE.w / 2 + 0.15, 0, 0); right.add(rightBlock);
  const coverRGeo = new THREE.BoxGeometry(PAGE.w + COVER.over, COVER.t, PAGE.d + 2 * COVER.over);
  const coverArt = new THREE.MeshStandardMaterial({ map: coverTexture(subject.page, subject.page.cover ?? '#1f2c4a', accent), roughness: 0.65 });
  const coverR = new THREE.Mesh(coverRGeo, [coverMat, coverMat, coverMat, coverArt, coverMat, coverMat]);
  // bottom face (-y) carries the art: when the book is closed it faces up
  coverArt.map.rotation = Math.PI; coverArt.map.center.set(0.5, 0.5);
  coverR.position.set((PAGE.w + COVER.over) / 2, -COVER.t / 2, 0); coverR.castShadow = coverR.receiveShadow = true;
  right.add(coverR);
  // spine
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(PAGE.thick + 0.3, PAGE.thick + 0.3, PAGE.d + 2 * COVER.over, 24, 1, true, Math.PI / 2, Math.PI), coverMat);
  spine.rotation.x = Math.PI / 2; spine.rotation.z = 0; spine.position.set(0, PAGE.thick * 0.2, 0); spine.scale.set(0.45, 1, 1);
  book.add(spine);

  // the model sits on the right page, centred
  const stage = new THREE.Group(); stage.position.set(PAGE.w / 2 + 0.15, PAGE.thick + 0.02, 0); right.add(stage);
  const rise = new THREE.Group(); stage.add(rise);
  const model = await subject.build({ THREE, M, P, curve, slab, smoothShape, roundedRect, flowTexture, renderer, scene, root: rise, page: PAGE });

  // post
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.22, 0.3, L.bloom ?? 1.25);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const vignette = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, amount: { value: L.vignette }, warm: { value: L.warm } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float warm; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = (vUv - 0.5) * vec2(1.0, 1.25);
        float v = smoothstep(0.85, 0.2, length(d)); c.rgb *= mix(1.0 - amount, 1.0, v);
        c.rgb = mix(c.rgb, c.rgb * vec3(1.03, 1.0, 0.95), warm); gl_FragColor = c; }`,
  });
  composer.addPass(vignette);

  // ---- state: open (0 closed .. 1 open), rise (0 in the page .. 1 up), drive (0..1) ----
  const state = { open: opts.intro ? 0 : 1, rise: opts.intro ? 0 : 1, cam: { ...(subject.camera ?? {}) } };
  const camDefault = { x: 7.5, y: 0.5, z: 1.5, dist: 58, el: 52, az: -22, fov: 30, ...(subject.camera ?? {}) };
  function setCamera(c = {}) {
    const k = { ...camDefault, ...c };
    const el = THREE.MathUtils.degToRad(k.el), az = THREE.MathUtils.degToRad(k.az);
    const target = new THREE.Vector3(k.x, k.y, k.z);
    camera.position.set(target.x + k.dist * Math.cos(el) * Math.sin(az), target.y + k.dist * Math.sin(el), target.z + k.dist * Math.cos(el) * Math.cos(az));
    camera.fov = k.fov; camera.updateProjectionMatrix(); camera.lookAt(target);
  }
  setCamera();

  function applyPose() {
    const o = THREE.MathUtils.clamp(state.open, 0, 1);
    const e = o < 0.5 ? 4 * o * o * o : 1 - Math.pow(-2 * o + 2, 3) / 2;
    hinge.rotation.z = Math.PI * (1 - e) * 0.995;
    // closed, the right block lies face down on the left one
    hinge.position.y = COVER.t + (2 * PAGE.thick + 0.05) * (1 - e);
    const r = THREE.MathUtils.clamp(state.rise, 0, 1);
    const er = 1 - Math.pow(1 - r, 3);
    rise.position.y = -6 * (1 - er);
    rise.scale.setScalar(0.85 + 0.15 * er);
    rise.visible = r > 0.001;
  }

  // pointer: drag across the model's page to drive, click to fire the action
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hitPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(PAGE.thick + COVER.t));
  let target = model.u ?? 0.3, u = target, pointerOn = false;
  renderer.domElement.addEventListener('pointermove', (ev) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(hitPlane, p) && p.x > 0.5 && p.x < PAGE.w + 0.5 && Math.abs(p.z) < PAGE.d / 2) {
      pointerOn = true; target = THREE.MathUtils.clamp((p.x - 1.5) / (PAGE.w - 3), 0, 1);
    } else pointerOn = false;
  });
  renderer.domElement.addEventListener('click', () => { if (pointerOn) model.action?.(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') target = Math.min(1, target + 0.1);
    if (e.key === 'ArrowLeft') target = Math.max(0, target - 0.1);
    if (e.key === ' ' || e.key === 'Enter') model.action?.();
  });

  let last = performance.now(), t = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
    u += (target - u) * (1 - Math.exp(-dt * 5));
    if (opts.intro) {
      // the book opens, then the model rises out of the right page
      state.open = Math.min(1, Math.max(0, (t - 0.4) / 1.3));
      state.rise = Math.min(1, Math.max(0, (t - 1.5) / 1.1));
      if (t > 2.7) opts.intro = false;
    }
    model.update(dt, t, u);
    applyPose();
    composer.render();
    requestAnimationFrame(frame);
  }
  applyPose();
  requestAnimationFrame(frame);

  const api = {
    THREE, scene, camera, renderer, model, state, setCamera, composer, bloom, sun, window_,
    drive: (v) => { target = THREE.MathUtils.clamp(v, 0, 1); },
    snap: (v) => { target = u = THREE.MathUtils.clamp(v, 0, 1); },
    action: () => model.action?.(),
    pose: (p) => Object.assign(state, p),
    readout: () => model.readout?.() ?? '',
    resize: (w, h) => { renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); },
  };
  window.book = api;
  window.figureDrive = api.drive; window.figureAction = api.action;
  return api;
}
