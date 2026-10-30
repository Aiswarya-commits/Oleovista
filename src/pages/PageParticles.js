/*
  src/pages/PageParticles.js
  ------------------------------------------------------------------------------------------
  The Home page look (dark green, film grain, one field of glowing 3D particles that re-shapes
  itself as you scroll) for every other page:

    About     oil tanker on a moving particle ocean  -> gold oil barrel -> chart -> oil drop
    Services  storage tank farm -> refinery -> trading network -> tanker -> oil drop
    Careers   dotted Earth (real continents) with glowing gold trade routes
    Team      a team of particle people linked together -> network -> soft drifting dust
    Contact   location pin with signal ripples over a city map -> network

  Every object is made clearly readable with three things:
    - more particles on the edges that define the object (deck line, rims, coastlines...) and
      those edge particles glow brighter,
    - thin glowing outline lines that fade in once the object has formed,
    - an invisible "solid" core, so the particles on the far side of an object are hidden
      (the object reads as a solid 3D thing instead of a see-through cloud).

  - Runs ONLY while About / Services / Careers / Team / Contact is open. Home (HomeParticles.js),
    Olivia, the navbar, WhatsApp and all page content are untouched.
  - Follows the existing scroll (cameraRig.getProgress()), so chapters, menus, the Team / Contact
    tracks and the About / Careers strip scrolling keep working exactly as before.
  - While it shows, body gets the class "pp-on": the old 3D canvas is hidden and main.js skips
    drawing it (saves the GPU). The old worlds keep updating, so nothing else changes.
  - The page-switch fade is recoloured from blue to the same dark green + grain (see themeCurtain).
  - Styles: src/pages/page-particles.css (imported below, no index.html change needed)

  To change a page's shapes, edit PAGE_STAGES near the bottom of this file.
*/
import * as THREE from 'three';
import './page-particles.css';

const PAGES = ['about', 'services', 'careers', 'team', 'contact'];
const R = Math.random;
const D = Math.PI / 180;
const TAU = Math.PI * 2;
const sm = (t) => t * t * (3 - 2 * t);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const gauss = () => (R() + R() + R() + R() - 2) / 2;
const pick = (a) => a[(R() * a.length) | 0];
const sgn = () => (R() < 0.5 ? -1 : 1);
const unit = () => { const u = R() * 2 - 1, t = R() * TAU, s = Math.sqrt(1 - u * u); return [s * Math.cos(t), u, s * Math.sin(t)]; };
const jit = (p, s = 0.004) => [p[0] + gauss() * s, p[1] + gauss() * s, p[2] + gauss() * s];
const edgeBox = (cx, cy, cz, hx, hy, hz) => {
  const e = (R() * 12) | 0, t = R() * 2 - 1, a = e & 1 ? 1 : -1, b = e & 2 ? 1 : -1;
  if (e < 4) return [cx + a * hx, cy + t * hy, cz + b * hz];
  if (e < 8) return [cx + t * hx, cy + a * hy, cz + b * hz];
  return [cx + a * hx, cy + b * hy, cz + t * hz];
};
// random point on the surface of a round tube from a to b (limbs, pipes)
const tube = (a, b, r) => {
  const ax = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...ax) || 1;
  const n = [ax[0] / L, ax[1] / L, ax[2] / L];
  const h = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [n[1] * h[2] - n[2] * h[1], n[2] * h[0] - n[0] * h[2], n[0] * h[1] - n[1] * h[0]];
  const ul = Math.hypot(...u); u = u.map((v) => v / ul);
  const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  const s = R(), t = R() * TAU, c = Math.cos(t) * r, d = Math.sin(t) * r;
  return [a[0] + ax[0] * s + u[0] * c + v[0] * d, a[1] + ax[1] * s + u[1] * c + v[1] * d, a[2] + ax[2] * s + u[2] * c + v[2] * d];
};

/* outline line builder (pairs of points for THREE.LineSegments) */
class LB {
  constructor() { this.a = []; }
  seg(p, q) { this.a.push(p[0], p[1], p[2], q[0], q[1], q[2]); return this; }
  poly(pts, closed) { for (let i = 0; i < pts.length - 1; i++) this.seg(pts[i], pts[i + 1]); if (closed && pts.length > 2) this.seg(pts[pts.length - 1], pts[0]); return this; }
  circle(cx, cy, cz, r, n = 40, rz = r) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; p.push([cx + Math.cos(a) * r, cy, cz + Math.sin(a) * rz]); } return this.poly(p, true); }
  box(cx, cy, cz, hx, hy, hz) {
    const c = (i, j, k) => [cx + i * hx, cy + j * hy, cz + k * hz];
    for (const i of [-1, 1]) for (const j of [-1, 1]) { this.seg(c(i, j, -1), c(i, j, 1)); this.seg(c(i, -1, j), c(i, 1, j)); this.seg(c(-1, i, j), c(1, i, j)); }
    return this;
  }
  get() { return new Float32Array(this.a); }
}

/* invisible solid cores: they only write depth, so particles behind them are hidden */
let OCC_MAT = null;
const occ = (geo, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  if (!OCC_MAT) OCC_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, OCC_MAT);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.renderOrder = 0;
  return m;
};
const GREEN = 0x8dff62, GOLD = 0xffc65a;

/* fn(f) returns [x, y, z, water(0/1), warm(0..1), edge(-1..1)]; points are shuffled so morphs look organic.
   edge > 0 = defining edge (brighter, slightly bigger)   edge < 0 = background detail (dimmer) */
function build(N, fn) {
  const pos = new Float32Array(N * 3), water = new Uint8Array(N), warm = new Float32Array(N), hi = new Float32Array(N);
  let hasW = false, hasWarm = false, hasHi = false;
  for (let i = 0; i < N; i++) {
    const p = fn(i / N, i);
    pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
    if (p[3]) { water[i] = 1; hasW = true; }
    if (p[4]) { warm[i] = p[4]; hasWarm = true; }
    if (p[5]) { hi[i] = p[5]; hasHi = true; }
  }
  for (let i = N - 1; i > 0; i--) {
    const j = (R() * (i + 1)) | 0;
    for (let k = 0; k < 3; k++) { const t = pos[i * 3 + k]; pos[i * 3 + k] = pos[j * 3 + k]; pos[j * 3 + k] = t; }
    let t = water[i]; water[i] = water[j]; water[j] = t;
    t = warm[i]; warm[i] = warm[j]; warm[j] = t;
    t = hi[i]; hi[i] = hi[j]; hi[j] = t;
  }
  return { pos, water: hasW ? water : null, warm: hasWarm ? warm : null, hi: hasHi ? hi : null, wave: null, deco: null };
}

/* moving surfaces (only points flagged "water" move) */
const WAVES = {
  ocean: (x, z, t) => Math.sin(x * 2.4 + t * 1.5 + z * 0.8) * 0.03 + Math.sin(z * 4.0 - t * 1.1) * 0.018,
  radial: (x, z, t) => { const r = Math.hypot(x, z); return Math.sin(r * 5 - t * 3) * 0.05 * Math.exp(-r * 0.45); }
};

/* ============================ SHAPES ============================ */

// oil tanker (same ship as Home: cargo drums on deck) sitting on a wide, moving particle ocean
function shipShape(N) {
  const ST = -1.6, KB = 1.35, DB = 1.66, KEEL = -0.35, DECK = 0.1, HALF = 0.38, WL = -0.19, FC = 1.1, OFF = -0.28;
  const deckY = (u) => DECK + 0.08 * sm(clamp01((u - FC) / 0.14));          // raised bow (forecastle)
  const uMax = (y) => KB + (DB - KB) * clamp01((y - KEEL) / (DECK - KEEL));  // raked bow
  const hw = (u, y) => {
    const h = clamp01((y - KEEL) / (DECK - KEEL)), um = uMax(y);
    let w = HALF * (0.7 + 0.3 * h);
    if (u > 0.9) w *= Math.sqrt(Math.max(0, 1 - ((u - 0.9) / (um - 0.9)) ** 2));
    if (u < ST + 0.18) w *= 0.85 + 0.15 * Math.max(0, (u - ST) / 0.18);
    return w;
  };
  const DR = 0.095, DH = 0.2, DRUMS = [];
  for (let x = -0.85; x <= 0.96; x += 0.3) for (const z of [-0.18, 0.18]) DRUMS.push([x, DECK + 0.01, z]);
  const HS = { x0: -1.5, x1: -1.1, y1: 0.5, zw: 0.3 }, BR = { x0: -1.46, x1: -1.06, y0: 0.5, y1: 0.58, zw: 0.44 };
  const FUN = { x: -1.4, y0: 0.58, y1: 0.86, rx: 0.07, rz: 0.1 };
  const WIN = [0.2, 0.3, 0.4];

  const s = build(N, (f) => {
    let p, water = 0, warm = 0, hi = 0;
    if (f < 0.27) {                                   // hull sides
      const q = R(), sd = sgn();
      let u, y;
      if (q < 0.26) { u = ST + R() * (DB - ST); y = deckY(u); hi = 1; }
      else if (q < 0.42) { u = ST + R() * (uMax(WL) - ST); y = WL; hi = 0.8; }
      else if (q < 0.62) { y = WL + (DECK - WL) * (R() < 0.5 ? 0.36 : 0.7); u = ST + R() * (uMax(y) - ST); hi = 0.15; }
      else if (q < 0.8) { y = WL + R() * (DECK - WL); u = ST + R() * (uMax(y) - ST); }
      else if (q < 0.88) { u = FC + R() * (DB - FC); y = DECK + R() * (deckY(u) - DECK); }
      else { y = KEEL + R() * (WL - KEEL); u = ST + R() * (uMax(y) - ST); hi = -0.75; }
      p = [u, y, sd * hw(u, Math.min(y, DECK))];
    } else if (f < 0.31) {                            // bow stem + square stern
      if (R() < 0.55) { const y = KEEL + R() * (deckY(DB) - KEEL); p = [uMax(Math.min(y, DECK)), y, 0]; hi = y < WL ? -0.5 : 1; }
      else { const y = WL + R() * (DECK - WL), w = hw(ST, y); p = R() < 0.6 ? [ST, y, sgn() * w] : [ST, R() < 0.5 ? DECK : WL, (R() * 2 - 1) * w]; hi = 0.8; }
    } else if (f < 0.34) {                            // deck plating
      const u = ST + R() * (DB - ST); p = [u, deckY(u) + 0.003, (R() * 2 - 1) * hw(u, DECK) * 0.95]; hi = -0.4;
    } else if (f < 0.4) {                             // pipes, catwalk, manifold, mast, crane
      const q = R();
      if (q < 0.38) { p = [-1.05 + R() * 2.1, DECK + 0.035, sgn() * 0.035]; warm = 0.75; hi = 0.3; }
      else if (q < 0.56) { const x = -1.05 + R() * 2.15; p = R() < 0.75 ? [x, DECK + 0.1, 0] : [-1.05 + ((R() * 15) | 0) * 0.15, DECK + R() * 0.1, 0]; hi = 0.5; }
      else if (q < 0.7) { p = [0.05 + gauss() * 0.02, DECK + 0.06, (R() * 2 - 1) * 0.33]; warm = 0.9; hi = 0.5; }
      else if (q < 0.86) { const x = 1.42, y0 = deckY(x); p = R() < 0.75 ? [x, y0 + R() * 0.42, 0] : [x, y0 + 0.34, (R() * 2 - 1) * 0.1]; hi = 0.8; }
      else { const a = [0.05, DECK, 0], b = [0.05, DECK + 0.3, 0], c = [0.32, DECK + 0.25, 0.24]; p = R() < 0.5 ? [a[0], a[1] + R() * 0.3, 0] : [lerp(b[0], c[0], R()), 0, 0]; if (p[1] === 0) { const t = (p[0] - b[0]) / (c[0] - b[0]); p = [p[0], lerp(b[1], c[1], t), lerp(b[2], c[2], t)]; } hi = 0.5; }
    } else if (f < 0.56) {                            // cargo drums (gold rims)
      const d = pick(DRUMS), a = R() * TAU, q = R();
      if (q < 0.3) { p = [d[0] + Math.cos(a) * DR, d[1] + DH, d[2] + Math.sin(a) * DR]; hi = 0.9; }
      else if (q < 0.44) { p = [d[0] + Math.cos(a) * DR, d[1], d[2] + Math.sin(a) * DR]; hi = 0.4; }
      else if (q < 0.6) { p = [d[0] + Math.cos(a) * DR * 1.02, d[1] + DH * (R() < 0.5 ? 0.33 : 0.66), d[2] + Math.sin(a) * DR * 1.02]; hi = 0.2; }
      else if (q < 0.84) { p = [d[0] + Math.cos(a) * DR, d[1] + R() * DH, d[2] + Math.sin(a) * DR]; }
      else { const r = DR * Math.sqrt(R()) * 0.9; p = [d[0] + Math.cos(a) * r, d[1] + DH, d[2] + Math.sin(a) * r]; hi = -0.2; }
      warm = 0.55;
    } else if (f < 0.68) {                            // accommodation block + bridge with lit windows
      const q = R();
      if (q < 0.24) { p = edgeBox((HS.x0 + HS.x1) / 2, (DECK + HS.y1) / 2, 0, (HS.x1 - HS.x0) / 2, (HS.y1 - DECK) / 2, HS.zw); hi = 1; }
      else if (q < 0.5) {
        const y = pick(WIN) + gauss() * 0.006;
        if (R() < 0.6) { const zc = -0.25 + ((R() * 6) | 0) * 0.1; p = [HS.x1 + 0.003, y, zc + (R() * 2 - 1) * 0.03]; }
        else { const xc = HS.x0 + 0.05 + ((R() * 4) | 0) * 0.1; p = [xc + (R() * 2 - 1) * 0.03, y, sgn() * (HS.zw + 0.003)]; }
        hi = 0.8; warm = 0.35;
      } else if (q < 0.68) {
        const face = (R() * 3) | 0, y = DECK + R() * (HS.y1 - DECK);
        p = face === 0 ? [HS.x1, y, (R() * 2 - 1) * HS.zw] : face === 1 ? [HS.x0 + R() * (HS.x1 - HS.x0), y, sgn() * HS.zw] : [HS.x0, y, (R() * 2 - 1) * HS.zw];
        hi = -0.2;
      } else if (q < 0.88) { p = edgeBox((BR.x0 + BR.x1) / 2, (BR.y0 + BR.y1) / 2, 0, (BR.x1 - BR.x0) / 2, (BR.y1 - BR.y0) / 2, BR.zw); hi = 1; }
      else { p = [BR.x1 + 0.003, BR.y0 + 0.04 + gauss() * 0.006, (R() * 2 - 1) * BR.zw * 0.9]; hi = 0.9; warm = 0.45; }
    } else if (f < 0.71) {                            // funnel with gold band + radar mast
      const a = R() * TAU, q = R();
      if (q < 0.75) {
        const y = q < 0.3 ? FUN.y0 + R() * (FUN.y1 - FUN.y0) : q < 0.5 ? FUN.y1 : 0.76 + R() * 0.06;
        p = [FUN.x + Math.cos(a) * FUN.rx, y, Math.sin(a) * FUN.rz];
        hi = q < 0.3 ? 0 : 1; warm = y > 0.75 ? 1 : 0;
      } else { p = R() < 0.7 ? [-1.2, 0.58 + R() * 0.2, 0] : [-1.2, 0.74, (R() * 2 - 1) * 0.12]; hi = 0.7; }
    } else {                                          // ocean
      water = 1;
      if (R() < 0.84) { const row = (R() * 30) | 0; p = [(R() * 2 - 1) * 3.6, WL - 0.006, -2.0 + row * (4.0 / 29)]; hi = -0.05 - Math.abs(p[2]) * 0.12; }
      else { const q = R(); p = [ST - q * 1.4, WL - 0.004, (R() * 2 - 1) * (0.22 + q * 0.6)]; hi = 0.1 - q * 0.4; }
    }
    return [p[0] + gauss() * 0.0015, p[1] + OFF + gauss() * 0.0015, p[2] + gauss() * 0.0015, water, warm, hi];
  });
  s.wave = 'ocean';
  s.deco = () => {
    const g = new LB(), y = new LB();
    for (const sd of [-1, 1]) {
      const deck = [], wl = [];
      for (let i = 0; i <= 60; i++) { const u = ST + (DB - ST) * i / 60; deck.push([u, deckY(u), sd * hw(u, DECK)]); }
      for (let i = 0; i <= 50; i++) { const u = ST + (uMax(WL) - ST) * i / 50; wl.push([u, WL, sd * hw(u, WL)]); }
      g.poly(deck).poly(wl);
      g.seg([ST, WL, sd * hw(ST, WL)], [ST, DECK, sd * hw(ST, DECK)]);
    }
    g.seg([ST, DECK, -hw(ST, DECK)], [ST, DECK, hw(ST, DECK)]);
    const stem = []; for (let i = 0; i <= 12; i++) { const yy = WL + (deckY(DB) - WL) * i / 12; stem.push([uMax(Math.min(yy, DECK)), yy, 0]); }
    g.poly(stem);
    g.box((HS.x0 + HS.x1) / 2, (DECK + HS.y1) / 2, 0, (HS.x1 - HS.x0) / 2, (HS.y1 - DECK) / 2, HS.zw);
    g.box((BR.x0 + BR.x1) / 2, (BR.y0 + BR.y1) / 2, 0, (BR.x1 - BR.x0) / 2, (BR.y1 - BR.y0) / 2, BR.zw);
    g.circle(FUN.x, FUN.y0, 0, FUN.rx, 24, FUN.rz).circle(FUN.x, FUN.y1, 0, FUN.rx, 24, FUN.rz);
    g.seg([1.42, deckY(1.42), 0], [1.42, deckY(1.42) + 0.42, 0]).seg([-1.05, DECK + 0.1, 0], [1.1, DECK + 0.1, 0]);
    for (const d of DRUMS) y.circle(d[0], d[1] + DH, d[2], DR, 18).circle(d[0], d[1], d[2], DR, 18);
    y.circle(FUN.x, 0.79, 0, FUN.rx * 1.01, 24, FUN.rz * 1.01);
    for (const z of [-0.035, 0.035]) y.seg([-1.05, DECK + 0.035, z], [1.05, DECK + 0.035, z]);
    const occs = [];
    const slabs = [[KEEL, -0.2], [-0.2, -0.05], [-0.05, DECK - 0.012]];
    for (const [yb, yt] of slabs) {
      const sh = new THREE.Shape(), n = 30, um = uMax(yb);
      for (let i = 0; i <= n; i++) { const u = ST + (um - ST) * i / n; i ? sh.lineTo(u, hw(u, yb) * 0.93) : sh.moveTo(u, hw(u, yb) * 0.93); }
      for (let i = n; i >= 0; i--) { const u = ST + (um - ST) * i / n; sh.lineTo(u, -hw(u, yb) * 0.93); }
      const geo = new THREE.ExtrudeGeometry(sh, { depth: yt - yb, bevelEnabled: false });
      geo.rotateX(Math.PI / 2);
      occs.push(occ(geo, 0, yt, 0));
    }
    occs.push(occ(new THREE.BoxGeometry(HS.x1 - HS.x0 - 0.02, HS.y1 - DECK - 0.01, HS.zw * 2 - 0.02), (HS.x0 + HS.x1) / 2, (DECK + HS.y1) / 2, 0));
    occs.push(occ(new THREE.BoxGeometry(BR.x1 - BR.x0 - 0.02, BR.y1 - BR.y0 - 0.01, BR.zw * 2 - 0.02), (BR.x0 + BR.x1) / 2, (BR.y0 + BR.y1) / 2, 0));
    occs.push(occ(new THREE.CylinderGeometry(FUN.rx * 0.92, FUN.rx * 0.92, FUN.y1 - FUN.y0 - 0.01, 20), FUN.x, (FUN.y0 + FUN.y1) / 2, 0, 1, 1, FUN.rz / FUN.rx));
    for (const d of DRUMS) occs.push(occ(new THREE.CylinderGeometry(DR * 0.92, DR * 0.92, DH - 0.01, 16), d[0], d[1] + DH / 2, d[2]));
    return { off: [0, OFF, 0], lines: [{ pos: g.get(), color: GREEN, k: 0.5 }, { pos: y.get(), color: GOLD, k: 0.42 }], occ: occs };
  };
  return s;
}

