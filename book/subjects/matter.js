// Chemistry · Ice, water, steam. A glass cylinder of glowing blue particles on a ceramic hot plate,
// brushed-aluminium piston, a thermometer and a dial. Drive = heat (-20 .. 140 °C) with latent-heat
// plateaus at 0 °C (melting) and 100 °C (boiling). Particles: lattice -> pool -> flying gas.
const ORANGE = 0xff6a1a;

export default {
  page: {
    kicker: 'Chemistry · Lesson 1',
    title: 'Ice, water,\nsteam',
    lede: 'Ice, water and steam are the same stuff. The only thing that changes is how fast the particles move.',
    body: [
      'In ice, particles are locked in a tidy lattice and can only shiver in place. Add energy and they shake loose, slump into a pool and slide past each other: that is liquid water.',
      'Keep heating and they fly apart, bouncing off every wall and pushing the piston up. While a state is changing, the heat goes into breaking bonds, so the temperature waits.',
    ],
    key: 'heat = faster particles',
    keyNote: '0 °C melts · 100 °C boils',
    tryIt: 'Drag across the burner to turn up the heat. Tap to cool it back down.',
    caption: 'Fig. 1.2  States of matter',
    pageNo: 8,
    accent: '#f26a21',
    cover: '#0f4c55',
  },
  camera: { x: 7.5, y: 8, z: 1.2, dist: 88, el: 52, az: -22 },

  async build({ THREE, M, P, slab, roundedRect, root }) {
    const g = new THREE.Group(); root.add(g);
    const shadowy = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };
    const ss = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    const clamp01 = (x) => Math.min(1, Math.max(0, x));
    const lerp = (a, b, k) => a + (b - a) * k;
    const tri = (q) => { const f = q - Math.floor(q); return 1 - Math.abs(2 * f - 1); };
    let seed = 1234; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const add = (parent, mesh, x, y, z) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };

    // ---- tray (as the reference subject) ----
    g.add(shadowy(new THREE.Mesh(slab(roundedRect(17.6, 25.2, 1.8), 0.32, 0.18), M.ceramic())));
    const trayPlate = new THREE.Mesh(slab(roundedRect(16.6, 24.2, 1.4), 0.12, 0.1), M.glass({ roughness: 0.15, thickness: 0.3 }));
    trayPlate.position.y = 0.66; g.add(trayPlate);
    for (const [x, y] of [[-7.6, 11.4], [7.6, 11.4], [-7.6, -11.4], [7.6, -11.4]]) {
      const pin = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 32), M.alu()));
      pin.position.copy(P(x, y, 1.0)); g.add(pin);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.alu()); cap.position.copy(P(x, y, 1.35)); g.add(cap);
    }
    const BASE = 0.95;

    // ---- hot plate ----
    const PX = 0, PY = 0.5;           // plate centre (page coords)
    const CX = -2.8, CY = 3.4;        // cylinder centre
    const PT = BASE + 2.0;            // top of the plate
    const plate = shadowy(new THREE.Mesh(slab(roundedRect(15.6, 18.2, 2.2), 1.2, 0.4), M.ceramic({ roughness: 0.22 })));
    plate.position.copy(P(PX, PY, BASE)); g.add(plate);
    const skin = shadowy(new THREE.Mesh(slab(roundedRect(13.6, 16.4, 1.7), 0.04, 0.1), M.ceramic({ roughness: 0.15 })), false);
    skin.position.copy(P(PX, PY, PT - 0.02)); g.add(skin);
    for (const [sx, sy] of [[-6.9, -8.4], [6.9, -8.4], [-6.9, 8.4], [6.9, 8.4]]) {
      const sc = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 24), M.alu()), false);
      sc.position.copy(P(PX + sx * 0.97, PY + sy * 0.94, PT + 0.17)); g.add(sc);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.07), M.ceramic({ color: 0x555a60 }));
      slot.position.copy(P(PX + sx * 0.97, PY + sy * 0.94, PT + 0.23)); slot.rotation.y = 0.6 + sx * 0.1; g.add(slot);
    }

    // everything of the cylinder assembly lives in one group at its centre
    const cyl = new THREE.Group(); cyl.position.copy(P(CX, CY, PT)); g.add(cyl);
    const RIN = 3.1, ROUT = 3.4, HC = 19, FLOOR = 0.34; // FLOOR: top of the alu floor disc (local y)

    // heater ring + halo
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x8c8884, roughness: 0.35, metalness: 0.6, emissive: ORANGE, emissiveIntensity: 0 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ROUT + 0.62, 0.2, 18, 96), ringMat); ring.rotation.x = Math.PI / 2; add(cyl, ring, 0, 0.12, 0);
    const ring2Mat = ringMat.clone();
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(ROUT + 1.2, 0.07, 12, 96), ring2Mat); ring2.rotation.x = Math.PI / 2; add(cyl, ring2, 0, 0.08, 0);
    const trim = shadowy(new THREE.Mesh(new THREE.TorusGeometry(ROUT + 0.95, 0.1, 12, 96), M.alu()), false); trim.rotation.x = Math.PI / 2; add(cyl, trim, 0, 0.06, 0);
    const haloTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,120,40,0)'); gr.addColorStop(0.42, 'rgba(255,120,40,0)'); gr.addColorStop(0.56, 'rgba(255,130,40,0.75)');
      gr.addColorStop(0.7, 'rgba(255,100,30,0.35)'); gr.addColorStop(1, 'rgba(255,90,20,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const haloMat = new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 12.5), haloMat); halo.rotation.x = -Math.PI / 2; add(cyl, halo, 0, 0.04, 0);
    const heatLight = new THREE.PointLight(0xff7a2a, 0, 16, 2); add(cyl, heatLight, 0, 1.2, 0);

    // alu floor disc + collar with screws
    add(cyl, shadowy(new THREE.Mesh(new THREE.CylinderGeometry(ROUT - 0.1, ROUT, 0.3, 64), M.alu({ roughness: 0.55 }))), 0, 0.15, 0);
    const collar = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(ROUT + 0.22, ROUT + 0.3, 0.7, 64, 1, true), M.alu({ side: THREE.DoubleSide })), false); add(cyl, collar, 0, 0.35, 0);
    const collarTop = shadowy(new THREE.Mesh(new THREE.TorusGeometry(ROUT + 0.22, 0.09, 12, 64), M.alu()), false); collarTop.rotation.x = Math.PI / 2; add(cyl, collarTop, 0, 0.7, 0);
    const collarIn = new THREE.Mesh(new THREE.TorusGeometry(ROUT + 0.05, 0.06, 10, 64), M.alu({ roughness: 0.5 })); collarIn.rotation.x = Math.PI / 2; add(cyl, collarIn, 0, 0.64, 0);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.2;
      add(cyl, new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 8), M.alu()), Math.cos(a) * (ROUT + 0.28), 0.36, -Math.sin(a) * (ROUT + 0.28));
    }

    // the glass cylinder
    add(cyl, new THREE.Mesh(new THREE.CylinderGeometry(ROUT, ROUT, HC, 96, 1, true), M.glass({ side: THREE.DoubleSide, thickness: 0.5, roughness: 0.04 })), 0, 0.3 + HC / 2, 0);
    add(cyl, new THREE.Mesh(new THREE.CylinderGeometry(RIN, RIN, HC - 0.1, 96, 1, true), M.glass({ side: THREE.BackSide, thickness: 0.2, roughness: 0.04, opacity: 1 })), 0, 0.3 + HC / 2, 0);
    const rim = new THREE.Mesh(new THREE.TorusGeometry((RIN + ROUT) / 2, (ROUT - RIN) / 2, 16, 96), M.glass({ thickness: 0.4 }));
    rim.rotation.x = Math.PI / 2; add(cyl, rim, 0, 0.3 + HC, 0);
    // volume ticks printed on the glass
    {
      const nT = 23, geo = new THREE.BoxGeometry(0.5, 0.05, 0.05);
      const ticks = new THREE.InstancedMesh(geo, M.ceramic({ color: 0xffffff, roughness: 0.4 }), nT);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
      const a = 1.05;
      for (let i = 0; i < nT; i++) {
        const long = i % 2 === 0;
        pos.set(Math.cos(a) * (ROUT + 0.02), FLOOR + 0.6 + i * 0.78, Math.sin(a) * (ROUT + 0.02));
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a - Math.PI / 2);
        sc.set(long ? 1.5 : 0.8, 1, 1); m4.compose(pos, q, sc); ticks.setMatrixAt(i, m4);
      }
      cyl.add(ticks);
    }

    // ---- piston: glass head in an aluminium rim so the particles stay visible from above ----
    const piston = new THREE.Group(); cyl.add(piston);
    const alu2 = () => M.alu({ color: 0xc9ccd2, roughness: 0.38 });
    const PR = RIN - 0.04;
    shadowy(add(piston, new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, 0.9, 64, 1, true), M.alu({ side: THREE.DoubleSide })), 0, 0.45, 0), false);
    add(piston, new THREE.Mesh(new THREE.CylinderGeometry(PR - 0.1, PR - 0.1, 0.34, 64), M.glass({ thickness: 0.35, roughness: 0.05 })), 0, 0.5, 0);
    for (const y of [0.24, 0.66]) { const gr = new THREE.Mesh(new THREE.TorusGeometry(PR, 0.07, 10, 64), alu2()); gr.rotation.x = Math.PI / 2; add(piston, gr, 0, y, 0); }
    const seal = new THREE.Mesh(new THREE.TorusGeometry(PR - 0.04, 0.09, 10, 64), M.ceramic({ color: 0xeeeeee })); seal.rotation.x = Math.PI / 2; add(piston, seal, 0, 0.04, 0);
    const topRim = new THREE.Mesh(new THREE.TorusGeometry(PR - 0.05, 0.12, 12, 64), M.alu()); topRim.rotation.x = Math.PI / 2; add(piston, topRim, 0, 0.9, 0);
    for (let i = 0; i < 4; i++) {
      const sp = shadowy(new THREE.Mesh(new THREE.BoxGeometry(PR - 0.5, 0.22, 0.2), M.alu()), true);
      sp.position.set(Math.cos(i * 1.571 + 0.785) * (PR / 2 + 0.2), 0.62, -Math.sin(i * 1.571 + 0.785) * (PR / 2 + 0.2)); sp.rotation.y = i * 1.571 + 0.785; piston.add(sp);
    }
    shadowy(add(piston, new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.9, 48), M.alu()), 0, 0.45, 0));
    shadowy(add(piston, new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 0.2, 48), alu2()), 0, 1.0, 0));
    const rc = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.1, 12, 40), M.alu()); rc.rotation.x = Math.PI / 2; add(piston, rc, 0, 1.2, 0);
    // rod telescopes so the handle always stands above the glass
    const rodGeo = new THREE.CylinderGeometry(0.44, 0.44, 1, 40); rodGeo.translate(0, 0.5, 0);
    const rod = shadowy(new THREE.Mesh(rodGeo, M.alu({ roughness: 0.2 }))); cyl.add(rod);
    const handle = new THREE.Group(); cyl.add(handle);
    shadowy(add(handle, new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.52, 0.35, 40), M.alu()), 0, 0.1, 0));
    shadowy(add(handle, new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.6, 0.34, 56), M.alu()), 0, 0.45, 0));
    add(handle, new THREE.Mesh(new THREE.CylinderGeometry(1.46, 1.6, 0.05, 56), alu2()), 0, 0.64, 0);
    const hring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.04, 8, 48), M.alu({ roughness: 0.5 })); hring.rotation.x = Math.PI / 2; add(handle, hring, 0, 0.67, 0);
    for (let i = 0; i < 8; i++) { const a2 = i / 8 * 6.283; add(handle, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), M.alu()), Math.cos(a2) * 1.3, 0.66, Math.sin(a2) * 1.3); }

    // ---- particles ----
    const R = 0.56;
    // solid lattice: 4 hex layers, ABAB
    const lattice = [];
    {
      const a = 1.3, hz = 1.2, rc2 = RIN - R - 0.1;
      for (let L = 0; L < 5; L++) {
        const ox = L % 2 ? a / 2 : 0, oz = L % 2 ? a * Math.sqrt(3) / 6 : 0;
        for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) {
          const x = a * (i + j / 2) + ox, z = a * j * Math.sqrt(3) / 2 + oz;
          if (Math.hypot(x, z) <= rc2) lattice.push([x, FLOOR + R + L * hz, z]);
        }
      }
    }
    const N = lattice.length;
    // liquid pool: settle a seeded random drop into the cylinder
    const pool = [];
    {
      const rl = R * 0.97, rc2 = RIN - R - 0.1;
      for (let i = 0; i < N; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * rc2; pool.push([Math.cos(a) * r, FLOOR + rl + rnd() * 9, Math.sin(a) * r]); }
      for (let it = 0; it < 700; it++) {
        for (const p of pool) { p[1] -= 0.035; const sh = 0.12 * (1 - it / 700); p[0] += (rnd() - 0.5) * sh; p[2] += (rnd() - 0.5) * sh; }
        for (let pass = 0; pass < 4; pass++) {
          for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
            const A = pool[i], B = pool[j]; const dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2];
            const d = Math.hypot(dx, dy, dz) || 1e-6, min = 2 * rl;
            if (d < min) { const k = (min - d) / d * 0.5; A[0] -= dx * k; A[1] -= dy * k; A[2] -= dz * k; B[0] += dx * k; B[1] += dy * k; B[2] += dz * k; }
          }
          for (const p of pool) { p[1] = Math.max(FLOOR + rl, p[1]); const h = Math.hypot(p[0], p[2]); if (h > rc2) { p[0] *= rc2 / h; p[2] *= rc2 / h; } }
        }
      }
    }
    // pair lattice[k] <-> pool[k] by height then angle so nobody crosses the whole cylinder
    const key = (p) => Math.round(p[1] * 2) * 10 + (Math.atan2(p[2], p[0]) + 3.2) / 7;
    lattice.sort((p, q) => key(p) - key(q)); pool.sort((p, q) => key(p) - key(q));
    const iceTop = Math.max(...lattice.map((p) => p[1])) + R, liqTop = Math.max(...pool.map((p) => p[1])) + R;

    const P_ = [];
    const perm = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < N; i++) {
      const rankY = i / (N - 1);
      P_.push({
        ph: [rnd() * 6.283, rnd() * 6.283, rnd() * 6.283], fr: 0.8 + rnd() * 0.5, size: 0.93 + rnd() * 0.14,
        thM: 0.7 * rankY + 0.3 * rnd(), thB: 0.65 * (1 - rankY) + 0.35 * rnd(),
        s: [rnd(), (perm[i] + rnd()) / N, rnd()], v: [(0.7 + rnd() * 0.8) * (rnd() < 0.5 ? -1 : 1), (0.3 + rnd() * 0.4) * (rnd() < 0.5 ? -1 : 1), (0.7 + rnd() * 0.8) * (rnd() < 0.5 ? -1 : 1)],
      });
    }
    const pMat = new THREE.MeshPhysicalMaterial({ color: 0x2b66ff, emissive: 0x1a47ff, emissiveIntensity: 0.8, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2, specularIntensity: 1 });
    const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 28, 18), pMat, N);
    balls.castShadow = true; balls.receiveShadow = true; balls.frustumCulled = false;
    balls.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cyl.add(balls);
    balls.setColorAt(0, new THREE.Color(1, 1, 1));
    const mtx = new THREE.Matrix4(), col = new THREE.Color();

    // liquid body + sloshing flat surface
    const surfMat = new THREE.MeshPhysicalMaterial({ color: 0x2a6bff, emissive: 0x1b4dff, emissiveIntensity: 0.45, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const bodyMat = surfMat.clone(); bodyMat.emissiveIntensity = 0.3;
    const SR = RIN - 0.03;
    const bodyGeo = new THREE.CylinderGeometry(SR, SR, 1, 64, 1, true); bodyGeo.translate(0, 0.5, 0);
    const body = new THREE.Mesh(bodyGeo, bodyMat); body.position.y = FLOOR; body.renderOrder = 2; cyl.add(body);
    const surfGeo = new THREE.RingGeometry(0.01, SR, 64, 14); surfGeo.rotateX(-Math.PI / 2);
    const surfBase = Float32Array.from(surfGeo.attributes.position.array);
    const surf = new THREE.Mesh(surfGeo, surfMat); surf.renderOrder = 3; cyl.add(surf);

    // ---- thermometer ----
    const TX = 5.7, TY = 6.6;
    const th = new THREE.Group(); th.position.copy(P(PX + TX, PY + TY - PY * 0 - 0.0, PT)); g.add(th);
    th.position.copy(P(TX, TY, PT));
    shadowy(add(th, new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.35, 40), M.alu()), 0.6, 0.17, 0));
    const tubeX = 0, postX = 1.4;
    const bulbY = 1.45;
    add(th, new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 14, 8, 28), M.glass({ thickness: 0.3 })), tubeX, bulbY + 7.2, 0);
    add(th, new THREE.Mesh(new THREE.SphereGeometry(0.7, 28, 18), M.glass({ thickness: 0.3 })), tubeX, bulbY, 0);
    const redMat = new THREE.MeshPhysicalMaterial({ color: 0xc41208, emissive: 0xff1c10, emissiveIntensity: 1.5, roughness: 0.12, clearcoat: 1 });
    add(th, new THREE.Mesh(new THREE.SphereGeometry(0.52, 24, 16), redMat), tubeX, bulbY, 0);
    const colGeo = new THREE.CylinderGeometry(0.16, 0.16, 1, 20); colGeo.translate(0, 0.5, 0);
    const column = add(th, new THREE.Mesh(colGeo, redMat), tubeX, bulbY, 0);
    const colCap = add(th, new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), redMat), tubeX, bulbY, 0);
    const COLMAX = 13.4;
    shadowy(add(th, new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 17, 28), M.alu()), postX, 0.35 + 8.5, 0));
    shadowy(add(th, new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 12, 0, 6.283, 0, 1.571), M.alu()), postX, 0.35 + 17, 0));
    for (const cy of [4.2, 13.4]) {
      const rg = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.11, 12, 32), M.alu()); rg.rotation.x = Math.PI / 2; add(th, rg, tubeX, cy, 0);
      const rg2 = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.12, 12, 32), M.alu()); rg2.rotation.x = Math.PI / 2; add(th, rg2, postX, cy, 0);
      shadowy(add(th, new THREE.Mesh(new THREE.BoxGeometry(postX, 0.28, 0.3), M.alu()), postX / 2, cy, 0));
    }
    {   // graduations on the front of the glass: every 10 °C from -20 to 140
      const nT = 17, geo = new THREE.BoxGeometry(0.34, 0.045, 0.05);
      const ticks = new THREE.InstancedMesh(geo, M.ceramic({ color: 0xffffff }), nT);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < nT; i++) {
        const Tt = -20 + i * 10, big = Tt === 0 || Tt === 100;
        m4.compose(new THREE.Vector3(tubeX + 0.12 + (big ? 0.12 : 0), bulbY + (Tt + 20) / 160 * COLMAX, 0.37), new THREE.Quaternion(), new THREE.Vector3(big ? 1.9 : 1, big ? 1.5 : 1, 1));
        ticks.setMatrixAt(i, m4);
      }
      th.add(ticks);
    }

    // ---- dial ----
    const DX = 4.9, DY = -4.7;
    const dialG = new THREE.Group(); dialG.position.copy(P(DX, DY, PT)); dialG.scale.setScalar(1.3); g.add(dialG);
    shadowy(add(dialG, new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.22, 56), M.alu({ roughness: 0.4 })), 0, 0.11, 0));
    const dialTurn = new THREE.Group(); dialG.add(dialTurn);
    {
      const n = 36, r1 = 1.12, r2 = 1.22, sh = new THREE.Shape();
      for (let k = 0; k < n * 4; k++) {
        const ang = (k / (n * 4)) * Math.PI * 2, rr = (k % 4 === 1 || k % 4 === 2) ? r2 : r1;
        const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr; if (k === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
      }
      sh.closePath();
      const knob = shadowy(new THREE.Mesh(slab(sh, 0.55, 0.05), M.alu({ roughness: 0.3 }))); knob.position.y = 0.22; dialTurn.add(knob);
      add(dialTurn, shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.02, 0.07, 48), M.alu({ roughness: 0.18 })), false), 0, 0.94, 0);
      const ptr = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.11), new THREE.MeshStandardMaterial({ color: 0x331a0c, emissive: ORANGE, emissiveIntensity: 1.8 }));
      add(dialTurn, ptr, 0.45, 0.99, 0);
    }
    const nDT = 15, dtick = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.06, 0.11), new THREE.MeshBasicMaterial({ color: 0xffffff }), nDT);
    dialG.add(dtick);
    {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < nDT; i++) {
        const ang = (-135 - 270 * (i / (nDT - 1))) * Math.PI / 180;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang);
        m4.compose(new THREE.Vector3(Math.cos(ang) * 2.0, 0.17, -Math.sin(ang) * 2.0), q, new THREE.Vector3(i % 7 === 0 ? 1.5 : 1, 1, 1));
        dtick.setMatrixAt(i, m4);
      }
      for (let i = 0; i < nDT; i++) dtick.setColorAt(i, col.set(0xc2bbb0));
    }

    // ---- readout plaque ----
    const rcv = document.createElement('canvas'); rcv.width = 1024; rcv.height = 200;
    const rctx = rcv.getContext('2d');
    const rtex = new THREE.CanvasTexture(rcv); rtex.colorSpace = THREE.SRGBColorSpace; rtex.anisotropy = 8;
    const plaque = shadowy(new THREE.Mesh(slab(roundedRect(8.6, 1.7, 0.5), 0.28, 0.08), M.ceramic()));
    plaque.position.copy(P(0, -11.75, BASE)); g.add(plaque);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.6), new THREE.MeshStandardMaterial({ map: rtex, transparent: true, roughness: 0.4 }));
    face.rotation.x = -Math.PI / 2; face.position.copy(P(0, -11.75, BASE + 0.45)); g.add(face);
    let shownKey = '';
    function drawReadout(Tr, state, glow) {
      rctx.clearRect(0, 0, 1024, 200);
      rctx.fillStyle = `rgba(242,106,33,${0.25 + 0.75 * glow})`; rctx.beginPath(); rctx.arc(70, 100, 24 + 8 * glow, 0, Math.PI * 2); rctx.fill();
      rctx.fillStyle = '#16171a'; rctx.font = '600 104px "Inter Tight"'; rctx.fillText(`${Tr}`, 130, 138);
      const w = rctx.measureText(`${Tr}`).width;
      rctx.fillStyle = '#6a6c72'; rctx.font = '600 40px "Inter Tight"'; rctx.fillText('°C', 142 + w, 136);
      rctx.fillStyle = '#16171a'; rctx.font = '600 76px "Inter Tight"'; rctx.textAlign = 'right';
      rctx.fillText(state, 990, 132); rctx.textAlign = 'left';
      rtex.needsUpdate = true;
    }

    // ---- state ----
    let liqPhase = 0, gasPhase = 0, cool = 0, cur = { T: -20, state: 'solid' };
    function thermo(ue) {
      let T, m = 0, b = 0;
      if (ue < 0.22) { T = -20 + 20 * ue / 0.22; }
      else if (ue < 0.30) { T = 0; m = (ue - 0.22) / 0.08; }
      else if (ue < 0.66) { T = 100 * (ue - 0.30) / 0.36; m = 1; }
      else if (ue < 0.76) { T = 100; m = 1; b = (ue - 0.66) / 0.10; }
      else { T = 100 + 40 * (ue - 0.76) / 0.24; m = 1; b = 1; }
      const Tr = Math.round(T) + 0;
      const state = b >= 0.999 ? 'gas' : b > 0.001 ? 'boiling' : m >= 0.999 ? 'liquid' : m > 0.001 ? 'melting' : 'solid';
      return { T, m, b, Tr, state };
    }
    const HMAX = HC - 1.6;

    return {
      u: 0.0,
      update(dt, t, u) {
        cool = Math.max(0, cool - dt / 2.4);
        const ue = u * (1 - ss(cool));
        const s = thermo(ue);
        cur = s;
        const hot = clamp01((s.T - 100) / 40), warm = clamp01(s.T / 100);
        liqPhase += dt * (1.2 + 3.0 * warm);
        gasPhase += dt * (0.8 + 1.0 * hot);
        const jigA = 0.03 + 0.06 * clamp01((s.T + 20) / 20);
        const swirlA = 0.04 + 0.05 * warm;
        const slA = 0.05 + 0.09 * warm;
        const slosh = (x, z) => slA * (Math.sin(0.9 * x + 1.1 * z + liqPhase * 0.8) + 0.6 * Math.sin(-1.3 * x + 0.7 * z + liqPhase * 1.2 + 1)) + 0.05 * (0.4 + warm) * x * Math.sin(liqPhase * 0.45);

        // pass 1: weights
        let sumM = 0, sumG = 0; const wm = new Array(N), wg = new Array(N);
        for (let i = 0; i < N; i++) {
          wm[i] = ss(clamp01(s.m * 1.6 - P_[i].thM * 0.6)); wg[i] = ss(clamp01(s.b * 1.8 - P_[i].thB * 0.8));
          sumM += wm[i]; sumG += wg[i];
        }
        const mm = sumM / N, gf = sumG / N;
        const poolTop = lerp(iceTop, liqTop, mm);
        const restTop = poolTop + 0.1;
        const H = restTop + (HMAX - restTop) * gf;
        const lo = (poolTop - R) * Math.pow(1 - gf, 2);
        piston.position.y = FLOOR + H + (gf > 0.05 ? Math.sin(t * 31) * 0.02 * gf : 0);

        let topY = FLOOR;
        for (let i = 0; i < N; i++) {
          const p = P_[i], A = lattice[i], B = pool[i];
          // solid: shiver around the lattice site
          const sx = A[0] + Math.sin(t * 17 * p.fr + p.ph[0]) * jigA, sy = A[1] + Math.sin(t * 19 * p.fr + p.ph[1]) * jigA, sz = A[2] + Math.sin(t * 23 * p.fr + p.ph[2]) * jigA;
          // liquid: correlated swirl in the pool, rippling surface
          const sw = 0.9 * B[0] + 1.3 * B[2] + 0.7 * B[1] + liqPhase;
          const tw = clamp01((B[1] - (liqTop - 2.4)) / 2.2);
          const lx = B[0] + Math.cos(sw) * swirlA, lz = B[2] + Math.sin(sw) * swirlA;
          const ly = B[1] + Math.sin(sw * 1.3 + 1) * swirlA * 0.4 + tw * slosh(B[0], B[2]);
          // gas: triangle-wave bounces off the walls and the piston
          const gx = 2 * tri(p.s[0] + p.v[0] * gasPhase) - 1, gz = 2 * tri(p.s[2] + p.v[2] * gasPhase) - 1;
          const Rg = RIN - R - 0.04;
          const ax = gx * Math.sqrt(1 - gz * gz / 2) * Rg, az = gz * Math.sqrt(1 - gx * gx / 2) * Rg;
          const ay = FLOOR + R + lo + tri(p.s[1] + p.v[1] * gasPhase) * (H - R * 2 - lo);
          let x = lerp(lerp(sx, lx, wm[i]), ax, wg[i]), y = lerp(lerp(sy, ly, wm[i]), ay, wg[i]), z = lerp(lerp(sz, lz, wm[i]), az, wg[i]);
          const rr = R * p.size;
          if (wg[i] < 0.5) topY = Math.max(topY, lerp(A[1], B[1], wm[i]) + rr);
          y = Math.min(y, FLOOR + H - rr * 0.92); y = Math.max(y, FLOOR + rr * 0.9);
          mtx.makeScale(rr, rr, rr); mtx.setPosition(x, y, z); balls.setMatrixAt(i, mtx);
          const ice = 1 - wm[i];
          col.setRGB(1 + 2.4 * ice, 1 + 1.3 * ice, 1).multiplyScalar(1 + 0.18 * wg[i]); balls.setColorAt(i, col);
        }
        balls.instanceMatrix.needsUpdate = true; balls.instanceColor.needsUpdate = true;

        // translucent liquid body with a sloshing flat top
        const sOp = ss(clamp01((mm - 0.3) / 0.6)) * (1 - ss(clamp01(gf * 2.5)));
        surfMat.opacity = 0.42 * sOp; bodyMat.opacity = 0.2 * sOp; surf.visible = body.visible = sOp > 0.01;
        if (surf.visible) {
          const sh = Math.max(0.3, topY - R * 0.55 - FLOOR), pos = surfGeo.attributes.position;
          for (let i = 0; i < pos.count; i++) { const x = surfBase[i * 3], z = surfBase[i * 3 + 2]; pos.setY(i, sh + FLOOR + slosh(x, z) * 0.9); }
          pos.needsUpdate = true; surfGeo.computeVertexNormals();
          body.scale.y = sh;
        }
        // piston rod + handle
        const py = piston.position.y, hy = Math.max(0.3 + HC + 1.5, py + 2.4);
        rod.position.y = py + 1.0; rod.scale.y = hy - (py + 1.0); handle.position.y = hy;

        // hot plate glow, dial, thermometer
        const glow = Math.pow(clamp01(ue), 1.1);
        ringMat.emissiveIntensity = 0.02 + 3.4 * glow; ring2Mat.emissiveIntensity = 0.02 + 2.2 * glow;
        haloMat.opacity = 0.9 * glow; heatLight.intensity = 4 * glow;
        dialTurn.rotation.y = (-135 - 270 * ue) * Math.PI / 180;
        for (let i = 0; i < nDT; i++) {
          const lit = (i / (nDT - 1)) <= ue + 1e-4 && ue > 0.002;
          dtick.setColorAt(i, lit ? col.setRGB(2.6, 0.95, 0.25) : col.set(0xc2bbb0));
        }
        dtick.instanceColor.needsUpdate = true;
        const frac = (s.T + 20) / 160;
        column.scale.y = 0.08 + frac * COLMAX; colCap.position.y = bulbY + 0.08 + frac * COLMAX;
        redMat.emissiveIntensity = 1.1 + 1.0 * glow;

        const key = `${s.Tr}|${s.state}|${Math.round(glow * 20)}`;
        if (key !== shownKey) { drawReadout(s.Tr, s.state, glow); shownKey = key; }
      },
      action() { cool = 1; },
      readout: () => `${cur.Tr} °C · ${cur.state}`,
    };
  },
};
