// Biology · The double pump. Four glass chambers of glowing blood on a ceramic tray, flap valves,
// glass vessels to two frosted lungs and a capillary bed. Drive = heart rate (50..160 bpm).
const RED = 0xff2414, BLUE = 0x1250ff;

export default {
  page: {
    kicker: 'Biology · Lesson 3',
    title: 'The double\npump',
    lede: 'Your heart is two pumps sharing one wall, and it never takes a day off.',
    body: [
      'The right side pushes tired blue blood to your lungs to pick up oxygen. The left side sends the fresh red blood out to every cell in your body.',
      'Valves snap shut behind each squeeze, so blood can only go one way round.',
    ],
    key: 'output = rate × stroke',
    keyNote: '72 beats × 70 mL ≈ 5 L a minute',
    tryIt: 'Drag across the heart to change its pace. Tap it for one big beat.',
    caption: 'Fig. 3.1  The double pump',
    pageNo: 42,
    accent: '#e2392f',
    cover: '#7a1f24',
  },
  camera: { x: 6.5, y: 0.5, z: 0.8, dist: 60, el: 54, az: -20 },

  async build({ THREE, M, P, curve, slab, smoothShape, roundedRect, flowTexture, root }) {
    const g = new THREE.Group(); root.add(g);
    const shadowy = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // tray: ceramic base with a clear raised plate
    g.add(shadowy(new THREE.Mesh(slab(roundedRect(17.6, 25.2, 1.8), 0.32, 0.18), M.ceramic())));
    const plate = new THREE.Mesh(slab(roundedRect(16.6, 24.2, 1.4), 0.12, 0.1), M.glass({ roughness: 0.15, thickness: 0.3 }));
    plate.position.y = 0.66; g.add(plate);
    for (const [x, y] of [[-7.6, 11.4], [7.6, 11.4], [-7.6, -11.4], [7.6, -11.4]]) {
      const pin = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 32), M.alu()));
      pin.position.copy(P(x, y, 1.0)); g.add(pin);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.alu()); cap.position.copy(P(x, y, 1.35)); g.add(cap);
    }
    const BASE = 0.95; // top of the plate

    // ---- chambers ----
    const mirror = (pts) => pts.map(([x, y]) => [-x, y]);
    const RA = [[-4.3, 2.3], [-3.8, 4.1], [-2.1, 4.6], [-0.6, 3.8], [-0.35, 2.1], [-1.3, 1.05], [-3.2, 0.95]];
    const RV = [[-4.2, 0.2], [-2.3, 0.6], [-0.45, 0.4], [-0.2, -1.6], [-0.55, -3.9], [-1.3, -4.9], [-2.9, -3.5], [-4.2, -1.3]];
    const chambers = [];
    function chamber(pts, color, kind) {
      const shape = smoothShape(pts);
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const grp = new THREE.Group(); grp.position.copy(P(cx, cy, BASE)); g.add(grp);
      const local = smoothShape(pts.map(([x, y]) => [x - cx, y - cy]));
      const inner = smoothShape(pts.map(([x, y]) => [(x - cx) * 0.8, (y - cy) * 0.8]));
      const shell = new THREE.Mesh(slab(local, 1.9, 0.6), M.glass({ thickness: 1.6 }));
      shell.castShadow = true; grp.add(shell);
      const liq = new THREE.Mesh(slab(inner, 1.45, 0.45), M.liquid(color));
      liq.position.y = 0.25; grp.add(liq);
      // glossy highlight bubbles
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.12 + 0.06 * (i % 2), 16, 10), M.glass());
        b.position.set((i - 1.5) * 0.45, 2.45, ((i * 37) % 5 - 2) * 0.25); grp.add(b);
      }
      const c = { grp, shell, liq, kind, shape }; chambers.push(c); void shape; void local;
      return c;
    }
    const ra = chamber(RA, BLUE, 'a'), rv = chamber(RV, BLUE, 'v');
    const la = chamber(mirror(RA), RED, 'a'), lv = chamber(mirror(RV), RED, 'v');
    void ra; void rv; void la; void lv;
    // septum: a ceramic wall between the two sides
    const septum = shadowy(new THREE.Mesh(slab(smoothShape([[-0.12, 4.3], [0.12, 4.3], [0.16, -4.6], [-0.16, -4.6]], 24), 2.0, 0.1), M.ceramic()));
    septum.position.y = BASE; g.add(septum);

    // ---- valves: two ceramic leaflets per valve, hinged at the valve ring ----
    const valves = [];
    function valve(x, y, h, kind, dir = 1) {
      const grp = new THREE.Group(); grp.position.copy(P(x, y, h)); g.add(grp);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.12, 12, 40), M.alu()); ring.rotation.x = Math.PI / 2; grp.add(ring);
      const leaves = [];
      for (const s of [-1, 1]) {
        const pivot = new THREE.Group(); pivot.position.x = s * 0.8; grp.add(pivot);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 12, 0, Math.PI, 0, Math.PI / 2), M.ceramic({ side: THREE.DoubleSide }));
        leaf.scale.set(1, 0.18, 0.75); leaf.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; leaf.position.x = -s * 0.8;
        pivot.add(leaf); leaves.push({ pivot, s });
      }
      const v = { grp, leaves, kind, dir, open: 0 }; valves.push(v); return v;
    }
    valve(-2.3, 0.75, BASE + 1.05, 'av');  // tricuspid
    valve(2.3, 0.75, BASE + 1.05, 'av');   // mitral
    valve(-0.95, 0.15, BASE + 2.2, 'out'); // pulmonary
    valve(0.95, 0.15, BASE + 2.2, 'out');  // aortic

    // ---- vessels ----
    const flows = [];
    function vessel(pts, color, r = 0.24, circuit = 'sys') {
      const cv = curve(pts);
      const len = cv.getLength();
      const segs = Math.max(48, Math.round(len * 6));
      const glass = new THREE.Mesh(new THREE.TubeGeometry(cv, segs, r + 0.11, 20), M.glass({ thickness: 0.4 }));
      glass.castShadow = true; g.add(glass);
      const tex = flowTexture(color); tex.repeat.set(len / 2.2, 1);
      const liq = new THREE.Mesh(new THREE.TubeGeometry(cv, segs, r, 16), M.liquid(color, { map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55 }));
      g.add(liq);
      flows.push({ tex, circuit });
      // aluminium clamps with standoffs at a few points
      for (const t of [0.12, 0.5, 0.88]) {
        const p = cv.getPointAt(t), tan = cv.getTangentAt(t);
        const clamp = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.2, r + 0.2, 0.38, 28, 1, true), M.alu({ side: THREE.DoubleSide }));
        clamp.position.copy(p); clamp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan); clamp.castShadow = true; g.add(clamp);
        if (p.y > BASE + 0.6) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, p.y - BASE, 12), M.alu());
          leg.position.set(p.x, BASE + (p.y - BASE) / 2 - r, p.z); leg.castShadow = true; g.add(leg);
        }
      }
      return cv;
    }
    const H = BASE + 0.75;
    // right heart -> lungs (blue)
    vessel([[-0.95, 0.15, BASE + 2.2], [-1.1, 2.6, BASE + 3.4], [-2.2, 5.3, H + 0.9], [-3.6, 6.5, H + 0.3]], BLUE, 0.26, 'pul');
    vessel([[-1.1, 2.6, BASE + 3.4], [0.6, 4.9, BASE + 3.9], [2.6, 6.2, H + 0.9], [3.7, 6.7, H + 0.3]], BLUE, 0.2, 'pul');
    // lungs -> left atrium (red)
    vessel([[4.6, 6.4, H], [4.0, 5.2, H + 0.2], [3.0, 4.4, BASE + 1.6], [2.3, 3.5, BASE + 1.6]], RED, 0.22, 'pul');
    vessel([[-4.8, 6.3, H], [-3.0, 5.5, H + 1.6], [0.2, 5.4, BASE + 4.4], [1.8, 4.3, BASE + 2.0], [2.2, 3.3, BASE + 1.6]], RED, 0.2, 'pul');
    // left ventricle -> aorta -> body (red)
    vessel([[0.95, 0.15, BASE + 2.2], [1.6, 3.4, BASE + 4.2], [4.2, 4.6, BASE + 3.0], [6.4, 2.6, H + 0.6], [6.9, -3.0, H], [6.1, -7.6, H], [3.8, -9.3, H]], RED, 0.32, 'sys');
    // body -> vena cava -> right atrium (blue)
    vessel([[-3.8, -9.3, H], [-6.1, -7.6, H], [-6.9, -2.0, H], [-6.6, 3.2, H + 0.5], [-5.2, 4.9, BASE + 2.2], [-3.4, 4.0, BASE + 1.6]], BLUE, 0.32, 'sys');

    // ---- lungs: frosted glass with a branching tree that turns blue -> red ----
    const grad = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 4; const x = c.getContext('2d');
      const gr = x.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#1f6bff'); gr.addColorStop(0.55, '#a43cff'.replace('a43cff', '9a4cf0')); gr.addColorStop(1, '#ff2a1f');
      x.fillStyle = gr; x.fillRect(0, 0, 256, 4);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const gradMat = M.liquid(0xffffff, { map: grad, emissiveMap: grad, emissive: 0xffffff, emissiveIntensity: 0.6 });
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    function tree(x, y, h, ang, len, depth, out) {
      if (depth === 0) return;
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      const cv = curve([[x, y, h], [(x + x2) / 2 + (rnd() - 0.5) * 0.3, (y + y2) / 2, h + 0.05], [x2, y2, h]]);
      out.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 10, 0.05 + depth * 0.025, 8), gradMat));
      tree(x2, y2, h, ang + 0.45 + rnd() * 0.2, len * 0.72, depth - 1, out);
      tree(x2, y2, h, ang - 0.45 - rnd() * 0.2, len * 0.72, depth - 1, out);
    }
    for (const s of [-1, 1]) {
      const lung = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), M.frosted({ color: 0xffe4ea, roughness: 0.22, thickness: 1.2 }));
      lung.scale.set(3.0, 1.15, 3.7); lung.position.copy(P(s * 4.3, 8.6, BASE + 0.9)); lung.castShadow = true; g.add(lung);
      const tr = new THREE.Group(); g.add(tr);
      tree(s * 3.4, 6.2, BASE + 0.9, Math.PI / 2 + s * 0.25, 1.5, 5, tr);
    }
    // trachea: ribbed glass
    const trachea = curve([[0, 12.3, BASE + 0.9], [0, 10.2, BASE + 1.0], [0, 8.6, BASE + 1.0]]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(trachea, 40, 0.42, 20), M.frosted({ roughness: 0.25 })));
    for (let i = 0; i < 9; i++) {
      const p = trachea.getPointAt(i / 8);
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.06, 8, 28), M.ceramic()); rib.position.copy(p); g.add(rib);
    }

    // ---- capillary bed: red -> blue ----
    const capMat = M.liquid(0xffffff, { map: grad, emissiveMap: grad, emissive: 0xffffff, emissiveIntensity: 0.6 });
    grad.wrapS = THREE.ClampToEdgeWrapping;
    const capTex = grad.clone(); capTex.center.set(0.5, 0.5); capTex.rotation = Math.PI; capTex.needsUpdate = true; // red at the aorta end
    capMat.map = capTex; capMat.emissiveMap = capTex;
    for (let i = 0; i < 9; i++) {
      const dip = -9.3 - 1.25 * Math.sin((i / 8) * Math.PI) - (i % 3) * 0.12;
      const wob = (k) => Math.sin(i * 1.7 + k) * 0.45;
      const cv = curve([[3.8, -9.3, BASE + 0.75], [2.4, dip + wob(1) * 0.5, BASE + 0.6], [0.8 + wob(2), dip - 0.5 + 0.1 * i - 0.4, BASE + 0.5], [-0.8 + wob(3), dip - 0.4 + 0.08 * i - 0.4, BASE + 0.5], [-2.4, dip + wob(4) * 0.5, BASE + 0.6], [-3.8, -9.3, BASE + 0.75]]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 60, 0.07 + (i % 2) * 0.03, 8), capMat));
    }

    // ---- readout plaque ----
    const rc = document.createElement('canvas'); rc.width = 1024; rc.height = 200;
    const rctx = rc.getContext('2d');
    const rtex = new THREE.CanvasTexture(rc); rtex.colorSpace = THREE.SRGBColorSpace; rtex.anisotropy = 8;
    const plaque = shadowy(new THREE.Mesh(slab(roundedRect(8.6, 1.7, 0.5), 0.28, 0.08), M.ceramic()));
    plaque.position.copy(P(0, -11.75, BASE)); g.add(plaque);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.6), new THREE.MeshStandardMaterial({ map: rtex, transparent: true, roughness: 0.4 }));
    face.rotation.x = -Math.PI / 2; face.position.copy(P(0, -11.75, BASE + 0.45)); g.add(face);
    let shownBpm = -1;
    function drawReadout(bpm, beat) {
      rctx.clearRect(0, 0, 1024, 200);
      rctx.fillStyle = `rgba(255,42,31,${0.45 + 0.55 * beat})`; rctx.beginPath(); rctx.arc(70, 100, 26 + 8 * beat, 0, Math.PI * 2); rctx.fill();
      rctx.fillStyle = '#16171a'; rctx.font = '600 104px "Inter Tight"'; rctx.fillText(`${bpm}`, 130, 138);
      const w = rctx.measureText(`${bpm}`).width;
      rctx.fillStyle = '#6a6c72'; rctx.font = '600 40px "Inter Tight"'; rctx.fillText('BPM', 150 + w, 136);
      rctx.fillStyle = '#16171a'; rctx.font = '600 76px "Inter Tight"'; rctx.textAlign = 'right';
      rctx.fillText(`${(bpm * 0.07).toFixed(1)} L/min`, 990, 132); rctx.textAlign = 'left';
      rtex.needsUpdate = true;
    }

    // ---- motion ----
    let phase = 0, kick = 0;
    const bump = (x, a, b) => (x > a && x < b ? Math.sin(Math.PI * (x - a) / (b - a)) : 0);
    let bpm = 72, lastBeatGlow = -1;
    return {
      u: 0.2,
      update(dt, t, u) {
        bpm = Math.round(50 + 110 * u);
        const before = phase;
        phase += dt * bpm / 60;
        if (Math.floor(phase) !== Math.floor(before)) kick *= 0.3;
        const f = phase % 1;
        const strength = 1 + kick;
        const a = bump(f, 0, 0.16) * strength, v = bump(f, 0.16, 0.48) * strength;
        for (const c of chambers) {
          const s = c.kind === 'a' ? a * 0.1 : v * 0.13;
          c.grp.scale.set(1 - s, 1 - s * 0.6, 1 - s);
          c.liq.material.emissiveIntensity = 0.9 + (c.kind === 'a' ? a : v) * 0.7;
        }
        const vOpen = v > 0.02 ? 1 : 0;
        for (const vl of valves) {
          const want = vl.kind === 'av' ? 1 - vOpen : vOpen;
          vl.open += (want - vl.open) * (1 - Math.exp(-dt * 28));
          for (const L of vl.leaves) L.pivot.rotation.z = L.s * vl.open * 1.15;
        }
        const surge = 0.4 + 2.6 * v + 0.6 * a;
        for (const fl of flows) fl.tex.offset.x -= dt * surge * (bpm / 72) * (fl.circuit === 'pul' ? 0.9 : 1.1);
        capTex.offset.x = 0;
        const beatGlow = Math.max(a, v);
        if (bpm !== shownBpm || Math.abs(beatGlow - lastBeatGlow) > 0.05) { drawReadout(bpm, Math.min(1, beatGlow)); shownBpm = bpm; lastBeatGlow = beatGlow; }
      },
      action() { phase = Math.floor(phase) + 0.999; kick = 0.8; },
      readout: () => `${bpm} bpm · ${(bpm * 0.07).toFixed(1)} L/min`,
    };
  },
};