// shining gold oil barrel with a green oil-drop emblem
function barrelShape(N) {
  const H = 0.62, RB = 0.44, HOOP = 0.36;
  const rad = (y) => RB * (1 + 0.05 * Math.cos(Math.PI * y / (2 * H)));
  const dropXY = (t, a) => [a * 0.72 * Math.sin(t) * Math.sin(t / 2), a * Math.cos(t)];   // tip up, round bottom
  const onSide = (x, y, out = 1.012) => { const ang = Math.PI / 2 + x / RB, r = rad(y) * out; return [Math.cos(ang) * r, y, Math.sin(ang) * r]; };
  const s = build(N, () => {
    const g = R(), a = R() * TAU;
    let p, warm = 0.85, hi = 0;
    if (g < 0.24) { const y = sgn() * H; p = [Math.cos(a) * rad(y), y, Math.sin(a) * rad(y)]; hi = 1; }
    else if (g < 0.42) { const y = sgn() * H * HOOP + (R() < 0.5 ? 0.015 : -0.015), r = rad(y) * 1.03; p = [Math.cos(a) * r, y, Math.sin(a) * r]; hi = 0.8; }
    else if (g < 0.7) { const y = (R() * 2 - 1) * H; p = [Math.cos(a) * rad(y), y, Math.sin(a) * rad(y)]; hi = -0.1; }
    else if (g < 0.82) { const r = RB * Math.sqrt(R()) * 0.94; p = [Math.cos(a) * r, H, Math.sin(a) * r]; hi = -0.3; if (R() < 0.3) { p = [Math.cos(a) * RB * 0.85, H + 0.005, Math.sin(a) * RB * 0.85]; hi = 0.5; } }
    else if (g < 0.86) { const c = R() < 0.5 ? 0.26 : -0.26, r = R() < 0.6 ? 0.055 : 0.055 * Math.sqrt(R()); p = [c + Math.cos(a) * r, H + 0.01, Math.sin(a) * r * 0.4 + (c > 0 ? 0 : 0.12)]; hi = 0.9; warm = 1; }
    else { // green oil-drop emblem on the front of the barrel
      const t = R() * TAU, [x, y] = dropXY(t, 0.19);
      if (R() < 0.6) p = onSide(x, y - 0.02); else { const k = Math.sqrt(R()); p = onSide(x * k, (y + 0.06) * k - 0.08); }
      hi = 1; warm = 0;
    }
    return [...jit(p, 0.002), 0, warm, hi];
  });
  s.deco = () => {
    const y = new LB(), g = new LB();
    for (const sy of [-1, 1]) { y.circle(0, sy * H, 0, rad(H), 56); y.circle(0, sy * H * HOOP, 0, rad(H * HOOP) * 1.03, 56); }
    y.circle(0, H, 0, RB * 0.85, 48);
    const em = []; for (let i = 0; i <= 40; i++) { const [x, yy] = dropXY(i / 40 * TAU, 0.19); em.push(onSide(x, yy - 0.02, 1.015)); }
    g.poly(em);
    return { lines: [{ pos: y.get(), color: GOLD, k: 0.5 }, { pos: g.get(), color: GREEN, k: 0.7 }], occ: [occ(new THREE.CylinderGeometry(RB * 0.97, RB * 0.97, 2 * H - 0.01, 40))] };
  };
  return s;
}

// rising candlestick chart with a gold trend line
function chartShape(N) {
  const C = [[-0.3, -0.1], [-0.15, 0.05], [0.0, -0.05], [-0.05, 0.2], [0.15, 0.32], [0.28, 0.2], [0.25, 0.48], [0.45, 0.62]];
  const X0 = -0.85, DX = 1.7 / (C.length - 1), W = 0.07;
  const box = (i) => { const [o, c] = C[i], y0 = Math.min(o, c) - 0.2, y1 = Math.max(o, c) - 0.2; return { x: X0 + i * DX, y0, y1, up: c > o }; };
  const trend = (s) => [-0.9 + s * 1.85, -0.45 + s * 1.15 + Math.sin(s * 9) * 0.06, 0.1];
  const s = build(N, () => {
    const g = R();
    let p, warm = 0, hi = 0;
    if (g < 0.5) {
      const b = box((R() * C.length) | 0), hy = Math.max(0.03, (b.y1 - b.y0) / 2);
      if (R() < 0.6) { p = edgeBox(b.x, (b.y0 + b.y1) / 2, 0, W, hy, W); hi = 1; }
      else { p = [b.x + (R() * 2 - 1) * W, b.y0 + R() * (b.y1 - b.y0), sgn() * W]; hi = -0.1; }
      if (!b.up) warm = 0.35;
    } else if (g < 0.6) { const b = box((R() * C.length) | 0); p = [b.x, b.y0 - 0.12 + R() * (b.y1 - b.y0 + 0.24), 0]; hi = 0.6; }
    else if (g < 0.8) { p = trend(R()); warm = 1; hi = 0.7; }
    else if (g < 0.86) { let a = R(), b = R(); if (a + b > 1) { a = 1 - a; b = 1 - b; } p = [0.95 + a * 0.14 - b * 0.1, 0.7 + a * 0.08 + b * 0.14, 0.1]; warm = 1; hi = 1; }
    else if (g < 0.94) { p = R() < 0.5 ? [-1.0, -0.65 + R() * 1.5, 0] : [-1.0 + R() * 2.05, -0.65, 0]; hi = 0.4; }
    else { p = [-1.0 + R() * 2.05, -0.65 + ((R() * 5) | 0) * 0.3 + 0.3, -0.05]; hi = -0.6; }
    return [...jit(p, 0.002), 0, warm, hi];
  });
  s.deco = () => {
    const g = new LB(), y = new LB();
    C.forEach((_, i) => { const b = box(i), hy = Math.max(0.03, (b.y1 - b.y0) / 2); g.box(b.x, (b.y0 + b.y1) / 2, 0, W, hy, W); g.seg([b.x, b.y0 - 0.12, 0], [b.x, b.y0, 0]).seg([b.x, b.y1, 0], [b.x, b.y1 + 0.12, 0]); });
    g.seg([-1.0, -0.65, 0], [-1.0, 0.85, 0]).seg([-1.0, -0.65, 0], [1.05, -0.65, 0]);
    const tr = []; for (let i = 0; i <= 60; i++) tr.push(trend(i / 60)); y.poly(tr);
    return { lines: [{ pos: g.get(), color: GREEN, k: 0.55 }, { pos: y.get(), color: GOLD, k: 0.6 }], occ: [] };
  };
  return s;
}

// oil drop falling into a ripple
function dropShape(N) {
  const prof = (t) => [0.5 * Math.sin(t) * Math.pow((1 - Math.cos(t)) / 2, 0.55) * 1.25, 0.72 * Math.cos(t) - 0.08];
  const s = build(N, () => {
    const g = R(), a = R() * TAU;
    if (g < 0.08) { const r = Math.sqrt(R()); return [...jit([-0.17 + Math.cos(a) * 0.05 * r, -0.1 + Math.sin(a) * 0.12 * r, 0.38], 0.004), 0, 1, 0.6]; }   // shine
    if (g < 0.3) { const t = (0.12 + ((R() * 7) | 0) * 0.12) * Math.PI, [r, y] = prof(t); return [...jit([Math.cos(a) * r, y, Math.sin(a) * r], 0.002), 0, 0.6, 0.6]; }
    if (g < 0.86) { const t = Math.acos(1 - 2 * R()), [r, y] = prof(t); return [...jit([Math.cos(a) * r, y, Math.sin(a) * r], 0.003), 0, 0.6, 0]; }
    const r = pick([0.35, 0.6, 0.85]) + gauss() * 0.01; return [Math.cos(a) * r, -1.0, Math.sin(a) * r, 1, 0.3, 0.2];   // ripple below
  });
  s.wave = 'radial';
  s.deco = () => {
    const g = new LB();
    for (let k = 0; k < 7; k++) { const [r, y] = prof((0.12 + k * 0.12) * Math.PI); g.circle(0, y, 0, r * 1.005, 48); }
    const pts = []; for (let i = 0; i <= 40; i++) pts.push(new THREE.Vector2(...prof(Math.PI - i / 40 * Math.PI)));
    pts.forEach((v) => (v.x *= 0.96));
    return { lines: [{ pos: g.get(), color: GOLD, k: 0.35 }], occ: [occ(new THREE.LatheGeometry(pts, 40))] };
  };
  return s;
}

