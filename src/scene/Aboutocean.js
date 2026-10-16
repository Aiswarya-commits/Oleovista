import * as THREE from 'three';

/*
  Aboutocean.js  (self-contained: sea + tanker + About camera, no other files needed)
  ------------------------------------------------------------------------------------
  Runs ONLY on the About Us view (#about-view). Home, Services and Contact keep
  the normal mountain exactly as before.

  Scroll progress (cameraRig progress 0..1):
    0.00 - 0.04  hero: your mountain view, held still (no orbit)
    0.04 - 0.17  camera dives down through the mist to the sea
    0.17 - 1.00  camera floats above a tanker sailing on the open sea

  CHANGES IN THIS VERSION
    1. Sea, fog, mist and vignette are now DARK GREEN (jade theme).
    2. The tanker is rebuilt as a real ship: lofted hull with a pointed, flared bow,
       red/black paint, bulwark, pipe rack, tank hatches, cranes, 5-storey white
       accommodation block with windows, funnel, mast, lifeboats and navigation lights.
*/

// Which views get the sea journey: 'home' (#home-view) and/or 'about' (#about-view)
const ENABLED_VIEWS = ['about'];   // About Us only - Home keeps its normal mountain

const SEA_Y = -900;          // the sea lies far below the mountain
const SHIP_SPEED = 9;        // how fast the water flows past the ship
const DIVE_START = 0.04;
const DIVE_END = 0.17;
const MIST = new THREE.Color('#cfe3d8');      // was blue-grey, now a soft green-white mist

// [progress, camera height, ship angle on screen (deg), ship screen x, ship screen y]
// screen x / y go from -1 (left / bottom) to 1 (right / top); angle 0 = bow points right
const KEYS = [
  [0.17, 240, -50, -0.75, -0.85],   // ship enters from the lower-left corner
  [0.28, 220, -50, -0.55, -0.55],
  [0.40, 165, -46, -0.30, -0.35],   // close, diagonal
  [0.55, 215, -14, -0.08, 0.05],    // turning level
  [0.68, 235, -8, 0.00, 0.05],
  [0.82, 250, -3, -0.05, 0.08],
  [1.00, 285, 0, -0.05, 0.10]       // level, sailing to the right
];
const SEA_FOG = new THREE.Color('#031d14');   // dark green sea air

// sea colours per Light preset (About uses the jade theme) - DARK GREEN
const SEA_COLORS = {
  about:    { deep: '#021a10', shallow: '#0b4a30' },
  greenery: { deep: '#03180f', shallow: '#0f4d2f' },
  day:      { deep: '#06182c', shallow: '#1a4466' },
  sunset:   { deep: '#1f1a28', shallow: '#7a5060' },
  night:    { deep: '#030a14', shallow: '#123150' }
};

// ship paint - change these hex numbers to restyle the ship
const SHIP_COL = {
  hullBottom: 0x8e1f1a,   // red anti-fouling paint (under the water line)
  hullTop: 0x1c2430,      // dark navy topside
  deck: 0x6f3a2c,         // main deck
  house: 0xeae6dd,        // white accommodation block
  bulwark: 0x6d7a80       // deck-edge wall
};

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

function keyAt(t) {
  t = Math.min(Math.max(t, KEYS[0][0]), KEYS[KEYS.length - 1][0]);
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const k = ease(clamp01((t - a[0]) / (b[0] - a[0])));
  return a.map((v, j) => lerp(v, b[j], k));
}

