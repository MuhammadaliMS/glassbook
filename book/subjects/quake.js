// Earth science · Where earthquakes come from. A cutaway slab of frosted-glass strata split by a
// glowing fault, pushed by a crank + coil spring until it slips; below, a seismograph drum whose
// pen traces each slip. Drive u = crank winding (stress builds, then the block slips 3 times).
const RED = 0xff4a1c;
const TAU = Math.PI * 2;

export default {
  page: {
    kicker: 'Earth science · Lesson 4',
    title: 'Where earthquakes\ncome from',
    lede: 'The ground feels solid, but it is a jigsaw of giant plates that never stop pushing.',
    body: [
      'Where two plates meet, friction locks them together while the rest of each plate keeps moving. The rock bends and stores the strain, like a spring being squeezed.',
      'When the stress finally beats the friction, the fault lets go in a flash. The rock snaps back and the energy leaves as waves that shake everything on top.',
    ],
    key: 'stress builds, rock slips',
    keyNote: '+1 magnitude ≈ 32× the energy',
    tryIt: 'Drag across the crust to wind the crank. Tap to make it slip.',
    caption: 'Fig. 4.3  Stick and slip',
    pageNo: 56,
    accent: '#ff4a1c',
    cover: '#2b3036',
  },
  camera: { x: 8.0, y: 0.5, z: 1.0, dist: 82, el: 54, az: -20 },

  async build({ THREE, M, P, slab, roundedRect, root }) {
    const g = new THREE.Group(); root.add(g);
    const shadowy = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const clamp = THREE.MathUtils.clamp;
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const hdr = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
    const ALU = M.alu({ color: 0xf0f1f4, roughness: 0.22 }), ALU2 = M.alu({ color: 0xd2d5da, roughness: 0.34 });
    const DARK = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.5, metalness: 0.2 });

    // a cylinder between two points (a = low end, b = high end)
    function rod(a, b, rTop, rBot, mat, seg = 20, parent = g) {
      const d = b.clone().sub(a), len = d.length();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, seg), mat);
      m.position.copy(a).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
      parent.add(m); return m;
    }
    const alongX = (geo) => { geo.rotateZ(Math.PI / 2); return geo; };
    function hexNut(x, y, h, r, len, parent = g) {
      const m = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(r, r, len, 6)), ALU));
      m.position.copy(P(x, y, h)); parent.add(m); return m;
    }

    // ---------- tray (same as the heart) ----------
    g.add(shadowy(new THREE.Mesh(slab(roundedRect(17.6, 25.2, 1.8), 0.32, 0.18), M.ceramic())));
    const plate = new THREE.Mesh(slab(roundedRect(16.6, 24.2, 1.4), 0.12, 0.1), M.glass({ roughness: 0.15, thickness: 0.3 }));
    plate.position.y = 0.66; g.add(plate);
    for (const [x, y] of [[-7.6, 11.4], [7.6, 11.4], [-7.6, -11.4], [7.6, -11.4]]) {
      const pin = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 32), ALU));
      pin.position.copy(P(x, y, 1.0)); g.add(pin);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), ALU); cap.position.copy(P(x, y, 1.35)); g.add(cap);
    }
    const BASE = 0.95;

    // ---------- textures ----------
    function noiseTex(draw, rep) {
      const c = document.createElement('canvas'); c.width = c.height = 256; draw(c.getContext('2d'));
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    }
    const grainTex = noiseTex((x) => {
      x.fillStyle = '#dcdcdc'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3600; i++) {
        const s = 1 + Math.floor(rnd() * 3);
        x.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${0.35 * rnd()})` : `rgba(0,0,0,${0.32 * rnd()})`;
        x.fillRect(rnd() * 256, rnd() * 256, s, s);
      }
    }, 0.34);
    const soilTex = noiseTex((x) => {
      x.fillStyle = '#9d8869'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(104,128,70,${0.25 + 0.3 * rnd()})`; x.beginPath(); x.arc(rnd() * 256, rnd() * 256, 6 + rnd() * 14, 0, TAU); x.fill(); }
      for (let i = 0; i < 2600; i++) {
        const s = 1 + Math.floor(rnd() * 3), r = rnd();
        x.fillStyle = r < 0.4 ? `rgba(225,214,190,${0.5 * rnd()})` : r < 0.75 ? `rgba(70,56,40,${0.5 * rnd()})` : `rgba(120,150,80,${0.4 * rnd()})`;
        x.fillRect(rnd() * 256, rnd() * 256, s, s);
      }
    }, 0.3);

    // ---------- the crust: two blocks of strata split by a diagonal fault ----------
    const PLINTH = 1.65, base0 = BASE + PLINTH;          // top of the white plinth
    const Y0 = 1.6, Y1 = 8.8, YC = (Y0 + Y1) / 2;       // block extent up the page
    const XL = -7.2, XR = 4.4, XM = -1.6;
    const DELTA = (62 * Math.PI) / 180, COT = 1 / Math.tan(DELTA);
    const H = 8.0, SKIRT = 1.55, E = 0.035, EH = E / Math.sin(DELTA);
    const xf = (hr) => XM + (H / 2 - hr) * COT;         // fault plane x at relative height hr
    const SLIP = 0.5;                                  // along-plane metres per slip step
    const CAP = 3;

    const plinth = shadowy(new THREE.Mesh(slab(roundedRect(13.0, 8.2, 0.9), PLINTH - 0.3, 0.15), M.ceramic()));
    plinth.position.copy(P(-1.4, YC, BASE)); g.add(plinth);
    for (const [x, y] of [[-7.55, Y0 - 0.25], [4.85, Y0 - 0.25], [-7.55, Y1 + 0.25], [4.85, Y1 + 0.25]]) {
      const s = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 6), ALU)); s.position.copy(P(x, y, base0 + 0.03)); g.add(s);
    }

    const LAYERS = [
      { h: 1.15, c: 0xf2d9a6, r: 0.5, e: 0xd9b878, ei: 0.1 },  // sand
      { h: 0.9, c: 0x5c636f, r: 0.3, ad: 2.5, e: 0x4a505a, ei: 0.12 }, // basalt
      { h: 1.2, c: 0x9aa1ab, r: 0.3, e: 0x7a808a, ei: 0.1 },   // slate
      { h: 0.9, c: 0xe9c08a, r: 0.4, e: 0xc89a58, ei: 0.12 },  // tan
      { h: 1.0, c: 0xffa23a, r: 0.3, e: 0xff7a12, ei: 0.34 },  // amber
      { h: 1.15, c: 0xee6a38, r: 0.3, e: 0xff4a1c, ei: 0.28 }, // terracotta
      { h: 1.0, c: 0xf7eedc, r: 0.2, e: 0xe8dcc0, ei: 0.1 },   // pale sand
      { h: 0.7, soil: true },                                  // topsoil
    ];
    function layerMat(L) {
      if (L.soil) return new THREE.MeshStandardMaterial({ color: 0xffffff, map: soilTex, bumpMap: soilTex, bumpScale: 1.2, roughness: 0.95 });
      return M.frosted({
        color: L.c, roughness: L.r, thickness: 1.8, attenuationColor: new THREE.Color(L.c), attenuationDistance: L.ad ?? 3.5,
        map: grainTex, bumpMap: grainTex, bumpScale: 0.5, emissive: L.e ?? 0x000000, emissiveIntensity: L.ei ?? 0,
      });
    }
    const left = new THREE.Group(), right = new THREE.Group();
    g.add(left, right);
    left.position.y = base0; right.position.y = base0;
    const topSoilH = H;
    function buildBlock(grp, side) {
      let h0 = 0;
      for (const L of LAYERS) {
        const h1 = h0 + L.h, b = side === 'R' && h0 === 0 ? -SKIRT : h0;
        const pts = side === 'L'
          ? [[XL + E, b + E], [xf(b + E) - EH, b + E], [xf(h1 - E) - EH, h1 - E], [XL + E, h1 - E]]
          : [[xf(b + E) + EH, b + E], [XR - E, b + E], [XR - E, h1 - E], [xf(h1 - E) + EH, h1 - E]];
        const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))),
          { depth: Y1 - Y0 - 2 * E, bevelEnabled: true, bevelThickness: E, bevelSize: E, bevelSegments: 2, curveSegments: 1 });
        const m = new THREE.Mesh(geo, layerMat(L));
        m.position.z = -Y1 + E; m.castShadow = true; m.receiveShadow = !!L.soil;
        grp.add(m); h0 = h1;
      }
    }
    buildBlock(left, 'L'); buildBlock(right, 'R');

    // glowing fault plane + edge lines (HDR so the bloom picks them up)
    const glowMats = [];
    const glowMat = (k) => { const m = new THREE.MeshBasicMaterial({ color: hdr(RED, k), side: THREE.DoubleSide }); glowMats.push(m); return m; };
    {
      const a = V3(xf(-0.02), -0.02, -Y0), b = V3(xf(H), H, -Y0), c = V3(xf(H), H, -Y1), d = V3(xf(-0.02), -0.02, -Y1);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([a, b, c, d].flatMap((v) => [v.x, v.y, v.z]), 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      left.add(new THREE.Mesh(geo, glowMat(2)));
      const front = rod(V3(xf(0.04), 0.04, -Y0 + 0.02), V3(xf(H + 0.02), H + 0.02, -Y0 + 0.02), 0.07, 0.07, glowMat(2.6), 10, left);
      const top = rod(V3(xf(H) , H + 0.04, -Y0), V3(xf(H), H + 0.04, -Y1), 0.06, 0.06, glowMat(2.6), 10, left);
      top.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(0, 0, -1)); void front;
    }
    const faultLight = new THREE.PointLight(RED, 0, 22, 2);
    faultLight.position.copy(P(xf(H / 2), Y0 - 1.5, base0 + 3.5)); g.add(faultLight);

    // little ceramic houses and trees that ride on the blocks and shake
    const shakers = [];
    const roofMat = M.ceramic({ color: 0xd9663f }), wallMat = M.ceramic(), winMat = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.3 });
    const triGeo = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-0.64, 0), new THREE.Vector2(0.64, 0), new THREE.Vector2(0, 0.5)]), { depth: 1.15, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
    triGeo.translate(0, 0, -0.575);
    function house(parent, x, y, rot, s) {
      const grp = new THREE.Group(); grp.position.copy(P(x, y, topSoilH + 0.03)); grp.rotation.y = rot; grp.scale.setScalar(s); parent.add(grp);
      const body = shadowy(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.78, 0.9), wallMat)); body.position.y = 0.39; grp.add(body);
      const roof = shadowy(new THREE.Mesh(triGeo, roofMat)); roof.rotation.y = Math.PI / 2; roof.position.y = 0.78; grp.add(roof);
      roof.scale.set(0.95, 1, 1.0);
      for (const dx of [-0.32, 0.32]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.04), winMat); w.position.set(dx, 0.48, 0.46); grp.add(w); }
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.04), winMat); door.position.set(0, 0.17, 0.46); grp.add(door);
      const ch = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), wallMat)); ch.position.set(-0.3, 1.05, -0.1); grp.add(ch);
      shakers.push({ o: grp, ph: rnd() * TAU, k: 1 });
    }
    const leafMats = [M.ceramic({ color: 0x5a8a3f, roughness: 0.7, clearcoat: 0 }), M.ceramic({ color: 0x3f6b3a, roughness: 0.7, clearcoat: 0 }), M.ceramic({ color: 0x77a04a, roughness: 0.7, clearcoat: 0 })];
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.8 });
    const ballGeo = new THREE.IcosahedronGeometry(0.38, 2), coneGeo = new THREE.ConeGeometry(0.34, 0.62, 14), trunkGeo = new THREE.CylinderGeometry(0.045, 0.065, 0.4, 8);
    function tree(parent, x, y, s, kind) {
      const grp = new THREE.Group(); grp.position.copy(P(x, y, topSoilH + 0.03)); grp.scale.setScalar(s); parent.add(grp);
      const tr = shadowy(new THREE.Mesh(trunkGeo, trunkMat)); tr.position.y = 0.2; grp.add(tr);
      if (kind === 0) {
        const b = shadowy(new THREE.Mesh(ballGeo, leafMats[Math.floor(rnd() * 3) % 3 === 1 ? 2 : 0])); b.scale.set(1, 1.12, 1); b.position.y = 0.68; grp.add(b);
      } else {
        for (let i = 0; i < 3; i++) { const c = shadowy(new THREE.Mesh(coneGeo, leafMats[1])); c.scale.setScalar(1 - i * 0.22); c.position.y = 0.52 + i * 0.3; grp.add(c); }
      }
      shakers.push({ o: grp, ph: rnd() * TAU, k: 1.3 });
    }
    house(left, -5.5, 7.1, 0.3, 1.15); house(left, -5.0, 3.4, -0.2, 1.05);
    tree(left, -6.6, 5.4, 1.0, 0); tree(left, -6.5, 8.3, 0.9, 1); tree(left, -4.4, 5.5, 0.8, 0); tree(left, -6.6, 2.3, 0.85, 1); tree(left, -5.8, 4.4, 0.7, 0);
    house(right, 1.6, 4.8, -0.15, 1.25);
    tree(right, 0.2, 8.1, 1.0, 1); tree(right, 3.2, 7.9, 1.0, 0); tree(right, 3.6, 2.4, 0.9, 1); tree(right, -0.8, 2.5, 0.85, 0);
    tree(right, 2.4, 2.9, 0.75, 0); tree(right, 3.5, 6.0, 0.8, 1); tree(right, 0.4, 5.9, 0.7, 0); tree(right, 2.7, 5.9, 0.6, 0);
    const rockGeo = new THREE.DodecahedronGeometry(0.14, 0), rockMat = new THREE.MeshStandardMaterial({ color: 0xb4aca0, roughness: 0.8 });
    for (let i = 0; i < 12; i++) {
      const onL = i < 5, x = onL ? -7 + rnd() * 3.4 : -2.4 + rnd() * 6.4, y = Y0 + 0.4 + rnd() * (Y1 - Y0 - 0.8);
      const rk = shadowy(new THREE.Mesh(rockGeo, rockMat)); rk.scale.set(1 + rnd(), 0.6 + 0.4 * rnd(), 1 + rnd()); rk.position.copy(P(x, y, topSoilH + 0.05)); rk.rotation.y = rnd() * 3;
      (onL ? left : right).add(rk);
    }

    // ---------- crank + coil spring ----------
    const AXH = base0 + 3.7, DISC_X = XR + 0.17;
    const rodGrp = new THREE.Group(); rodGrp.position.copy(P(0, YC, AXH)); g.add(rodGrp);
    const core = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.13, 0.13, 4.05, 20)), ALU)); core.position.x = 6.78; rodGrp.add(core);
    class Helix extends THREE.Curve {
      constructor(len, r, turns) { super(); this.len = len; this.r = r; this.turns = turns; }
      getPoint(t, out = new THREE.Vector3()) { const a = t * this.turns * TAU; return out.set(t * this.len, this.r * Math.cos(a), this.r * Math.sin(a)); }
    }
    const thread = shadowy(new THREE.Mesh(new THREE.TubeGeometry(new Helix(3.0, 0.15, 16), 360, 0.04, 6), ALU2)); thread.position.x = 4.8; rodGrp.add(thread);
    // bearing post
    const post = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.7, AXH - BASE + 0.8, 1.8), ALU)); post.position.copy(P(7.95, YC, BASE + (AXH - BASE + 0.8) / 2 - 0.4)); g.add(post);
    const bush = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.55, 0.55, 0.95, 32)), ALU)); bush.position.copy(P(7.95, YC, AXH)); g.add(bush);
    for (const dy of [-0.6, 0.6]) { const s = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 6)), ALU2)); s.position.copy(P(8.33, YC + dy, BASE + 0.45)); g.add(s); }
    // crank handle
    const crank = new THREE.Group(); crank.position.copy(P(8.78, YC, AXH)); g.add(crank);
    const hub = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 32)), ALU)); crank.add(hub);
    const arm = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.3, 0.7), ALU)); arm.position.set(0.12, 1.05, 0); crank.add(arm);
    const knob = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.34, 0.34, 1.3, 24)), ALU)); knob.position.set(0.6, 2.1, 0); crank.add(knob);
    const knobCap = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 10), ALU)); knobCap.position.set(1.25, 2.1, 0); crank.add(knobCap);
    // pusher disc + spring + nut
    const disc = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(1.15, 1.15, 0.16, 48)), ALU)); g.add(disc);
    const rim = shadowy(new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 10, 48), ALU)); rim.rotation.y = Math.PI / 2; disc.add(rim);
    const springG = new THREE.Group(); g.add(springG);
    const spring = shadowy(new THREE.Mesh(new THREE.TubeGeometry(new Helix(1, 0.62, 8), 320, 0.09, 10), M.alu({ color: 0xeceef1, roughness: 0.18 }))); springG.add(spring);
    const nut = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 6)), ALU)); g.add(nut);
    const nutRing = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 32)), ALU)); nutRing.position.x = -0.31; nut.add(nutRing);

    // ---------- seismograph ----------
    const DY = -5.6, R = 2.5, DL = 10.6, AXH2 = BASE + 0.45 + R, RAIL_H = AXH2 + R + 1.0;
    const drumRot = new THREE.Group(); drumRot.position.copy(P(0, DY, AXH2)); g.add(drumRot);
    const paperTex = (() => {
      const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const x = c.getContext('2d');
      x.fillStyle = '#f8f6f0'; x.fillRect(0, 0, 2048, 1024);
      for (let j = 0; j <= 1024; j += 16) { x.strokeStyle = j % 80 === 0 ? 'rgba(110,112,122,0.42)' : 'rgba(110,112,122,0.2)'; x.lineWidth = j % 80 === 0 ? 2 : 1; x.beginPath(); x.moveTo(0, j); x.lineTo(2048, j); x.stroke(); }
      for (let i = 0; i < 64; i++) { x.strokeStyle = i % 4 === 0 ? 'rgba(110,112,122,0.4)' : 'rgba(110,112,122,0.16)'; x.lineWidth = i % 4 === 0 ? 2 : 1; x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 1024); x.stroke(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    })();
    const drum = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(R, R, DL, 120, 1)), M.ceramic({ map: paperTex, roughness: 0.42 }))); drumRot.add(drum);
    for (const s of [-1, 1]) {
      const cap = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(R + 0.1, R + 0.1, 0.6, 96)), ALU)); cap.position.x = s * (DL / 2 + 0.3); drumRot.add(cap);
      const lip = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(R - 0.5, R - 0.5, 0.16, 64)), ALU2)); lip.position.x = s * (DL / 2 + 0.66); drumRot.add(lip);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU, hole = new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 20)), DARK);
        hole.position.set(s * (DL / 2 + 0.76), 1.35 * Math.cos(a), 1.35 * Math.sin(a)); drumRot.add(hole);
      }
      const ax = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.34, 0.34, 2.3, 24)), ALU)); ax.position.x = s * 6.45; drumRot.add(ax);
      const hn = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 6)), ALU)); hn.position.x = s * 7.45; drumRot.add(hn);
    }
    // paper clip bar so the rotation reads
    const clipGeo = new THREE.BoxGeometry(DL - 0.4, 0.08, 0.22); clipGeo.translate(0, R + 0.01, 0);
    drumRot.add(shadowy(new THREE.Mesh(clipGeo, ALU)));

    // brackets: alu plates with a bearing ring, tie rods, rail
    function rrPath(sh, x0, y0, x1, y1, r) {
      sh.moveTo(x0 + r, y0); sh.lineTo(x1 - r, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + r); sh.lineTo(x1, y1 - r); sh.quadraticCurveTo(x1, y1, x1 - r, y1);
      sh.lineTo(x0 + r, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - r); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
    }
    for (const s of [-1, 1]) {
      const sh = new THREE.Shape(); rrPath(sh, -3.3, BASE + 0.1, 3.3, RAIL_H + 0.75, 0.7);
      const hole = new THREE.Path(); hole.absarc(0, AXH2, 0.95, 0, TAU, true); sh.holes.push(hole);
      const slot = new THREE.Path(); rrPath(slot, -2.4, RAIL_H - 0.35, 2.4, RAIL_H + 0.25, 0.25); sh.holes.push(slot);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 24 });
      geo.translate(0, 0, -0.17); geo.rotateY(Math.PI / 2);
      const br = shadowy(new THREE.Mesh(geo, ALU)); br.position.copy(P(s * 6.55, DY, 0)); g.add(br);
      const ring = shadowy(new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.13, 14, 48), ALU2)); ring.rotation.y = Math.PI / 2; ring.position.copy(P(s * 6.55, DY, AXH2)); g.add(ring);
      const ring2 = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.18, 36), ALU)); ring2.rotation.z = Math.PI / 2; ring2.position.copy(P(s * 6.9, DY, AXH2)); g.add(ring2);
      for (const [dy, dh] of [[-2.55, 0.65], [2.55, 0.65], [-2.55, 7.35], [2.55, 7.35]]) {
        const sc = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 6)), ALU2)); sc.position.copy(P(s * 6.78, DY + dy, BASE + dh - 0.1)); g.add(sc);
      }
      const foot = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 6.9), ALU2)); foot.position.copy(P(s * 6.55, DY, BASE + 0.1)); g.add(foot);
    }
    for (const dy of [-2.75, 2.75]) {
      const tr = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.14, 0.14, 13.6, 20)), ALU)); tr.position.copy(P(0, DY + dy, BASE + 0.55)); g.add(tr);
      for (const s of [-1, 1]) hexNut(s * 7.0, DY + dy, BASE + 0.55, 0.3, 0.3);
    }
    const rail = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.1, 0.1, 13.4, 20)), ALU)); rail.position.copy(P(0, DY, RAIL_H)); g.add(rail);
    for (const s of [-1, 1]) { const st = shadowy(new THREE.Mesh(alongX(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 20)), ALU2)); st.position.copy(P(s * 6.0, DY, RAIL_H)); g.add(st); }
    // pen carriage
    const carriage = new THREE.Group(); carriage.position.copy(P(0, DY, RAIL_H)); g.add(carriage);
    const cBody = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.62), ALU)); cBody.position.y = -0.02; carriage.add(cBody);
    const cTop = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.4), ALU2)); cTop.position.y = 0.3; carriage.add(cTop);
    rod(V3(0, AXH2 + R + 0.03 - RAIL_H, 0), V3(0, -0.2, -0.45), 0.08, 0.015, ALU, 12, carriage);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshBasicMaterial({ color: hdr(RED, 4) })); tip.position.set(0, AXH2 + R + 0.05 - RAIL_H, 0); carriage.add(tip);

    // ink trace on the drum surface (ring buffer indexed by drum angle, re-meshed each frame)
    const K = 900, RS = 5, G = 24, TR = R + 0.045, TT = 0.085;
    const tpos = new Float32Array(K * RS * 3), tcol = new Float32Array(K * RS * 3);
    const cosK = new Float32Array(K), sinK = new Float32Array(K);
    for (let k = 0; k < K; k++) { cosK[k] = Math.cos((k / K) * TAU); sinK[k] = Math.sin((k / K) * TAU); }
    const cb = [], sb = [];
    for (let j = 0; j < RS; j++) { cb.push(Math.cos((j / RS) * TAU)); sb.push(Math.sin((j / RS) * TAU)); }
    const idx = [];
    for (let k = 0; k < K; k++) {
      const k2 = (k + 1) % K;
      for (let j = 0; j < RS; j++) { const j2 = (j + 1) % RS, a = k * RS + j, b = k * RS + j2, c = k2 * RS + j, d = k2 * RS + j2; idx.push(a, b, c, b, d, c); }
    }
    const tgeo = new THREE.BufferGeometry();
    tgeo.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tgeo.setAttribute('color', new THREE.BufferAttribute(tcol, 3)); tgeo.setIndex(idx);
    const traceMesh = new THREE.Mesh(tgeo, new THREE.MeshBasicMaterial({ vertexColors: true })); traceMesh.frustumCulled = false; drumRot.add(traceMesh);
    const ampBuf = new Float32Array(K);

    // ---------- readout plaque ----------
    const rc = document.createElement('canvas'); rc.width = 1024; rc.height = 200;
    const rctx = rc.getContext('2d');
    const rtex = new THREE.CanvasTexture(rc); rtex.colorSpace = THREE.SRGBColorSpace; rtex.anisotropy = 8;
    const plaque = shadowy(new THREE.Mesh(slab(roundedRect(8.6, 1.7, 0.5), 0.28, 0.08), M.ceramic()));
    plaque.position.copy(P(0, -11.75, BASE)); g.add(plaque);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.6), new THREE.MeshStandardMaterial({ map: rtex, transparent: true, roughness: 0.4 }));
    face.rotation.x = -Math.PI / 2; face.position.copy(P(0, -11.75, BASE + 0.45)); g.add(face);
    let shownKey = '';
    function drawPlaque(pct, mag, glow) {
      rctx.clearRect(0, 0, 1024, 200);
      rctx.fillStyle = `rgba(255,74,28,${0.4 + 0.6 * glow})`; rctx.beginPath(); rctx.arc(66, 100, 24 + 10 * glow, 0, TAU); rctx.fill();
      rctx.fillStyle = '#16171a'; rctx.font = '600 104px "Inter Tight"'; rctx.fillText(`${pct}`, 120, 138);
      const w = rctx.measureText(`${pct}`).width;
      rctx.fillStyle = '#6a6c72'; rctx.font = '600 40px "Inter Tight"'; rctx.fillText('% STRESS', 132 + w, 136);
      rctx.textAlign = 'right';
      rctx.fillStyle = glow > 0.3 ? '#e8340a' : '#16171a'; rctx.font = '600 84px "Inter Tight"'; rctx.fillText(mag, 990, 134);
      rctx.textAlign = 'left';
      rtex.needsUpdate = true;
    }

    // ---------- motion state ----------
    const T = [0.30, 0.62, 0.92], MAG = [4.6, 5.1, 5.8];
    let first = true, prevN = 0, relief = 0, forced = 0, want = false;
    let off = 0, vel = 0, springC = 0, lastKf = 0, tPrev = 0, hasM = false, lastM = 0, lastT = -99;
    let sEff = 0, lastRead = 'stress 0% · locked';
    const events = [];
    function fire(t, mag, natural) {
      events.push({ t, amp: clamp(0.6 + (mag - 3) * 1.75, 0.8, 4.3), f: 3.0 + 0.3 * (mag - 4), ph: 0.4 * mag });
      if (events.length > 6) events.shift();
      lastM = mag; lastT = t; hasM = true; vel += natural ? 3.4 : 2.4;
    }
    const WSPIN = 0.8;
    function ampAt(tau) {
      let a = (0.035 + 0.3 * sEff * sEff * sEff) * (0.6 * Math.sin(tau * 44.6) + 0.4 * Math.sin(tau * 71.0 + 1.0));
      for (const e of events) {
        const d = tau - e.t; if (d < 0) continue;
        const env = Math.exp(-d / 0.85) * (1 - Math.exp(-d / 0.03));
        a += e.amp * env * (0.72 * Math.sin(TAU * e.f * d + e.ph) + 0.28 * Math.sin(TAU * e.f * 2.1 * d + 1.3));
      }
      return clamp(a, -4.4, 4.4);
    }

    return {
      u: 0.2,
      update(dt, t, u) {
        // stress cycle from u
        let n = 0; while (n < T.length && u >= T[n]) n++;
        const a0 = n ? T[n - 1] : 0, b0 = n < T.length ? T[n] : T[T.length - 1] + 0.3;
        const s0 = clamp((u - a0) / (b0 - a0), 0, 1);
        if (first) { prevN = n; }
        if (n !== prevN) { if (n > prevN && !first) fire(t, MAG[Math.min(n - 1, 2)], true); prevN = n; relief = 0; }
        if (u < 0.02) forced = 0;
        sEff = clamp((s0 - relief) / Math.max(0.05, 1 - relief), 0, 1);
        if (want) { want = false; fire(t, 3.0 + 2.4 * sEff, false); forced = Math.min(forced + 1, CAP); relief = s0; sEff = 0; }
        const target = Math.min(CAP, n + forced) + 0.15 * sEff;
        if (first) { off = target; springC = sEff; first = false; lastKf = ((-WSPIN * t) / TAU % 1 + 1) % 1 * K; tPrev = t; }
        // block slip dynamics (stiff, slightly underdamped going forward; soft going back)
        const fwd = target >= off, kS = fwd ? 480 : 40, cS = fwd ? 28 : 12.6;
        for (let rem = Math.min(dt, 0.1); rem > 1e-6;) {
          const d = Math.min(0.004, rem); vel += (-kS * (off - target) - cS * vel) * d; off += vel * d; rem -= d;
        }
        off = Math.max(off, -0.05);
        springC += (sEff - springC) * (1 - Math.exp(-dt * 24));
        // shake / flash envelopes
        let shake = 0, flash = 0;
        for (const e of events) { const d = t - e.t; if (d >= 0) { shake = Math.max(shake, Math.min(1, e.amp / 2.5) * Math.exp(-d / 0.55) * (1 - Math.exp(-d / 0.02))); flash = Math.max(flash, Math.exp(-d / 0.4)); } }
        shake += 0.05 * sEff * sEff * sEff;

        // blocks
        const dx = -Math.cos(DELTA) * SLIP * off, dh = Math.sin(DELTA) * SLIP * off;
        right.position.set(dx, base0 + dh, 0);
        for (const s of shakers) {
          const w = shake * s.k;
          s.o.position.x = s.o.userData.x ??= s.o.position.x; s.o.userData.y ??= s.o.position.y; s.o.userData.z ??= s.o.position.z;
          s.o.position.x = s.o.userData.x + 0.07 * w * Math.sin(63 * t + s.ph);
          s.o.position.z = s.o.userData.z + 0.07 * w * Math.sin(51 * t + s.ph * 1.7);
          s.o.position.y = s.o.userData.y + 0.04 * w * Math.abs(Math.sin(47 * t + s.ph));
          s.o.rotation.z = 0.09 * w * Math.sin(58 * t + s.ph * 0.7);
        }
        left.position.z = right.position.z = 0.035 * shake * Math.sin(70 * t);
        // glow
        const gk = 0.55 + 2.2 * sEff + 5.5 * flash;
        for (const m of glowMats) m.color.copy(hdr(RED, gk * 1.2));
        faultLight.intensity = 0.4 + 24 * sEff * sEff + 130 * flash;

        // crank, thread, spring
        const ang = -u * TAU * 3.2;
        crank.rotation.x = ang; rodGrp.rotation.x = ang;
        disc.position.copy(P(DISC_X + dx, YC, AXH));
        const plateRight = DISC_X + dx + 0.1;
        const L = 1.9 - 0.9 * springC;
        springG.position.copy(P(plateRight, YC, AXH)); spring.scale.x = L;
        nut.position.copy(P(plateRight + L + 0.3, YC, AXH));

        // seismograph
        const phi = WSPIN * t; drumRot.rotation.x = phi;
        const kf = (((-phi / TAU) % 1) + 1) % 1 * K;
        const steps = (((lastKf - kf) % K) + K) % K, nS = Math.max(1, Math.ceil(steps));
        for (let i = 1; i <= nS; i++) {
          const pos = lastKf - (i * steps) / nS, k = (((Math.floor(pos)) % K) + K) % K;
          ampBuf[k] = ampAt(tPrev + ((t - tPrev) * i) / nS);
        }
        lastKf = kf; tPrev = t;
        const kp = Math.floor(kf) % K;
        const cur = ampAt(t);
        carriage.position.x = cur;
        const oldest = ampBuf[(kp + K - G - 1) % K];
        for (let k = 0; k < K; k++) {
          const age = (k - kp + K) % K, gap = age >= K - G, ag = K - age;
          const ax = gap ? (ag <= G / 2 ? ampBuf[kp] : oldest) : ampBuf[k], rt = gap ? 0 : TT;
          const br = 0.7 + 2.8 * Math.exp(-age / 110) + 1.6 * flash * Math.exp(-age / 160), c = cosK[k], s = sinK[k];
          for (let j = 0; j < RS; j++) {
            const o = (k * RS + j) * 3, e = cb[j] * rt, r = sb[j] * rt;
            tpos[o] = ax + e; tpos[o + 1] = (TR + r) * c; tpos[o + 2] = (TR + r) * s;
            tcol[o] = br; tcol[o + 1] = br * 0.07; tcol[o + 2] = br * 0.02;
          }
        }
        tgeo.attributes.position.needsUpdate = true; tgeo.attributes.color.needsUpdate = true;

        // plaque
        const pct = Math.round(sEff * 100), gq = Math.round(flash * 6) / 6, mag = hasM ? `M ${lastM.toFixed(1)}` : 'M –';
        const key = `${pct}|${mag}|${gq}`;
        if (key !== shownKey) { drawPlaque(pct, mag, gq); shownKey = key; }
        lastRead = t - lastT < 1.6 ? `slip! · M ${lastM.toFixed(1)}` : `stress ${pct}% · locked`;
      },
      action() { want = true; },
      readout: () => lastRead,
    };
  },
};