// deep star field + nebula filaments (the trading network)
function cosmosShape(N, mobile) {
  const CW = mobile ? 0.42 : 1;
  const fil = [...Array(7)].map(() => ({ x0: (-6 + R() * 12) * CW, y0: 1.2 + R() * 2.4, len: (2 + R() * 4) * CW, ang: -0.6 + R() * 1.2, wob: R() * 3, z: -3 + R() * 2.5 }));
  return build(N, (f) => {
    if (f < 0.7) return [(R() * 2 - 1) * 7.5 * CW, (R() * 2 - 1) * 4.2, -6 + R() * 7.2];
    const fl = pick(fil), s = R();
    const x = fl.x0 + Math.cos(fl.ang) * s * fl.len, y = fl.y0 + Math.sin(fl.ang) * s * fl.len + Math.sin(s * 6 + fl.wob) * 0.35;
    const sp = 0.05 + 0.18 * Math.pow(R(), 2);
    return [x + gauss() * sp * 3, y + gauss() * sp, fl.z + gauss() * sp * 2];
  });
}

function dustShape(N, mobile) {
  const CW = mobile ? 0.42 : 1;
  return build(N, () => [(R() * 2 - 1) * 8 * CW, (R() * 2 - 1) * 5, -7 + R() * 7]);
}

// DNA double helix with base-pair rungs
function helixShape(N) {
  const strand = (t, side) => { const y = t * 2.5, rad = 0.38 + 0.25 * t * t, a = t * 7 + side * Math.PI; return [Math.cos(a) * rad, y, Math.sin(a) * rad]; };
  return build(N, () => {
    if (R() < 0.62) { const t = R() * 2 - 1, p = strand(t, R() < 0.5 ? 0 : 1); return [...jit(p, 0.012), 0, 0, 0.6]; }
    const k = (R() * 34) | 0, t = -1 + (k + 0.5) / 34 * 2, a = strand(t, 0), b = strand(t, 1), s = R();
    return [...jit([lerp(a[0], b[0], s), lerp(a[1], b[1], s), lerp(a[2], b[2], s)], 0.006), 0, (s < 0.5) === (k % 2 === 0) ? 0.9 : 0, 0.2];
  });
}

// storage tank farm with glowing gold pipelines
function tanksShape(N) {
  const T = [[-1.55, -0.55, 0.3, 0.6], [-0.8, -0.65, 0.36, 0.72], [0.05, -0.6, 0.33, 0.62], [0.85, -0.55, 0.3, 0.55], [1.6, -0.6, 0.26, 0.48],
    [-1.2, 0.4, 0.3, 0.55], [-0.4, 0.45, 0.36, 0.7], [0.45, 0.4, 0.38, 0.74], [1.3, 0.45, 0.3, 0.58]];
  const B = -0.55, RF = 0.18;
  const s = build(N, (f) => {
    let p, warm = 0, hi = 0;
    if (f < 0.7) {
      const [x, z, r, H] = pick(T), g = R(), a = R() * TAU;
      if (g < 0.22) { p = [x + Math.cos(a) * r, B + H, z + Math.sin(a) * r]; hi = 1; }
      else if (g < 0.32) { p = [x + Math.cos(a) * r, B, z + Math.sin(a) * r]; hi = 0.6; }
      else if (g < 0.46) { const y = [0.25, 0.5, 0.75][(R() * 3) | 0] * H; p = [x + Math.cos(a) * r * 1.005, B + y, z + Math.sin(a) * r * 1.005]; hi = 0.15; }
      else if (g < 0.58) { const t = R(), ang = t * Math.PI * 1.2 + 0.6, rr = r * 1.04; p = [x + Math.cos(ang) * rr, B + t * H, z + Math.sin(ang) * rr]; hi = 0.5; warm = 0.4; }
      else if (g < 0.8) { const s2 = R(), rr = r * (1 - s2); p = [x + Math.cos(a) * rr, B + H + s2 * H * RF, z + Math.sin(a) * rr]; hi = -0.1; warm = 0.2; }
      else { p = [x + Math.cos(a) * r, B + R() * H, z + Math.sin(a) * r]; hi = -0.2; }
    } else if (f < 0.8) {
      const i = (R() * (T.length - 1)) | 0, a = T[i], b = T[i + 1], s2 = R();
      p = [lerp(a[0], b[0], s2), B + 0.05, lerp(a[1], b[1], s2)]; warm = 0.8; hi = 0.5;
    } else if (f < 0.92) {
      const X = 2.1, Z = 1.1, y = B - 0.01;
      if (R() < 0.4) { const t = R() * 2 - 1, e = (R() * 4) | 0; p = e < 2 ? [t * X, y, e ? -Z : Z] : [e === 2 ? -X : X, y, t * Z]; hi = 0.4; }
      else { p = R() < 0.5 ? [-X + ((R() * 13) | 0) * 0.35, y, (R() * 2 - 1) * Z] : [(R() * 2 - 1) * X, y, -Z + ((R() * 7) | 0) * 0.35]; hi = -0.5; }
    } else {
      const [x, z, r] = pick(T), rr = r * (1.25 + R() * 0.2), a = R() * TAU;
      p = [x + Math.cos(a) * rr, B - 0.01, z + Math.sin(a) * rr]; hi = -0.3;
    }
    return [...jit(p, 0.002), 0, warm, hi];
  });
  s.deco = () => {
    const g = new LB(), y = new LB(), occs = [];
    for (const [x, z, r, H] of T) {
      g.circle(x, B + H, z, r, 36).circle(x, B, z, r, 36);
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.seg([x + Math.cos(a) * r, B + H, z + Math.sin(a) * r], [x, B + H + H * RF, z]); }
      occs.push(occ(new THREE.CylinderGeometry(r * 0.96, r * 0.96, H - 0.01, 28), x, B + H / 2, z));
      occs.push(occ(new THREE.ConeGeometry(r * 0.94, H * RF * 0.9, 28), x, B + H + H * RF * 0.45, z));
    }
    for (let i = 0; i < T.length - 1; i++) y.seg([T[i][0], B + 0.05, T[i][1]], [T[i + 1][0], B + 0.05, T[i + 1][1]]);
    return { lines: [{ pos: g.get(), color: GREEN, k: 0.45 }, { pos: y.get(), color: GOLD, k: 0.5 }], occ: occs };
  };
  return s;
}

// refinery: distillation columns, flare stack, spheres, pipe rack and rising steam
function refineryShape(N) {
  const B = -0.9;
  const COLS = [[-0.75, -0.25, 0.13, 1.55], [-0.38, -0.32, 0.17, 1.85], [0.0, -0.22, 0.12, 1.35], [0.32, -0.3, 0.1, 1.15]];
  const SPH = [[-0.95, 0.5, 0.26], [-0.35, 0.55, 0.24]], SY = B + 0.48;
  const s = build(N, (f) => {
    let p, warm = 0, hi = 0;
    if (f < 0.42) {
      const [x, z, r, H] = pick(COLS), g = R(), a = R() * TAU;
      if (g < 0.32) { const k = (R() * Math.floor(H / 0.2)) | 0; p = [x + Math.cos(a) * (r + 0.03), B + 0.1 + k * 0.2, z + Math.sin(a) * (r + 0.03)]; hi = 0.7; }
      else if (g < 0.72) { p = [x + Math.cos(a) * r, B + R() * H, z + Math.sin(a) * r]; hi = -0.1; }
      else if (g < 0.86) { const d = unit(); p = [x + d[0] * r, B + H + Math.abs(d[1]) * r * 0.6, z + d[2] * r]; hi = 0.4; }
      else { const sd = sgn(); p = [x + sd * (r + 0.05), B + R() * H, z + 0.02]; hi = 0.5; }
    } else if (f < 0.5) {
      const x = 0.72, z = -0.15;
      if (R() < 0.6) { p = [x + gauss() * 0.01, B + R() * 1.9, z + gauss() * 0.01]; hi = 0.8; }
      else { p = [x + gauss() * 0.05, B + 1.95 + Math.abs(gauss()) * 0.28, z + gauss() * 0.05]; warm = 1; hi = 1; }
    } else if (f < 0.68) {
      const [x, z, r] = pick(SPH);
      if (R() < 0.62) { const d = unit(); p = [x + d[0] * r, SY + d[1] * r, z + d[2] * r]; hi = -0.1; }
      else if (R() < 0.6) { const a = R() * TAU; p = [x + Math.cos(a) * r * 1.01, SY, z + Math.sin(a) * r * 1.01]; hi = 1; }
      else { p = [x + sgn() * r * 0.6, B + R() * (SY - B), z + sgn() * r * 0.6]; hi = 0.5; }
    } else if (f < 0.78) {
      if (R() < 0.6) { p = [-1.2 + R() * 2.1, B + 0.42 + (R() < 0.5 ? 0 : 0.05), 0.25]; warm = 0.6; hi = 0.5; }
      else { p = [-1.2 + ((R() * 8) | 0) * 0.3, B + R() * 0.44, 0.25]; hi = 0.3; }
    } else if (f < 0.9) {
      const X = 1.8, Z = 1.1;
      p = R() < 0.5 ? [-X + ((R() * 13) | 0) * 0.3, B, (R() * 2 - 1) * Z] : [(R() * 2 - 1) * X, B, -Z + ((R() * 8) | 0) * 0.3]; hi = -0.5;
    } else {
      const [x, z, , H] = pick(COLS), s2 = R();
      p = [x + gauss() * 0.08 * (1 + s2 * 2), B + H + 0.1 + s2 * 0.9, z + gauss() * 0.08 * (1 + s2 * 2)]; hi = -0.4;
    }
    return [...jit(p, 0.002), 0, warm, hi];
  });
  s.deco = () => {
    const g = new LB(), y = new LB(), occs = [];
    for (const [x, z, r, H] of COLS) {
      g.circle(x, B, z, r, 28).circle(x, B + H, z, r, 28);
      for (let k = 0; k < Math.floor(H / 0.2); k++) g.circle(x, B + 0.1 + k * 0.2, z, r + 0.03, 28);
      occs.push(occ(new THREE.CylinderGeometry(r * 0.94, r * 0.94, H, 24), x, B + H / 2, z));
    }
    for (const [x, z, r] of SPH) { g.circle(x, SY, z, r * 1.01, 40); occs.push(occ(new THREE.SphereGeometry(r * 0.95, 24, 16), x, SY, z)); }
    g.seg([0.72, B, -0.15], [0.72, B + 1.9, -0.15]);
    y.seg([-1.2, B + 0.42, 0.25], [0.9, B + 0.42, 0.25]).seg([-1.2, B + 0.47, 0.25], [0.9, B + 0.47, 0.25]);
    return { lines: [{ pos: g.get(), color: GREEN, k: 0.42 }, { pos: y.get(), color: GOLD, k: 0.5 }], occ: occs };
  };
  return s;
}

