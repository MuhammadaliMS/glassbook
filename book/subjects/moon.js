// Astronomy · Why the Moon changes shape. A classroom orrery: a glowing glass lamp (the Sun), a ceramic
// Earth on an aluminium post, a pearl Moon on a slim arm orbiting it, and a ring of eight frosted cups
// each holding a tiny Moon in its phase. u = one lap of the Moon (0 new, 0.5 full, 1 new again).
const AMBER = 0xe8a020;
const MONTH = 29.53;
const NAMES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];

function phaseName(f) {
  if (f < 0.03 || f > 0.97) return NAMES[0];
  if (f < 0.22) return NAMES[1];
  if (f < 0.28) return NAMES[2];
  if (f < 0.47) return NAMES[3];
  if (f <= 0.53) return NAMES[4];
  if (f < 0.72) return NAMES[5];
  if (f <= 0.78) return NAMES[6];
  return NAMES[7];
}

export default {
  page: {
    kicker: 'Astronomy · Lesson 2',
    title: 'Why the Moon\nchanges shape',
    lede: 'The Moon makes no light of its own, and half of it is always lit. What changes is how much of that half you can see.',
    body: [
      'The Sun lights one side of the Moon at all times. As the Moon circles the Earth, you look at that bright side from a new angle: a thin crescent, then a half, then a full disc.',
      'Earth’s shadow has nothing to do with it. One lap takes about a month, and the same face of the Moon always points at us.',
    ],
    key: 'half lit, always',
    keyNote: '29.5 days from new to new',
    tryIt: 'Drag across the orrery to move the Moon round the Earth. Tap to run a whole month.',
    caption: 'Fig. 2.4  Phases of the Moon',
    pageNo: 58,
    accent: '#e8a020',
    cover: '#1b2a4e',
  },
  camera: { x: 8, y: 2.5, z: -0.5, dist: 68, el: 54, az: -20 },

  async build({ THREE, M, P, slab, roundedRect, root }) {
    const g = new THREE.Group(); root.add(g);
    const shadowy = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
    const BASE = 0.95;
    let seed = 11; const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

    // tray (same ceramic tray + clear plate as the heart)
    g.add(shadowy(new THREE.Mesh(slab(roundedRect(17.6, 25.2, 1.8), 0.32, 0.18), M.ceramic())));
    const plate = new THREE.Mesh(slab(roundedRect(16.6, 24.2, 1.4), 0.12, 0.1), M.glass({ roughness: 0.15, thickness: 0.3 }));
    plate.position.y = 0.66; g.add(plate);
    for (const [x, y] of [[-7.6, 11.4], [7.6, 11.4], [-7.6, -11.4], [7.6, -11.4]]) {
      const pin = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 32), M.alu()));
      pin.position.copy(P(x, y, 1.0)); g.add(pin);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.alu()); cap.position.copy(P(x, y, 1.35)); g.add(cap);
    }

    // ---------- orrery geometry parameters (orr-local: x right, y up, z toward the viewer) ----------
    const CX = 1.2, CY = 2.3;        // orrery centre on the page
    const SUNPAGE = [-6.7, -8.5];    // the Sun stands front-left, toward the camera
    const SUNV = [SUNPAGE[0] - CX, SUNPAGE[1] - CY];
    const SUND = Math.hypot(SUNV[0], SUNV[1]);
    const S = [SUNV[0] / SUND, SUNV[1] / SUND]; // page-plane unit vector toward the Sun
    const PSI = Math.atan2(-S[0], S[1]);
    const EC = 5.4;                  // Earth centre height
    const ER = 2.5;                  // Earth radius
    const MR = 1.36;                 // Moon radius
    const ORB = 4.9;                 // Moon orbit radius
    const TILT = -0.2;               // orbit plane tilt (full moon rides high)
    const CUPR = 5.8;                // radius of the ring of cups
    const SH = 6.6, SR = 2.6;        // Sun globe centre height and radius
    const FL = 0.38;                 // floor of the clear disc
    const orr = new THREE.Group(); orr.position.copy(P(CX, CY, BASE)); g.add(orr);
    const lp = (px, py, h) => new THREE.Vector3(px, h, -py);
    const rot = (th, v = S) => [v[0] * Math.cos(th) - v[1] * Math.sin(th), v[0] * Math.sin(th) + v[1] * Math.cos(th)];
    const orbitM = new THREE.Matrix4().makeRotationY(PSI).multiply(new THREE.Matrix4().makeRotationX(TILT));
    const moonLocal = (th, R = ORB) => new THREE.Vector3(-R * Math.sin(th), 0, -R * Math.cos(th)).applyMatrix4(orbitM).add(new THREE.Vector3(0, EC, 0));

    // ---------- round base: ceramic disc, clear plate, amber channels ----------
    const cdisc = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.6, 0.2, 128), M.ceramic()));
    cdisc.position.y = 0.1; orr.add(cdisc);
    const gdisc = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(7.4, 7.4, 0.2, 128), M.glass({ roughness: 0.1, thickness: 0.4 })));
    gdisc.position.y = 0.28; orr.add(gdisc);
    const rimRing = shadowy(new THREE.Mesh(new THREE.TorusGeometry(7.4, 0.1, 14, 192), M.alu()));
    rimRing.rotation.x = Math.PI / 2; rimRing.position.y = 0.38; orr.add(rimRing);
    const glowMat = (k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(AMBER).multiplyScalar(k) });
    const flatRing = (r, tube, y, k = 1.5) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 220), glowMat(k)); m.rotation.x = Math.PI / 2; m.position.y = y; orr.add(m); return m; };
    flatRing(7.1, 0.045, FL + 0.03, 1.7);
    flatRing(3.55, 0.05, FL + 0.03, 1.9);
    // screw heads around the rim
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 6), M.alu({ roughness: 0.4 }));
      sc.position.set(Math.cos(a) * 7.4, 0.4, Math.sin(a) * 7.4); orr.add(sc);
    }

    // ---------- dial ----------
    const dialTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
      x.fillStyle = '#e4e6ea'; x.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(80,84,92,${rnd() * 0.05})`; x.fillRect(rnd() * 1024, rnd() * 1024, 2 + rnd() * 5, 1); }
      const cx = 512, cy = 512, R = 480;
      for (let n = 0; n < 30; n++) {
        const th = (n / MONTH) * Math.PI * 2, d = rot(th);
        const major = n % 5 === 0;
        x.strokeStyle = major ? '#1c2028' : '#5a606c'; x.lineWidth = major ? 7 : 4;
        x.beginPath(); x.moveTo(cx + d[0] * R * (major ? 0.82 : 0.88), cy - d[1] * R * (major ? 0.82 : 0.88)); x.lineTo(cx + d[0] * R * 0.97, cy - d[1] * R * 0.97); x.stroke();
        if (major) { x.fillStyle = '#1c2028'; x.font = '600 50px "Inter Tight"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), cx + d[0] * R * 0.68, cy - d[1] * R * 0.68); }
      }
      x.strokeStyle = '#8a909c'; x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, R * 0.99, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.arc(cx, cy, R * 0.34, 0, Math.PI * 2); x.stroke();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    })();
    const dial = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.5, 0.26, 96), M.alu({ roughness: 0.3 })));
    dial.position.y = FL + 0.13; orr.add(dial);
    const dialFace = new THREE.Mesh(new THREE.CircleGeometry(3.4, 96), new THREE.MeshStandardMaterial({ map: dialTex, metalness: 0.7, roughness: 0.35, envMapIntensity: 1.1 }));
    dialFace.rotation.x = -Math.PI / 2; dialFace.position.y = FL + 0.265; orr.add(dialFace);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.13;
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 6), M.alu({ roughness: 0.4 }));
      sc.position.set(Math.cos(a) * 3.62, FL + 0.18, Math.sin(a) * 3.62); orr.add(sc);
    }
    // day pointer riding on the dial, always under the Moon
    const pointer = new THREE.Group(); pointer.position.y = FL + 0.32; orr.add(pointer);
    const pbar = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 0.1), M.alu()); pbar.position.x = 2.05; pointer.add(pbar);
    const ptip = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 12), glowMat(2.4)); ptip.position.x = 3.2; pointer.add(ptip);
    // pedestal and post
    const ped = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.5, 64), M.ceramic()));
    ped.position.y = FL + 0.5; orr.add(ped);
    for (const [r, y, h] of [[0.5, FL + 0.82, 0.14], [0.4, FL + 1.1, 0.12]]) {
      const c = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40), M.alu())); c.position.y = y; orr.add(c);
    }
    const post = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, EC - ER - FL - 0.6, 24), M.alu()));
    post.position.y = FL + 0.65 + (EC - ER - FL - 0.6) / 2; orr.add(post);
    const axle = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 7.2, 16), M.alu()));
    axle.position.y = EC + 0.5; orr.add(axle);

    // ---------- Earth: glossy ceramic, white land on blue glaze ----------
    const earthTex = (() => {
      const W = 1024, H = 512; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      const og = x.createLinearGradient(0, 0, 0, H); og.addColorStop(0, '#2a68d8'); og.addColorStop(0.5, '#1450c4'); og.addColorStop(1, '#2a68d8');
      x.fillStyle = og; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 420; i++) { x.fillStyle = `rgba(120,170,255,${rnd() * 0.06})`; x.beginPath(); x.ellipse(rnd() * W, rnd() * H, 8 + rnd() * 40, 2 + rnd() * 6, 0, 0, 7); x.fill(); }
      const land = (cx, cy, rx, ry, n) => {
        for (let i = 0; i < n; i++) {
          const a = rnd() * 6.283, d = rnd();
          const px = cx + Math.cos(a) * rx * d, py = cy + Math.sin(a) * ry * d, s = 14 + rnd() * 34;
          x.fillStyle = rnd() > 0.7 ? '#dfe9d2' : '#f6f2e8';
          x.beginPath(); x.ellipse(px, py, s * (0.8 + rnd() * 0.8), s * (0.6 + rnd() * 0.7), rnd() * 3, 0, 7); x.fill();
        }
      };
      land(250, 160, 110, 80, 70); land(300, 340, 55, 110, 50); land(540, 175, 70, 50, 50); land(560, 310, 70, 90, 60);
      land(740, 170, 160, 70, 80); land(850, 360, 60, 40, 30); land(620, 120, 40, 25, 16); land(130, 250, 40, 100, 20); land(950, 230, 50, 90, 30);
      x.fillStyle = '#fbfaf6'; x.fillRect(0, 0, W, 26); x.fillRect(0, H - 34, W, 34);
      for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.08})`; x.beginPath(); x.ellipse(rnd() * W, rnd() * H, 30 + rnd() * 80, 4 + rnd() * 10, rnd() * 0.5, 0, 7); x.fill(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; return t;
    })();
    const earthMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: earthTex }, uLamp: { value: new THREE.Vector3() } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vWP; void main(){ vUv = uv; vN = mat3(modelMatrix) * normal; vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform sampler2D map; uniform vec3 uLamp; varying vec2 vUv; varying vec3 vN; varying vec3 vWP;
        void main(){
          vec3 N = normalize(vN), L = normalize(uLamp - vWP), V = normalize(cameraPosition - vWP);
          float d = dot(N, L);
          float diff = smoothstep(-0.04, 0.22, d) * (0.3 + 0.7 * pow(max(d, 0.0), 0.6));
          vec3 tex = texture2D(map, vUv).rgb;
          vec3 col = tex * (vec3(0.018, 0.026, 0.06) + vec3(1.25, 1.15, 1.0) * diff * 1.15);
          vec3 H = normalize(L + V);
          col += vec3(1.0, 0.95, 0.85) * pow(max(dot(N, H), 0.0), 150.0) * 3.0 * smoothstep(0.0, 0.25, d);
          float rim = pow(1.0 - max(dot(N, V), 0.0), 3.5);
          col += vec3(0.5, 0.65, 1.0) * rim * (0.05 + 0.35 * diff);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const earth = shadowy(new THREE.Mesh(new THREE.SphereGeometry(ER, 96, 64), earthMat));
    earth.position.y = EC; orr.add(earth);
    // hub above the Earth, with the Moon arm's pivot
    const hubY = EC + ER + 1.5;
    const hub = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 40), M.alu({ roughness: 0.2 })));
    hub.position.y = hubY - 0.1; orr.add(hub);
    const hubCap = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 16), M.alu({ roughness: 0.2 })));
    hubCap.position.y = hubY + 0.15; orr.add(hubCap);
    const collarTop = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 10, 32), M.alu()); collarTop.rotation.x = Math.PI / 2; collarTop.position.y = EC + ER + 0.05; orr.add(collarTop);

    // ---------- the orbit ring, with its posts ----------
    const orbitGroup = new THREE.Group(); orbitGroup.position.y = EC; orbitGroup.quaternion.setFromRotationMatrix(orbitM); orr.add(orbitGroup);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ORB, 0.055, 12, 256), M.liquid(AMBER, { emissiveIntensity: 1.5 }));
    ring.rotation.x = Math.PI / 2; orbitGroup.add(ring);
    for (let i = 0; i < 29; i++) { // day ticks along the ring
      const th = (i / MONTH) * Math.PI * 2, tk = new THREE.Mesh(new THREE.SphereGeometry(i % 5 === 0 ? 0.1 : 0.055, 10, 8), glowMat(i % 5 === 0 ? 2.2 : 1.2));
      tk.position.set(-ORB * Math.sin(th), 0, -ORB * Math.cos(th)); orbitGroup.add(tk);
    }
    for (let k = 0; k < 4; k++) {
      const a = (22.5 + 90 * k) * Math.PI / 180, p = moonLocal(a);
      const h = p.y - 0.1, st = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, h - FL, 14), M.alu()));
      st.position.set(p.x, FL + (h - FL) / 2, p.z); orr.add(st);
      const col = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), M.alu()); col.position.set(p.x, p.y, p.z); orr.add(col);
      const foot = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.1, 24), M.alu())); foot.position.set(p.x, FL + 0.05, p.z); orr.add(foot);
    }

    // ---------- Moon: custom shader, lit only by the lamp, so the dark half reads dark ----------
    const moonTex = (() => {
      const W = 1024, H = 512; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      x.fillStyle = '#e7e4db'; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '120,116,108'},${rnd() * 0.06})`; x.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 6, 1 + rnd() * 3); }
      for (const [cx, cy, r] of [[470, 190, 90], [560, 250, 70], [430, 290, 80], [610, 160, 55], [350, 220, 60], [520, 330, 45], [640, 270, 50]]) {
        const gr = x.createRadialGradient(cx, cy, 4, cx, cy, r); gr.addColorStop(0, 'rgba(110,108,104,0.62)'); gr.addColorStop(0.7, 'rgba(120,118,112,0.35)'); gr.addColorStop(1, 'rgba(120,118,112,0)');
        x.fillStyle = gr; x.beginPath(); x.ellipse(cx, cy, r * 1.2, r, rnd(), 0, 7); x.fill();
      }
      for (let i = 0; i < 260; i++) {
        const cx = rnd() * W, cy = 50 + rnd() * (H - 100), r = 3 + Math.pow(rnd(), 2.4) * 26;
        const gr = x.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.2, cx, cy, r);
        gr.addColorStop(0, 'rgba(86,84,80,0.40)'); gr.addColorStop(0.78, 'rgba(110,108,102,0.16)'); gr.addColorStop(0.92, 'rgba(255,255,255,0.34)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    })();
    const moonGeo = new THREE.SphereGeometry(MR, 64, 48); moonGeo.rotateY(-Math.PI / 2);
    const miniGeo = new THREE.SphereGeometry(0.8, 48, 36); miniGeo.rotateY(-Math.PI / 2); // texture centre faces +Z
    const moonMat = (gain = 1) => new THREE.ShaderMaterial({
      uniforms: { map: { value: moonTex }, uL: { value: new THREE.Vector3(0, 0, 1) }, gain: { value: gain } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D map; uniform vec3 uL; uniform float gain; varying vec2 vUv; varying vec3 vN;
        void main(){
          vec3 n = normalize(vN); float d = dot(n, uL);
          float lit = smoothstep(-0.03, 0.2, d) * (0.35 + 0.65 * pow(max(d, 0.0), 0.55));
          vec3 tex = texture2D(map, vUv).rgb;
          vec3 col = tex * (vec3(0.022, 0.026, 0.04) + vec3(1.75, 1.68, 1.55) * lit * gain);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const moon = new THREE.Mesh(moonGeo, moonMat(1.0)); moon.castShadow = true; orbitGroup.add(moon);
    const collarM = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.34, 20), M.alu())); orr.add(collarM);
    const armMesh = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 12), M.alu())); orr.add(armMesh);
    const pivot = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), M.alu({ roughness: 0.2 }))); pivot.position.y = hubY + 0.05; orr.add(pivot);

    // ---------- the Sun: warm glass lamp on an aluminium stand ----------
    const sun = new THREE.Group(); sun.position.copy(lp(SUNV[0], SUNV[1], 0)); orr.add(sun);
    const base1 = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.0, 0.4, 64), M.alu({ roughness: 0.22 }))); base1.position.y = 0.2; sun.add(base1);
    const base2 = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.4, 64), M.alu({ roughness: 0.22 }))); base2.position.y = 0.6; sun.add(base2);
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(1.92, 0.05, 8, 80), glowMat(2)); baseRing.rotation.x = Math.PI / 2; baseRing.position.y = 0.42; sun.add(baseRing);
    const stemTop = SH - SR - 0.5;
    const stem = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, stemTop - 0.8, 28), M.alu())); stem.position.y = 0.8 + (stemTop - 0.8) / 2; sun.add(stem);
    for (const y of [1.6, 2.6]) { const cl = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 32), M.alu({ roughness: 0.2 }))); cl.position.y = y; sun.add(cl); }
    const socket = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.55, 0.5, 40), M.alu({ roughness: 0.2 }))); socket.position.y = SH - SR - 0.1; sun.add(socket);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(SR, 80, 60), new THREE.ShaderMaterial({
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vN; void main(){ float f = pow(clamp(abs(vN.z), 0.0, 1.0), 1.6); vec3 col = mix(vec3(4.2, 2.3, 0.6), vec3(8.0, 6.6, 4.4), f); gl_FragColor = vec4(col, 1.0); }',
    })); bulb.position.y = SH; sun.add(bulb);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(SR + 0.08, 64, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false })); shell.position.y = SH; sun.add(shell);
    const swirls = [];
    for (let i = 0; i < 3; i++) {
      const sw = new THREE.Mesh(new THREE.TorusGeometry(SR * (0.55 + i * 0.07), 0.05, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.45).multiplyScalar(6) }));
      sw.position.y = SH; sw.rotation.set(i * 1.1, i * 0.7, i * 0.4); sun.add(sw); swirls.push(sw);
    }
    const core = new THREE.Object3D(); // kept for the breathing pulse
    const halo = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      const gr = x.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, 'rgba(255,200,120,0.5)'); gr.addColorStop(0.35, 'rgba(255,190,100,0.35)'); gr.addColorStop(1, 'rgba(255,170,70,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.scale.setScalar(SR * 3.4); sp.position.y = SH; sun.add(sp); return sp;
    })();
    void halo;
    const lamp = new THREE.PointLight(0xffd9a8, 110, 0, 2); lamp.position.y = SH; sun.add(lamp);

    // ---------- eight phase cups ----------
    const cupProfile = [[0.001, 0], [1.18, 0], [1.3, 0.1], [1.3, 1.45], [1.22, 1.56], [1.1, 1.56], [1.08, 0.5], [1.0, 0.4], [0.001, 0.4]].map(([r, y]) => new THREE.Vector2(r, y));
    const cupGeo = new THREE.LatheGeometry(cupProfile, 64); cupGeo.scale(0.92, 0.92, 0.92);
    const cups = [];
    for (let k = 0; k < 8; k++) {
      const th = (k / 8) * Math.PI * 2, d = rot(th), pos = lp(d[0] * CUPR, d[1] * CUPR, FL);
      const holder = new THREE.Group(); holder.position.copy(pos); orr.add(holder);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2; pool.position.y = 0.04; holder.add(pool);
      const gring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.05, 8, 64), glowMat(1)); gring.rotation.x = Math.PI / 2; gring.position.y = 0.06; holder.add(gring);
      const lift = new THREE.Group(); holder.add(lift);
      const cup = new THREE.Mesh(cupGeo, M.frosted({ roughness: 0.3, thickness: 0.9 })); cup.castShadow = true; lift.add(cup);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.045, 8, 64), M.alu({ roughness: 0.2 })); lip.rotation.x = Math.PI / 2; lip.position.y = 1.44; lift.add(lip);
      const mm = moonMat(1.15); mm.uniforms.uL.value.set(Math.sin(th), 0, -Math.cos(th)).normalize();
      const mini = new THREE.Mesh(miniGeo, mm); mini.rotation.x = -0.96; mini.position.y = 1.25; lift.add(mini);
      cups.push({ holder, lift, pool, gring, mm });
    }

    // ---------- readout plaque ----------
    const rc = document.createElement('canvas'); rc.width = 1024; rc.height = 200;
    const rctx = rc.getContext('2d');
    const rtex = new THREE.CanvasTexture(rc); rtex.colorSpace = THREE.SRGBColorSpace; rtex.anisotropy = 8;
    const plaque = shadowy(new THREE.Mesh(slab(roundedRect(8.6, 1.7, 0.5), 0.28, 0.08), M.ceramic()));
    plaque.position.copy(P(0, -11.75, BASE)); g.add(plaque);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.6), new THREE.MeshStandardMaterial({ map: rtex, transparent: true, roughness: 0.4 }));
    face.rotation.x = -Math.PI / 2; face.position.copy(P(0, -11.75, BASE + 0.45)); g.add(face);
    let shownKey = '';
    function drawReadout(day, name, pct, f) {
      rctx.clearRect(0, 0, 1024, 200);
      // phase icon
      const cx = 100, cy = 100, r = 66, th = f * Math.PI * 2, m = f <= 0.5 ? 1 : -1, k = Math.cos(th);
      rctx.fillStyle = '#2b3140'; rctx.beginPath(); rctx.arc(cx, cy, r, 0, Math.PI * 2); rctx.fill();
      rctx.fillStyle = '#f4efe2'; rctx.beginPath();
      for (let i = 0; i <= 40; i++) { const s = (i / 40) * Math.PI; const px = cx + m * r * Math.sin(s), py = cy - r * Math.cos(s); i ? rctx.lineTo(px, py) : rctx.moveTo(px, py); }
      for (let i = 40; i >= 0; i--) { const s = (i / 40) * Math.PI; rctx.lineTo(cx + m * k * r * Math.sin(s), cy - r * Math.cos(s)); }
      rctx.fill();
      rctx.strokeStyle = '#2b3140'; rctx.lineWidth = 3; rctx.beginPath(); rctx.arc(cx, cy, r, 0, Math.PI * 2); rctx.stroke();
      rctx.strokeStyle = '#e8a020'; rctx.lineWidth = 5; rctx.beginPath(); rctx.arc(cx, cy, r + 9, 0, Math.PI * 2); rctx.stroke();
      rctx.fillStyle = '#6a6c72'; rctx.font = '600 38px "Inter Tight"'; rctx.textAlign = 'left'; rctx.fillText('DAY', 200, 128);
      rctx.fillStyle = '#16171a'; rctx.font = '600 112px "Inter Tight"'; rctx.fillText(String(day), 292, 142);
      rctx.textAlign = 'right'; rctx.fillStyle = '#16171a'; rctx.font = '600 66px "Inter Tight"'; rctx.fillText(name, 990, 106);
      rctx.fillStyle = '#b06f08'; rctx.font = '600 44px "Inter Tight"'; rctx.fillText(`${pct}% lit`, 990, 162);
      rctx.textAlign = 'left';
      rtex.needsUpdate = true;
    }

    // ---------- motion ----------
    let run = null, lastU = 0, info = { day: 0, name: NAMES[0], pct: 0 };
    const ease = (p) => p * p * (3 - 2 * p);
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const phaseOf = (f) => {
      const day = Math.min(Math.round(f * MONTH), 29);
      return { day, name: phaseName(f), pct: Math.round(((1 - Math.cos(f * Math.PI * 2)) / 2) * 100) };
    };
    return {
      u: 0.25,
      update(dt, t, u) {
        lastU = u;
        let f = u;
        if (run) {
          run.p += dt / 4;
          if (run.p >= 1) run = null; else f = (run.u0 + ease(run.p)) % 1;
        }
        const th = f * Math.PI * 2;
        // Earth
        earth.rotation.y = t * 0.45;
        lamp.getWorldPosition(tmp); earthMat.uniforms.uLamp.value.copy(tmp);
        // Moon on its arm
        const mp = moonLocal(th);
        moon.position.set(-ORB * Math.sin(th), 0, -ORB * Math.cos(th)); moon.rotation.y = th;
        tmp.copy(mp).sub(new THREE.Vector3(0, EC, 0)); // moon offset from Earth centre (orr-local)
        const a0 = tmp2.set(0, hubY + 0.05, 0), a1 = mp.clone();
        const dir = a1.clone().sub(a0), len = dir.length(); dir.normalize();
        const end = a1.clone().addScaledVector(dir, -(MR * 0.5));
        const armLen = end.distanceTo(a0);
        armMesh.position.copy(a0).add(end).multiplyScalar(0.5); armMesh.scale.set(1, armLen, 1); armMesh.quaternion.setFromUnitVectors(up, dir);
        collarM.position.copy(a1).addScaledVector(dir, -(MR * 0.72)); collarM.quaternion.setFromUnitVectors(up, dir);
        void len;
        // lamp direction in the Moon's own frame
        lamp.getWorldPosition(tmp); moon.updateWorldMatrix(true, false);
        moon.worldToLocal(tmp); moon.material.uniforms.uL.value.copy(tmp).normalize();
        // day pointer
        const d = rot(th); pointer.rotation.y = Math.atan2(d[1], d[0]);
        // Sun life
        swirls.forEach((s, i) => { s.rotation.x += dt * (0.5 + i * 0.3); s.rotation.y += dt * (0.4 - i * 0.2); });
        bulb.scale.setScalar(1 + 0.012 * Math.sin(t * 2.1));
        // cups: matching phase rises and glows
        for (let k = 0; k < cups.length; k++) {
          const dd = Math.abs(((f * 8 - k + 4) % 8 + 8) % 8 - 4);
          const x = Math.max(0, Math.min(1, 1 - (dd - 0.2) / 0.9)), act = x * x * (3 - 2 * x);
          const c = cups[k];
          c.lift.position.y = 0.55 * act;
          c.gring.material.color.set(AMBER).multiplyScalar(0.4 + 2.4 * act);
          c.pool.material.opacity = 0.1 + 0.6 * act;
          c.mm.uniforms.gain.value = 1.0 + 0.25 * act;
        }
        info = phaseOf(f);
        const key = `${info.day}|${info.name}|${info.pct}|${document.fonts.check('600 20px "Inter Tight"')}`;
        if (key !== shownKey) { drawReadout(info.day, info.name, info.pct, f); shownKey = key; }
      },
      action() { if (!run) run = { p: 0, u0: lastU }; },
      readout: () => `day ${info.day} · ${info.name.toLowerCase()} · ${info.pct}% lit`,
    };
  },
};