const NOISE_GLSL = `
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;

/* ------------------------------------------------------------------ */
/* Sea                                                                 */
/* ------------------------------------------------------------------ */
function makeSea(atmosphere) {
  const uniforms = {
    uTime: { value: 0 },
    uFlow: { value: 0 },
    uDeep: { value: new THREE.Color(SEA_COLORS.about.deep) },
    uShallow: { value: new THREE.Color(SEA_COLORS.about.shallow) },
    uSkyTop: atmosphere.uniforms.uTopColor,
    uSkyBottom: atmosphere.uniforms.uBottomColor,
    uSunColor: atmosphere.uniforms.uSunColor,
    uSunPos: atmosphere.uniforms.uSunPos,
    uFogColor: { value: new THREE.Color() },
    uFogDensity: { value: 0.0015 }
  };
  const geo = new THREE.PlaneGeometry(3200, 3200, 160, 160);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uTime, uFlow;
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec2 q = wp.xz + vec2(uFlow, 0.0);
        wp.y += sin(q.x * 0.045 + uTime * 0.9) * 0.6 + sin(q.y * 0.06 - uTime * 1.1) * 0.45;
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uTime, uFlow, uFogDensity;
      uniform vec3 uDeep, uShallow, uSkyTop, uSkyBottom, uSunColor, uSunPos, uFogColor;
      varying vec3 vWorld;
      ${NOISE_GLSL}
      float waves(vec2 p) {
        return fbm(p * 0.09 + vec2(uTime * 0.05, uTime * 0.03))
             + 0.45 * fbm(p * 0.35 - vec2(uTime * 0.11, -uTime * 0.07))
             + 0.15 * noise(p * 1.2 + uTime * 0.3);
      }
      void main() {
        vec2 p = vWorld.xz + vec2(uFlow, 0.0);       // water drifts past the ship
        float e = 0.6;
        float h = waves(p), hx = waves(p + vec2(e, 0.0)), hz = waves(p + vec2(0.0, e));
        float dist = length(cameraPosition - vWorld);
        float k = 2.2 / (1.0 + dist * 0.0012);
        vec3 N = normalize(vec3(-(hx - h) / e * k, 1.0, -(hz - h) / e * k));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);

        vec3 R = reflect(-V, N);
        vec3 sky = mix(uSkyBottom, uSkyTop, clamp(R.y * 1.5 + 0.15, 0.0, 1.0));
        vec3 L = normalize(uSunPos);

        vec3 body = mix(uDeep, uShallow, smoothstep(0.45, 1.15, h));
        body *= 0.85 + 0.4 * smoothstep(0.94, 1.0, dot(N, normalize(vec3(-0.35, 1.0, -0.25))));
        vec3 col = mix(body, sky, fres * 0.8);
        col += uSunColor * pow(max(dot(N, normalize(L + V)), 0.0), 180.0) * 1.2;

        float fg = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
        col = mix(col, uFogColor, clamp(fg, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = SEA_Y;
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, uniforms };
}

/* ------------------------------------------------------------------ */
/* Tanker  (bow points to +X, main deck at y = 3, water line at y = 0) */
/* ------------------------------------------------------------------ */
const SHIP_L0 = -62, SHIP_L1 = 62.5, DECK = 3;
const uOf = (x) => (x - SHIP_L0) / (SHIP_L1 - SHIP_L0);

// half-width of the ship at position u (0 = stern, 1 = bow tip)
function halfBeam(u) {
  const stern = smooth(0, 0.16, u);                 // stern narrows a little
  const tb = clamp01((u - 0.72) / 0.28);            // bow narrows to a point
  return 10 * (0.7 + 0.3 * stern) * Math.pow(Math.max(0, 1 - tb * tb), 0.75);
}
const deckAt = (u) => DECK + 1.4 * smooth(0.82, 1, u);                                   // bow sheer: deck rises at the bow
const bottomAt = (u) => -4.5 + 3.4 * smooth(0.84, 1, u) + 1.8 * (1 - smooth(0, 0.12, u)); // keel line

// Real hull: cross-sections lofted from stern to bow
function buildHull() {
  const ST = 64;
  const pos = [], col = [], idx = [];
  const cB = new THREE.Color(SHIP_COL.hullBottom).multiplyScalar(0.7);
  const cT = new THREE.Color(SHIP_COL.hullTop).multiplyScalar(0.9);
  const cD = new THREE.Color(SHIP_COL.deck).multiplyScalar(0.7);
  const cW = new THREE.Color(SHIP_COL.bulwark).multiplyScalar(0.7);
  const push = (x, y, z, c) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); return pos.length / 3 - 1; };

  // one full cross-section (left deck edge -> keel -> right deck edge)
  const section = (u) => {
    const w = halfBeam(u), top = deckAt(u), bot = bottomAt(u);
    const dw = -bot;                                   // depth from keel up to the water line
    const flare = 0.32 * smooth(0.55, 1, u);           // bow flares outwards going up
    const lv = [                                       // [width factor, height, 0 = red paint / 1 = dark paint]
      [0.0, bot, 0], [0.5, bot, 0], [0.8, bot + 0.1 * dw, 0], [0.95, bot + 0.35 * dw, 0],
      [1.0, bot + 0.7 * dw, 0], [1.0, 0.0, 0],
      [1.0, 0.3, 1], [1.0, 0.3 + (top - 0.3) * 0.5, 1], [1.0, top, 1]
    ];
    const side = lv.map(([xf, y, c]) => ({ x: xf * w * (1 - flare * (top - y) / (top - bot)), y, c }));
    const ring = [];
    for (let j = side.length - 1; j >= 1; j--) ring.push({ z: -side[j].x, y: side[j].y, c: side[j].c });
    ring.push({ z: 0, y: side[0].y, c: 0 });
    for (let j = 1; j < side.length; j++) ring.push({ z: side[j].x, y: side[j].y, c: side[j].c });
    return ring;
  };

  // 1. hull skin
  let R = 0;
  for (let i = 0; i <= ST; i++) {
    const u = i / ST, X = lerp(SHIP_L0, SHIP_L1, u);
    const ring = section(u);
    R = ring.length;
    ring.forEach((p) => push(X, p.y, p.z, p.c ? cT : cB));
  }
  for (let i = 0; i < ST; i++) {
    for (let r = 0; r < R - 1; r++) {
      const a = i * R + r, b = a + 1, c = a + R, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  // 2. stern wall (transom)
  const ring0 = section(0);
  const base = pos.length / 3;
  ring0.forEach((p) => push(SHIP_L0, p.y, p.z, p.c ? cT : cB));
  const centre = push(SHIP_L0, (bottomAt(0) + deckAt(0)) / 2, 0, cT);
  for (let r = 0; r < R - 1; r++) idx.push(centre, base + r, base + r + 1);

  // 3. main deck
  const deckBase = pos.length / 3;
  for (let i = 0; i <= ST; i++) {
    const u = i / ST, X = lerp(SHIP_L0, SHIP_L1, u), w = halfBeam(u), y = deckAt(u) + 0.01;
    push(X, y, -w, cD); push(X, y, w, cD);
  }
  for (let i = 0; i < ST; i++) {
    const a = deckBase + i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  // 4. bulwark (low wall around the deck edge)
  [-1, 1].forEach((s) => {
    const wb = pos.length / 3;
    for (let i = 0; i <= ST; i++) {
      const u = i / ST, X = lerp(SHIP_L0, SHIP_L1, u), w = halfBeam(u), y = deckAt(u);
      push(X, y, s * w, cW); push(X, y + 0.9, s * w, cW);
    }
    for (let i = 0; i < ST; i++) {
      const a = wb + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function makeTanker() {
  const ship = new THREE.Group();
  const cache = {};
  const std = (c, r = 0.8, m = 0.08) => {
    const k = `${c}_${r}_${m}`;
    return cache[k] || (cache[k] = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(0.7), roughness: r, metalness: m }));
  };
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0c1a24, roughness: 0.2, metalness: 0.6,
    emissive: new THREE.Color(0x1d4a55), emissiveIntensity: 0.6
  });
  const put = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); ship.add(m); return m; };
  const box = (w, h, d, x, y, z, c, r) => put(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? std(c, r) : c, x, y, z);
  const cyl = (rt, rb, h, x, y, z, c, axis = 'y', seg = 14) => {
    const m = put(new THREE.CylinderGeometry(rt, rb, h, seg), std(c, 0.7, 0.15), x, y, z);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    return m;
  };
  const lamp = (x, y, z, c, r = 0.35) =>
    put(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color: c }), x, y, z);
  const fy = (x) => deckAt(uOf(x));       // deck height at any x (rises at the bow)
  const D = DECK;

  // ---- hull ----
  ship.add(new THREE.Mesh(buildHull(), new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.7, metalness: 0.12, side: THREE.DoubleSide
  })));

  // ---- cargo tanks: 8 deck sections with hatches and cross pipes ----
  for (let i = 0; i < 8; i++) {
    const x = -39 + i * 10;
    box(9.7, 0.14, 17, x, D + 0.07, 0, i % 2 ? 0x8b3a2e : 0x7d3327);          // deck panel
    box(0.3, 0.2, 17.2, x + 5, D + 0.12, 0, 0x4a2a22);                        // tank dividing line
    [-4.8, 4.8].forEach((z) => {
      cyl(1.2, 1.3, 0.5, x, D + 0.4, z, 0xb7aa98, 'y', 18);                   // tank hatch
      cyl(0.55, 0.55, 0.3, x, D + 0.8, z, 0x8a7d6c, 'y', 12);                 // hatch lid
    });
    cyl(0.22, 0.22, 15, x, D + 0.95, 0, 0xa9886f, 'z', 8);                    // cross pipe
  }

  // ---- main pipe rack down the centre with a catwalk on top ----
  [-0.8, 0.8].forEach((z) => cyl(0.38, 0.38, 82, -4.5, D + 1.5, z, 0xb9a48f, 'x', 10));
  for (let x = -42; x <= 34; x += 8) box(0.4, 1.5, 2.2, x, D + 0.75, 0, 0x6e5b4d);   // pipe supports
  box(82, 0.1, 1.6, -4.5, D + 2.3, 0, 0x8d8f8a);                                    // catwalk
  [-0.85, 0.85].forEach((z) => box(82, 0.08, 0.08, -4.5, D + 3.0, z, 0xc9c9c0));    // catwalk rails

  // ---- manifold amidships with two hose cranes ----
  box(3.5, 1.0, 17.5, 5, D + 0.5, 0, 0x9a7a6e);
  [-1, 1].forEach((s) => {
    cyl(0.3, 0.42, 5, 5, D + 2.5, s * 8.4, 0xcfa23a, 'y', 10);                // crane post
    box(0.35, 0.35, 6, 5, D + 5.2, s * 5.4, 0xcfa23a);                        // crane boom
    cyl(0.04, 0.04, 2.2, 5, D + 4.1, s * 2.6, 0x222222, 'y', 4);              // hook line
  });

  // ---- bollards along the sides ----
  [-30, -10, 10, 30].forEach((x) => [-1, 1].forEach((s) => cyl(0.35, 0.45, 0.9, x, D + 0.45, s * 9.2, 0x2a2f33, 'y', 8)));

  // ---- bow: windlass, anchor winches, store house, foremast ----
  cyl(0.9, 0.9, 3.6, 52, fy(52) + 0.9, 0, 0x555f58, 'z', 14);                 // windlass
  [-1, 1].forEach((s) => {
    cyl(0.8, 0.8, 1.2, 51, fy(51) + 0.8, s * 2.8, 0x4a524c, 'z', 12);         // anchor winch drums
    box(0.8, 0.5, 0.6, 56, fy(56) + 0.25, s * 2.2, 0x2a2f33);                 // hawse pipes
    cyl(0.32, 0.4, 0.9, 54, fy(54) + 0.45, s * 4.0, 0x2a2f33, 'y', 8);        // bow bollards
  });
  box(4, 1.8, 6, 42, fy(42) + 0.9, 0, 0xd2cdc3, 0.7);                         // forecastle store
  cyl(0.22, 0.32, 8, 46, fy(46) + 4, 0, 0xdedad0, 'y', 8);                    // foremast
  box(0.2, 0.2, 4.5, 46, fy(46) + 7.2, 0, 0xdedad0);                          // mast yard
  lamp(46, fy(46) + 8.2, 0, 0xffffff, 0.3);                                   // foremast light
  cyl(0.08, 0.08, 3, 59, fy(59) + 1.5, 0, 0xdedad0, 'y', 6);                  // jack staff
  lamp(59, fy(59) + 3.1, 0, 0xffffff, 0.22);

  // ---- accommodation block at the stern (5 storeys) ----
  // [centre x, width (length of ship), height, depth (across the ship)]
  const tiers = [[-53, 13, 3.2, 14], [-53.5, 12, 3.2, 13.6], [-54, 11, 3.2, 13.2], [-54.5, 9, 3.0, 12.8]];
  let y = D;
  tiers.forEach(([cx, w, h, d]) => {
    box(w, h, d, cx, y + h / 2, 0, SHIP_COL.house, 0.65);
    box(0.15, 0.9, d - 1.5, cx + w / 2 + 0.04, y + h * 0.55, 0, glass);                         // front windows
    [-1, 1].forEach((s) => box(w - 2, 0.9, 0.15, cx, y + h * 0.55, s * (d / 2 + 0.04), glass)); // side windows
    box(w + 0.4, 0.15, d + 0.4, cx, y + h + 0.07, 0, 0xb9b4aa);                                  // storey roof edge
    y += h;
  });
  // wheelhouse (bridge) with wings
  const bx = -52.2;
  box(5.5, 3, 18, bx, y + 1.5, 0, SHIP_COL.house, 0.65);
  box(0.15, 1.2, 17, bx + 2.79, y + 1.8, 0, glass);
  [-1, 1].forEach((s) => box(4.5, 1.2, 0.15, bx, y + 1.8, s * 9.04, glass));
  box(6, 0.2, 18.4, bx, y + 3.1, 0, 0xcfcac0);
  lamp(bx, y + 2.2, -9.2, 0xff2a2a);     // port (red) light
  lamp(bx, y + 2.2, 9.2, 0x2aff6a);      // starboard (green) light
  // mast, yard and radars
  cyl(0.2, 0.3, 8, -53.6, y + 7.1, 0, 0xdedad0, 'y', 8);
  box(0.2, 0.2, 6, -53.6, y + 8.6, 0, 0xdedad0);
  lamp(-53.6, y + 11.3, 0, 0xffffff, 0.3);
  [-1, 1].forEach((s) => box(0.5, 0.15, 2.6, -55.2, y + 3.9, s * 3, 0x9fb0b4));
  // funnel
  cyl(1.8, 2.2, 5, -57.2, D + 12.6 + 2.5, 0, 0xb3332b, 'y', 20);
  cyl(1.85, 1.85, 1.2, -57.2, D + 12.6 + 5.6, 0, 0x14181c, 'y', 20);
  // lifeboats on davits
  [-1, 1].forEach((s) => {
    cyl(1.0, 1.0, 6.5, -53, D + 5.0, s * 7.9, 0xe36f2a, 'x', 14);
    [-55.2, -50.8].forEach((x) => box(0.3, 2.4, 0.3, x, D + 4.2, s * 7.9, 0x8a8f90));
  });

  // contact shadow on the water
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(132, 26),
    new THREE.MeshBasicMaterial({ color: 0x000814, transparent: true, opacity: 0.35, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(3, 0.4, 3);
  ship.add(shadow);

  // foam wake (particles, in ship space) - now follows the real hull shape
  const N = 4200;
  const seeds = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    seeds[i * 3] = Math.random();
    seeds[i * 3 + 1] = Math.random();
    seeds[i * 3 + 2] = i < N * 0.6 ? 0 : i < N * 0.88 ? 1 : 2;   // 0 stern trail, 1 bow V, 2 hull foam
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  wg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  const wakeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uScale: { value: 500 } },
    vertexShader: `
      attribute vec3 aSeed;
      uniform float uTime, uScale;
      varying float vA;
      float hb(float x) {                       // half-width of the hull at x (same as the JS hull)
        float u = (x + 62.0) / 124.5;
        float st = smoothstep(0.0, 0.16, u);
        float tb = clamp((u - 0.72) / 0.28, 0.0, 1.0);
        return 10.0 * (0.7 + 0.3 * st) * pow(max(0.0, 1.0 - tb * tb), 0.75);
      }
      void main() {
        float t = fract(aSeed.x + uTime * (aSeed.z == 0.0 ? 0.09 : 0.13));
        vec3 p; float size;
        if (aSeed.z == 0.0) {
          float spread = 3.5 + t * 26.0;
          p = vec3(-63.0 - t * 170.0, 1.2, (aSeed.y - 0.5) * spread + sin(t * 20.0 + aSeed.y * 9.0) * 1.5 * t);
          size = 5.0 + t * 11.0; vA = pow(1.0 - t, 1.6) * (0.08 + 0.12 * fract(aSeed.y * 13.0));
        } else if (aSeed.z == 1.0) {
          float x = 60.0 - t * 190.0;
          float side = aSeed.y < 0.5 ? -1.0 : 1.0;
          p = vec3(x, 1.1, side * (max(hb(x) + 0.8, 1.0 + t * 44.0) + fract(aSeed.y * 7.0) * 2.0));
          size = 4.5 + t * 8.0; vA = pow(1.0 - t, 2.0) * 0.07;
        } else {
          float x = mix(-60.0, 60.0, aSeed.x); float side = aSeed.y < 0.5 ? -1.0 : 1.0;
          p = vec3(x, 1.1, side * (hb(x) + 0.5 + fract(aSeed.y * 11.0 + uTime * 0.5) * 1.8));
          size = 3.2; vA = 0.10 + 0.06 * sin(uTime * 3.0 + aSeed.x * 40.0);
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = size * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(0.95, 0.97, 1.0, smoothstep(0.5, 0.1, d) * vA); }`
  });
  const wake = new THREE.Points(wg, wakeMat);
  wake.frustumCulled = false;
  wake.renderOrder = 3;
  ship.add(wake);

  ship.position.set(0, SEA_Y, 0);
  ship.visible = false;
  return { group: ship, wakeMat };
}

/* ------------------------------------------------------------------ */
/* About-page controller                                              */
/* ------------------------------------------------------------------ */
export class AboutOcean {
  constructor({ scene, camera, cameraRig, terrain, forest, water, atmosphere }) {
    Object.assign(this, { scene, camera, cameraRig, terrain, forest, water, atmosphere });
    this.active = false;
    this.current = 'mountain';
    this.preset = null;
    this.baseFogDensity = scene.fog.density;

    this.sea = makeSea(atmosphere);
    scene.add(this.sea.mesh);
    this.tanker = makeTanker();
    scene.add(this.tanker.group);

    // Sky dome follows the camera only during the About sea part (uFollow = 0 keeps today's sky)
    const sky = atmosphere.skyMesh;
    this.skyFollow = { value: 0 };
    this.skyHome = sky.position.clone();
    sky.material.uniforms.uFollow = this.skyFollow;
    sky.material.fragmentShader = 'uniform float uFollow;\n' + sky.material.fragmentShader.replace(
      'normalize(vWorldPos)', 'normalize(mix(vWorldPos, vWorldPos - cameraPosition, uFollow))'
    );
    sky.material.needsUpdate = true;
    sky.frustumCulled = false;

    this._p0 = new THREE.Vector3();
    this._t0 = new THREE.Vector3();
    this._p1 = new THREE.Vector3();
    this._t1 = new THREE.Vector3();
    this._up1 = new THREE.Vector3();
    this._r = new THREE.Vector3();
    this._q0 = new THREE.Quaternion();
    this._q1 = new THREE.Quaternion();
    this._m = new THREE.Matrix4();
    this._frame = 0;

    // soft dark-green vignette over the sea; sits under the content cards
    this.vignette = document.createElement('div');
    this.vignette.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;' +
      'background:radial-gradient(ellipse at 50% 45%,rgba(4,32,22,0) 35%,rgba(3,24,16,.55) 75%,rgba(2,16,10,.85) 100%)';
    document.body.appendChild(this.vignette);
  }

  isAboutOpen() {
    const on = (id) => !!document.getElementById(id)?.classList.contains('active');
    return (ENABLED_VIEWS.includes('home') && on('home-view')) ||
           (ENABLED_VIEWS.includes('about') && on('about-view'));
  }

  // sea colour follows the current look: About (jade) or a Light preset picked in the dropdown
  syncColors() {
    if (this._frame++ % 15) return;
    const pill = document.getElementById('light-current')?.textContent || '';
    let p = 'about';
    if (!/sapphire|jade|greenery/i.test(pill)) {
      const item = document.querySelector('#dropdown-light .dropdown-item.active');
      p = item?.dataset.time || 'about';
    }
    if (p === this.preset) return;
    this.preset = p;
    const c = SEA_COLORS[p] || SEA_COLORS.about;
    this.sea.uniforms.uDeep.value.set(c.deep);
    this.sea.uniforms.uShallow.value.set(c.shallow);
  }

  aerialPose(t, outPos, outTarget, outUp) {
    const [, H, angDeg, sx, sy] = keyAt(t);
    const a = THREE.MathUtils.degToRad(angDeg);
    this._r.set(Math.cos(a), 0, Math.sin(a));          // screen-right on the water
    outUp.set(Math.sin(a), 0, -Math.cos(a));           // screen-up on the water
    const halfH = H * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const halfW = halfH * this.camera.aspect;
    outTarget.copy(this.tanker.group.position)
      .addScaledVector(this._r, -sx * halfW)
      .addScaledVector(outUp, -sy * halfH);
    outTarget.y = SEA_Y + 2;
    outPos.copy(outTarget).addScaledVector(outUp, -H * 0.05);  // almost straight down, tiny tilt so the hull reads in 3D
    outPos.y = SEA_Y + H;
  }

  setVisibility(showMtn, showSea) {
    if (this.terrain.mesh) this.terrain.mesh.visible = showMtn;
    if (this.forest?.instancedMesh) this.forest.instancedMesh.visible = showMtn;
    if (this.water?.mesh) this.water.mesh.visible = showMtn;
    if (this.atmosphere.cloudParticles) this.atmosphere.cloudParticles.visible = showMtn;
    if (this.atmosphere.snowDust) this.atmosphere.snowDust.visible = showMtn;
    this.sea.mesh.visible = showSea;
    this.tanker.group.visible = showSea;
  }

  exit() {
    this.active = false;
    this.current = 'mountain';
    this.setVisibility(true, false);
    this.scene.fog.density = this.baseFogDensity;   // Atmosphere eases the fog colour back by itself
    this.skyFollow.value = 0;
    this.vignette.style.opacity = '0';
    this.atmosphere.skyMesh.position.copy(this.skyHome);
    this.camera.up.set(0, 1, 0);
  }

  /* call every frame, just before renderer.render(). Errors switch it off, never the page. */
  update(dt, elapsed) {
    if (this.disabled) return;
    try {
      this._update(dt, elapsed);
    } catch (err) {
      console.error('[AboutOcean] turned off after an error:', err);
      this.disabled = true;
      try { this.exit(); } catch (e) { /* ignore */ }
    }
  }

  _update(dt, elapsed) {
    const open = this.isAboutOpen() && this.cameraRig.mode !== 'orbit';
    if (!open) { if (this.active) this.exit(); return; }
    this.active = true;
    this.syncColors();

    const t = this.cameraRig.getProgress();
    const cam = this.camera;

    // 1. About hero = start of the mountain path, held still
    this.cameraRig.cameraCurve.getPointAt(0, this._p0);
    this.cameraRig.targetCurve.getPointAt(0, this._t0);

    // 2. aerial pose over the tanker
    this.aerialPose(Math.max(t, DIVE_END), this._p1, this._t1, this._up1);

    const d = ease(smooth(DIVE_START, DIVE_END, t));
    if (d <= 0) {
      cam.up.set(0, 1, 0);
      cam.position.copy(this._p0);
      cam.lookAt(this._t0);
    } else if (d >= 1) {
      cam.position.copy(this._p1);
      cam.up.copy(this._up1);
      cam.lookAt(this._t1);
    } else {
      cam.position.set(
        lerp(this._p0.x, this._p1.x, d),
        lerp(this._p0.y, this._p1.y, Math.pow(d, 0.8)),
        lerp(this._p0.z, this._p1.z, d)
      );
      this._m.lookAt(this._p0, this._t0, Y_AXIS);
      this._q0.setFromRotationMatrix(this._m);
      this._m.lookAt(this._p1, this._t1, this._up1);
      this._q1.setFromRotationMatrix(this._m);
      cam.quaternion.slerpQuaternions(this._q0, this._q1, d);
    }
    cam.up.set(0, 1, 0);

    // same gentle mouse parallax as the mountain
    const m = this.cameraRig.mouse;
    const par = d >= 1 ? 0.6 : 1.0 - d * 0.4;
    cam.translateX(m.x * 1.5 * par);
    cam.translateY(m.y * 2.0 * par);

    // 3. what is visible
    const showSea = t > DIVE_START - 0.01;
    this.setVisibility(t < DIVE_END + 0.03, showSea);
    this.current = t > DIVE_START + 0.04 ? 'ocean' : 'mountain';

    // 4. fog: mountain haze -> green mist in the dive -> dark green sea air
    const fog = this.scene.fog;
    const b = smooth(DIVE_START, DIVE_END + 0.02, t);
    if (b > 0) {
      if (b < 0.5) {
        fog.color.lerp(MIST, b * 2);
        fog.density = lerp(this.baseFogDensity, 0.003, b * 2);
      } else {
        fog.color.lerpColors(MIST, SEA_FOG, (b - 0.5) * 2);
        fog.density = lerp(0.003, 0.0012, (b - 0.5) * 2);
      }
    } else {
      fog.density = this.baseFogDensity;
    }
    this.sea.uniforms.uFogColor.value.copy(fog.color);
    this.sea.uniforms.uFogDensity.value = fog.density;

    // 5. sky follows the camera once we leave the mountain
    this.vignette.style.opacity = d.toFixed(3);
    const f = smooth(0, 0.3, d);
    this.skyFollow.value = f;
    this.atmosphere.skyMesh.position.lerpVectors(this.skyHome, cam.position, f);

    // 6. animate the sea and the ship
    if (showSea) {
      const u = this.sea.uniforms;
      u.uTime.value = elapsed;
      u.uFlow.value = elapsed * SHIP_SPEED;
      // keep the sea under the camera
      this.sea.mesh.position.x = Math.round(cam.position.x / 20) * 20;
      this.sea.mesh.position.z = Math.round(cam.position.z / 20) * 20;

      const g = this.tanker.group;
      g.position.y = SEA_Y + Math.sin(elapsed * 0.9) * 0.15;
      g.rotation.x = Math.sin(elapsed * 0.7) * 0.006;
      this.tanker.wakeMat.uniforms.uTime.value = elapsed;
      this.tanker.wakeMat.uniforms.uScale.value =
        (window.innerHeight * Math.min(window.devicePixelRatio, 2)) / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    }
  }
}