/* Earth land mask (1 degree cells, Natural Earth 110m, public domain) + simplified coastlines */
const LAND_MASK = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADg/wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADA/v8/AOD//z8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+///D/////5//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAH/j/+//////8PAAAAgB0AAHgAAAAAAD8AAAAAAAAAAAAAAAAAAAAAAAAAAOD//wP8//////8BAACAfx4AAAAAAAAAAP4AAAAAAAAAAAAAAAAAAAAAAAA4+I73//n///////8AAAAAfwAAAAAAAAAAAAAfAAAAAAAAAAAAAAAAAAAAAOAQACDwP4D///////8BAAAAPAQAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAADzAgPP5H8D//////38AAAAAAAAAAAAA4AEAAAD+DwAAAAAAAAAAAAAAAAAAAIC/g7PfBwAA/v////8AAAAAAAAAAADgBwAAwP//PwAA4B8AAAAAAAAAAAAAAAAMAAD8AgAA+P////8AAAAAAAAAAABwAAAA/P//AwAAAAAAAAAAAAAAAAAAAP8Ahvc5OwAA8P///38AAAAAAAAAAAAcAADg////34cHAAcAAAAAAAAAAAAAgN9/xzf8RwAA4P///z8AAAAAAAAAAAAPAB7g//////8fgB8AAAAAAT4AAAAAAO//B3f8/wsA4P///z8AAAAAAAAAAAAPAG////////8f2f8HAAAAAAD4HwAAAAD8H/D4/38A4P///xMAAAAAAPAHAAAAgN//////////////DwAAAAD+///h/4//H+/Bg/8BwP7//w8AAAAAwP8fAAAAj9///////////////88//v//////////////////////////////DwAA/P8cgEEAAAAAAAAAAAAAAAAA8P//////////////////////////////AwAA4AwAAGAAAAAAAAAAAAAAAAAAIP7/////////////////////////////AQBg4AAAABAAAAAAAAAAAAAAAAAAAf//////////////////////////////AByADwAAAAAAAAAAAAAAAAAAAAAAQID4///////////Pw/0DAP8HAMAfAACA//F//v////////////////////8/AAP4///////////BBPAHAP4HAAAAAADg//z///////////////////////9/AID///////////8AQ8ABAPwBAAAAAAD8P/7///////////////////////9fAMD//////////z8AwA8AAPgBAAAAAAD+H/7/////////////////////Of8BAID///z//////z8AwD8AAMABAAAAAAD+P/z///////////////////9/wH8AAAD8MwD//////x8AwH8MAAAAAAAAAAD+P2D///////////////////95cAAAAACAAwD8/////38AwP8eAAAAAAAAgAGcH/D//////////////////wEAOAAAAADADgDA/////38AgP8/AAAAAAAAwANAH/T//////////////////wAAfgAAAAAwAAAA//////8PgP8/AAAAAAAAwAFwD/7/////////////////PwAAfwAAAAAGAAAA//////8/wP//AAAAAAAAwAOwA/7/////////////////DwCAPwAAAIAAAAAA/v//////8///BwAAAAAAOAcgcP//////////////////HwAAHwAAAAAAAACA+P//////4///DwAAAAAAOA74/////////////////////wUADwAAAAAAAAAA8P//////4///DwAAAAAAGD///////////////////////wUAAwAAAAAAAAAA8P//////7///FwAAAAAAAB///////////////////////wUAAgAAAAAAAAAA0P//////////CAAAAAAAgOH//////////////////////w0AAAAAAAAAAAAAYP////////8xLAAAAAAAAPz//////////////////////wwAAAAAAAAAAAAAAP7//////38HfgAAAAAAgP///////////////////////wQAAAAAAAAAAAAAAP3///////8HUAAAAAAAAP7/////////////////////fwQAAAAAAAAAAAAAAP////////+XAAAAAAAAAPz///93/D/+////////////PwwAAAAAAAAAAAAAAP////////9/AAAAAAAAAPj//f9j/g/+////////////HwAAAAAAAAAAAAAAAP////////8MAAAAAAAAAPj/+P8B/Mf/////////////DwQAAAAAAAAAAAAAAP///////z8AAAAAAAAAcPzH8/8A8I//////////////Bx4AAAAAAAAAAAAAAP///////x8AAAAAAAAA+H+Aw/8AwA/+//////////9/AA8AAAAAAAAAAAAAAP///////x8AAAAAAAAA+D8Aj//w4R/8//////////8/AAAAAAAAAAAAAAAAAP///////wMAAAAAAAAA+B8wuE/+/z/+/////////98fAAMAAAAAAAAAAAAAAP///////wMAAAAAAAAA+A8wEMf//x/+/////////0cOAAMAAAAAAAAAAAAAAP7//////wEAAAAAAAAA+A8AAI7//x/8/////////wMOAAEAAAAAAAAAAAAAAP7//////wAAAAAAAAAA+AcABob//z/8/////////zccwAEAAAAAAAAAAAAAAPz//////wAAAAAAAAAAQOB/AAQ2/////////////x8c8AEAAAAAAAAAAAAAAPj//////wAAAAAAAAAAQPx/AAAA/////////////w8Y/gEAAAAAAAAAAAAAAPD/////fwAAAAAAAAAA4P8/AAAA/////////////w+EGwAAAAAAAAAAAAAAAMD/////HwAAAAAAAAAA8P9/AACA/////////////x/AAwAAAAAAAAAAAAAAAID/////DwAAAAAAAAAA+P//BwaA/////////////x/AAAAAAAAAAAAAAAAAAID9////BwAAAAAAAAAA/P//D3+E/////////////z9AAAAAAAAAAAAAAAAAAAD5////BwAAAAAAAAAA/P//f////////////////x8AAAAAAAAAAAAAAAAAAADy/x8GBgAAAAAAAAAA/P/////v/8///////////z8AAAAAAAAAAAAAAAAAAAD0/w8ABgAAAAAAAAAA/v////+//4///////////z8AAAAAAAAAAAAAAAAAAADu/wcADgAAAAAAAACA//////8f/x/+/////////x8AAAAAAAAAAAAAAAAAAACI/wcALAAAAAAAAADA//////8//z/g/////////w8AAAAAAAAAAAAAAAAAAACQ/wcACAAAAAAAAADg//////9//r+A/////////wcAAAAAAAAAAAAAAAAAAAAQ/wMAAAAAAAAAAADg//////9//n8cgP///////ycAAAAAAAAAAAAAAAAAAAAA/gMAAAAAAAAAAADw////////+P9/AP///////xEAAAAAAAAAAAAAAAAAAAAA/AMAHQAAAAAAAADw////////+P//APz/f///fxAAAAAAAAAAAAAAAAAAAAAA+AcAYAAAAAAAAAD4////////+f9/APz/B///BgAAAAAAAAAAAAAAAAAAAAAA/AccgAEAAAAAAADw////////8f9/AOD/B/5/AAAAAAAAAAAAAAAAAQAAAAAA+A8eADgAAAAAAADw////////4f8/AOD/Afw/BgAAAAAAAAAAAAAAAAAAAAAA8J8PAPwCAAAAAADw////////4/8fAOD/APw/AgAAAAAAAAAAAAAAAAAAAAAAgP8PAAAAAAAAAADw////////x/8HAOB/APx/ADAAAAAAAAAAAAAAAAAAAAAAAP4PAAAAAAAAAAD4////////h/8BAOA/APz/ADAAAAAAAAAAAAAAAAAAAAAAAID/AAAAAAAAAAD4////////j/8AAMAPAMD/ATAAAAAAAAAAAAAAAAAAAAAAAAD/AQAAAAAAAAD4////////nx8AAMAPAMD/ATAAAAAAAAAAAAAAAAAAAAAAAAD8AAAAAAAAAAD4////////vwcAAIAPAMD/AcAAAAAAAAAAAAAAAAAAAAAAAADgAQAAAAAAAAD4////////fwAAAIAPAMD8AQABAAAAAAAAAAAAAAAAAAAAAADAAAgAAAAAAADw////////f2AAAAAPAID4AUACAAAAAAAAAAAAAAAAAAAAAADAAe9zAAAAAADg/////////34AAAAPAEBwAAgAAAAAAAAAAAAAAAAAAAAAAAAAE+9/AAAAAADA/////////38AAAAXAEAgAAQCAAAAAAAAAAAAAAAAAAAAAAAAz///AAAAAACA/////////z8AAAASAMAAAIACAAAAAAAAAAAAAAAAAAAAAAAAyP//AQAAAACA/////////z8AAAAwAIAAAEAHAAAAAAAAAAAAAAAAAAAAAAAAgP//AwAAAAAA/v///////x8AAAAwAAADAAMBAAAAAAAAAAAAAAAAAAAAAAAAwP//fwAAAAAA/A/+/////x8AAAAAAAAHAAcAAAAAAAAAAAAAAAAAAAAAAAAAgP///wAAAAAAEAD8/////w8AAAAAADAGwAcAAAAAAAAAAAAAAAAAAAAAAAAAgP///wEAAAAAAADA/////wcAAAAAAGAG4AEAAAAAAAAAAAAAAAAAAAAAAAAA4P///wEAAAAAAADA/////wMAAAAAAMAM+AMAAAAAAAAAAAAAAAAAAAAAAAAA4P///wMAAAAAAADg/////wEAAAAAAIAL/gMQAAAAAAAAAAAAAAAAAAAAAAAA8P///wMAAAAAAADg////fwAAAAAAAIAH/vMQAAAAAAAAAAAAAAAAAAAAAAAA8P///wcAAAAAAADg////PwAAAAAAAAAP/gMAAQAAAAAAAAAAAAAAAAAAAAAA+P///38AAAAAAADg////PwAAAAAAAAAO/DmAAwAAAAAAAAAAAAAAAAAAAAAA+P///38BAAAAAADA////HwAAAAAAAAA+/DkA8gAAAAAAAAAAAAAAAAAAAAAA8P////8fAAAAAACA////DwAAAAAAAAA8wChE/gcAAAAAAAAAAAAAAAAAAAAA+P////8/AAAAAACA////BwAAAAAAAAA4AEAA8B8AAAAAAAAAAAAAAAAAAAAA+P//////AQAAAAAA////BwAAAAAAAAAwAEAAxD8NAAAAAAAAAAAAAAAAAAAA+P//////AQAAAAAA////BwAAAAAAAADAAQAAxP+AAAAAAAAAAAAAAAAAAAAA8P//////AQAAAAAA/v//BwAAAAAAAACAHwAAwH8ABAAAAAAAAAAAAAAAAAAA4P//////AQAAAAAA/v//BwAAAAAAAAAAQFYEAMcAAAAAAAAAAAAAAAAAAAAA4P//////AAAAAAAA/v//DwAAAAAAAAAAAAgBAIABMAAAAAAAAAAAAAAAAAAAwP//////AAAAAAAA/v//DwAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAgP////9/AAAAAAAA/P//DwAAAAAAAAAAAAAAAQQAAAAAAAAAAAAAAAAAAAAAgP////8/AAAAAAAA/v//HyAAAAAAAAAAAACAHwQAAAAAAAAAAAAAAAAAAAAAAP////8fAAAAAAAA/v//HyAAAAAAAAAAAADADwwAAAAAAAAAAAAAAAAAAAAAAP////8fAAAAAAAA////HzAAAAAAAAAAAADsDxwAAAAAAAAAAAAAAAAAAAAAAP7///8fAAAAAAAA////DzgAAAAAAAAAAAD/DxwAAAAA//////////////////////////////////////////////////////////9/AAAAAAAAAAAAAAAAAOD///8fAAAAAAAA////Ax8AAAAAAAAAAMD//z4AAABAAAAAAAAAAAAAAAAAAMD///8PAAAAAAAA////AB8AAAAAAAAAAMD//z8AAAAAAAAAAAAAAAAAAAAAAMD///8PAAAAAAAA/v9/AB8AAAAAAAAAAOD//38AAAAAAAAAAAAAAAAAAAAAAMD///8PAAAAAAAA/v9/AB8AAAAAAAAAAPz///8BAAEAAAAAAAAAAAAAAAAAAMD///8HAAAAAAAA/P9/gA8AAAAAAAAAgP////8BAAIAAAAAAAAAAAAAAAAAAMD///8DAAAAAAAA/P//gA8AAAAAAAAAwP////8DAAAAAAAAAAAAAAAAAAAAAMD//38AAAAAAAAA/P9/AA8AAAAAAAAAwP////8HAAAAAAAAAAAAAAAAAAAAAOD//x8AAAAAAAAA+P9/AAcAAAAAAAAA4P////8PAAAAAAAAAAAAAAAAAAAAAOD//w8AAAAAAAAA+P8fAAIAAAAAAAAAwP////8fAAAAAAAAAAAAAAAAAAAAAOD//wcAAAAAAAAA+P8fAAAAAAAAAAAA4P////8fAAAAAAAAAAAAAAAAAAAAAOD//wcAAAAAAAAA+P8fAAAAAAAAAAAAwP////8fAAAAAAAAAAAAAAAAAAAAAOD//wcAAAAAAAAA8P8PAAAAAAAAAAAAgP////8/AAAAAAAAAAAAAAAAAAAAAOD//wMAAAAAAAAA4P8HAAAAAAAAAAAAgP////8fAAAAAAAAAAAAAAAAAAAAAPD//wMAAAAAAAAA4P8HAAAAAAAAAAAAgP////8fAAAAAAAAAAAAAAAAAAAAAPD//wEAAAAAAAAAwP8DAAAAAAAAAAAAAP////8fAAAAAAAAAAAAAAAAAAAAAOD//wAAAAAAAAAAwP8BAAAAAAAAAAAAAP8D/P8PAAAAAAAAAAAAAAAAAAAAAPD/fwAAAAAAAAAAwH8AAAAAAAAAAAAAgP8A2P8HAAAAAAAAAAAAAAAAAAAAAPD/OwAAAAAAAAAAgAEAAAAAAAAAAAAAAAcA6P8HAAAAAAAAAAAAAAAAAAAAAPj/BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwP8DAAACAAAAAAAAAAAAAAAAAPj/BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8DAAAEAAAAAAAAAAAAAAAAAPz/BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8DAAAIAAAAAAAAAAAAAAAAAPj/AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGgAAAA4AAAAAAAAAAAAAAAAAPg/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAPw/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAPwHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAALAAAAAAAAAAAAAAAAAPwfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAIADAAAAAAAAAAAAAAAAAPgHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAMABAAAAAAAAAAAAAAAAAPwHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAAAAAAAAAAAAAAAP4BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAP4BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAP4DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH6AAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const COASTS = '-68,-54 -66,-54 -65,-55 -66,-55 -68,-56 -70,-55 -72,-54 -75,-53 -72,-54 -71,-54 -70,-53 -69,-53 -68,-54|145,-41 147,-41 148,-41 148,-42 147,-44 145,-43 145,-41|173,-41 174,-41 173,-43 172,-44 171,-45 170,-46 168,-47 167,-46 168,-44 170,-44 171,-43 172,-42 173,-40|175,-36 175,-37 177,-38 178,-38 178,-39 177,-40 176,-41 175,-41 175,-40 174,-39 175,-38 174,-37 173,-35 174,-35|50,-14 50,-15 50,-16 49,-17 49,-19 49,-20 48,-22 48,-24 47,-25 45,-26 44,-25 44,-24 43,-22 44,-21 44,-19 44,-17 44,-16 46,-16 48,-15 49,-13 50,-14|144,-14 145,-15 145,-16 146,-18 146,-19 147,-19 149,-20 150,-22 151,-23 152,-24 153,-26 154,-28 153,-29 153,-31 152,-33 151,-34 151,-35 150,-36 149,-38 147,-38 146,-39 145,-38 144,-39 142,-38 141,-38 140,-37 138,-36 138,-34 137,-35 138,-34 138,-33 136,-34 135,-34 135,-33 133,-32 131,-31 130,-32 128,-32 126,-32 124,-33 123,-34 121,-34 120,-34 119,-35 117,-35 116,-34 116,-33 116,-32 115,-30 115,-29 114,-27 113,-26 114,-25 114,-23 114,-22 115,-21 117,-21 118,-20 120,-20 121,-19 122,-18 123,-16 124,-16 125,-15 126,-14 128,-14 129,-15 130,-14 131,-13 133,-12 134,-12 136,-12 137,-13 136,-14 136,-16 138,-16 139,-17 140,-18 141,-17 142,-15 142,-14 142,-12 142,-11 143,-12 144,-13|109,-7 111,-7 113,-7 114,-8 116,-8 115,-9 113,-8 111,-8 109,-8 106,-7 105,-7 107,-6 108,-6|134,-1 134,-3 136,-2 137,-2 139,-2 141,-3 143,-3 145,-4 146,-5 148,-6 147,-7 149,-9 150,-10 149,-10 147,-9 146,-8 145,-8 143,-8 143,-9 141,-9 140,-8 139,-8 138,-8 139,-7 138,-5 136,-5 134,-4 132,-3 134,-2 132,-2 131,-1 132,0 134,-1|125,1 124,0 123,0 121,0 120,-1 121,-1 123,-1 122,-2 122,-3 123,-5 122,-5 121,-4 120,-6 120,-4 119,-3 119,-1 120,0 121,1 123,1 125,2|106,-6 104,-5 103,-4 101,-3 100,-1 99,0 99,2 97,3 95,5 97,5 98,4 100,3 101,2 102,1 104,0 104,-1 105,-2 106,-3 106,-4 106,-6|118,2 119,1 117,0 117,-1 116,-4 115,-4 114,-3 112,-3 110,-3 110,-2 109,0 109,1 110,2 111,3 113,3 114,5 115,5 117,7 118,6 119,5 118,4 118,2|126,8 127,7 125,7 125,6 124,6 124,8 122,7 123,8 125,9 125,10 126,9|81,6 80,7 80,8 80,10 81,9 82,6|121,19 123,17 122,16 122,14 124,14 124,13 123,14 121,14 120,15 120,16 120,18 121,19|-73,20 -71,20 -69,19 -69,18 -70,18 -71,18 -73,18 -74,18 -73,18 -73,20|-80,23 -78,23 -77,22 -76,21 -74,20 -76,20 -78,20 -78,21 -80,22 -82,22 -83,22 -85,22 -84,23 -83,23 -81,23|16,38 15,37 14,37 12,38 14,38 16,38|141,37 141,36 139,35 137,35 136,33 135,35 133,34 132,34 131,31 130,32 129,33 131,34 133,35 135,36 137,37 139,38 140,39 140,41 142,40 141,38|144,44 145,44 144,43 143,42 142,43 141,42 140,43 141,43 142,45 143,45|-124,49 -126,49 -127,50 -128,50 -127,50 -125,50 -124,49|-56,51 -55,49 -53,49 -53,48 -53,47 -54,48 -55,47 -57,48 -59,48 -58,49 -57,51 -56,52|144,51 145,49 143,49 143,48 144,47 142,46 142,48 142,50 142,51 142,53 143,54 143,53 144,51|-7,52 -9,52 -10,52 -9,53 -8,55 -7,55 -6,55 -6,53|-3,59 -4,58 -2,58 -3,56 -1,55 0,53 2,53 1,51 -1,51 -2,50 -5,50 -6,50 -4,51 -5,52 -5,53 -3,53 -4,55 -5,55 -6,56 -6,58 -4,59 -3,59|-85,66 -84,65 -82,64 -80,64 -83,64 -84,64 -86,63 -87,64 -86,65 -85,66|-15,66 -14,65 -15,64 -18,64 -20,64 -23,64 -24,65 -22,65 -24,66 -22,66 -21,66 -19,66 -18,66 -16,67 -15,66|-180,69 -178,68 -175,67 -172,67 -170,66 -173,65 -173,64 -175,65 -176,65 -177,66 -179,66 -180,65 180,65 179,65 177,65 179,63 177,63 175,62 172,61 171,60 169,61 166,60 165,60 164,60 162,58 163,58 163,56 162,55 160,54 159,53 157,51 156,53 155,55 156,57 157,58 158,58 160,59 162,60 164,61 164,63 163,62 160,61 159,62 157,61 154,60 153,59 151,59 150,60 149,59 145,59 142,59 139,57 135,55 137,55 138,54 140,54 141,53 141,51 140,48 139,47 137,45 136,44 134,43 132,43 131,43 130,42 129,40 128,40 128,39 129,37 129,36 128,35 126,34 127,36 127,37 126,38 125,39 124,40 123,40 121,39 122,40 121,41 120,40 118,39 119,38 121,38 122,37 121,37 120,36 120,34 121,32 122,31 122,29 120,27 120,26 119,25 117,24 116,23 114,22 112,22 110,20 110,21 109,22 107,21 106,20 106,18 107,17 109,15 109,13 109,12 107,10 105,9 105,10 103,11 103,12 101,13 99,11 99,9 100,8 101,7 102,6 103,5 103,3 104,2 103,2 101,3 101,4 100,5 100,7 99,8 98,9 98,11 98,12 98,14 98,15 98,16 95,16 94,16 95,17 94,19 92,21 92,22 90,23 90,22 88,22 87,21 86,20 85,19 84,18 82,17 81,16 80,14 80,12 80,10 79,10 78,8 77,9 76,10 75,12 75,14 74,16 73,18 73,19 73,20 71,21 69,22 68,24 67,25 65,25 63,25 61,25 60,25 57,26 57,27 56,27 53,27 52,28 51,29 50,30 49,30 48,29 49,27 50,26 51,25 51,26 51,25 53,24 54,24 55,25 56,26 56,25 57,24 59,24 60,23 59,21 58,20 58,19 57,19 55,18 54,17 52,16 51,15 50,15 48,14 47,13 45,13 44,13 43,14 43,15 43,17 42,18 41,19 40,20 39,22 38,24 37,25 36,27 35,28 35,29 34,28 32,30 33,28 34,26 35,25 36,24 37,22 37,21 37,20 37,19 39,17 40,15 41,14 42,13 43,12 44,11 46,11 48,11 49,11 50,12 51,11 51,9 50,8 49,7 49,5 48,4 47,3 46,2 44,1 43,0 42,-1 41,-2 40,-3 39,-5 39,-6 39,-7 39,-8 40,-10 40,-12 41,-14 40,-15 39,-17 37,-18 36,-19 35,-20 35,-21 36,-23 35,-24 33,-25 33,-27 32,-28 32,-29 31,-30 29,-32 27,-33 26,-34 25,-34 23,-34 22,-34 20,-35 19,-34 18,-33 18,-32 17,-30 16,-29 15,-27 15,-25 14,-24 14,-22 13,-21 13,-20 12,-18 12,-17 12,-15 13,-14 13,-12 14,-11 13,-10 13,-9 13,-7 12,-6 11,-4 10,-3 9,-1 9,0 10,2 9,4 9,5 7,4 6,4 5,6 4,6 2,6 -1,5 -2,5 -3,5 -5,5 -7,5 -8,4 -9,5 -11,6 -12,7 -13,9 -14,10 -15,11 -16,12 -17,13 -17,14 -17,16 -16,17 -16,19 -17,21 -17,22 -16,23 -15,24 -15,26 -14,27 -13,28 -12,28 -10,29 -10,31 -9,33 -8,34 -6,35 -5,36 -4,35 -2,35 0,36 1,37 3,37 5,37 6,37 8,37 10,37 11,37 11,36 10,34 11,33 13,33 14,33 15,32 17,31 18,31 20,31 20,32 21,33 23,33 24,32 25,32 26,32 28,31 30,31 31,32 32,31 34,31 35,32 35,34 36,35 36,37 35,37 33,36 31,37 29,37 27,38 27,39 27,40 29,40 31,41 32,42 34,42 35,42 37,41 38,41 40,41 42,42 41,43 39,44 38,45 38,46 39,47 37,47 36,47 35,46 37,45 35,45 34,44 32,45 34,46 32,46 30,46 30,45 29,44 28,43 29,41 28,41 26,40 25,41 24,41 23,40 24,39 23,37 21,38 21,39 20,40 19,41 18,42 17,43 15,44 14,45 13,46 12,45 14,44 15,42 17,41 18,40 17,40 17,39 16,38 16,40 15,41 14,41 12,42 11,43 10,44 8,44 7,43 5,43 3,43 2,41 1,41 0,39 -1,38 -2,37 -3,37 -5,36 -6,36 -7,37 -9,37 -9,38 -9,39 -9,41 -9,43 -8,44 -7,44 -5,44 -4,43 -2,43 -1,46 -2,47 -4,48 -3,49 -2,49 1,50 3,51 4,52 5,53 6,54 8,54 9,55 8,57 9,57 11,58 11,56 10,55 11,54 13,54 14,54 16,55 18,55 20,54 21,55 21,57 23,58 24,57 24,58 23,59 25,59 26,60 28,59 29,60 26,60 24,60 23,60 21,61 21,63 22,64 25,65 24,66 22,66 21,64 20,64 18,63 17,61 19,60 18,59 16,57 15,56 13,55 12,57 11,59 8,58 7,58 6,59 5,62 9,63 11,64 12,66 15,68 16,69 19,70 21,70 23,70 25,71 26,71 28,71 31,70 30,70 31,70 34,69 37,69 40,68 41,67 40,66 38,66 34,67 35,66 35,64 36,64 37,65 40,65 42,66 44,66 44,67 43,69 46,68 46,67 48,67 50,68 54,69 55,68 57,68 59,69 60,68 61,69 64,70 65,69 69,68 68,69 67,69 67,71 69,72 70,73 73,73 72,71 73,70 73,69 74,68 71,66 73,67 74,67 75,69 74,70 74,71 73,71 75,72 76,71 78,72 80,72 81,72 81,73 82,74 85,74 87,74 87,75 90,76 93,76 96,76 99,76 101,76 102,77 104,78 106,77 105,77 107,77 108,77 111,77 113,76 113,75 110,74 112,74 114,73 116,74 119,74 123,73 125,74 127,74 129,73 130,71 131,71 132,72 134,71 136,72 137,71 140,71 140,73 150,72 153,71 157,71 159,71 160,70 161,69 162,70 164,70 166,69 168,70 170,69 171,69 174,70 176,70 179,69 -180,69|-91,69 -89,69 -88,69 -87,67 -86,68 -86,70 -84,70 -83,70 -81,69 -82,68 -83,66 -85,66 -86,66 -87,65 -88,64 -90,64 -91,63 -93,62 -94,61 -95,59 -93,59 -92,57 -91,57 -89,57 -87,56 -86,56 -83,55 -82,54 -81,52 -80,51 -79,53 -79,54 -78,55 -77,56 -77,57 -79,59 -77,60 -78,62 -76,62 -74,62 -72,62 -70,61 -69,59 -68,58 -66,59 -65,60 -64,59 -63,58 -61,57 -60,56 -58,55 -57,54 -56,53 -56,52 -59,51 -60,50 -62,50 -64,50 -65,50 -67,50 -69,49 -70,48 -71,47 -69,48 -67,49 -65,49 -65,47 -63,46 -62,46 -61,47 -60,46 -61,45 -63,45 -65,44 -66,44 -64,45 -66,45 -68,44 -70,44 -71,42 -72,41 -74,41 -72,41 -73,41 -74,40 -76,39 -75,38 -76,39 -76,38 -76,37 -76,35 -78,34 -79,33 -80,33 -81,31 -81,30 -81,28 -80,27 -80,25 -82,26 -83,27 -83,29 -84,30 -85,30 -86,30 -88,30 -90,30 -91,29 -92,30 -94,30 -96,29 -97,28 -97,26 -98,25 -98,23 -97,21 -97,20 -96,19 -94,18 -93,19 -91,19 -91,20 -90,21 -88,21 -87,20 -88,19 -88,18 -89,16 -87,16 -86,16 -85,16 -83,15 -83,14 -83,12 -84,11 -83,10 -82,9 -81,9 -80,10 -78,9 -77,9 -76,9 -75,11 -73,11 -72,12 -72,10 -72,9 -71,11 -70,11 -69,11 -67,11 -66,10 -64,10 -63,11 -62,10 -61,9 -59,8 -58,7 -57,6 -56,6 -54,6 -52,5 -51,2 -51,0 -49,0 -47,-1 -45,-2 -43,-2 -41,-3 -40,-3 -39,-4 -37,-5 -36,-5 -35,-7 -35,-9 -37,-11 -38,-12 -39,-13 -39,-16 -39,-17 -40,-20 -41,-21 -42,-22 -43,-23 -45,-23 -46,-24 -48,-25 -48,-26 -48,-27 -49,-29 -51,-31 -52,-32 -53,-34 -55,-35 -56,-35 -58,-34 -57,-36 -58,-38 -59,-39 -61,-39 -62,-40 -64,-41 -65,-41 -64,-42 -65,-43 -66,-45 -67,-46 -67,-47 -66,-48 -67,-49 -68,-50 -69,-51 -68,-52 -69,-52 -71,-53 -73,-54 -74,-53 -75,-52 -75,-51 -76,-49 -74,-47 -76,-47 -75,-46 -74,-44 -73,-42 -74,-43 -74,-42 -74,-40 -74,-38 -73,-37 -73,-36 -72,-34 -71,-32 -72,-31 -71,-29 -71,-28 -71,-26 -70,-24 -70,-21 -70,-20 -70,-18 -71,-17 -73,-16 -75,-15 -76,-14 -77,-12 -78,-10 -79,-8 -80,-7 -81,-6 -81,-5 -80,-3 -80,-2 -81,-1 -80,0 -79,1 -78,3 -77,4 -78,6 -78,7 -78,8 -80,9 -80,8 -82,8 -83,8 -84,9 -85,10 -86,11 -87,12 -88,13 -89,13 -90,14 -92,14 -93,16 -95,16 -96,16 -97,16 -99,17 -101,17 -102,18 -103,18 -105,19 -106,20 -106,22 -107,24 -108,25 -109,26 -110,27 -111,28 -112,28 -113,30 -114,32 -115,30 -114,29 -113,28 -112,27 -111,25 -110,24 -109,23 -111,24 -112,25 -112,26 -113,27 -115,28 -114,29 -116,30 -116,31 -117,33 -118,34 -119,34 -120,34 -122,36 -123,38 -124,39 -124,40 -124,42 -124,44 -124,46 -124,47 -125,48 -123,48 -125,50 -127,51 -128,52 -129,53 -131,54 -132,55 -134,57 -135,58 -137,58 -138,59 -140,60 -143,60 -144,60 -146,60 -147,61 -148,60 -150,60 -152,59 -151,61 -153,60 -154,59 -154,58 -156,57 -158,56 -160,56 -161,55 -163,55 -165,54 -163,55 -161,56 -159,57 -158,58 -159,58 -160,59 -162,59 -163,60 -164,60 -165,61 -166,61 -165,63 -164,63 -162,64 -161,64 -162,65 -165,64 -166,65 -168,66 -167,66 -164,67 -162,66 -164,67 -165,68 -167,68 -164,69 -163,69 -162,70 -159,71 -157,71 -155,71 -152,71 -151,70 -148,70 -146,70 -144,70 -142,70 -139,69 -138,69 -136,69 -134,70 -133,70 -131,70 -130,70 -128,70 -126,69 -124,70 -123,70 -121,70 -120,69 -118,69 -116,69 -114,68 -115,68 -113,68 -111,68 -109,67 -108,69 -107,69 -105,69 -103,68 -101,68 -100,68 -98,68 -96,68 -95,68 -95,70 -96,70 -95,72 -94,72 -92,70|-114,73 -112,73 -111,72 -110,73 -108,72 -108,73 -107,73 -105,72 -103,70 -101,70 -103,70 -104,69 -106,69 -109,69 -112,69 -113,69 -115,69 -117,70 -115,70 -114,70 -112,70 -114,71 -116,71 -118,71 -116,71 -118,71 -119,72 -118,73 -115,73|-76,73 -78,73 -80,73 -81,73 -78,74 -76,73|-87,73 -85,73 -82,74 -81,73 -79,72 -76,72 -74,72 -72,72 -71,71 -69,71 -67,69 -69,69 -66,68 -65,68 -63,67 -62,67 -64,65 -65,65 -67,66 -68,66 -67,65 -66,65 -65,63 -66,63 -69,64 -67,63 -66,62 -69,62 -71,63 -72,63 -73,64 -75,65 -78,64 -76,65 -74,65 -73,67 -75,69 -77,69 -78,70 -79,70 -81,70 -85,70 -87,70 -89,70 -90,71 -89,73 -86,74|-100,74 -99,74 -97,74 -97,73 -98,71 -100,72 -102,73 -100,73 -102,73 -100,74|-93,73 -94,72 -96,73 -95,74 -92,74 -91,74 -92,73 -93,73|-120,71 -123,71 -126,72 -125,73 -125,74 -122,74 -120,74 -118,74 -116,73 -117,73 -119,73 -120,72|151,75 150,75 148,75 146,75 148,75 151,75|145,76 141,75 139,75 137,75 139,76 141,76 145,76|-98,77 -98,76 -100,75 -101,76 -103,76 -101,76 -100,77 -99,77|-108,76 -107,76 -106,75 -110,75 -112,74 -114,74 -112,75 -116,75 -118,75 -116,76 -113,76 -111,76 -109,75 -110,76 -109,77|58,71 54,71 52,71 52,73 54,74 56,75 58,76 61,76 65,76 66,77 68,77 65,76 62,75 58,74 57,73 55,72 58,71|-95,77 -92,77 -90,76 -88,76 -86,75 -85,76 -83,76 -81,76 -80,75 -82,74 -83,75 -86,74 -88,74 -90,75 -92,75 -94,76 -96,76 -95,77|-116,78 -117,77 -120,76 -121,76 -123,76 -121,77 -119,78 -118,77 -116,78|-100,78 -101,78 -103,78 -105,78 -104,79 -101,79|18,80 22,79 19,79 18,78 16,77 14,77 11,79 13,80 15,80 17,80 18,80|25,80 27,80 26,80 23,79 20,80 18,80 20,81 22,80 25,80|51,81 50,80 48,80 45,81 47,81 48,81 50,81 52,81|100,79 98,79 95,79 93,79 91,80 94,81 96,81 98,81 100,80|-87,80 -86,79 -87,79 -89,78 -91,78 -93,78 -94,79 -96,80 -95,81 -92,81 -91,81 -89,81 -88,80|-68,83 -66,83 -64,83 -62,83 -64,82 -67,82 -65,82 -68,81 -69,81 -71,80 -73,80 -77,79 -76,79 -76,78 -78,78 -80,77 -78,77 -81,76 -83,76 -86,76 -88,76 -89,76 -88,77 -85,78 -86,78 -88,78 -85,79 -87,80 -84,80 -82,80 -84,81 -88,81 -89,81 -91,82 -90,82 -87,82 -85,83 -84,83 -82,83 -81,83 -79,83 -76,83 -73,83 -71,83 -68,83|-27,84 -21,83 -23,82 -27,82 -32,82 -28,82 -25,82 -23,82 -21,82 -16,82 -13,82 -16,81 -20,80 -18,80 -19,79 -20,78 -18,77 -20,77 -22,77 -20,76 -21,75 -19,74 -22,74 -20,74 -22,73 -24,73 -22,73 -24,73 -22,71 -24,70 -26,71 -26,70 -24,70 -22,70 -25,69 -28,68 -31,68 -33,68 -34,67 -36,66 -38,66 -40,65 -41,64 -43,63 -43,61 -45,60 -46,61 -48,61 -50,62 -52,64 -52,65 -54,66 -53,68 -51,69 -51,70 -53,69 -55,70 -54,71 -51,71 -53,71 -55,71 -55,73 -56,74 -57,75 -59,75 -61,76 -63,76 -66,76 -69,76 -70,76 -71,77 -69,77 -67,77 -71,78 -73,78 -69,79 -66,79 -68,80 -64,81 -62,81 -60,82 -57,82 -54,82 -50,82 -48,82 -47,82 -45,82 -47,82 -43,83 -40,83 -39,84 -35,84 -27,84';
let _mask = null;
const isLand = (lat, lon) => {
  if (!_mask) { const b = atob(LAND_MASK); _mask = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) _mask[i] = b.charCodeAt(i); }
  const y = Math.min(179, Math.max(0, Math.floor(90 - lat))), x = ((Math.floor(lon + 180) % 360) + 360) % 360, k = y * 360 + x;
  return (_mask[k >> 3] >> (k & 7)) & 1;
};

