/*
  HomeParticles.js  -  Oleovista Home page: one field of glowing particles that re-shapes
  itself as you scroll (growth chart -> trading network -> oil cargo ship -> double helix ->
  floating forms), with the text choreography from the reference design.
  ------------------------------------------------------------------------------------------
  - Runs ONLY while the Home page (#home-view) is open. The logo, navbar, WhatsApp, Olivia and
    every other page are untouched.
  - The Home page scrolls natively inside #home-view (with smooth wheel scrolling), so GSAP
    ScrollTrigger drives the choreography. While Home is open the old 3D mountain is hidden
    and not rendered at all (body gets the class "home-p").
  - Styles: src/home/home-particles.css  (every rule is scoped to #home-view)
*/
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CONTACT_EMAIL = 'corporate@oleovista.com';

export class HomeParticles {
  constructor() {
    this.root = document.getElementById('home-view');
    this.active = false;
    this.started = false;
    if (!this.root || !this.root.querySelector('.hp-main')) { this.disabled = true; return; }
    try { this.init(); } catch (e) { console.error('[HomeParticles] disabled:', e); this.disabled = true; }
  }

  /* -------------------------------------------------------------- */
  init() {
    const root = this.root;
    const $ = (s) => root.querySelector(s);
    const $$ = (s) => [...root.querySelectorAll(s)];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrow = () => innerWidth < 860;
    ScrollTrigger.defaults({ scroller: root });

    /* ================= smooth wheel scrolling inside #home-view ================= */
    const sm = (t) => t * t * (3 - 2 * t);
    const maxScroll = () => Math.max(0, root.scrollHeight - root.clientHeight);
    this.smooth = { target: 0, animating: false };
    const S = this.smooth;
    const skipWheel = (el) => el && el.closest && el.closest('.olivia-overlay, .menu-drawer, .modal-overlay, .job-panel, .header-dropdown-menu');
    window.addEventListener('wheel', (e) => {
      if (!this.active || e.ctrlKey || skipWheel(e.target)) return;
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
      if (!S.animating) S.target = root.scrollTop;
      S.target = Math.min(maxScroll(), Math.max(0, S.target + d));
      S.animating = !reduce;
      if (reduce) root.scrollTop = S.target;
    }, { passive: false });
    root.addEventListener('scroll', () => { if (!S.animating) S.target = root.scrollTop; }, { passive: true });
    const scrollToY = (y, instant = false) => {
      S.target = Math.min(maxScroll(), Math.max(0, y));
      if (instant || reduce) { S.animating = false; root.scrollTop = S.target; }
      else S.animating = true;
    };
    this.scrollToY = scrollToY;
    const getScroll = () => root.scrollTop;

    const pins = {};
    const goTo = (sel) => {
      const t = root.querySelector(sel); if (!t) return;
      let y = t.getBoundingClientRect().top - root.getBoundingClientRect().top + getScroll();
      const st = pins[sel]; if (st) y = st.start + (st.end - st.start) * 0.45;
      scrollToY(y);
    };
    document.querySelectorAll('[data-hp-go]').forEach((a) => a.addEventListener('click', (e) => {
      if (!this.active) return;
      e.preventDefault();
      goTo(a.dataset.hpGo);
    }));
    // back-to-top button, logo and "Home" link scroll Home back to the top
    ['scroll-top-btn', 'brand-logo-btn', 'nav-home'].forEach((id) => document.getElementById(id)?.addEventListener('click', () => {
      if (this.active) scrollToY(0);
    }));

    /* ================= text splitting ================= */
    function split(el) {
      const out = [];
      const walk = (node, parent) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            n.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(' ')); return; }
              const w = document.createElement('span'); w.className = 'w';
              const i = document.createElement('span'); i.className = 'wi'; i.textContent = part;
              w.appendChild(i); parent.appendChild(w); out.push(i);
            });
          } else if (n.nodeName === 'BR') parent.appendChild(n.cloneNode());
          else if (n.classList && n.classList.contains('ico')) {
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.className = 'wi'; i.appendChild(n.cloneNode(true));
            w.appendChild(i); parent.appendChild(w); out.push(i);
          } else {
            const c = n.cloneNode(false); parent.appendChild(c); walk(n, c);
          }
        });
      };
      const frag = document.createElement('div'); walk(el, frag);
      el.innerHTML = ''; [...frag.childNodes].forEach((c) => el.appendChild(c));
      return out;
    }
    $$('[data-split],[data-scrub]').forEach((el) => { el._w = split(el); });

    /* ================= particles ================= */
    const canvas = $('#hp-gl');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setSize(innerWidth, innerHeight, false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
    camera.position.z = 6;
    const group = new THREE.Group(); scene.add(group);
    this.renderer = renderer;

    const N = innerWidth < 760 ? 8000 : 15000;
    const R = Math.random;
    const rnd = new Float32Array(N); for (let i = 0; i < N; i++) rnd[i] = R();
    const rv = new Float32Array(N * 3);
    function unit() { const u = R() * 2 - 1, t = R() * Math.PI * 2, s = Math.sqrt(1 - u * u); return [s * Math.cos(t), u, s * Math.sin(t)]; }
    for (let i = 0; i < N; i++) { const d = unit(); rv[i * 3] = d[0]; rv[i * 3 + 1] = d[1]; rv[i * 3 + 2] = d[2]; }
    const gauss = () => (R() + R() + R() + R() - 2) / 2;
    function shuffle(a) { for (let i = N - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; for (let k = 0; k < 3; k++) { const t = a[i * 3 + k]; a[i * 3 + k] = a[j * 3 + k]; a[j * 3 + k] = t; } } return a; }
    function build(fn) { const a = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const p = fn(i / N, i); a[i * 3] = p[0]; a[i * 3 + 1] = p[1]; a[i * 3 + 2] = p[2]; } return shuffle(a); }

    // --- growth chart: rising 3D bars of light, glowing trend arrow, grid tabletop, floating panel
    const BARS = [0.28, 0.5, 0.78, 1.02, 1.38, 1.8, 2.35];
    const BASE = -1.15, BW = 0.17, YS = -0.25;
    const BX = (i) => -1.65 + i * 0.55;
    const ARROW = [[-2.05, -1.0], [-1.5, -0.74], [-0.95, -0.44], [-0.45, -0.12], [-0.05, -0.2], [0.4, 0.05], [0.85, 0.42], [1.15, 0.62], [1.4, 0.56], [1.75, 1.12], [2.05, 1.68]];
    const AZ = 0.42;
    const aWarm = new Float32Array(N), barId = new Int8Array(N).fill(-1), arrowS = new Float32Array(N).fill(-1);
    function catmull(pts, s) {
      const n = pts.length - 1, u = Math.min(n - 1e-4, Math.max(0, s) * n), i = Math.floor(u), t = u - i;
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)], t2 = t * t, t3 = t2 * t;
      const f = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      return [f(0), f(1)];
    }
    function boxEdges(cx, y0, y1, hw, hd) {
      const e = (R() * 12) | 0, t = R(), sx = e & 1 ? 1 : -1, sz = e & 2 ? 1 : -1;
      if (e < 4) return [cx + sx * hw, y0 + t * (y1 - y0), sz * hd];
      if (e < 8) return [cx + (t * 2 - 1) * hw, e & 4 ? y1 : y0, sz * hd];
      return [cx + sx * hw, e & 4 ? y1 : y0, (t * 2 - 1) * hd];
    }
    const tipA = catmull(ARROW, 1), tipB = catmull(ARROW, 0.97);
    const TD = (() => { const dx = tipA[0] - tipB[0], dy = tipA[1] - tipB[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; })();
    const LABELS = [[-1.95, 1.05], [-1.95, 0.55], [-1.95, 0.05], [-1.25, 1.3], [-0.55, 0.75], [0.35, 1.2], [1.05, -0.25]];
    const chartRaw = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const f = i / N; let p;
      if (f < 0.52) {
        const b = (R() * BARS.length) | 0, x = BX(b), h = BARS[b], top = BASE + h; barId[i] = b;
        const g = R();
        if (g < 0.45) { p = boxEdges(x, BASE, top, BW, BW); aWarm[i] = 0.9; }
        else if (g < 0.56) { p = [x + (R() * 2 - 1) * BW, top, (R() * 2 - 1) * BW]; aWarm[i] = 1; }
        else {
          const q = 0.045, face = (R() * 4) | 0, u = Math.round((R() * 2 - 1) * BW / q) * q, v = BASE + Math.round(Math.pow(R(), 0.8) * h / q) * q;
          p = face < 2 ? [x + u, v, face ? -BW : BW] : [x + (face === 2 ? -BW : BW), v, u]; aWarm[i] = 0.7;
        }
      } else if (f < 0.64) {
        const s = R(), c = catmull(ARROW, s), r = 0.032 * Math.sqrt(R()), a = R() * Math.PI * 2;
        p = [c[0], c[1] + Math.cos(a) * r, AZ + Math.sin(a) * r]; aWarm[i] = 1; arrowS[i] = s;
      } else if (f < 0.67) {
        const s = R(), c = catmull(ARROW, s);
        p = [c[0] + gauss() * 0.05, c[1] + gauss() * 0.08, AZ + gauss() * 0.06]; aWarm[i] = 1; arrowS[i] = s;
      } else if (f < 0.71) {
        let a = R(), b = R(); if (a + b > 1) { a = 1 - a; b = 1 - b; }
        const along = a * 0.36, across = (b - (1 - a - b)) * 0.21;
        p = [tipA[0] + TD[0] * along - TD[1] * across, tipA[1] + TD[1] * along + TD[0] * across, AZ + gauss() * 0.012]; aWarm[i] = 1; arrowS[i] = 1;
      } else if (f < 0.84) {
        const g = R(), X = 2.35, Z = 1.0, y = BASE - 0.02;
        if (g < 0.22) { const t = R(), e = (R() * 4) | 0; p = e < 2 ? [(t * 2 - 1) * X, y - (e === 0 ? R() * 0.08 : 0), e ? -Z : Z] : [e === 2 ? -X : X, y, (t * 2 - 1) * Z]; }
        else if (g < 0.72) { p = R() < 0.55 ? [-X + ((R() * 12) | 0) * (2 * X / 11), y, (R() * 2 - 1) * Z] : [(R() * 2 - 1) * X, y, -Z + ((R() * 6) | 0) * (2 * Z / 5)]; }
        else { const b = (R() * BARS.length) | 0, rr = Math.sqrt(R()) * 0.42, a = R() * Math.PI * 2; p = [BX(b) + Math.cos(a) * rr, y, Math.sin(a) * rr * 0.7]; aWarm[i] = 0.75; }
      } else if (f < 0.92) {
        const PZ = -1.0, g = R();
        if (g < 0.5) p = [-2.05 + R() * 3.95, -0.7 + ((R() * 5) | 0) * 0.5, PZ];
        else if (g < 0.66) p = [-2.05 + ((R() * 4) | 0) * 1.3, -0.7 + R() * 2.0, PZ];
        else { const L = LABELS[(R() * LABELS.length) | 0], w = 0.2, h = 0.09, e = R();
          p = e < 0.6 ? [L[0] + R() * w, L[1] + (R() < 0.5 ? 0 : h), PZ + 0.02] : [L[0] + (R() < 0.5 ? 0 : w), L[1] + R() * h, PZ + 0.02]; }
      } else {
        const c = catmull(ARROW, R());
        p = [c[0] + gauss() * 0.45, c[1] + 0.12 + Math.abs(gauss()) * 0.7, AZ - 0.2 + gauss() * 0.45]; aWarm[i] = 0.9;
      }
      chartRaw[i * 3] = p[0]; chartRaw[i * 3 + 1] = p[1] + YS; chartRaw[i * 3 + 2] = p[2];
    }
    for (let i = N - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0;
      for (let k = 0; k < 3; k++) { const t = chartRaw[i * 3 + k]; chartRaw[i * 3 + k] = chartRaw[j * 3 + k]; chartRaw[j * 3 + k] = t; }
      let t = aWarm[i]; aWarm[i] = aWarm[j]; aWarm[j] = t;
      t = barId[i]; barId[i] = barId[j]; barId[j] = t;
      t = arrowS[i]; arrowS[i] = arrowS[j]; arrowS[j] = t; }
    const barGrow = BARS.map(() => 0), arrowDraw = { v: 0 };
    this.playChartIntro = () => {
      BARS.forEach((_, b) => gsap.to(barGrow, { [b]: 1, duration: 1.3, ease: 'expo.out', delay: 0.5 + b * 0.12 }));
      gsap.to(arrowDraw, { v: 1, duration: 1.7, ease: 'power2.inOut', delay: 1.1 });
    };
    const chart = chartRaw;

    // --- cosmos: deep scatter + nebula filaments (the trading network)
    const filaments = [...Array(7)].map(() => ({ x0: -6 + R() * 12, y0: 1.2 + R() * 2.4, len: 2 + R() * 4, ang: -0.6 + R() * 1.2, wob: R() * 3, z: -3 + R() * 2.5 }));
    const cosmos = build((f) => {
      if (f < 0.7) return [(R() * 2 - 1) * 7.5, (R() * 2 - 1) * 4.2, -6 + R() * 7.2];
      const fl = filaments[(R() * filaments.length) | 0];
      const s = R();
      const x = fl.x0 + Math.cos(fl.ang) * s * fl.len, y = fl.y0 + Math.sin(fl.ang) * s * fl.len + Math.sin(s * 6 + fl.wob) * 0.35;
      const sp = 0.05 + 0.18 * Math.pow(R(), 2);
      return [x + gauss() * sp * 3, y + gauss() * sp, fl.z + gauss() * sp * 2];
    });
    const dust = build(() => [(R() * 2 - 1) * 8, (R() * 2 - 1) * 5, -7 + R() * 7]);

    // --- cargo ship: hull, deck, bridge + funnel, stacked oil drums, water around it
    const HULL = { stern: -1.6, keelBow: 1.35, deckBow: 1.66, keel: -0.35, deck: 0.1, half: 0.38 };
    function hullHalfWidth(u, y) {
      const h = (y - HULL.keel) / (HULL.deck - HULL.keel);
      let w = HULL.half * (0.7 + 0.3 * h);
      if (u > 0.9) w *= Math.sqrt(Math.max(0, 1 - ((u - 0.9) / (HULL.keelBow + (HULL.deckBow - HULL.keelBow) * h - 0.9)) ** 2));
      if (u < HULL.stern + 0.18) w *= 0.85 + 0.15 * Math.max(0, (u - HULL.stern) / 0.18);
      return w;
    }
    const DRUMS = [];
    const DR = 0.105, DH = 0.25;
    for (let x = -0.85; x <= 1.0; x += 0.3) for (const z of [-0.14, 0.14]) {
      if (hullHalfWidth(x, HULL.deck) - DR < Math.abs(z)) continue;
      DRUMS.push([x, HULL.deck, z]);
      if (x > -0.6 && x < 0.4) DRUMS.push([x, HULL.deck + DH + 0.02, z]);
    }
    const ship = build((f) => {
      let p;
      if (f < 0.27) {
        const y = HULL.keel + R() * (HULL.deck - HULL.keel), h = (y - HULL.keel) / (HULL.deck - HULL.keel);
        const uMax = HULL.keelBow + (HULL.deckBow - HULL.keelBow) * h;
        const yy = R() < 0.18 ? (R() < 0.5 ? -0.12 : HULL.deck) : y;
        const u = HULL.stern + R() * (uMax - HULL.stern);
        p = [u, yy, (R() < 0.5 ? -1 : 1) * hullHalfWidth(u, yy)];
      } else if (f < 0.31) {
        const u = HULL.stern + R() * (HULL.deckBow - HULL.stern), w = hullHalfWidth(u, HULL.deck);
        p = [u, HULL.deck, (R() * 2 - 1) * w];
      } else if (f < 0.7) {
        const d = DRUMS[(R() * DRUMS.length) | 0], a = R() * Math.PI * 2, g = R();
        if (g < 0.5) { const ring = [0, DH * 0.33, DH * 0.66, DH][(R() * 4) | 0]; p = [d[0] + Math.cos(a) * DR, d[1] + ring, d[2] + Math.sin(a) * DR]; }
        else if (g < 0.78) { const st = ((R() * 14) | 0) / 14 * Math.PI * 2; p = [d[0] + Math.cos(st) * DR, d[1] + R() * DH, d[2] + Math.sin(st) * DR]; }
        else if (g < 0.9) { const r = DR * 0.55; p = [d[0] + Math.cos(a) * r, d[1] + DH, d[2] + Math.sin(a) * r]; }
        else { p = [d[0] + DR * 0.3 + (R() - 0.5) * 0.03, d[1] + DH, d[2] + (R() - 0.5) * 0.03]; }
      } else if (f < 0.83) {
        const g = R(), x0 = -1.52, x1 = -1.08, y0 = HULL.deck, y1 = 0.74, zw = 0.3;
        if (g < 0.6) {
          const face = (R() * 3) | 0, yy = R() < 0.35 ? [0.32, 0.47, 0.62][(R() * 3) | 0] : y0 + R() * (y1 - y0);
          p = face === 0 ? [x1, yy, (R() * 2 - 1) * zw] : face === 1 ? [x0 + R() * (x1 - x0), yy, (R() < 0.5 ? -1 : 1) * zw] : [x0 + R() * (x1 - x0), y1, (R() * 2 - 1) * zw];
        } else if (g < 0.85) p = [x0 + 0.05 + R() * (x1 - x0 - 0.05), 0.66 + R() * 0.04, (R() * 2 - 1) * 0.44];
        else p = boxEdges(-1.3, y0, y1, 0.22, zw);
      } else if (f < 0.86) {
        const a = R() * Math.PI * 2, yy = 0.74 + R() * 0.3;
        p = [-1.4 + Math.cos(a) * 0.09, yy, Math.sin(a) * 0.11];
      } else if (f < 0.9) {
        const g = R();
        if (g < 0.35) p = [1.2, HULL.deck + R() * 0.55, 0];
        else if (g < 0.7) p = [-1.05 + R() * 2.2, HULL.deck + 0.03, (R() < 0.5 ? -1 : 1) * 0.02];
        else { const u = 0.9 + R() * 0.76, w = hullHalfWidth(u, HULL.deck); p = [u, HULL.deck + 0.06, (R() < 0.5 ? -1 : 1) * w]; }
      } else {
        if (R() < 0.7) { const x = (R() * 2 - 1) * 2.3, z = (R() * 2 - 1) * 1.0; p = [x, -0.13 + Math.sin(x * 6 + z * 4) * 0.02, z]; }
        else { const s = R(), x = HULL.stern - s * 0.9; p = [x, -0.12, (R() * 2 - 1) * (0.25 + s * 0.55)]; }
      }
      return [p[0] + gauss() * 0.002, p[1] - 0.28 + gauss() * 0.002, p[2] + gauss() * 0.002];
    });

    // --- helix
    // --- helix: only the two strands (no rungs between them, no cloud around them)
    const helix = build(() => {
      const t = R() * 2 - 1, y = t * 2.7;
      const rad = 0.32 + 0.5 * t * t;
      const s = R() < 0.5 ? 0 : Math.PI, a = t * 7 + s;
      const sp = 0.05 + 0.05 * t * t;
      return [Math.cos(a) * rad + gauss() * sp, y + gauss() * sp * 0.6, Math.sin(a) * rad + gauss() * sp];
    });
    // --- "Get in touch" shapes: trading items that morph into each other
    //     (oil barrel -> container ship -> rising candlestick chart -> oil drop -> ...)
    const jit = (p, s = 0.008) => [p[0] + gauss() * s, p[1] + gauss() * s, p[2] + gauss() * s];
    const edgeBox = (cx, cy, cz, hx, hy, hz) => {          // a point on the 12 edges of a box
      const e = (R() * 12) | 0, t = R() * 2 - 1, a = e & 1 ? 1 : -1, b = e & 2 ? 1 : -1;
      if (e < 4) return [cx + a * hx, cy + t * hy, cz + b * hz];
      if (e < 8) return [cx + t * hx, cy + a * hy, cz + b * hz];
      return [cx + a * hx, cy + b * hy, cz + t * hz];
    };

    // 1. oil barrel: bulging wall with staves, two rolling ribs, rims and a lid with a bung
    const shapeBarrel = build(() => {
      const H = 0.62, RB = 0.44, g = R(), a = R() * Math.PI * 2;
      const rad = (y) => RB * (1 + 0.07 * Math.cos(Math.PI * y / (2 * H)));
      let p;
      if (g < 0.38) { const st = ((R() * 18) | 0) / 18 * Math.PI * 2, y = (R() * 2 - 1) * H; p = [Math.cos(st) * rad(y), y, Math.sin(st) * rad(y)]; }
      else if (g < 0.7) { const y = [-H, -H * 0.42, H * 0.42, H][(R() * 4) | 0]; const r = rad(y) * (y === H || y === -H ? 1 : 1.03); p = [Math.cos(a) * r, y, Math.sin(a) * r]; }
      else if (g < 0.86) { const r = RB * Math.sqrt(R()) * 0.96; p = [Math.cos(a) * r, H, Math.sin(a) * r]; }
      else if (g < 0.93) { const r = 0.07; p = [0.22 + Math.cos(a) * r, H + 0.02, Math.sin(a) * r]; }
      else { const y = (R() * 2 - 1) * H; p = [Math.cos(a) * rad(y), y, Math.sin(a) * rad(y)]; }
      return jit(p);
    });

    // 2. container ship: hull, stacked containers, bridge at the stern, wake on the water
    const SHIP_L = 1.0, HW = 0.24;
    const hullW = (x) => (x > 0.62 ? HW * Math.sqrt(Math.max(0, 1 - ((x - 0.62) / (SHIP_L - 0.62)) ** 2)) : HW);
    const CONT = [];
    for (let x = -0.52; x <= 0.6; x += 0.16) for (const z of [-0.13, 0, 0.13]) {
      const n = 1 + ((Math.sin(x * 9 + z * 20) * 0.5 + 0.5) * 2.6 | 0);
      for (let k = 0; k < n; k++) CONT.push([x, -0.12 + 0.065 + k * 0.13, z]);
    }
    const shapeShip = build(() => {
      const g = R();
      let p;
      if (g < 0.26) { const x = -SHIP_L + R() * 2 * SHIP_L, y = -0.38 + R() * 0.26; p = [x, y, (R() < 0.5 ? -1 : 1) * hullW(x)]; }
      else if (g < 0.32) { const x = -SHIP_L + R() * 2 * SHIP_L; p = [x, R() < 0.5 ? -0.12 : -0.38, (R() * 2 - 1) * hullW(x)]; }
      else if (g < 0.78) { const c = CONT[(R() * CONT.length) | 0]; p = R() < 0.7 ? edgeBox(c[0], c[1], c[2], 0.075, 0.06, 0.06) : [c[0] + (R() * 2 - 1) * 0.075, c[1] + (R() * 2 - 1) * 0.06, c[2] + (R() < 0.5 ? -0.06 : 0.06)]; }
      else if (g < 0.9) { p = R() < 0.6 ? edgeBox(-0.78, 0.12, 0, 0.1, 0.24, 0.2) : [-0.68, -0.12 + R() * 0.48, (R() * 2 - 1) * 0.2]; }
      else { const s = R(); p = [-SHIP_L - s * 0.7, -0.38, (R() * 2 - 1) * (0.12 + s * 0.35)]; }
      return jit(p, 0.005);
    });

    // 3. rising candlestick chart with a trend arrow and axes
    const CANDLES = [[-0.3, -0.1], [-0.15, 0.05], [0.0, -0.05], [-0.05, 0.2], [0.15, 0.32], [0.28, 0.2], [0.25, 0.48], [0.45, 0.62]];
    const shapeChart = build(() => {
      const g = R(), X0 = -0.85, DX = 1.7 / (CANDLES.length - 1);
      let p;
      if (g < 0.5) { const i = (R() * CANDLES.length) | 0, [o, c] = CANDLES[i], y0 = Math.min(o, c) - 0.2, y1 = Math.max(o, c) - 0.2;
        p = R() < 0.65 ? edgeBox(X0 + i * DX, (y0 + y1) / 2, 0, 0.055, Math.max(0.03, (y1 - y0) / 2), 0.055) : [X0 + i * DX + (R() * 2 - 1) * 0.055, y0 + R() * (y1 - y0), 0.055]; }
      else if (g < 0.62) { const i = (R() * CANDLES.length) | 0, [o, c] = CANDLES[i]; p = [X0 + i * DX, Math.min(o, c) - 0.32 + R() * (Math.abs(c - o) + 0.24), 0]; }
      else if (g < 0.8) { const s = R(); p = [-0.9 + s * 1.85, -0.45 + s * 1.15 + Math.sin(s * 9) * 0.06, 0.12]; }
      else if (g < 0.86) { let a = R(), b = R(); if (a + b > 1) { a = 1 - a; b = 1 - b; } p = [0.95 + a * 0.12 - b * 0.1, 0.7 + a * 0.1 + b * 0.12, 0.12]; }
      else { p = R() < 0.5 ? [-1.0, -0.65 + R() * 1.5, 0] : [-1.0 + R() * 2.05, -0.65, 0]; }
      return jit(p, 0.006);
    });

    // 4. oil drop (energy) with an inner highlight ring
    const shapeDrop = build(() => {
      const t = Math.acos(1 - 2 * R()), a = R() * Math.PI * 2;
      const y = 0.72 * Math.cos(t) - 0.08;
      const r = 0.5 * Math.sin(t) * Math.pow((1 - Math.cos(t)) / 2, 0.55) * 1.25;
      if (R() < 0.12) { const hr = 0.12; return jit([-0.16 + Math.cos(a) * hr * 0.6, -0.12 + Math.sin(a) * hr, 0.36], 0.004); }
      return jit([Math.cos(a) * r, y, Math.sin(a) * r], 0.006);
    });

    const blobs = [shapeBarrel, shapeShip, shapeChart, shapeDrop];
    const blobLive = new Float32Array(N * 3); blobLive.set(blobs[0]);

    const STAGES = [
      { shape: chart, op: 1, x: 0.2, y: 0.18, s: 0.8, flat: 0.45, warm: 1, rot: (t) => [0.32 + Math.sin(t * 0.3) * 0.03, -0.38 + Math.sin(t * 0.22) * 0.16] },
      { shape: cosmos, op: 1, x: 0, y: 0, s: 1, flat: 0.2, rot: (t) => [0, t * 0.015] },
      { shape: cosmos, op: 0.28, x: 0, y: 0, s: 1.25, flat: 0.2, rot: (t) => [0, t * 0.015] },
      { shape: ship, op: 1, x: 0, y: 0.02, s: 0.86, flat: 0.7, rot: (t) => [0.3 + Math.sin(t * 0.9) * 0.02, -0.32 + Math.sin(t * 0.3) * 0.16] },
      { shape: helix, op: 1, x: 0, y: -0.05, s: 0.78, flat: 0.55, rot: (t) => [0.08, t * 0.45] },
      { shape: dust, op: 0, x: 0, y: 0, s: 1.3, flat: 0.3, rot: (t) => [0, t * 0.01] },
      { shape: blobLive, op: 1, x: 0, y: 0.62, s: 0.56, flat: 0.35, rot: (t) => [0.14, -0.25 + Math.sin(t * 0.45) * 0.45] },   // gentle swing (not a full spin) so the chart always reads left-to-right
      { shape: dust, op: 0.22, x: 0, y: 0, s: 1.3, flat: 0.3, rot: (t) => [0, t * 0.01] }
    ];

    const cur = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) cur[i] = cosmos[i] * 1.6;
    const target = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(cur, 3); posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
    geo.setAttribute('aWarm', new THREE.BufferAttribute(aWarm, 1));
    const uniforms = { uWarm: { value: 0 }, uTime: { value: 0 }, uSize: { value: innerWidth < 760 ? 2.4 : 2.1 }, uPR: { value: renderer.getPixelRatio() }, uOpacity: { value: 0 }, uFlat: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aRand; attribute float aWarm; uniform float uTime,uSize,uPR,uFlat,uWarm; varying float vB; varying float vR; varying float vW;
        void main(){
          vec3 p = position + 0.012*vec3(sin(uTime*1.3+aRand*40.),cos(uTime*1.1+aRand*30.),sin(uTime*.9+aRand*20.));
          vec4 mv = modelViewMatrix*vec4(p,1.);
          gl_Position = projectionMatrix*mv;
          float d = -mv.z;
          gl_PointSize = uSize*uPR*(0.55+aRand*0.9)*(6.0/d);
          float b = smoothstep(-1.3,1.25,position.y);
          vB = mix(b, 0.72, uFlat) * clamp(1.25-(d-6.0)*0.09, 0.3, 1.25);
          vR = aRand;
          vW = aWarm * uWarm;
        }`,
      fragmentShader: `
        uniform float uOpacity,uTime; varying float vB; varying float vR; varying float vW;
        void main(){
          vec2 c = gl_PointCoord-0.5; float d = length(c); if(d>0.5) discard;
          float a = smoothstep(0.5,0.05,d);
          float b = mix(vB*(0.55+0.45*vR), 0.65+0.35*vR, vW*0.8);
          vec3 green = mix(vec3(0.04,0.30,0.08), vec3(0.62,1.0,0.45), b);
          vec3 gold = mix(vec3(0.45,0.2,0.02), vec3(1.0,0.82,0.38), b);
          vec3 col = mix(green, gold, vW);
          float tw = 0.78+0.22*sin(uTime*2.0+vR*60.0);
          gl_FragColor = vec4(col, a*uOpacity*(0.3+0.7*b)*tw);
        }`
    });
    group.add(new THREE.Points(geo, mat));

    // network lines over a subset of cosmos points
    const nodes = [];
    for (let i = 0; i < N && nodes.length < 240; i++) { const x = cosmos[i * 3], y = cosmos[i * 3 + 1], z = cosmos[i * 3 + 2]; if (Math.abs(x) < 5.5 && Math.abs(y) < 3 && z > -3.5) nodes.push(i); }
    const pairs = []; const deg = new Map();
    for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
      const i = nodes[a], j = nodes[b];
      const dx = cosmos[i * 3] - cosmos[j * 3], dy = cosmos[i * 3 + 1] - cosmos[j * 3 + 1], dz = cosmos[i * 3 + 2] - cosmos[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < 1.6 && (deg.get(i) || 0) < 3 && (deg.get(j) || 0) < 3) { pairs.push(i, j); deg.set(i, (deg.get(i) || 0) + 1); deg.set(j, (deg.get(j) || 0) + 1); }
    }
    const lpos = new Float32Array(pairs.length * 3);
    const lgeo = new THREE.BufferGeometry(); const lAttr = new THREE.BufferAttribute(lpos, 3); lAttr.setUsage(THREE.DynamicDrawUsage); lgeo.setAttribute('position', lAttr);
    const lmat = new THREE.LineBasicMaterial({ color: 0x5fe03a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    group.add(new THREE.LineSegments(lgeo, lmat));
    const npos = new Float32Array(nodes.length * 3);
    const ngeo = new THREE.BufferGeometry(); const nAttr = new THREE.BufferAttribute(npos, 3); nAttr.setUsage(THREE.DynamicDrawUsage); ngeo.setAttribute('position', nAttr);
    const nmat = new THREE.PointsMaterial({ color: 0xdfffd0, size: 0.05, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    group.add(new THREE.Points(ngeo, nmat));

    /* ================= stage from scroll ================= */
    let holds = [];
    const computeHolds = () => {
      const vh = root.clientHeight, max = maxScroll(), sc = getScroll(), top0 = root.getBoundingClientRect().top;
      holds = $$('[data-stage]').map((el) => {
        const id = '#' + el.id;
        if (id === '#hp-hero') return [0, 0];
        if (pins[id]) { const st = pins[id]; return [st.start + (st.end - st.start) * 0.12, st.end - (st.end - st.start) * 0.08]; }
        const top = el.getBoundingClientRect().top - top0 + sc, h = el.offsetHeight;
        const c = top + h / 2 - vh / 2, ex = Math.max(0, (h - vh) / 2) * 0.6;
        return [Math.min(max, Math.max(0, c - ex)), Math.min(max, Math.max(0, c + ex))];
      });
    };
    function stageAt(s) {
      if (s <= holds[0][1]) return 0;
      for (let k = 0; k < holds.length; k++) {
        if (s >= holds[k][0] && s <= holds[k][1]) return k;
        if (k < holds.length - 1 && s > holds[k][1] && s < holds[k + 1][0]) return k + sm((s - holds[k][1]) / (holds[k + 1][0] - holds[k][1]));
      }
      return holds.length - 1;
    }

    /* ================= render loop ================= */
    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });
    const introState = { v: 0 };
    this.playParticleIntro = () => gsap.to(introState, { v: 1, duration: 2.2, delay: 0.15, ease: 'none' });
    let last = performance.now(), blobClock = 0;
    const lerp = (a, b, t) => a + (b - a) * t;

    const frame = (now) => {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      this.checkActive();
      if (!this.active) return;

      // smooth wheel scrolling
      if (S.animating) {
        const d = S.target - root.scrollTop;
        if (Math.abs(d) < 0.5) { root.scrollTop = S.target; S.animating = false; }
        else root.scrollTop += d * (1 - Math.pow(1 - 0.12, dt * 60));
        ScrollTrigger.update();
      }

      const t = now / 1000; uniforms.uTime.value = t;
      const stage = holds.length ? stageAt(getScroll()) : 0;
      const k = Math.min(STAGES.length - 2, Math.floor(stage)), f = stage - k;
      const A = STAGES[k], B = STAGES[k + 1];

      if (stage > 5.2 && stage < 7) {
        blobClock += dt;
        const cyc = 3.6, idx = Math.floor(blobClock / cyc) % 4, p = (blobClock % cyc) / cyc;
        const m = sm(Math.min(1, Math.max(0, (p - 0.55) / 0.45)));
        const S0 = blobs[idx], S1 = blobs[(idx + 1) % 4];
        for (let i = 0; i < N; i++) {
          const fi = sm(Math.min(1, Math.max(0, m * 1.6 - rnd[i] * 0.6)));
          const b = Math.sin(fi * Math.PI) * 0.25;
          for (let c = 0; c < 3; c++) { const q = i * 3 + c; blobLive[q] = S0[q] + (S1[q] - S0[q]) * fi + rv[q] * b; }
        }
      }

      const SA = A.shape, SB = B.shape;
      if (SA === SB || f < 0.0005) target.set(f > 0.9995 ? SB : SA);
      else for (let i = 0; i < N; i++) {
        const fi = sm(Math.min(1, Math.max(0, f * 1.7 - rnd[i] * 0.7)));
        const burst = Math.sin(fi * Math.PI) * 0.9;
        for (let c = 0; c < 3; c++) { const q = i * 3 + c; target[q] = SA[q] + (SB[q] - SA[q]) * fi + rv[q] * burst; }
      }
      if (stage < 1 && (arrowDraw.v < 1 || barGrow[barGrow.length - 1] < 1)) {
        const floor = BASE + YS, tip = catmull(ARROW, arrowDraw.v), w = 1 - stage;
        for (let i = 0; i < N; i++) {
          const q = i * 3;
          if (barId[i] >= 0) { const g = barGrow[barId[i]] + (1 - barGrow[barId[i]]) * (1 - w); target[q + 1] = floor + (target[q + 1] - floor) * g; }
          else if (arrowS[i] >= 0 && arrowS[i] > arrowDraw.v) { target[q] += (tip[0] - target[q]) * w; target[q + 1] += (tip[1] + YS - target[q + 1]) * w; target[q + 2] += (AZ - target[q + 2]) * w; }
        }
      }
      const ease = 1 - Math.pow(1 - 0.11, dt * 60);
      for (let i = 0; i < N * 3; i++) cur[i] += (target[i] - cur[i]) * ease;
      posAttr.needsUpdate = true;

      const n = narrow(), fit = Math.min(1, (innerWidth / innerHeight) / 1.35);
      // phones: the chart sits below the hero text and is scaled to fit the screen width
      const mobChart = n && k === 0;
      const ox = n ? 0 : lerp(A.x, B.x, f), oy = lerp(mobChart ? -0.42 : A.y, B.y, f);
      const sc = lerp(mobChart ? Math.min(0.8, innerWidth / innerHeight * 0.74) : A.s, B.s, f) * (mobChart ? 1 : 0.55 + 0.45 * fit) * (k === 0 ? 1 + f * 0.6 : 1);      group.scale.setScalar(sc);
      mouse.sx += (mouse.x - mouse.sx) * 0.04; mouse.sy += (mouse.y - mouse.sy) * 0.04;
      group.position.set(ox + mouse.sx * 0.06, oy - mouse.sy * 0.04, 0);
      const ra = A.rot(t), rb = B.rot(t);
      group.rotation.x = lerp(ra[0], rb[0], f) + mouse.sy * 0.08;
      group.rotation.y = lerp(ra[1], rb[1], f) + mouse.sx * 0.12;
      uniforms.uOpacity.value = lerp(A.op, B.op, f) * introState.v;
      uniforms.uFlat.value = lerp(A.flat, B.flat, f);
      uniforms.uWarm.value = lerp(A.warm || 0, B.warm || 0, f);

      const lo = Math.max(0, 1 - Math.abs(stage - 1) * 1.5) * introState.v;
      lmat.opacity = lo * 0.22; nmat.opacity = lo * 0.9;
      if (lo > 0.01) {
        for (let p = 0; p < pairs.length; p++) { const i = pairs[p]; lpos[p * 3] = cur[i * 3]; lpos[p * 3 + 1] = cur[i * 3 + 1]; lpos[p * 3 + 2] = cur[i * 3 + 2]; }
        for (let p = 0; p < nodes.length; p++) { const i = nodes[p]; npos[p * 3] = cur[i * 3]; npos[p * 3 + 1] = cur[i * 3 + 1]; npos[p * 3 + 2] = cur[i * 3 + 2]; }
        lAttr.needsUpdate = true; nAttr.needsUpdate = true;
      }
      renderer.render(scene, camera);
    };

    /* ================= scroll choreography ================= */
    const heroWords = $$('#hp-hero .wi');
    gsap.set(heroWords, { yPercent: 115 });
    gsap.set($$('.hero-fade'), { opacity: 0, y: 16 });
    this.playTextIntro = () => {
      gsap.to(heroWords, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.07, delay: 0.35 });
      gsap.to($$('.hero-fade'), { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1, delay: 0.9 });
    };

    const heroTl = gsap.timeline({ scrollTrigger: { trigger: '#hp-hero', start: 'top top', end: '+=100%', scrub: true, pin: true, pinType: 'fixed', anticipatePin: 1, invalidateOnRefresh: true } });
    heroTl.to($('.hero-left'), { x: () => -innerWidth * 0.7, ease: 'power2.in' }, 0)
      .to($('.hero-right'), { x: () => innerWidth * 0.7, ease: 'power2.in' }, 0)
      .to($('.hero-desc'), { x: () => innerWidth * 0.5, opacity: 0, ease: 'power2.in' }, 0)
      .to($('.scroll-hint'), { opacity: 0, duration: 0.2 }, 0)
      .to($('#hp-bgHero'), { opacity: 0, ease: 'none' }, 0.1);
    pins['#hp-hero'] = heroTl.scrollTrigger;

    gsap.fromTo('#hp-beam', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#hp-know', start: 'top 85%', end: 'top 10%', scrub: true } });
    gsap.fromTo('#hp-splash', { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '#hp-know', start: 'top 30%', end: 'top -5%', scrub: true } });
    const scrubWords = (el, trigger, start, end) => {
      if (!el || !el._w) return;
      gsap.fromTo(el._w, { opacity: 0.08, filter: 'blur(8px)', y: 10 }, { opacity: 1, filter: 'blur(0px)', y: 0, stagger: 0.08, ease: 'none', scrollTrigger: { trigger, start, end, scrub: true } });
    };
    scrubWords($('#hp-know h2'), '#hp-know', 'top 55%', 'top -10%');
    gsap.from([$('.know-btn'), $('.know-side')], { opacity: 0, y: 20, duration: 1, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '#hp-know', start: 'top -5%', once: true } });
    gsap.to($$('#hp-know .sticky > *:not(.floor)'), { opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hp-know', start: 'bottom 95%', end: 'bottom 40%', scrub: true } });

    const card = $('#hp-scanCard');
    gsap.fromTo(card, { scale: 0.86, opacity: 0 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '#hp-scan', start: 'top 90%', end: 'top 20%', scrub: true } });
    gsap.to(card, { opacity: 0, scale: 0.94, ease: 'none', scrollTrigger: { trigger: '#hp-scan', start: 'bottom 110%', end: 'bottom 70%', scrub: true } });
    const bpaths = card.querySelectorAll('.brackets path');
    bpaths.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    let typeTimer = null;
    const today = new Date();
    const ds = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    const typeOut = () => {
      clearInterval(typeTimer);
      const a = $('#hp-typeA'), b = $('#hp-typeB');
      const s1 = ds + '  ·  MV OLEOVISTA  ·  ICE TRADE CAPTURED', s2 = `CARGO CHECK: ${DRUMS.length} OIL DRUMS · POSITION & P&L UPDATED`; let i = 0;
      a.textContent = ''; b.textContent = '';
      typeTimer = setInterval(() => {
        i++;
        if (i <= s1.length) a.innerHTML = s1.slice(0, i).replace(/&/g, '&amp;') + '<span class="caret"></span>';
        else if (i <= s1.length + s2.length) { a.textContent = s1; b.innerHTML = s2.slice(0, i - s1.length).replace(/&/g, '&amp;') + '<span class="caret"></span>'; }
        else clearInterval(typeTimer);
      }, 45);
      const o = { v: 0 };
      gsap.to(o, { v: 99.8, duration: 2.4, delay: 0.6, ease: 'power2.out', onUpdate() { $('#hp-conf').textContent = o.v.toFixed(1); $('#hp-confBar').style.width = o.v + '%'; } });
    };
    ScrollTrigger.create({ trigger: '#hp-scan', start: 'top 15%', end: 'bottom 60%',
      onEnter: () => { card.classList.add('scan-on'); gsap.to(bpaths, { strokeDashoffset: 0, duration: 1, stagger: 0.08, ease: 'power3.out' }); typeOut(); },
      onEnterBack: () => card.classList.add('scan-on'),
      onLeaveBack: () => { card.classList.remove('scan-on'); bpaths.forEach((p) => { p.style.strokeDashoffset = p.style.strokeDasharray; }); }
    });

    const ring = $('#hp-ring');
    const hcards = [...ring.children];
    const step = 360 / hcards.length;
    const ringState = { rot: 50 };
    const applyRing = () => {
      const Rr = getComputedStyle(ring).getPropertyValue('--R').trim() || '470px';
      hcards.forEach((c, i) => {
        const a = i * step + ringState.rot;
        const cos = Math.cos(a * Math.PI / 180);
        c.style.transform = `rotateY(${a}deg) translateZ(${Rr}) translateY(${(i % 2 ? 46 : -34)}px)`;
        c.style.opacity = (0.12 + 0.88 * Math.pow(Math.max(0, cos), 1.6)).toFixed(3);
      });
    };
    applyRing();
    const solTl = gsap.timeline({ scrollTrigger: { trigger: '#hp-solutions', start: 'top top', end: '+=360%', scrub: 0.6, pin: true, pinType: 'fixed', anticipatePin: 1 } });
    solTl.fromTo($('.sol-title'), { opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.12 }, 0)
      .to($('.sol-title'), { opacity: 0, y: -40, filter: 'blur(8px)', duration: 0.1 }, 0.2)
      .fromTo(ring, { opacity: 0, scale: 0.75, rotateX: 14 }, { opacity: 1, scale: 1, rotateX: -6, duration: 0.15 }, 0.2)
      .to(ringState, { rot: 50 - 360 + step, ease: 'none', duration: 0.68, onUpdate: applyRing }, 0.28)
      .to(ring, { opacity: 0, scale: 0.85, duration: 0.06 }, 0.95);
    pins['#hp-solutions'] = solTl.scrollTrigger;

    const aboutH = $('#hp-about h2');
    gsap.from(aboutH._w, { yPercent: 115, duration: 1.2, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: aboutH, start: 'top 82%', once: true } });
    $$('.fade-up').forEach((el) => gsap.from(el, { opacity: 0, y: 24, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
    $$('.card').forEach((c, i) => gsap.from(c, { opacity: 0, y: 60, scale: 0.96, duration: 1.1, ease: 'expo.out', delay: (i % 3) * 0.08,
      scrollTrigger: { trigger: c, start: 'top 92%', once: true } }));

    const contactH = $('#hp-contact h2');
    gsap.from(contactH._w, { yPercent: 115, duration: 1.2, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '#hp-contact', start: 'top 30%', once: true } });
    const copyBtn = $('#hp-copyMail');
    copyBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const label = copyBtn.querySelector('.lbl-txt');
      const done = () => { label.textContent = 'Email copied'; setTimeout(() => { label.textContent = 'Copy email'; }, 1800); };
      try { navigator.clipboard.writeText(CONTACT_EMAIL).then(done, done); } catch (_) { done(); }
    });

    scrubWords($('#hp-footer h2'), '#hp-footer', 'top 85%', 'top 25%');

    /* ================= resize / boot ================= */
    ScrollTrigger.addEventListener('refresh', computeHolds);
    addEventListener('resize', () => {
      renderer.setSize(innerWidth, innerHeight, false);
      camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
      applyRing();
    });
    this.refresh = () => { ScrollTrigger.refresh(); computeHolds(); };
    this.refresh();
    requestAnimationFrame(frame);
  }

  /* -------------------------------------------------------------- */
  // Home is "active" when its view layer is shown and the loading screen is gone
  checkActive() {
    const on = this.root.classList.contains('active') && document.body.classList.contains('loaded');
    if (on === this.active) return;
    this.active = on;
    document.body.classList.toggle('home-p', on);
    if (on) {
      // Home always scrolls on its own: undo the phone "strip" mode if another script added it
      this.root.classList.remove('m-strip');
      this.root.style.transform = '';
      document.body.classList.remove('m-strip-on');
      this.scrollToY(0, true);
      requestAnimationFrame(() => this.refresh());
      if (!this.started) {
        this.started = true;
        this.playTextIntro();
        this.playChartIntro();
        this.playParticleIntro();
      }
    }
  }
}