// dotted Earth with real continents, coastlines, graticule and gold trade routes
function globeShape(N) {
  const RG = 1.2;
  const ll = (lat, lon, r = 1) => { const phi = (lon + 180) * D, th = (90 - lat) * D; return [-r * Math.cos(phi) * Math.sin(th), r * Math.cos(th), r * Math.sin(phi) * Math.sin(th)]; };
  // regular dot grid, like a printed dotted world map
  const grid = (step, wantLand) => {
    const out = [];
    for (let lat = -58 + step / 2; lat < 84; lat += step) {
      const n = Math.max(1, Math.round(360 * Math.cos(lat * D) / step));
      for (let i = 0; i < n; i++) { const lon = -180 + (i + 0.5) * 360 / n; if (!!isLand(lat, lon) === wantLand) out.push([lat, lon]); }
    }
    return out;
  };
  const LAND = grid(N > 9000 ? 1.45 : 1.9, true), SEA = grid(5, false);
  const CITIES = [[9.93, 76.27], [19.07, 72.88], [25.2, 55.27], [25.12, 56.33], [1.35, 103.8], [51.5, -0.12], [29.76, -95.37], [22.32, 114.17], [35.69, 139.69],
    [-33.87, 151.2], [40.7, -74], [-23.55, -46.63], [6.52, 3.38], [41, 28.98], [-33.92, 18.42], [51.92, 4.48], [46.2, 6.14]];
  const ROUTES = [[0, 2], [0, 4], [0, 5], [1, 3], [1, 15], [1, 7], [2, 5], [2, 13], [2, 12], [3, 4], [4, 8], [4, 9], [5, 10], [5, 6], [6, 11], [10, 16], [7, 8], [14, 11], [12, 15], [0, 16]];
  const C = CITIES.map((c) => ll(c[0], c[1]));
  const arc = (i, j, s) => {
    const a = C[i], b = C[j], ang = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), sa = Math.sin(ang) || 1;
    const k1 = Math.sin((1 - s) * ang) / sa, k2 = Math.sin(s * ang) / sa, lift = RG * (1.006 + (0.04 + 0.22 * ang / Math.PI) * Math.sin(Math.PI * s));
    return [(a[0] * k1 + b[0] * k2) * lift, (a[1] * k1 + b[1] * k2) * lift, (a[2] * k1 + b[2] * k2) * lift];
  };
  let li = 0;
  const s = build(N, (f) => {
    let p, warm = 0, hi = 0;
    if (f < 0.56) {
      const c = LAND.length <= N * 0.56 ? LAND[li++ % LAND.length] : pick(LAND);
      p = ll(c[0] + gauss() * 0.12, c[1] + gauss() * 0.12, RG * 1.004); hi = 0.45;
    } else if (f < 0.66) { const c = pick(SEA); p = ll(c[0], c[1], RG * 1.002); hi = -0.55; }
    else if (f < 0.84) { const [i, j] = pick(ROUTES); p = arc(i, j, R()); warm = 0.9; hi = 0.5; }
    else if (f < 0.88) { const c = pick(C), d = unit(), r = R() < 0.5 ? 0.012 : 0.03; p = [c[0] * RG * 1.012 + d[0] * r, c[1] * RG * 1.012 + d[1] * r, c[2] * RG * 1.012 + d[2] * r]; warm = 1; hi = 1; }
    else if (f < 0.93) { const d = unit(), r = RG * (1.03 + Math.abs(gauss()) * 0.08); p = [d[0] * r, d[1] * r, d[2] * r]; hi = -0.5; }
    else { const d = unit(), r = 2.6 + R() * 2.2; p = [d[0] * r, d[1] * r, d[2] * r]; hi = -0.3; }
    return [p[0], p[1], p[2], 0, warm, hi];
  });
  s.deco = () => {
    const g = new LB(), gr = new LB(), y = new LB();
    for (const ring of COASTS.split('|')) {
      const pts = ring.split(' ').map((q) => { const [lo, la] = q.split(',').map(Number); return ll(la, lo, RG * 1.006); });
      g.poly(pts, true);
    }
    for (let lat = -60; lat <= 60; lat += 30) { const pts = []; for (let i = 0; i <= 72; i++) pts.push(ll(lat, -180 + i * 5, RG * 1.002)); gr.poly(pts); }
    for (let lon = -180; lon < 180; lon += 30) { const pts = []; for (let i = 0; i <= 36; i++) pts.push(ll(-90 + i * 5, lon, RG * 1.002)); gr.poly(pts); }
    for (const [i, j] of ROUTES) { const pts = []; for (let k = 0; k <= 32; k++) pts.push(arc(i, j, k / 32)); y.poly(pts); }
    return {
      lines: [{ pos: g.get(), color: GREEN, k: 0.6 }, { pos: gr.get(), color: GREEN, k: 0.12 }, { pos: y.get(), color: GOLD, k: 0.42 }],
      occ: [occ(new THREE.SphereGeometry(RG * 0.985, 48, 32))], halo: RG
    };
  };
  return s;
}

// a team of particle people standing on an arc, linked to each other
function peopleShape(N) {
  const G = -0.95, angs = [-1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05];
  const figs = angs.map((a, i) => ({ x: Math.sin(a) * 1.75, z: 0.45 - (1 - Math.cos(a)) * 1.5, k: i === 3 ? 1.12 : 0.92 + ((i * 37) % 10) / 100 }));
  // body parts in figure units (feet at 0, about 1.05 tall)
  const PARTS = [
    { t: 'tube', a: [-0.07, 0.02, 0], b: [-0.065, 0.46, 0], r: 0.052, w: 0.13 }, { t: 'tube', a: [0.07, 0.02, 0], b: [0.065, 0.46, 0], r: 0.052, w: 0.13 },
    { t: 'torso', y0: 0.44, y1: 0.8, rx: 0.15, rz: 0.085, w: 0.28 },
    { t: 'tube', a: [-0.2, 0.78, 0], b: [-0.235, 0.44, 0.01], r: 0.042, w: 0.1 }, { t: 'tube', a: [0.2, 0.78, 0], b: [0.235, 0.44, 0.01], r: 0.042, w: 0.1 },
    { t: 'tube', a: [0, 0.8, 0], b: [0, 0.86, 0], r: 0.04, w: 0.03 },
    { t: 'head', c: [0, 0.96, 0], r: 0.1, w: 0.23 }
  ];
  const cum = []; let acc = 0; for (const q of PARTS) { acc += q.w; cum.push(acc); }
  const head = (F) => [F.x, G + 0.96 * F.k, F.z];
  const s = build(N, (f) => {
    let p, warm = 0, hi = 0;
    if (f < 0.72) {
      const F = pick(figs), k = F.k, r0 = R() * acc;
      const q = PARTS[cum.findIndex((c) => r0 <= c)];
      let l;
      if (q.t === 'tube') l = tube(q.a, q.b, q.r);
      else if (q.t === 'head') { const d = unit(); l = [q.c[0] + d[0] * q.r, q.c[1] + d[1] * q.r * 1.12, q.c[2] + d[2] * q.r]; hi = 0.3; }
      else {
        const a = R() * TAU, y = q.y0 + R() * (q.y1 - q.y0), sh = y > q.y1 - 0.06 ? 1 - ((y - (q.y1 - 0.06)) / 0.06) ** 2 * 0.35 : 1, wv = 1 - 0.18 * Math.max(0, (0.6 - y) / 0.16);
        l = [Math.cos(a) * q.rx * sh * wv, y, Math.sin(a) * q.rz * sh];
        if (R() < 0.18) { const a2 = R() * Math.PI; l = [Math.cos(a2) * q.rx * 0.65, q.y1 + Math.sin(a2) * 0.035, Math.sin(R() * TAU) * q.rz * 0.6]; hi = 0.5; }
      }
      p = [F.x + l[0] * k, G + l[1] * k, F.z + l[2] * k];
      if (!hi) hi = 0.35;
      if (F === figs[3]) warm = 0.3;
    } else if (f < 0.86) {
      const i = (R() * figs.length) | 0;
      let j = R() < 0.5 ? 3 : i + 1;
      if (j >= figs.length || j === i) j = (i + 1) % figs.length;
      const a = head(figs[i]), b = head(figs[j]), s2 = R();
      p = [lerp(a[0], b[0], s2), lerp(a[1], b[1], s2) + 0.16 + Math.sin(s2 * Math.PI) * 0.2, lerp(a[2], b[2], s2)];
      warm = 0.7; hi = 0.4;
    } else if (f < 0.95) {
      if (R() < 0.45) { const F = pick(figs), a = R() * TAU, r = 0.24 * F.k; p = [F.x + Math.cos(a) * r, G - 0.01, F.z + Math.sin(a) * r * 0.6]; hi = 0.4; }
      else { const r = pick([0.6, 1.2, 1.9, 2.6]), a = R() * TAU; p = [Math.cos(a) * r, G - 0.02, Math.sin(a) * r * 0.8 - 0.2]; hi = -0.4; }
    } else { p = [(R() * 2 - 1) * 3, -0.9 + R() * 2.4, (R() * 2 - 1) * 1.5]; hi = -0.5; }
    return [...jit(p, 0.0025), 0, warm, hi];
  });
  s.deco = () => {
    const occs = [], y = new LB();
    for (const F of figs) {
      const k = F.k, X = F.x, Z = F.z, at = (v) => [X + v[0] * k, G + v[1] * k, Z + v[2] * k];
      occs.push(occ(new THREE.SphereGeometry(0.093 * k, 16, 12), ...at([0, 0.96, 0]), 1, 1.12, 1));
      occs.push(occ(new THREE.CylinderGeometry(0.135 * k, 0.12 * k, 0.37 * k, 20), ...at([0, 0.61, 0]), 1, 1, 0.56));
      for (const sx of [-1, 1]) {
        occs.push(occ(new THREE.CylinderGeometry(0.045 * k, 0.045 * k, 0.44 * k, 10), ...at([sx * 0.068, 0.24, 0])));
        occs.push(occ(new THREE.CylinderGeometry(0.036 * k, 0.036 * k, 0.33 * k, 10), ...at([sx * 0.218, 0.61, 0])));
      }
      y.circle(X, G - 0.01, Z, 0.24 * k, 32, 0.144 * k);
    }
    return { lines: [{ pos: y.get(), color: GOLD, k: 0.35 }], occ: occs };
  };
  return s;
}

// location pin with signal ripples over a city map (the Kochi office)
function pinShape(N) {
  const prof = [[0, 0], [0.9, 1.6], [2.4, 5.2], [4.1, 8.8], [5.4, 11.8], [6.1, 14.4], [6.2, 16.2], [5.8, 18.2], [4.7, 19.9], [2.8, 21.1], [0, 21.5]].map(([x, y]) => [x * 0.075, y * 0.075]);
  const segs = []; let tot = 0;
  for (let i = 0; i < prof.length - 1; i++) { const l = Math.hypot(prof[i + 1][0] - prof[i][0], prof[i + 1][1] - prof[i][1]); segs.push(l); tot += l; }
  const onProf = () => { let r = R() * tot, i = 0; while (i < segs.length - 1 && r > segs[i]) { r -= segs[i]; i++; } const t = r / segs[i]; return [lerp(prof[i][0], prof[i + 1][0], t), lerp(prof[i][1], prof[i + 1][1], t)]; };
  const rAt = (y) => { for (let i = 0; i < prof.length - 1; i++) if (y >= prof[i][1] && y <= prof[i + 1][1]) return lerp(prof[i][0], prof[i + 1][0], (y - prof[i][1]) / (prof[i + 1][1] - prof[i][1])); return 0; };
  const B = -0.55, G = -0.95, EY = 1.2, ER = 0.17;
  const emb = (a, rr = ER, side = 1) => { const x = Math.cos(a) * rr, y = EY + Math.sin(a) * rr, r = rAt(y); return [x, B + y, side * Math.sqrt(Math.max(0, r * r - x * x)) * 1.01]; };
  const s = build(N, (f) => {
    let p, water = 0, warm = 0, hi = 0;
    if (f < 0.44) {
      const [r, y] = onProf(), a = R() * TAU;
      p = [Math.cos(a) * r, B + y, Math.sin(a) * r]; hi = -0.05;
      if (R() < 0.3) { const yy = pick([0.35, 0.6, 0.85, 1.05, 1.4]), rr = rAt(yy); p = [Math.cos(a) * rr, B + yy, Math.sin(a) * rr]; hi = 0.5; }
    } else if (f < 0.54) {
      const a = R() * TAU; p = R() < 0.75 ? emb(a, ER, sgn()) : emb(a, ER * Math.sqrt(R()), sgn()); warm = 1; hi = 1;
    } else if (f < 0.6) {
      if (R() < 0.45) { p = [gauss() * 0.008, G + R() * (B - G), gauss() * 0.008]; warm = 0.6; hi = 0.6; }   // light beam from the tip
      else { const r = 0.26 * Math.sqrt(R()), a = R() * TAU; p = [Math.cos(a) * r, G + 0.005, Math.sin(a) * r]; warm = 0.7; hi = 0.4 - r; }   // glowing spot
    } else if (f < 0.8) {
      water = 1; const r = pick([0.35, 0.7, 1.05, 1.45, 1.9, 2.4]), a = R() * TAU; p = [Math.cos(a) * r, G, Math.sin(a) * r]; hi = 0.3 - r * 0.15;
    } else if (f < 0.95) {
      water = 1;
      let x = (R() * 2 - 1) * 2.6, z = (R() * 2 - 1) * 2.6;
      const h = Math.hypot(x, z); if (h > 2.6) { const k = 2.6 / h * R(); x *= k; z *= k; }
      if (R() < 0.5) x = Math.round(x / 0.3) * 0.3; else z = Math.round(z / 0.3) * 0.3;
      p = [x, G - 0.01, z]; hi = -0.5;
    } else {
      const a = R() * TAU, r = 0.5 + R() * 1.8, h = 0.05 + R() * 0.3;
      p = edgeBox(Math.cos(a) * r, G + h / 2, Math.sin(a) * r, 0.05, h / 2, 0.05); hi = -0.2;
    }
    return [...jit(p, 0.002), water, warm, hi];
  });
  s.wave = 'radial';
  s.deco = () => {
    const g = new LB(), y = new LB();
    for (const yy of [0.35, 0.6, 0.85, 1.05, 1.4]) g.circle(0, B + yy, 0, rAt(yy) * 1.004, 40);
    for (const sd of [-1, 1]) { const pts = []; for (let i = 0; i <= 32; i++) pts.push(emb(i / 32 * TAU, ER, sd)); y.poly(pts); }
    const pts = prof.map(([x, yy]) => new THREE.Vector2(x * 0.95, yy));
    const geo = new THREE.LatheGeometry(pts, 40);
    return { lines: [{ pos: g.get(), color: GREEN, k: 0.35 }, { pos: y.get(), color: GOLD, k: 0.6 }], occ: [occ(geo, 0, B, 0)] };
  };
  return s;
}

const SHAPES = {
  ship: shipShape, barrel: barrelShape, chart: chartShape, drop: dropShape, cosmos: cosmosShape, dust: dustShape,
  helix: helixShape, tanks: tanksShape, refinery: refineryShape, globe: globeShape, people: peopleShape, pin: pinShape
};

/* ============================ PAGE STORYBOARDS ============================
   at   = scroll progress (same numbers as the chapters in index.html) where this shape is fully formed
   op   = brightness (lower while text sits on top)   x / y / s = position and size
   rot  = (time, progress) => [tilt, turn]            On phones x is always 0. */
const shipRot = (t) => [0.26 + Math.sin(t * 0.9) * 0.015, -0.38 + Math.sin(t * 0.22) * 0.14];
const spin = (k, tilt = 0.3) => (t) => [tilt, t * k];
const globeRot = (t, p) => [0.3, 2.75 + Math.sin(t * 0.05) * 0.6 + p * 2.2];   // starts with India / the Gulf facing you
const cosmosRot = (t) => [0, t * 0.015];

// how wide each object is (used to keep it on screen on narrow phones)
const WIDTH = { ship: 3.4, tanks: 3.9, chart: 2.2, people: 3.7, refinery: 3.0, globe: 2.6, barrel: 1.0, drop: 1.1, pin: 1.2 };

const PAGE_STAGES = {
  about: [
    { at: 0.0, shape: 'ship', op: 1, x: 0.15, y: -0.45, s: 1.05, flat: 0.55, rot: shipRot },
    { at: 0.16, shape: 'ship', op: 0.6, x: 0, y: -0.2, s: 1.25, flat: 0.55, rot: (t) => [0.5, 0.38 + Math.sin(t * 0.18) * 0.12] },
    { at: 0.32, shape: 'barrel', op: 0.7, x: 0, y: 0, s: 1.2, flat: 0.4, rot: (t) => [0.32, Math.sin(t * 0.35) * 0.9] },
    { at: 0.48, shape: 'chart', op: 0.65, x: 0, y: 0, s: 1.5, flat: 0.35, rot: (t) => [0.12, -0.2 + Math.sin(t * 0.4) * 0.35] },
    { at: 0.64, shape: 'ship', op: 0.6, x: 0, y: -0.3, s: 1.1, flat: 0.55, rot: (t) => [0.3, -1.3 + Math.sin(t * 0.2) * 0.15] },
    { at: 0.8, shape: 'drop', op: 0.7, x: 0, y: 0.1, s: 1.2, flat: 0.4, rot: spin(0.3, 0.2) },
    { at: 0.93, shape: 'ship', op: 0.65, x: 0, y: -0.5, s: 0.9, flat: 0.55, rot: shipRot }
  ],
  services: [
    { at: 0.0, shape: 'tanks', op: 1, x: 0, y: -0.5, s: 0.9, flat: 0.55, rot: (t) => [0.42, -0.3 + Math.sin(t * 0.2) * 0.2] },
    { at: 0.24, shape: 'refinery', op: 0.85, x: 1.4, y: -0.1, s: 0.9, flat: 0.5, rot: (t) => [0.25, t * 0.12] },
    { at: 0.48, shape: 'cosmos', op: 0.32, x: 0, y: 0, s: 1.1, flat: 0.2, rot: cosmosRot },
    { at: 0.74, shape: 'ship', op: 0.65, x: 1.0, y: -0.3, s: 0.8, flat: 0.55, rot: shipRot },
    { at: 0.93, shape: 'drop', op: 0.75, x: 0, y: -0.1, s: 1.0, flat: 0.4, rot: spin(0.3, 0.2) }
  ],
  careers: [
    { at: 0.0, shape: 'globe', op: 1, x: 0, y: -1.1, s: 1.2, flat: 0.45, rot: globeRot },
    { at: 0.24, shape: 'globe', op: 0.95, x: 1.55, y: 0, s: 1.0, flat: 0.45, rot: globeRot },
    { at: 0.5, shape: 'globe', op: 0.75, x: 1.7, y: 0, s: 1.0, flat: 0.45, rot: globeRot },
    { at: 0.77, shape: 'globe', op: 0.9, x: 1.55, y: 0, s: 1.0, flat: 0.45, rot: globeRot },
    { at: 0.94, shape: 'globe', op: 0.75, x: 1.55, y: 0, s: 1.0, flat: 0.45, rot: globeRot }
  ],
  team: [
    { at: 0.0, shape: 'people', op: 1, x: 0, y: -0.55, s: 1.0, flat: 0.5, rot: (t) => [0.16, Math.sin(t * 0.25) * 0.3] },
    { at: 0.13, shape: 'people', op: 0.55, x: 0, y: -0.2, s: 1.1, flat: 0.5, rot: (t) => [0.28, Math.sin(t * 0.2) * 0.4] },
    { at: 0.55, shape: 'cosmos', op: 0.3, x: 0, y: 0, s: 1.1, flat: 0.2, rot: cosmosRot },
    { at: 0.95, shape: 'dust', op: 0.25, x: 0, y: 0, s: 1.3, flat: 0.3, rot: (t) => [0, t * 0.01] }   // quiet drifting dust behind the closing text
  ],
  contact: [
    { at: 0.0, shape: 'pin', op: 0.95, x: 0, y: -0.55, s: 0.85, flat: 0.5, rot: (t) => [0.3, Math.sin(t * 0.3) * 0.7] },
    { at: 0.12, shape: 'pin', op: 0.55, x: 0, y: -0.1, s: 1.0, flat: 0.5, rot: (t) => [0.42, Math.sin(t * 0.25) * 0.8] },
    { at: 0.55, shape: 'cosmos', op: 0.3, x: 0, y: 0, s: 1.1, flat: 0.2, rot: cosmosRot },
    { at: 0.9, shape: 'dust', op: 0.25, x: 0, y: 0, s: 1.3, flat: 0.3, rot: (t) => [0, t * 0.01] }
  ]
};

/* ============================ CONTROLLER ============================ */
export class PageParticles {
  constructor({ cameraRig } = {}) {
    this.rig = cameraRig;
    this.active = false;
    this.page = null;
    this.shapes = {};
    this.decos = {};
    try { this.init(); } catch (e) { console.error('[PageParticles] disabled:', e); this.disabled = true; }
  }

  init() {
    this.mobile = innerWidth < 760;
    const N = (this.N = this.mobile ? 7000 : 12000);
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // background layer: sits under the page content (z 10) and above the old 3D canvas
    const layer = document.createElement('div');
    layer.id = 'pp-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<div class="pp-bg"></div><div class="pp-amb"></div><canvas class="pp-gl"></canvas><div class="pp-shade"></div><div class="pp-grain"></div>';
    document.body.insertBefore(layer, document.getElementById('content-container'));
    this.layer = layer;

    const canvas = layer.querySelector('.pp-gl');
    const renderer = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }));
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
    this.camera.position.z = 6;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    const rnd = new Float32Array(N); for (let i = 0; i < N; i++) rnd[i] = R();
    this.rnd = rnd;
    this.rv = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const d = unit(); this.rv.set(d, i * 3); }
    this.cur = new Float32Array(N * 3);
    this.target = new Float32Array(N * 3);
    this.warm = new Float32Array(N);
    this.hi = new Float32Array(N);

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.cur, 3).setUsage(THREE.DynamicDrawUsage);
    this.warmAttr = new THREE.BufferAttribute(this.warm, 1).setUsage(THREE.DynamicDrawUsage);
    this.hiAttr = new THREE.BufferAttribute(this.hi, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
    geo.setAttribute('aWarm', this.warmAttr);
    geo.setAttribute('aHi', this.hiAttr);
    this.uniforms = { uTime: { value: 0 }, uSize: { value: this.mobile ? 2.3 : 2.0 }, uPR: { value: renderer.getPixelRatio() }, uOpacity: { value: 0 }, uFlat: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aRand; attribute float aWarm; attribute float aHi;
        uniform float uTime, uSize, uPR, uFlat;
        varying float vB; varying float vR; varying float vW; varying float vH;
        void main(){
          vec3 p = position + 0.006*vec3(sin(uTime*1.3+aRand*40.),cos(uTime*1.1+aRand*30.),sin(uTime*.9+aRand*20.));
          vec4 mv = modelViewMatrix*vec4(p,1.);
          gl_Position = projectionMatrix*mv;
          float d = -mv.z;
          float e = max(aHi, 0.);
          gl_PointSize = uSize*uPR*(0.7+aRand*0.6)*(1.0+0.45*e)*(6.0/d);
          float b = smoothstep(-1.3,1.25,position.y);
          vB = mix(b,0.72,uFlat)*clamp(1.3-(d-6.0)*0.2,0.35,1.35);
          vR = aRand; vW = aWarm; vH = aHi;
        }`,
      fragmentShader: `
        uniform float uOpacity, uTime; varying float vB; varying float vR; varying float vW; varying float vH;
        void main(){
          vec2 c = gl_PointCoord-0.5; float d = length(c); if(d>0.5) discard;
          float a = smoothstep(0.5,0.12,d);
          float e = max(vH,0.), dim = 1.0 + min(vH,0.)*0.8;
          float b = mix(vB*(0.6+0.4*vR), 0.7+0.3*vR, vW*0.8);
          b = mix(b, 1.0, e*0.75);
          vec3 green = mix(vec3(0.04,0.30,0.08), vec3(0.66,1.0,0.48), b);
          vec3 gold = mix(vec3(0.45,0.2,0.02), vec3(1.0,0.84,0.42), b);
          vec3 col = mix(green, gold, vW) + smoothstep(0.2,0.0,d)*0.25*e;
          float tw = 0.85+0.15*sin(uTime*2.0+vR*60.0);
          gl_FragColor = vec4(col, a*uOpacity*(0.35+0.65*b)*tw*(1.0+e*0.7)*dim);
        }`
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 1;
    this.group.add(pts);

    this.mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    addEventListener('pointermove', (e) => { this.mouse.x = e.clientX / innerWidth * 2 - 1; this.mouse.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
    addEventListener('resize', () => {
      renderer.setSize(innerWidth, innerHeight, false);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
    });

    this.themeCurtain();

    this.last = performance.now();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  // The page-switch fade (created by UIManager) was dark blue. Give it the Home look instead:
  // dark green + film grain. Only its colour changes (styles: .pp-curtain in page-particles.css);
  // its timing and behaviour stay exactly the same.
  themeCurtain(tries = 0) {
    const el = [...document.body.children].find((d) => d.tagName === 'DIV' && d.style.zIndex === '90' && /gradient/.test(d.style.background || d.style.backgroundImage));
    if (el) { el.classList.add('pp-curtain'); return; }
    if (tries < 40) setTimeout(() => this.themeCurtain(tries + 1), 250);
  }

  shape(name) {
    if (!this.shapes[name]) {
      const S = (this.shapes[name] = SHAPES[name](this.N, this.mobile));
      if (name === 'cosmos') this.makeLines(S.pos);
      if (S.deco) this.makeDeco(name, S.deco());
    }
    return this.shapes[name];
  }

  // outline lines + invisible solid core + (globe) atmosphere glow for one shape
  makeDeco(name, d) {
    const root = new THREE.Group(), core = new THREE.Group();
    if (d.off) root.position.set(...d.off);
    root.add(core);
    (d.occ || []).forEach((m) => core.add(m));
    const mats = [];
    for (const L of d.lines || []) {
      if (!L.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(L.pos, 3));
      const m = new THREE.LineBasicMaterial({ color: L.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      m.userData.k = L.k;
      const ls = new THREE.LineSegments(g, m); ls.renderOrder = 2; ls.frustumCulled = false;
      root.add(ls); mats.push(m);
    }
    let halo = null;
    if (d.halo) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const cx = cv.getContext('2d'), rr = 1 / 1.4, gr = cx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(60,200,70,0.10)'); gr.addColorStop(rr * 0.9, 'rgba(70,220,80,0.12)'); gr.addColorStop(rr * 1.0, 'rgba(140,255,110,0.38)');
      gr.addColorStop(rr * 1.06, 'rgba(90,230,80,0.12)'); gr.addColorStop(1, 'rgba(40,140,50,0)');
      cx.fillStyle = gr; cx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(cv);
      halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(d.halo * 2 * 1.4); halo.renderOrder = 2;
      root.add(halo);
    }
    root.visible = false;
    this.group.add(root);
    this.decos[name] = { root, core, mats, halo };
  }

  // network lines between nearby stars (like Home's network section)
  makeLines(cos) {
    const N = this.N, nodes = [], pairs = [], deg = new Map();
    for (let i = 0; i < N && nodes.length < 220; i++) {
      if (Math.abs(cos[i * 3]) < 5.5 && Math.abs(cos[i * 3 + 1]) < 3 && cos[i * 3 + 2] > -3.5) nodes.push(i);
    }
    for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
      const i = nodes[a], j = nodes[b];
      const dx = cos[i * 3] - cos[j * 3], dy = cos[i * 3 + 1] - cos[j * 3 + 1], dz = cos[i * 3 + 2] - cos[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < 1.6 && (deg.get(i) || 0) < 3 && (deg.get(j) || 0) < 3) {
        pairs.push(i, j); deg.set(i, (deg.get(i) || 0) + 1); deg.set(j, (deg.get(j) || 0) + 1);
      }
    }
    this.pairs = pairs;
    this.lpos = new Float32Array(pairs.length * 3);
    const lgeo = new THREE.BufferGeometry();
    this.lAttr = new THREE.BufferAttribute(this.lpos, 3).setUsage(THREE.DynamicDrawUsage);
    lgeo.setAttribute('position', this.lAttr);
    this.lmat = new THREE.LineBasicMaterial({ color: 0x5fe03a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const lines = new THREE.LineSegments(lgeo, this.lmat);
    lines.frustumCulled = false;
    this.group.add(lines);
  }

  // which inner page is open (Home is handled by HomeParticles.js)
  checkActive() {
    let page = null;
    if (document.body.classList.contains('loaded')) {
      for (const n of PAGES) if (document.getElementById(`${n}-view`)?.classList.contains('active')) { page = n; break; }
    }
    if (page === this.page) return;
    this.page = page;
    this.active = !!page;
    document.body.classList.toggle('pp-on', this.active);
    document.body.dataset.ppPage = page || '';
    if (!page) return;
    this.stages = PAGE_STAGES[page];
    this.stages.forEach((s) => this.shape(s.shape));
    // particles fly in from a wide scatter, like the Home intro
    const dust = this.shape('dust').pos;
    for (let i = 0; i < this.N * 3; i++) this.cur[i] = dust[i] * 1.6;
    this.warm.fill(0);
    this.hi.fill(0);
    this.introStart = performance.now();
  }

  frame(now) {
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.checkActive();
    if (!this.active) return;

    const N = this.N, t = now / 1000, st = this.stages;
    this.uniforms.uTime.value = t;
    const p = clamp01(this.rig?.getProgress?.() || 0);

    // which two shapes we are between, and how far the morph is
    let k = 0;
    while (k < st.length - 1 && p >= st[k + 1].at) k++;
    const A = st[k], B = st[Math.min(k + 1, st.length - 1)];
    const f = A === B ? 0 : sm(clamp01(((p - A.at) / (B.at - A.at) - 0.5) / 0.45));
    const SA = this.shapes[A.shape], SB = this.shapes[B.shape];

    const tp = this.target, rnd = this.rnd, rv = this.rv;
    if (SA === SB || f < 0.0005 || f > 0.9995) tp.set((f > 0.9995 ? SB : SA).pos);
    else {
      const pa = SA.pos, pb = SB.pos;
      for (let i = 0; i < N; i++) {
        const fi = sm(clamp01(f * 1.7 - rnd[i] * 0.7)), burst = Math.sin(fi * Math.PI) * 0.9;
        for (let c = 0; c < 3; c++) { const q = i * 3 + c; tp[q] = pa[q] + (pb[q] - pa[q]) * fi + rv[q] * burst; }
      }
    }

    // moving water / signal ripples
    const wA = SA.wave ? WAVES[SA.wave] : null, wB = SB !== SA && SB.wave ? WAVES[SB.wave] : null;
    if (wA || wB) {
      const ka = SA === SB ? 1 : 1 - f;
      for (let i = 0; i < N; i++) {
        const q = i * 3;
        if (wA && SA.water[i]) tp[q + 1] += wA(SA.pos[q], SA.pos[q + 2], t) * ka;
        if (wB && SB.water[i]) tp[q + 1] += wB(SB.pos[q], SB.pos[q + 2], t) * f;
      }
    }

    const ease = 1 - Math.pow(1 - 0.11, dt * 60);
    const cur = this.cur;
    for (let i = 0; i < N * 3; i++) cur[i] += (tp[i] - cur[i]) * ease;
    this.posAttr.needsUpdate = true;

    const ga = SA.warm, gb = SB.warm, w = this.warm, ha = SA.hi, hb = SB.hi, h = this.hi;
    for (let i = 0; i < N; i++) {
      const want = (ga ? ga[i] : 0) * (1 - f) + (gb ? gb[i] : 0) * f;
      w[i] += (want - w[i]) * ease;
      const wantH = (ha ? ha[i] : 0) * (1 - f) + (hb ? hb[i] : 0) * f;
      h[i] += (wantH - h[i]) * ease;
    }
    this.warmAttr.needsUpdate = true;
    this.hiAttr.needsUpdate = true;

    // placement, size and slow turning
    const narrow = innerWidth < 860;
    const fit = Math.min(1, (innerWidth / innerHeight) / 1.35), fitS = 0.55 + 0.45 * fit;
    const intro = this.reduce ? 1 : sm(clamp01((now - this.introStart) / 1800));
    // keep wide objects (ship, tank farm...) fully on screen on phones
    const vw = 2 * 6 * Math.tan(17.5 * D) * (innerWidth / innerHeight) * 0.94;
    const fitTo = (S) => Math.min((S.s ?? 1) * fitS * (narrow ? 0.85 : 1), WIDTH[S.shape] ? vw / WIDTH[S.shape] : 9);
    const sc = lerp(fitTo(A), fitTo(B), f);
    this.group.scale.setScalar(sc);
    const m = this.mouse;
    m.sx += (m.x - m.sx) * 0.04; m.sy += (m.y - m.sy) * 0.04;
    const ox = narrow ? 0 : lerp(A.x ?? 0, B.x ?? 0, f);
    this.group.position.set(ox + m.sx * 0.06, lerp(A.y ?? 0, B.y ?? 0, f) - m.sy * 0.04, 0);
    const ra = A.rot(t, p), rb = B.rot(t, p);
    this.group.rotation.x = lerp(ra[0], rb[0], f) + m.sy * 0.08;
    this.group.rotation.y = lerp(ra[1], rb[1], f) + m.sx * 0.12;
    const op = lerp(A.op ?? 1, B.op ?? 1, f) * intro;
    this.uniforms.uOpacity.value = op;
    this.uniforms.uFlat.value = lerp(A.flat ?? 0.3, B.flat ?? 0.3, f);

    // outlines, solid cores and glow: only for the shape(s) on screen, fading in once formed
    const settle = sm(clamp01((now - this.introStart - 900) / 1400));
    for (const name in this.decos) {
      const dc = this.decos[name];
      const wgt = (A.shape === name ? 1 - f : 0) + (B !== A && B.shape === name ? f : 0);
      const on = wgt > 0.01;
      dc.root.visible = on;
      if (!on) continue;
      const cs = sm(clamp01((wgt - 0.55) / 0.45)) * (this.reduce ? 1 : sm(clamp01((now - this.introStart - 600) / 1000)));
      dc.core.visible = cs > 0.02;
      dc.core.scale.setScalar(Math.max(0.001, cs));
      const lo = sm(clamp01((wgt - 0.6) / 0.4)) * op * settle;
      for (const mt of dc.mats) mt.opacity = lo * mt.userData.k;
      if (dc.halo) dc.halo.material.opacity = sm(clamp01((wgt - 0.4) / 0.6)) * op * settle;
    }

    // network lines while a "cosmos" stage shows
    if (this.lmat) {
      const wc = (A.shape === 'cosmos' ? 1 - f : 0) + (B.shape === 'cosmos' && B !== A ? f : 0);
      const lo = clamp01(wc) * op;
      this.lmat.opacity = lo * 0.5;
      if (lo > 0.01) {
        const pr = this.pairs, lp = this.lpos;
        for (let j = 0; j < pr.length; j++) { const i = pr[j]; lp[j * 3] = cur[i * 3]; lp[j * 3 + 1] = cur[i * 3 + 1]; lp[j * 3 + 2] = cur[i * 3 + 2]; }
        this.lAttr.needsUpdate = true;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}