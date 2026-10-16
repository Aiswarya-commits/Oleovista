import * as THREE from 'three';

/*
  Careersglobe.js  (self-contained: Earth globe + Careers camera, no other files or images needed)
  -----------------------------------------------------------------------------------------------
  Runs ONLY on the Careers view (#careers-view has class "active").

  Scroll progress (cameraRig progress 0..1):
    0.00 - 0.04  hero: your mountain (Sunset theme set by UIManager), held still
    0.04 - 0.18  the camera tips down and sinks through the dusk haze, fades through deep blue,
                 and comes out in space in front of the Earth
    0.18 - 1.00  the Earth sits on the RIGHT side of the screen (about half of it visible) so the
                 content on the left stays readable. It turns with your scrolling and is wrapped
                 in a dashed network of trade routes between cities.

  The continents are drawn at runtime from public-domain Natural Earth coastlines (embedded at the
  bottom of this file), so no texture files are needed.
*/

const GLOBE_Y = -4200;               // the space scene sits far below the mountain
const R = 100;                       // Earth radius (world units)
const DIVE_START = 0.04;
const DIVE_END = 0.18;
const BG = new THREE.Color('#01040b');
const DUSK = new THREE.Color('#150c19');
const ARC_COLOR = new THREE.Color('#d6ecff');
const GLOW_COLOR = new THREE.Color('#22d36f');   // halo around the globe (was blue #2f86ff)
const NODE_COLOR = new THREE.Color('#9fd4ff');
const SUN_DIR = new THREE.Vector3(-0.62, 0.38, 0.69).normalize();   // light from the upper-left front
const TURN = Math.PI * 2 * 1.1;     // how far the globe turns over the whole scroll
const FOCUS_LON = 72;                // this longitude faces you at FOCUS_T (India / Arabian Sea)
const FOCUS_T = 0.52;
const SPACE_FOV = 30;                // camera lens while looking at the globe

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ------------------------------------------------------------------ */
/* Cities and routes                                                   */
/* ------------------------------------------------------------------ */
const CITIES = {
  kochi: [9.93, 76.27], mumbai: [19.07, 72.88], chennai: [13.08, 80.27], delhi: [28.6, 77.2],
  dubai: [25.2, 55.27], fujairah: [25.12, 56.33], doha: [25.29, 51.53], riyadh: [24.7, 46.7],
  singapore: [1.35, 103.8], hongkong: [22.32, 114.17], shanghai: [31.23, 121.47], tokyo: [35.69, 139.69],
  busan: [35.1, 129.04], jakarta: [-6.2, 106.85], sydney: [-33.87, 151.2], perth: [-31.95, 115.86],
  london: [51.5, -0.12], rotterdam: [51.92, 4.48], geneva: [46.2, 6.14], athens: [37.98, 23.73],
  istanbul: [41.0, 28.98], lagos: [6.52, 3.38], capetown: [-33.92, 18.42], mombasa: [-4.04, 39.67],
  houston: [29.76, -95.37], newyork: [40.7, -74.0], panama: [8.98, -79.5], saopaulo: [-23.55, -46.63],
  losangeles: [34.05, -118.24], calgary: [51.05, -114.07]
};
const HUBS = ['kochi', 'mumbai', 'dubai', 'singapore', 'london', 'houston'];
const ROUTES = [
  ['kochi', 'dubai'], ['kochi', 'singapore'], ['kochi', 'london'], ['kochi', 'mombasa'], ['kochi', 'perth'],
  ['mumbai', 'fujairah'], ['mumbai', 'rotterdam'], ['mumbai', 'hongkong'], ['mumbai', 'capetown'], ['mumbai', 'delhi'],
  ['chennai', 'jakarta'], ['delhi', 'geneva'], ['dubai', 'london'], ['dubai', 'riyadh'], ['dubai', 'lagos'],
  ['dubai', 'istanbul'], ['doha', 'tokyo'], ['fujairah', 'singapore'], ['singapore', 'shanghai'], ['singapore', 'sydney'],
  ['singapore', 'busan'], ['hongkong', 'tokyo'], ['london', 'newyork'], ['london', 'houston'], ['rotterdam', 'lagos'],
  ['geneva', 'athens'], ['athens', 'istanbul'], ['houston', 'panama'], ['houston', 'saopaulo'], ['newyork', 'calgary'],
  ['losangeles', 'tokyo'], ['losangeles', 'houston'], ['capetown', 'saopaulo'], ['lagos', 'saopaulo'], ['perth', 'jakarta'],
  ['shanghai', 'losangeles']
];

// latitude/longitude -> point on a sphere, matching THREE.SphereGeometry's texture mapping
function latLon(lat, lon, r, out = new THREE.Vector3()) {
  const phi = THREE.MathUtils.degToRad(lon + 180);
  const theta = THREE.MathUtils.degToRad(90 - lat);
  return out.set(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
}

/* ------------------------------------------------------------------ */
/* Procedural noise (for land colour variety and clouds)              */
/* ------------------------------------------------------------------ */
function hash3(x, y, z) {
  let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi;
  xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf); zf = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), xf), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), xf), yf),
    l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), xf), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), xf), yf),
    zf
  );
}
function fbm(x, y, z, oct) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += vnoise(x * f, y * f, z * f) * a; n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
// noise sampled over the sphere (seamless) into an equirectangular grid
function sphereNoise(w, h, freq, oct, seed) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const th = (y + 0.5) / h * Math.PI;
    const st = Math.sin(th), ct = Math.cos(th);
    for (let x = 0; x < w; x++) {
      const ph = (x + 0.5) / w * Math.PI * 2;
      out[y * w + x] = fbm(Math.cos(ph) * st * freq + seed, ct * freq + seed * 0.7, Math.sin(ph) * st * freq - seed, oct);
    }
  }
  return out;
}
function sampleGrid(g, w, h, u, v) {
  const x = u * w - 0.5, y = v * h - 0.5;
  const x0 = Math.floor(x), y0 = Math.max(0, Math.min(h - 1, Math.floor(y)));
  const y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = Math.max(0, Math.min(1, y - y0));
  const xa = ((x0 % w) + w) % w, xb = (xa + 1) % w;
  const a = g[y0 * w + xa] + (g[y0 * w + xb] - g[y0 * w + xa]) * fx;
  const b = g[y1 * w + xa] + (g[y1 * w + xb] - g[y1 * w + xa]) * fx;
  return a + (b - a) * fy;
}

/* ------------------------------------------------------------------ */
/* Earth textures (built once, the first time Careers opens)          */
/* ------------------------------------------------------------------ */
function drawLand(ctx, W, H) {
  ctx.fillStyle = '#fff';
  for (const ring of LAND) {
    const v = ring.split(',').map(Number);
    let lon = 0, lat = 0, prevX = null;
    const pts = [];
    for (let i = 0; i < v.length; i += 2) {
      lon += v[i]; lat += v[i + 1];
      let x = (lon / 5 + 180) / 360 * W;
      const y = (90 - lat / 5) / 180 * H;
      if (prevX !== null) {                         // keep rings continuous across the date line
        while (x - prevX > W / 2) x -= W;
        while (prevX - x > W / 2) x += W;
      }
      prevX = x;
      pts.push(x, y);
    }
    // a ring that wraps all the way round (Antarctica) is closed along the bottom edge
    const span = pts[pts.length - 2] - pts[0];
    for (const off of [-W, 0, W]) {
      ctx.beginPath();
      ctx.moveTo(pts[0] + off, pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] + off, pts[i + 1]);
      if (Math.abs(span) > W / 2) {
        ctx.lineTo(pts[pts.length - 2] + off, H + 2);
        ctx.lineTo(pts[0] + off, H + 2);
      }
      ctx.closePath();
      ctx.fill('evenodd');
    }
  }
}

function makeEarthTexture() {
  const W = 2048, H = 1024;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // crisp land mask
  const mask = mk(W, H);
  const mctx = mask.getContext('2d');
  mctx.fillStyle = '#000'; mctx.fillRect(0, 0, W, H);
  drawLand(mctx, W, H);

  // soft mask (for shallow water around coasts) by down- then up-scaling
  const s1 = mk(512, 256), s2 = mk(128, 64), blur = mk(W, H);
  s1.getContext('2d').drawImage(mask, 0, 0, 512, 256);
  s2.getContext('2d').drawImage(s1, 0, 0, 128, 64);
  const bctx = blur.getContext('2d');
  bctx.imageSmoothingEnabled = true;
  bctx.drawImage(s2, 0, 0, W, H);

  const m = mctx.getImageData(0, 0, W, H).data;
  const b = bctx.getImageData(0, 0, W, H).data;

  const NW = 512, NH = 256;
  const nBig = sphereNoise(NW, NH, 2.2, 4, 3.1);
  const nFine = sphereNoise(NW, NH, 7.0, 3, 9.7);

  const out = mk(W, H);
  const octx = out.getContext('2d');
  const img = octx.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    const lat = 90 - v * 180, al = Math.abs(lat);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const u = (x + 0.5) / W;
      const lon = u * 360 - 180;
      const land = m[i] / 255, coast = b[i] / 255;
      const n = sampleGrid(nBig, NW, NH, u, v);
      const f = sampleGrid(nFine, NW, NH, u, v);

      // ocean: deep navy with lighter shallows near coasts
      const deep = clamp01(n * 0.9);
      let r = lerp(3, 9, deep), g = lerp(16, 40, deep), bl = lerp(44, 96, deep);
      const sh = smooth(0.04, 0.55, coast) * 0.75;
      r = lerp(r, 34, sh); g = lerp(g, 104, sh); bl = lerp(bl, 156, sh);

      // land: forest / grass, deserts round the tropics, tundra and ice towards the poles
      let lr = lerp(30, 66, f), lg = lerp(58, 92, f), lb = lerp(30, 46, f);
      const det = land > 0 ? vnoise(x * 0.045, y * 0.045, 1.7) * 0.6 + vnoise(x * 0.16, y * 0.16, 4.2) * 0.4 : 0.5;   // fine relief
      const desert = clamp01((1 - Math.abs(al - 24) / 19) * 1.2 - 0.3 + (n - 0.5) * 2.6 + (det - 0.5) * 0.5);
      lr = lerp(lr, lerp(140, 182, f), desert); lg = lerp(lg, lerp(108, 146, f), desert); lb = lerp(lb, lerp(66, 96, f), desert);
      const tundra = smooth(52, 68, al);
      lr = lerp(lr, 104, tundra * 0.7); lg = lerp(lg, 100, tundra * 0.7); lb = lerp(lb, 88, tundra * 0.7);
      const greenland = lat > 59 && lon > -75 && lon < -11 ? 1 : 0;
      const ice = Math.max(smooth(-60, -66, lat), smooth(74, 80, lat), greenland * smooth(59, 66, lat));
      lr = lerp(lr, 214 + f * 30, ice); lg = lerp(lg, 226 + f * 24, ice); lb = lerp(lb, 238 + f * 16, ice);
      const shade = (0.58 + f * 0.2 + det * 0.24) * (1 - ice * 0.2);                // relief-like variation
      lr *= shade; lg *= shade; lb *= shade;

      d[i] = lerp(r, lr, land);
      d[i + 1] = lerp(g, lg, land);
      d[i + 2] = lerp(bl, lb, land);
      d[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.anisotropy = 4;
  return tex;
}

function makeCloudTexture() {
  const W = 1024, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const n = sphereNoise(W, H, 5.5, 5, 21.3);
  for (let y = 0; y < H; y++) {
    const lat = 90 - (y + 0.5) / H * 180;
    const band = 0.75 + 0.25 * Math.cos(THREE.MathUtils.degToRad(lat) * 3.0);   // more cloud in storm belts
    for (let x = 0; x < W; x++) {
      const k = y * W + x, i = k * 4;
      const a = smooth(0.57, 0.76, n[k] * band + 0.05) * 255;
      d4(img.data, i, a);
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}
function d4(d, i, a) { d[i] = a; d[i + 1] = a; d[i + 2] = a; d[i + 3] = 255; }

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */
const WORLD_VERT = `
  varying vec2 vUv; varying vec3 vW; varying vec3 vN;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

function earthMat(map, shared) {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uSun: { value: SUN_DIR }, uFade: shared.uFade },
    vertexShader: WORLD_VERT,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uSun; uniform float uFade;
      varying vec2 vUv; varying vec3 vW; varying vec3 vN;
      void main() {
        vec3 col = texture2D(uMap, vUv).rgb;
        vec3 n = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        float nl = dot(n, uSun);
        float lit = 0.14 + 1.0 * smoothstep(-0.25, 0.75, nl);
        float ocean = smoothstep(0.04, 0.16, col.b - col.r);
        vec3 H = normalize(uSun + V);
        float spec = pow(max(dot(n, H), 0.0), 90.0) * 0.22 * ocean * step(0.0, nl);
        vec3 c = col * lit;
        c = mix(c, c * vec3(0.78, 0.9, 1.25), 0.45);            // cinematic blue grade
        c += vec3(0.55, 0.75, 1.0) * spec;
        float fres = pow(1.0 - max(dot(n, V), 0.0), 2.6);
        c += vec3(0.16, 0.92, 0.46) * fres * (0.35 + 0.9 * smoothstep(-0.4, 0.6, nl));
        gl_FragColor = vec4(c * uFade, 1.0);
      }`
  });
}

function cloudMat(map, shared) {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uSun: { value: SUN_DIR }, uFade: shared.uFade },
    transparent: true, depthWrite: false,
    vertexShader: WORLD_VERT,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uSun; uniform float uFade;
      varying vec2 vUv; varying vec3 vW; varying vec3 vN;
      void main() {
        float a = texture2D(uMap, vUv).r;
        vec3 n = normalize(vN);
        float lit = 0.12 + smoothstep(-0.2, 0.7, dot(n, uSun));
        gl_FragColor = vec4(vec3(0.82, 0.9, 1.0) * lit, a * 0.42 * uFade);
      }`
  });
}

function glowMat(shared, center) {
  return new THREE.ShaderMaterial({
    uniforms: { uCenter: { value: center }, uR: { value: R }, uColor: { value: GLOW_COLOR }, uFade: shared.uFade },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform vec3 uCenter, uColor; uniform float uR, uFade; varying vec3 vW;
      void main() {
        vec3 dir = normalize(vW - cameraPosition);
        vec3 oc = uCenter - cameraPosition;
        float b = length(oc - dir * dot(oc, dir));          // closest distance of the view ray to the centre
        float x = (b - uR) / uR;
        float g = x < 0.0 ? 0.0 : exp(-x * 16.0) * 1.15 + exp(-x * 4.5) * 0.28;
        gl_FragColor = vec4(uColor * g * uFade, 1.0);
      }`
  });
}

/* ------------------------------------------------------------------ */
/* Network: dashed arcs, travelling packets, glowing city nodes        */
/* ------------------------------------------------------------------ */
function buildNetwork(shared) {
  const group = new THREE.Group();
  const arcs = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  ROUTES.forEach(([from, to], idx) => {
    latLon(CITIES[from][0], CITIES[from][1], 1, a);
    latLon(CITIES[to][0], CITIES[to][1], 1, b);
    const ang = a.angleTo(b);
    const lift = 0.035 + 0.3 * (ang / Math.PI);
    const pts = [];
    const qa = new THREE.Quaternion(), axis = new THREE.Vector3().crossVectors(a, b).normalize();
    for (let i = 0; i <= 48; i++) {
      const s = i / 48;
      qa.setFromAxisAngle(axis, ang * s);
      const p = a.clone().applyQuaternion(qa);
      p.multiplyScalar(R * (1.004 + lift * Math.sin(Math.PI * s)));
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const len = curve.getLength();
    const u = {
      uTime: shared.uTime, uFade: shared.uFade, uColor: { value: ARC_COLOR },
      uDraw: { value: 0 }, uPhase: { value: Math.random() }, uLen: { value: len }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime, uFade, uDraw, uPhase, uLen; uniform vec3 uColor; varying vec2 vUv;
        void main() {
          float s = vUv.x;
          if (s > uDraw) discard;
          float dash = step(0.42, fract(s * uLen / 3.4 - uTime * 0.55 + uPhase));
          float ends = smoothstep(0.0, 0.05, s) * smoothstep(1.0, 0.95, s);
          float head = exp(-abs(uDraw - s) * 60.0) * 1.6 * step(uDraw, 0.995);
          float a = (dash * 0.8 + head) * max(ends, head) * uFade;
          gl_FragColor = vec4(uColor * (1.0 + head), a);
        }`
    });
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, 0.34, 4, false), mat);
    group.add(mesh);
    arcs.push({ curve, u, delay: (idx % 12) / 12 * 0.5, speed: 0.06 + Math.random() * 0.07, phase: Math.random() });
  });

  // packets travelling along the arcs
  const pPos = new Float32Array(arcs.length * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const dotFrag = `
    uniform vec3 uColor; uniform float uFade; varying float vA;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float core = smoothstep(1.0, 0.0, d);
      gl_FragColor = vec4(uColor * (0.6 + core), pow(core, 1.6) * uFade * vA);
    }`;
  const packets = new THREE.Points(pGeo, new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#ffffff') }, uFade: shared.uFade, uSize: { value: 15 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uSize; varying float vA; void main(){ vA = 1.0; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = uSize * (300.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: dotFrag
  }));
  packets.frustumCulled = false;
  group.add(packets);

  // city nodes (hubs are bigger)
  const names = Object.keys(CITIES);
  const nPos = new Float32Array(names.length * 3), nSize = new Float32Array(names.length), nPhase = new Float32Array(names.length);
  const tmp = new THREE.Vector3();
  names.forEach((k, i) => {
    latLon(CITIES[k][0], CITIES[k][1], R * 1.006, tmp);
    nPos.set([tmp.x, tmp.y, tmp.z], i * 3);
    nSize[i] = HUBS.includes(k) ? 26 : 14;
    nPhase[i] = Math.random() * 6.28;
  });
  const nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  nGeo.setAttribute('aSize', new THREE.BufferAttribute(nSize, 1));
  nGeo.setAttribute('aPhase', new THREE.BufferAttribute(nPhase, 1));
  const nodes = new THREE.Points(nGeo, new THREE.ShaderMaterial({
    uniforms: { uColor: { value: NODE_COLOR }, uFade: shared.uFade, uTime: shared.uTime },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSize; attribute float aPhase; uniform float uTime; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 nView = normalize(normalMatrix * normalize(position));
        vA = smoothstep(-0.05, 0.25, dot(nView, normalize(-mv.xyz)));   // hide nodes on the far side
        gl_PointSize = aSize * (0.8 + 0.25 * sin(uTime * 2.2 + aPhase)) * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: dotFrag
  }));
  nodes.frustumCulled = false;
  group.add(nodes);

  return { group, arcs, packets, pPos };
}

function buildStars() {
  const N = 2600, pos = new Float32Array(N * 3), size = new Float32Array(N), ph = new Float32Array(N);
  const v = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const zz = Math.random() * 2 - 1, aa = Math.random() * Math.PI * 2, rr = Math.sqrt(1 - zz * zz);
    v.set(rr * Math.cos(aa), zz, rr * Math.sin(aa)).multiplyScalar(900 + Math.random() * 500);
    pos.set([v.x, v.y, v.z], i * 3);
    size[i] = Math.random() < 0.08 ? 3.0 + Math.random() * 1.8 : 1.2 + Math.random() * 1.5;
    ph[i] = Math.random() * 6.28;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  return new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio || 1, 2) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSize; attribute float aPhase; uniform float uTime, uPR; varying float vT;
      void main() {
        vT = 0.65 + 0.35 * sin(uTime * 1.3 + aPhase);
        gl_PointSize = aSize * uPR;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uFade; varying float vT;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        gl_FragColor = vec4(vec3(0.78, 0.86, 1.0), smoothstep(1.0, 0.1, d) * vT * uFade);
      }`
  }));
}

/* ------------------------------------------------------------------ */
/* Careers-page controller                                             */
/* ------------------------------------------------------------------ */
export class CareersGlobe {
  constructor({ scene, camera, cameraRig, terrain, forest, water, atmosphere }) {
    Object.assign(this, { scene, camera, cameraRig, terrain, forest, water, atmosphere });
    this.active = false;
    this.built = false;
    this.current = 'mountain';
    this.shared = { uTime: { value: 0 }, uFade: { value: 0 } };
    this.prevBg = scene.background;
    this.baseFogDensity = 0.0018;
    this.center = new THREE.Vector3(0, GLOBE_Y, 0);

    // deep-blue veil the camera passes through between the mountain and space
    this.veil = document.createElement('div');
    this.veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;' +
      'background:radial-gradient(ellipse at 65% 50%,#0b2a1a 0%,#03120b 55%,#01040b 100%);';
    document.body.appendChild(this.veil);

    // soft shade on the left so the text stays readable over space
    this.shade = document.createElement('div');
    this.shade.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;' +
      'background:linear-gradient(90deg,rgba(1,4,11,0.82) 0%,rgba(1,4,11,0.55) 34%,rgba(1,4,11,0) 62%);' +
      'transition:opacity 0.5s ease;';
    document.body.appendChild(this.shade);

    this._p = new THREE.Vector3();
    this._l = new THREE.Vector3();
  }

  // the globe is built the first time Careers opens, so other pages never pay for it
  build() {
    this.world = new THREE.Group();
    this.world.position.copy(this.center);
    this.world.visible = false;

    this.tilt = new THREE.Group();
    this.tilt.rotation.set(0.32, 0, -0.24);               // north pole tipped towards you a little
    this.spin = new THREE.Group();
    this.tilt.add(this.spin);
    this.world.add(this.tilt);

    const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64), earthMat(makeEarthTexture(), this.shared));
    this.spin.add(earth);

    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 96, 48), cloudMat(makeCloudTexture(), this.shared));
    this.spin.add(this.clouds);

    this.net = buildNetwork(this.shared);
    this.spin.add(this.net.group);

    const glow = new THREE.Mesh(new THREE.SphereGeometry(R * 1.45, 64, 32), glowMat(this.shared, this.center));
    glow.renderOrder = 2;
    this.world.add(glow);

    this.stars = buildStars();
    this.world.add(this.stars);

    this.scene.add(this.world);

    // spin that puts FOCUS_LON towards the viewer
    this.focusRot = -THREE.MathUtils.degToRad(FOCUS_LON + 90);
    this.built = true;
  }

  isOpen() {
    return !!document.getElementById('careers-view')?.classList.contains('active');
  }

  setMountain(visible) {
    if (this.terrain?.mesh) this.terrain.mesh.visible = visible;
    if (this.forest?.instancedMesh) this.forest.instancedMesh.visible = visible;
    if (this.forest?.mesh) this.forest.mesh.visible = visible;
    if (this.water?.mesh) this.water.mesh.visible = visible;
    if (this.atmosphere?.skyMesh) this.atmosphere.skyMesh.visible = visible;
    if (this.atmosphere?.cloudParticles) this.atmosphere.cloudParticles.visible = visible;
    if (this.atmosphere?.snowDust) this.atmosphere.snowDust.visible = visible;
  }

  exit() {
    this.active = false;
    this.setMountain(true);
    if (this.world) this.world.visible = false;
    this.veil.style.opacity = '0';
    this.shade.style.opacity = '0';
    this.scene.background = this.prevBg;
    if (this.scene.fog) {
      this.scene.fog.density = this.baseFogDensity;
      if (this.atmosphere?.targetFogColor) this.scene.fog.color.copy(this.atmosphere.targetFogColor);
    }
    this.current = 'mountain';
    this.camera.up.set(0, 1, 0);
    this.restoreFov();
  }

  restoreFov() {
    if (this.baseFov !== undefined) {
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
      this.baseFov = undefined;
    }
  }

  update(dt, elapsed) {
    try {
      this._update(dt, elapsed);
    } catch (err) {
      console.error('[CareersGlobe] update error:', err);
      if (!this.built) this.broken = true;     // could not build: stay on the mountain, never retry
      this.active = false;
      try { this.exit(); } catch (e) { /* ignore */ }
    }
  }

  _update(dt, elapsed) {
    const open = this.isOpen() && this.cameraRig.mode !== 'orbit' && !this.broken;
    if (!open) {
      if (this.active) this.exit();
      return;
    }
    if (!this.built) this.build();
    this.active = true;

    const t = this.cameraRig.getProgress();
    const cam = this.camera;
    const d = clamp01((t - DIVE_START) / (DIVE_END - DIVE_START));
    const inSpace = d >= 0.5;

    if (!inSpace) {
      // on the mountain: hero vista, then tip down and sink into the dusk haze
      const k = ease(d * 2);
      this.restoreFov();
      this.cameraRig.cameraCurve.getPointAt(0, this._p);
      this.cameraRig.targetCurve.getPointAt(0, this._l);
      this._p.y -= k * 45;
      this._l.y -= k * 150;
      cam.up.set(0, 1, 0);
      cam.position.copy(this._p);
      cam.lookAt(this._l);
    } else {
      // in space: Earth on the right, about half of it in view
      const k = ease((d - 0.5) * 2);                       // 0 = just arrived, 1 = settled
      // a narrower lens while in space keeps the off-centre globe round (restored on exit)
      if (this.baseFov === undefined) this.baseFov = cam.fov;
      const fov = lerp(this.baseFov, SPACE_FOV, k);
      if (Math.abs(cam.fov - fov) > 1e-3) { cam.fov = fov; cam.updateProjectionMatrix(); }
      const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const portrait = cam.aspect < 0.9;
      const fill = portrait ? 0.6 : 0.84;                  // globe radius as part of half the screen height
      const D = R / (tanH * fill);
      const halfH = D * tanH, halfW = halfH * cam.aspect;
      const cx = portrait ? 0.6 : 0.76;                   // where the globe centre sits (screen units)
      const cy = portrait ? -0.5 : 0.0;
      const dist = lerp(R * 1.32, D, k);
      const X = lerp(0, cx * halfW, k), Y = lerp(0, cy * halfH, k);
      const drift = Math.sin(t * Math.PI * 2) * 10;        // slow vertical sway as you scroll
      this._p.set(-X, -Y + drift, dist).add(this.center);
      this._l.set(-X, -Y + drift * 0.3, 0).add(this.center);
      cam.up.set(0, 1, 0);
      cam.position.copy(this._p);
      cam.lookAt(this._l);

      // the globe turns with your scrolling (plus a slow idle turn)
      this.spin.rotation.y = this.focusRot + (t - FOCUS_T) * TURN + elapsed * 0.01 + (1 - k) * 0.9;
      this.clouds.rotation.y = elapsed * 0.006;
      this.stars.rotation.y = t * 0.25;
    }
    const m = this.cameraRig.mouse;
    cam.translateX(m.x * 1.5);
    cam.translateY(m.y * 2.0);

    // dark-blue veil: rises while sinking, clears as the Earth appears
    const veil = d < 0.5 ? smooth(0.18, 0.5, d) : 1 - smooth(0.5, 0.8, d);
    this.veil.style.opacity = (d > 0 && d < 1 ? veil : 0).toFixed(3);

    this.setMountain(!inSpace);
    this.world.visible = inSpace;
    this.current = inSpace ? 'globe' : 'mountain';
    this.shade.style.opacity = inSpace ? '1' : '0';

    if (inSpace) {
      this.scene.background = BG;
      if (this.scene.fog) { this.scene.fog.color.copy(BG); this.scene.fog.density = 0; }
      const fade = smooth(0.5, 0.85, d);
      this.shared.uFade.value = fade;
      this.shared.uTime.value = elapsed;
      this.stars.material.uniforms.uFade.value = fade;
      this.stars.material.uniforms.uTime.value = elapsed;

      // routes draw themselves in as you arrive, then packets keep flowing
      const reveal = smooth(0.55, 1.0, d) * 0.6 + smooth(DIVE_END, 0.32, t) * 0.4;
      const tmp = this._l;
      this.net.arcs.forEach((a, i) => {
        a.u.uDraw.value = clamp01((reveal - a.delay * 0.6) / 0.45);
        const s = (elapsed * a.speed + a.phase) % 1;
        a.curve.getPointAt(Math.min(s, a.u.uDraw.value), tmp);
        this.net.pPos[i * 3] = tmp.x; this.net.pPos[i * 3 + 1] = tmp.y; this.net.pPos[i * 3 + 2] = tmp.z;
      });
      this.net.packets.geometry.attributes.position.needsUpdate = true;
    } else {
      this.scene.background = this.prevBg;
      if (this.scene.fog) {
        const k = smooth(0, 0.5, d);
        this.scene.fog.density = lerp(this.baseFogDensity, 0.011, k);
        if (this.atmosphere?.targetFogColor) {
          this.scene.fog.color.copy(this.atmosphere.targetFogColor).lerp(DUSK, k);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Land outlines: Natural Earth 1:110m (public domain), 0.2° steps,    */
/* delta-encoded "dLon,dLat" pairs (x5). Drawn into the Earth texture. */
/* ------------------------------------------------------------------ */
const LAND = [
  '-298,-400,-1,-3,-2,-2,-10,1,-11,-1,-7,2,-2,2,11,0,11,-1,3,2,3,2,5,-2',
  '-796,-397,-10,-1,-6,2,-3,1,0,1,-4,1,3,2,10,-1,5,-1,4,-2,1,-2',
  '-226,-390,6,-2,3,-3,0,-3,0,-2,-7,-2,-9,-1,-9,-1,-10,-1,-12,0,-7,2,1,2,11,1,4,2,3,2,2,2,3,2,4,2,2,0,8,1,7,-1',
  '-606,-368,6,0,6,1,-2,-2,-5,-1,-7,0,-5,2,1,1,6,-1',
  '-628,-367,8,-2,-3,0,-7,0,-6,2,3,1,5,-1',
  '-495,-360,6,0,5,0,3,-3,-4,1,-6,0,-6,0,-7,-1,-5,1,-3,3,3,0,7,0,7,-1',
  '-342,-355,0,-2,-1,-2,-1,-2,-6,-1,-5,-1,-7,1,3,2,-6,-1,-6,-1,-4,2,0,2,5,2,4,0,6,0,1,3,0,1,0,4,3,3,5,1,2,-2,2,-2,2,-2,1,-3,2,-2',
  '-900,-424,5,3,9,-1,2,0,1,1,2,0,1,1,0,-1,1,0,7,-2,6,2,2,1,14,1,5,-2,2,0,8,-2,14,-1,11,-2,20,-1,14,2,21,-1,12,-2,14,1,13,2,2,2,-20,0,-16,2,-5,1,-13,2,1,2,2,2,2,2,-1,2,-9,1,-3,2,-8,1,12,0,12,1,7,-2,9,2,8,2,4,1,-2,2,-6,2,-8,1,-10,1,-9,0,-10,1,-3,2,-6,1,-4,2,-2,6,3,-1,4,-2,8,1,8,1,4,-2,8,0,7,1,6,1,6,2,7,1,0,1,-1,2,1,2,6,1,3,-2,8,1,6,2,7,0,7,0,6,1,6,1,6,1,4,0,3,0,8,0,6,0,7,0,7,0,7,0,7,-1,7,1,7,0,8,-1,6,1,6,1,6,1,6,-1,6,1,5,1,4,-1,1,-2,4,-2,5,2,6,-2,6,-1,6,-1,7,0,7,1,7,0,7,-1,7,-1,2,3,-3,1,-2,2,-7,0,-3,2,-1,2,-1,4,3,-1,7,0,6,0,6,-1,5,-1,3,-2,6,0,7,1,7,1,6,0,5,-1,7,0,4,4,4,-2,6,-1,6,1,4,-2,7,-1,6,0,6,-1,4,2,2,1,5,-2,6,1,5,-1,4,-2,7,1,5,1,5,1,6,1,7,0,6,1,5,1,3,2,1,2,0,2,-2,2,-2,2,-1,2,-1,1,-1,2,1,2,2,2,2,2,1,2,-1,2,-1,2,3,3,2,1,4,2,3,2,4,1,2,2,3,2,3,1,5,0,3,2,3,1,5,0,3,1,3,2,4,1,3,-2,-2,-1,-5,-2,-2,-1,-4,1,-4,-1,-3,-1,-4,-1,-3,-1,0,-2,0,-2,2,-2,-3,-1,-5,-1,-2,-1,-3,-2,-4,-2,0,-2,1,-2,3,-1,4,-2,4,-1,2,-2,1,-2,2,-2,2,-2,1,-1,1,-5,2,-2,0,-2,2,-2,-1,-2,-3,-3,-3,-1,-6,-1,-3,-2,-3,-1,-7,-2,-7,-1,-6,-1,-7,-1,-4,-2,-8,0,-9,0,-8,-1,-8,0,1,-2,8,0,6,-2,3,-2,-6,-1,-8,0,-8,-1,0,-2,0,-2,6,-2,1,-1,6,-2,11,-1,9,-1,7,-2,9,-2,12,0,13,-2,8,-1,10,-2,4,-2,3,-2,6,2,8,1,9,2,10,1,9,1,13,0,12,0,10,-1,3,2,7,1,13,0,10,1,9,1,10,1,12,1,7,1,-3,2,-2,2,0,2,-10,0,-10,-1,-10,0,-2,2,1,3,2,1,8,2,8,1,6,1,6,2,5,2,6,1,7,0,4,1,7,0,8,0,6,1,6,2,5,1,7,1,5,2,4,2,2,1,-5,2,1,2,4,1,5,1,5,1,6,2,3,2,3,2,4,2,5,-1,3,-1,6,0,0,1,3,2,5,0,1,-2,6,0,7,1,6,0,6,0,2,-2,5,1,5,1,6,1,6,1,5,1,5,1,5,1,3,2,3,-2,6,1,3,-2,3,-2,6,1,2,2,5,1,7,0,2,-2,4,2,5,0,6,1,5,0,6,-1,5,0,3,-2,3,-1,5,0,6,1,6,0,5,0,5,0,6,1,4,1,5,1,5,1,4,1,3,3,2,1,6,0,2,-2,4,-1,5,0,4,-2,3,-1,5,1,2,2,5,1,5,2,5,1,6,1,3,1,5,1,4,1,4,-1,5,2,3,2,5,-1,4,2,1,1,4,2,4,1,5,1,5,0,4,0,5,-1,4,-1,0,-2,5,-2,3,-1,6,-1,3,-1,4,-2,5,0,4,1,4,2,5,-1,5,-1,5,0,4,-1,5,0,5,-5,-1,-1,0,-2,-5,-2,-4,-2,1,-1,5,0,0,-2,-3,-2,-2,-2,4,-2,5,0,6,1,3,2,2,1,2,2,3,1,2,2,2,3,3,0,6,0,5,1,5,1,3,2,1,2,4,1,4,2,5,1,2,1,3,1,4,1,5,-1,4,1,5,1,6,-1,3,2,3,3,2,-1,2,-3,4,-1,5,0,5,0,5,0,5,0,3,0,4,0,4,-1,4,1,6,0,4,0,6,0,3,1,2,2,4,1,6,4,3,-1,4,-1,4,-2,6,-3,5,0,4,0,6,1,5,1,4,1,4,1,5,1,4,1,4,-1,2,-2,4,-1,6,0,3,-2,6,-1,6,0,5,0,4,2,4,1,4,1,5,-1,5,-1,5,1,4,0,4,0,5,-1,5,1,5,1,5,0,6,0,4,1,5,0,1,2,0,2,3,-1,1,-2,2,-2,2,-2,4,-1,6,1,7,0,4,0,7,0,4,0,7,0,5,-1,4,-1,-1,-2,3,-1,6,-2,5,-1,7,-1,6,-1,6,0,5,0,3,1,5,-1,4,-2,4,-1,6,0,6,-1,2,-2,6,-1,4,-2,5,-1,6,0,6,0,6,0,6,0,5,-1,5,-1,6,-1,3,-1,-1,-2,-2,-2,-2,-2,-2,-2,-3,-2,-6,-1,-3,-2,-7,-1,-2,-2,-3,-2,-4,-1,-2,-2,-1,-2,-1,-2,0,-2,3,-2,1,-2,3,-2,9,-1,2,-2,-9,-1,-8,-1,-9,0,-4,-3,-1,-2,-2,-2,-3,-2,7,-1,2,-2,4,-2,7,-2,6,-2,8,-1,11,-2,3,-2,14,-1,1,-1,4,-1,14,1,11,-1,-1791,-2',
  '-339,-269,7,-3,7,-1,-3,-3,-4,0,-3,2,-1,-3,-5,-1,-5,1,-4,1,-5,1,-6,3,-5,2,-7,6,4,-1,7,-4,6,-1,3,2,2,3,4,2,4,0,2,-3,2,-3',
  '-293,-255,4,-3,-1,-2,-7,-1,-2,2,-4,-2,-3,2,6,3,4,-2,3,3',
  '351,-249,-7,0,0,3,0,2,1,1,3,-2,5,0,0,-1,-2,-3',
  '727,-204,5,-2,3,1,3,1,3,0,1,-6,-2,-2,0,-4,-2,1,-4,-3,-1,0,-3,0,-3,5,-1,3,-2,4,0,2,3,0',
  '865,-205,1,-2,4,2,1,-2,0,-2,-2,-2,-3,-4,-2,-2,1,-2,-3,0,-5,-2,-1,-3,-3,-6,-4,-2,-2,-1,-5,0,-3,2,-6,0,0,2,2,3,7,5,3,1,3,2,5,3,3,2,2,4,2,1,0,3,4,3,1,-3',
  '873,-181,4,-5,0,3,2,-1,1,-4,4,-1,3,-1,3,2,3,0,-2,-5,-1,-3,-4,0,-1,-1,0,-2,-1,-1,-1,-3,-3,-3,-4,-2,-1,1,-2,1,3,4,-2,2,-5,2,0,2,4,2,1,4,-1,3,-2,3,1,1,-3,2,-4,5,-2,3,2,1,3,-3,4,-1,1,-5',
  '836,-111,-2,-1,-3,1,-4,3,-3,2,-3,4,-1,1,2,0,3,-1,2,-2,2,-1,4,-3,3,-3',
  '892,-87,2,-1,-1,-3,-3,0,-3,0,-1,2,2,2,3,-1,1,1',
  '-900,-83,1797,-1,-3,-1,-1,2,2,1,2,0,-1797,2,1,0,-1,-3',
  '839,-82,-1,-1,-2,2,0,2,3,-3',
  '836,-75,0,-4,-1,1,-1,0,-1,1,0,4,3,-2',
  '250,-68,1,-6,1,-2,0,-3,-1,-1,-2,3,-1,-2,1,-3,0,-2,-2,-2,0,-4,-2,-6,-2,-6,-3,-10,-2,-7,-3,-6,-4,-1,-4,-2,-3,1,-4,2,-1,3,-1,4,-1,4,-1,4,1,3,2,1,0,2,3,4,0,3,-1,2,-1,3,0,5,2,3,0,3,3,0,3,1,1,1,3,0,2,3,5,3,1,3,-1,2,2,-1,3,4,0,3,2,2,2,-2,1,-2,1,-4',
  '718,-69,2,-4,3,2,1,-2,3,-2,-1,-2,1,-4,1,-3,1,-1,2,-4,-1,-2,2,-4,5,-2,4,-3,3,-2,0,-1,2,-3,2,-6,2,1,2,-2,2,1,1,-5,3,-3,2,-2,4,-4,2,-4,0,-3,-1,-3,3,-5,0,-4,-1,-2,-2,-5,0,-3,-1,-3,-2,-5,-3,-2,-2,-4,-2,-3,-1,-4,-2,-2,-2,-4,0,-4,0,-1,-3,-2,-5,0,-5,-2,-2,-2,-3,-2,-5,2,-3,1,1,3,-3,-1,-4,-4,-4,1,-3,1,-3,0,-5,2,-3,3,-1,4,-1,2,-3,2,-4,1,1,2,-1,4,-2,-3,-5,-1,3,2,1,3,1,3,0,4,-4,-5,-3,-1,-2,-4,-4,2,0,2,-3,4,-3,2,1,1,-6,3,-4,0,-4,3,-9,-1,-7,-2,-5,-1,-5,0,-6,-3,-4,-1,-1,-2,-2,-2,-4,-1,-3,0,-5,1,-3,-1,-4,0,-3,-3,-1,1,-2,-2,-3,-1,-4,0,-3,0,-5,3,-3,1,0,3,3,1,1,1,-1,1,1,4,-1,3,-2,5,-1,3,0,3,-2,3,0,1,-2,2,-1,4,-3,4,0,2,2,-2,-2,5,3,-2,1,-1,0,2,-2,4,-1,2,-1,1,1,3,1,1,0,3,0,3,2,3,0,-4,2,4,4,2,3,2,4,1,2,1,1,-1,4,2,3,1,1,1,1,0,3,0,5,2,3,2,1,2,3,3,0,2,1,3,3,4,2,-4,2,1,-1,2,1,2,2,-1,1,4,3,3,1,2,2,0,0,2,3,-1,0,2,2,0,2,1,4,-2,3,-3,3,0,3,-1,-1,3,2,4,3,1,-1,1,2,3,3,2,3,-1,4,1,0,3,-4,2,3,0,3,-1,3,-2,4,-1,1,0,3,-1,3,1,2,0,1,1,3,-3,-2,-2,-1,-2,-2,-1,0,-2,-1,-2,-2,-3,0,-1,4,-3,4,-1,3,-2,4,-3,1,0,3,-1,0,-2,5,-2,3,2,1,3,1,2,1,3,2,4,-1,2,0,2,0,3,0,3,1,1,-1,2,2,3,1,2,0,2,2,2,1,-3,0,-3,2,-1,0,-2,2,-2,0,-3,0,-2',
  '811,-52,1,-2,-3,0,-2,3,3,-1,1,0',
  '604,-51,-3,0,-6,3,5,1,2,-1,2,-2,0,-1',
  '804,-49,-2,0,-3,0,-1,1,1,2,3,-1,1,-1,1,-1',
  '808,-48,0,-1,-4,4,-1,3,2,0,1,-4,2,-2',
  '622,-51,-4,-1,-1,1,1,2,2,3,5,2,0,1,5,1,3,0,2,1,2,-1,-2,-1,-5,-3,-5,-1,-3,-4',
  '589,-40,2,-2,3,1,2,-3,-6,-1,-4,0,-2,0,1,3,3,0,1,2',
  '615,-40,-1,-3,-8,-2,-6,1,0,2,4,1,3,-2,3,1,5,2',
  '799,-42,1,-1,-4,2,-3,2,-2,2,1,0,2,-1,4,-2,1,-2',
  '788,-37,-1,0,-2,1,-3,2,1,1,3,-2,2,-2',
  '543,-34,10,0,1,2,9,-3,2,-3,7,-1,7,-3,-6,-2,-6,2,-4,0,-5,0,-5,1,-6,2,-4,1,-2,-1,-9,2,-1,2,-4,1,3,5,6,-1,4,-2,2,0,1,-2',
  '674,-31,-3,-3,0,3,0,2,1,2,2,-2,0,-2',
  '779,-34,-1,-1,-2,2,-2,3,-1,4,0,1,1,-2,1,-1,3,-3,2,-2,-1,-1',
  '760,-27,-3,-1,0,-1,-3,-1,-3,-2,-2,0,-5,2,-2,1,0,2,4,-1,3,0,1,3,1,0,0,-3,3,1,1,1,3,2,0,3,3,0,1,-1,0,-2,-2,-3',
  '636,-17,-2,-2,-3,1,-1,2,5,0,1,-1',
  '652,-15,2,-4,-4,2,-4,0,-3,0,-3,0,1,3,6,0,5,-1',
  '766,-22,-2,-2,-1,3,-1,2,-2,2,-3,2,-4,1,2,2,2,-2,2,-1,2,-1,2,-2,2,-2,1,-2',
  '671,-6,1,-8,5,-3,4,5,6,3,5,0,4,-1,4,-2,5,-1,9,-3,9,-3,3,-3,3,-2,1,-3,8,-3,1,-3,-4,-1,1,-3,4,-3,4,-6,3,1,-1,-3,4,0,-1,-1,5,-2,-1,-2,-3,0,-1,1,-4,1,-5,0,-4,4,-3,2,-3,5,-6,2,-5,-2,-3,-1,1,-4,-4,-2,-3,1,-5,0,-4,5,-5,1,-2,-2,-6,0,2,4,3,1,-1,6,-2,4,-10,4,-4,1,-8,4,-1,-2,-2,-1,-1,2,0,2,-4,3,5,2,4,0,-1,1,-7,0,-2,3,-4,1,-2,2,6,2,3,1,8,-2,1,-2',
  '626,7,-4,-5,-4,-1,-4,1,-9,0,-4,-1,-1,-4,5,-4,2,2,10,2,-1,-2,-2,0,-2,-3,-4,-2,4,-6,-1,-2,5,-5,0,-4,-3,-1,-2,2,3,4,-5,-2,-2,1,1,2,-4,3,1,5,-3,-2,0,-5,0,-8,-3,0,-2,1,1,5,-1,5,-2,0,-1,3,2,3,1,4,2,8,1,2,4,4,4,-2,7,-1,5,1,5,3,1,-1',
  '643,6,0,-5,-2,1,-1,-3,2,-3,-2,0,-2,3,-1,6,1,4,2,2,0,-3,3,0,0,-2',
  '529,-29,-5,0,-5,4,-6,4,-2,3,-4,4,-2,4,-4,7,-5,4,-1,4,-2,4,-5,3,-2,5,-4,2,-5,6,-1,2,4,0,7,-1,5,-5,4,-3,2,-2,5,-6,5,0,4,-3,3,-4,4,-2,-2,-5,3,-1,2,0,1,-4,1,-3,4,0,3,-3,-2,-7,0,-7',
  '589,9,6,-4,-6,-1,-2,-3,1,-5,-5,-3,0,-5,-2,-8,-1,2,-6,-3,-2,4,-3,0,-3,1,-6,-1,-1,2,-4,0,-4,0,-1,7,-2,1,-3,5,0,4,0,5,3,3,4,-2,4,1,1,4,2,1,6,2,4,3,2,4,2,2,4,2,4,4,3,4,2,0,2,-3,0,-2,4,-1,4,-2,0,-2,-4,0,1,-3,-4,-1,-2,-5,3,-5,-1,-2',
  '632,42,0,-3,1,-3,-2,-5,-2,5,-2,-2,1,-4,-1,-2,-6,3,-1,3,1,3,-3,2,-2,-2,-2,0,-4,-3,0,2,2,4,3,2,2,1,2,-2,4,2,1,2,3,0,0,4,4,-3,1,-2,0,-2',
  '406,31,-4,-1,-3,4,-1,7,3,8,3,-3,3,-3,2,-5,-1,-6,-2,-1',
  '-305,51,-4,-1,-1,0,2,2,0,2,2,0,2,0,-1,-3',
  '620,51,-2,-1,-1,-3,-2,-2,-3,4,1,1,1,1,1,3,2,1,0,-4,3,5,0,-5',
  '593,47,-7,-5,2,3,4,3,3,4,3,5,0,-4,-3,-3,-2,-3',
  '609,59,3,-1,4,0,0,-2,-3,-2,-3,-2,0,3,0,2,-1,2',
  '628,61,1,-6,-4,2,0,-2,1,-3,-2,-1,0,3,-2,0,0,3,2,0,0,2,-3,4,5,0,2,-2',
  '608,65,-2,-4,-2,3,-2,3,4,0,2,-2',
  '607,93,3,-2,1,1,1,-1,-1,-2,2,-4,-2,-4,-3,-1,0,-4,1,-4,2,-1,3,1,6,-3,-1,-3,2,-1,-1,-2,-4,2,-1,3,-2,-2,-3,3,-4,-1,-3,1,0,2,2,2,-2,1,0,-2,-3,3,0,2,-1,5,2,-2,1,8,2,5,3,0',
  '-328,91,-1,-1,-4,0,-3,0,0,2,1,1,4,0,2,-1,1,-1',
  '-385,89,-1,0,-3,0,-3,2,1,1,2,1,1,-1,4,0,2,-1,1,-2,-4,0',
  '-363,99,4,0,1,0,4,0,3,-1,1,0,1,-2,3,1,0,-2,2,0,2,-2,-1,-2,-3,1,-2,0,-2,0,-1,-1,-2,0,0,1,-2,-1,-2,-3,-1,1,-1,1,-3,1,-2,0,-3,0,-3,-1,-2,2,0,1,5,0,4,-1,1,1,-2,3,0,1,-3,1,1,2,3,-1',
  '552,93,-5,-2,-4,2,0,4,3,2,5,2,3,-1,1,-2,-2,-2,-1,-3',
  '-778,95,-2,0,0,2,0,2,1,1,-1,1,1,0,2,-1,1,0,1,-1,1,-1,0,-1,-2,-1,-2,-1',
  '-780,103,-2,0,-1,1,-1,0,0,1,1,0,2,0,1,-1,0,-1',
  '-784,106,0,-1,-3,0,1,1,2,0',
  '-788,107,-1,-1,-2,1,0,1,1,1,0,-1,2,-1',
  '-797,110,0,-1,-2,1,0,1,1,0,1,0,0,-1',
  '-398,114,2,-2,4,1,2,-2,4,-3,3,-2,2,0,3,-1,0,-1,3,-1,4,-2,0,-1,-4,0,-3,-1,-4,1,-7,-1,4,3,-2,1,-4,1,-1,1,-2,3,-2,0,-5,1,-2,1,-6,1,-2,1,2,1,-5,0,-3,-2,-3,0,0,-1,-3,-1,-2,0,3,2,1,2,2,1,3,1,3,0,2,1,4,0,4,0,5,-2',
  '-388,119,-1,0,-1,2,-2,2,1,3,2,0,1,-4,0,-3',
  '606,114,-2,-4,-3,4,0,4,2,5,4,3,3,-1,-1,-3,-3,-8',
  '-389,133,-6,-1,0,2,2,0,4,0,0,-1',
  '-385,133,-1,-4,-1,1,0,3,-2,2,4,-2',
  '673,171,1,-2,-3,-3,-2,2,-3,-2,-1,-2,-3,1,0,2,3,3,2,0,3,2,3,-1',
  '173,178,-4,-2,1,-1,-5,-2,-3,1,-1,2,3,0,1,1,3,0,5,1',
  '119,179,2,-2,4,0,4,0,0,-1,2,1,0,-2,-7,0,-6,1,1,3',
  '78,191,-2,-4,1,-1,-1,-3,-4,2,-3,1,-7,2,1,3,6,-1,5,1,4,0',
  '46,206,3,-3,-1,-7,-2,0,-2,-1,-2,1,0,6,-1,3,3,-1,2,2',
  '705,186,-2,-4,1,-3,-3,-3,-6,-3,-9,0,-7,-6,-3,2,-1,4,-8,-1,-6,-2,-6,-1,5,-3,-3,-9,-4,-2,-2,2,1,5,-3,1,-2,3,5,2,2,3,5,3,4,3,10,2,5,-1,6,9,3,-3,7,5,3,2,3,6,-1,6,3,3,5,1,3,-7,-1,-4,-4,-5,0,-5',
  '48,211,-2,-4,-2,1,-1,3,1,2,3,2,1,-4',
  '720,221,3,-1,4,2,1,-6,-8,-1,-4,-5,-8,3,-3,-5,-5,0,-1,5,3,4,5,0,1,7,2,4,6,-5,4,-2',
  '-318,233,3,-1,5,0,-3,-2,-1,0,-7,2,-1,2,2,1,2,-2',
  '-309,246,-2,-1,-7,2,-5,2,2,1,7,-1,5,-3',
  '-618,243,-2,-1,-8,2,-2,2,-4,2,-1,1,-5,1,-2,3,0,1,5,-1,4,-1,4,-1,2,-1,2,-3,5,-2,2,-2',
  '-281,253,-3,-4,3,2,4,-1,-2,-2,4,-1,3,1,5,-2,-2,-3,4,0,0,-2,2,-3,-2,-5,-3,0,-3,1,1,4,-1,1,-6,-5,-3,1,4,2,-5,1,-6,0,-9,0,-1,1,3,2,-2,2,4,3,5,8,3,2,5,2,2,0,-1,-1,-3,-4',
  '-664,270,5,1,-1,-6,4,-4,-2,0,-3,2,-2,2,-2,2,-1,2,0,2,2,-1',
  '718,254,5,-9,-7,2,-3,-8,5,-5,0,-3,-4,3,-4,-4,0,4,0,5,0,5,1,4,0,7,-3,5,0,7,5,2,-2,2,2,1,2,-3,1,-5,0,-5,2,-5',
  '-34,261,-9,-3,-7,1,4,5,-2,5,6,4,4,3,4,0,6,-3,-3,-4,1,-3,-4,-5',
  '63,278,-3,-4,-5,3,0,2,7,2,1,-3',
  '-765,286,-5,-2,-3,1,0,2,4,2,3,1,3,0,2,-2,-4,-2',
  '-15,293,-5,-5,5,0,5,0,-1,-4,-5,-4,6,0,4,-7,4,-1,3,-5,1,-2,6,-1,0,-4,-3,-1,2,-3,-4,-2,-7,0,-8,-2,-3,1,-3,-2,-5,1,-3,-2,-3,1,7,5,5,1,-8,1,-1,2,5,2,-3,2,1,3,8,0,0,3,-3,3,-6,1,-1,1,1,3,-1,1,-3,-2,0,4,-3,3,2,5,4,4,4,0,6,0',
  '-828,300,-3,-1,-3,1,-3,1,5,1,4,-1,0,-1',
  '-396,311,-2,-3,-2,1,-2,1,2,2,2,0,2,-1',
  '-409,314,-6,-3,-4,0,-1,1,4,3,7,0,0,-1',
  '-859,319,3,-1,4,0,4,-1,5,-1,-1,0,-4,-1,-3,1,-2,1,-5,0,-1,0,0,2',
  '-426,328,1,-2,3,1,3,-1,5,-2,6,-2,0,-2,4,0,3,-1,-4,-2,-8,1,-3,3,-4,-3,-8,-3,-1,3,-7,0,4,2,1,4,2,5,3,-1',
  '-73,332,-1,-3,6,-3,-7,-4,-14,-4,-4,-1,-7,1,-14,2,5,2,-11,2,9,1,0,2,-11,1,4,3,7,1,8,-3,8,2,6,-1,8,3,8,-1',
  '-379,336,-6,-1,-1,3,2,3,5,0,3,-1,0,-2,0,-1,-3,-1',
  '-900,345,12,-4,13,-5,0,-3,3,-1,-1,3,14,0,10,-5,-5,-2,-9,-1,0,-5,-2,-1,-4,0,-4,2,-7,2,-1,2,-5,1,-6,-1,-3,2,2,2,-6,-2,2,-2,-3,-2,1800,0,-6,-2,-7,0,5,-3,3,-4,2,-1,0,-2,-1,-1,-9,1,-14,-4,-5,-1,-7,-3,-8,-3,-1,-3,-7,4,-14,-4,-2,2,-5,-2,-6,0,-2,-3,-6,-5,0,-2,6,-1,-1,-7,-4,0,-2,-5,2,-2,-9,-2,-2,-6,-7,-1,-2,-5,-7,-5,-2,3,-2,8,-3,11,3,7,4,3,0,2,8,1,9,7,8,5,9,4,4,7,-6,-1,-3,-4,-12,-5,-4,6,-13,-2,-13,-8,4,-3,-11,-2,-8,0,1,4,-8,0,-6,-2,-16,1,-16,-2,-16,-10,-19,-11,8,-1,2,-3,5,-1,3,2,6,0,7,-6,0,-4,-4,-5,0,-6,-3,-8,-7,-7,-2,-3,-7,-6,-6,-6,-4,-3,-6,-3,-3,0,-4,2,-6,-3,-1,-2,-2,0,-2,-1,-2,-2,1,-4,-3,-1,-1,-1,-2,-1,-3,-1,-2,-1,0,-2,-1,-1,2,-1,3,-2,4,-6,1,-3,0,-6,-2,-3,-4,-1,-4,-2,-5,0,0,3,1,3,-2,6,3,0,-3,5,-3,1,0,-1,-2,-1,0,1,-1,1,-1,1,1,2,1,0,0,1,1,3,0,1,-3,0,-3,2,-7,-2,-3,-2,-6,-2,3,3,-1,2,4,3,-3,3,-4,-2,-6,-4,-3,-3,-5,0,-2,-2,2,-4,4,-1,1,-2,4,-1,5,3,5,-2,3,0,1,-2,-7,-2,-3,-2,-5,-3,-2,-3,5,-3,2,-5,3,-5,4,-4,-1,-3,-3,-2,2,-2,2,-2,0,-4,-2,-4,-2,0,-4,-6,-4,-6,-5,-6,-7,-5,-7,-4,-5,-1,-3,-2,-2,2,-3,-3,-7,-2,-5,-1,-2,-5,-3,-1,-1,4,1,2,-6,2,-3,-1,-6,-5,-5,-4,-1,-4,4,-5,5,-7,4,-3,3,-4,3,-9,-1,-9,-4,-3,-6,-3,-4,-4,-6,-5,-2,3,1,4,-3,2,-5,1,-2,3,-2,5,-5,2,-4,0,1,4,-5,0,0,-5,-3,-8,-1,-4,0,-4,3,0,2,-5,1,-4,3,-3,3,0,3,-3,1,0,3,-3,2,-4,0,-3,0,-2,0,-2,1,-3,1,-1,2,-5,0,-2,-3,0,-5,4,-6,4,-1,2,-3,4,0,4,-2,3,1,3,-2,2,-2,2,0,3,-3,3,-2,2,-1,-3,-1,3,0,3,2,5,-1,3,2,4,-2,3,1,6,-2,2,-2,6,-1,7,-2,4,-3,-3,-6,-3,-3,0,-3,1,2,6,-1,5,-4,6,0,2,-3,0,-3,4,-2,3,0,3,-1,2,-2,3,-5,0,1,-2,-2,-3,-2,1,0,-1,-2,1,-2,0,-1,-2,-3,1,-6,-2,0,-3,-3,-3,-7,-4,-5,-5,-4,-4,-5,-3,0,-2,-3,-1,-4,-2,-2,-1,-2,-3,1,-7,0,-4,-2,-5,0,-8,-2,0,-3,-4,2,-2,-5,-1,-1,-4,-2,-1,-5,5,-2,6,-2,6,-2,2,-3,5,-1,6,-1,3,-4,7,-2,10,-2,6,0,6,-1,5,-7,-3,-4,0,-6,6,2,2,-1,2,-6,4,-4,2,-1,3,-4,4,-9,-1,-8,0,-8,-1,-9,2,-5,1,-6,1,-2,6,-3,1,-3,-1,-5,-3,-7,2,-5,4,-4,1,-4,5,-3,7,-3,-1,-3,2,-2,-2,-3,0,1,-2,-1,-1,2,-4,2,-5,3,-1,0,-1,4,-3,0,-2,0,-1,0,-2,2,-1,0,-2,1,-1,0,3,1,3,1,1,2,-2,0,-3,-1,-3,1,-2,1,0,0,-1,4,1,4,0,3,0,3,3,4,3,3,3,2,2,0,-3,-1,0,1,-4,2,-4,3,-2,4,0,3,-1,2,-3,1,-2,2,0,0,-1,-2,-3,-1,-2,-2,-1,-2,-4,-2,0,-1,-1,-1,-2,1,-4,-1,0,-2,0,-3,-2,0,-3,-2,-1,-3,0,-2,-1,0,-2,-2,-1,-3,0,-3,-1,-2,-1,-4,-1,-1,-2,0,-2,-5,-2,-8,-2,-5,-4,-2,0,-1,0,-3,-2,-3,-1,-5,0,-1,-1,-1,-1,-1,0,-1,-2,-3,1,-1,-1,-4,0,-1,3,0,3,-1,1,-1,4,-1,2,1,0,0,3,0,1,0,2,-1,2,-1,1,-1,2,-2,2,-3,4,-1,4,-4,4,-2,1,-3,4,-1,4,0,3,-3,5,-2,2,-3,1,-1,3,0,1,-1,3,-2,1,-2,4,-3,4,-2,3,-3,0,1,3,0,2,1,2,0,1,-2,-3,-1,-3,-1,-3,-1,-1,-2,2,-2,2,-4,7,2,-5,3,-6,4,-7,1,-3,2,-3,4,-5,-1,-1,1,-3,5,-5,1,-1,2,-5,-1,-1,1,-5,1,-6,2,-1,3,-2,3,-6,1,-4,3,-3,7,-5,3,-2,2,-3,2,-2,2,-2,2,-1,-1,-2,-2,-1,2,-2,1,-1,1,-2,3,-2,2,0,5,1,5,1,5,2,2,0,2,1,3,0,1,0,3,1,2,0,3,2,2,0,0,-1,-1,-3,0,-3,-1,-2,-1,-5,-3,-6,-3,-6,-4,-7,-4,-6,-6,-7,-5,-4,-8,-5,-4,-4,-6,-6,-1,-2,-1,-1,-4,-2,-1,-2,-2,-1,0,-3,-2,-2,-1,-4,-2,-1,-2,-7,0,-2,3,-2,0,-1,-1,-4,0,-1,0,-2,2,-4,2,-4,2,-2,0,-2,0,-5,1,-4,0,-8,1,-2,-2,-4,-2,-4,-3,-3,-4,-2,-6,-2,-6,-5,-2,-1,-3,-4,-2,-1,0,-3,2,-4,1,-3,0,-2,1,1,0,-5,-1,-3,1,-1,-1,-2,-2,-1,-4,-2,-6,-3,-2,-2,0,-2,2,0,-1,-3,-1,-3,-1,-5,-1,-2,-3,-2,-1,-1,-2,-3,-2,-2,-3,-4,-5,-5,-4,-3,-4,-2,-5,-2,-2,0,-1,-2,-3,1,-3,-1,-5,1,-3,-1,-2,1,-5,-2,-5,-1,-3,-2,-2,0,-2,2,-2,0,-2,2,0,-1,-1,2,0,3,-1,3,1,1,0,4,-3,4,-3,5,-3,6,-4,4,-2,4,-1,4,-1,4,-2,8,0,6,-1,2,-2,3,-2,4,-3,6,-1,3,-4,5,0,3,-1,4,1,4,2,5,0,2,2,4,1,2,3,4,1,2,1,4,-1,2,-1,2,-1,3,-2,3,1,1,1,2,-1,5,-1,3,-3,4,1,1,-1,1,-1,4,-5,5,-5,5,-3,4,-3,5,0,2,1,2,1,3,1,4,0,1,1,5,1,4,-2,4,-2,1,-1,2,-2,0,1,2,-6,-2,-2,0,-2,-1,-4,0,-2,3,-2,4,-3,3,-4,0,-5,0,-4,0,-4,-1,-8,-3,-2,-2,-5,-1,-4,1,-3,0,-3,1,-3,0,-6,-1,-4,-1,-5,-2,-1,0,-1,0,-5,2,-5,4,-4,3,-3,3,-2,0,-3,2,-3,3,-1,2,0,4,-2,2,-2,2,-2,1,-1,1,0,2,-1,1,-2,1,-2,2,-2,1,-2,1,0,1,-1,1,0,1,-1,4,0,2,-2,4,-2,2,2,1,2,3,2,3,-1,2,2,3,0,5,0,4,-1,3,1,2,-2,3,-2,2,0,2,0,2,2,2,2,2,-1,2,2,4,3,3,2,1,1,3,0,2,2,3,3,2,3,5,3,2,5,1,4,3,2,1,4,5,-1,6,2,4,0,3,4,3,5,2,3,3,4,5,1,3,4,0,3,-2,5,0,5,-1,2,0,5,3,5,0,4,3,4,1,9,1,8,0,3,0,4,2,6,0,2,-2,3,1,6,2,3,-1,0,-2,4,1,1,0,-3,-3,0,-2,2,-2,-1,-4,-3,-2,1,-3,2,0,2,-3,1,0,6,-2,2,0,5,0,6,-3,3,-4,4,-1,7,-2,5,-3,3,2,2,2,-1,4,2,2,3,3,4,0,6,-1,2,-2,2,0,2,-1,5,0,1,-2,6,0,5,-1,5,-2,3,-1,3,2,2,1,5,1,3,-1,2,-2,1,1,4,-1,4,0,2,1,2,2,-1,0,2,2,1,4,0,1,1,0,1,5,3,3,0,4,1,2,-2,2,2,2,-3,0,-4,1,-4,-3,-7,0,-4,2,-6,0,-1,-2,-4,0,-4,2,-6,0,-3,5,-3,3,2,4,-3,2,5,5,8,0,2,4,10,-1,6,4,6,1,8,0,9,-3,7,-2,6,1,4,-1,6,3,1,2,-2,3,-3,2,-2,1,-2,1,-7,4,-5,2,-5,3,4,1,4,4,-3,2,8,2,0,1,-5,0,-4,-1,-3,-2,-5,0,-4,-2,0,-3,3,-1,5,0,-1,-1,-6,-1,-7,-3,-2,1,1,2,-6,2,1,1,5,1,-2,1,-7,2,-1,2,-4,-1,-2,-3,-4,-4,0,-1,-2,-1,-2,1,-1,-6,-3,-3,-2,-3,2,-3,1,-2,4,-1,-1,-2,-6,0,-2,-2,-4,-2,-2,2,0,1,-3,0,-2,1,-6,-2,3,-2,-3,-1,-2,0,-3,2,-1,-1,1,-3,3,-2,-2,-1,3,-2,2,-2,0,-3,-4,2,1,-3,-3,0,2,-5,-4,0,-4,2,-2,4,0,4,-2,2,-3,3,0,1,-1,0,0,2,-3,1,0,3,0,3,1,2,-1,0,-1,1,-2,1,-2,1,-4,2,-3,2,-5,2,-4,3,1,1,-2,2,0,1,-4,1,-1,-2,-2,2,0,1,1,0,1,1,-4,1,-4,-2,0,-3,-1,-1,2,-3,5,-2,2,-4,6,-4,4,0,1,-1,-2,-1,5,-2,4,-2,4,-2,0,-1,-1,-2,-2,2,-5,1,-2,-3,4,-2,-1,-2,-2,-1,-2,-4,-3,0,0,1,1,3,2,1,-2,3,-2,2,-2,1,-1,2,-4,1,-2,2,-4,0,-3,3,-5,3,-3,3,-2,5,-2,0,-5,2,-2,-1,-3,-2,-2,-1,-4,-2,-10,1,-7,-2,-1,-3,0,-3,-5,-3,-6,-1,0,-2,-3,-2,-2,-4,2,-3,-3,-3,-1,-3,-4,-1,-4,-4,-6,0,-5,0,-3,-1,-2,-2,-2,0,-2,2,-2,3,-4,0,-2,-1,-3,1,-2,-1,0,4,0,3,-2,1,-2,2,1,3,2,2,0,2,1,3,0,2,-1,2,0,1,0,4,-2,2,7,4,6,-1,7,0,5,-1,4,0,8,0,3,3,1,10,-5,5,-4,3,-7,2,-1,3,7,2,8,-2,-2,6,5,-2,12,4,1,4,5,1,4,1,2,1,5,7,6,3,5,-1,1,1,4,1,1,-1,3,2,-1,2,0,3,-2,3,-1,5,1,1,2,2,4,0,2,1,4,2,0,-3,-2,-2,1,-1,3,-1,-2,-2,-1,1,-4,-4,2,-2,0,-2,5,-1,0,-2,5,1,3,1,5,-2,3,-1,3,1,8,3,6,1,5,-1,0,-1,5,0,1,2,7,2,-1,4,0,4,3,3,5,2,4,-4,4,0,1,4,0,3,-2,-1,-3,2,0,3,6,1,6,1,6,-1,5,0,6,3,-6,3,-9,-1,-9,-2,-8,-1,-3,3,-4,2,1,5,-3,4,3,3,4,3,12,6,3,1,-1,2,-6,2,-9,-1,-5,-4,1,-3,-8,-4,-10,-4,-3,-7,3,-4,5,-3,-5,-5,-5,-1,-2,-9,-3,-4,-6,0,-3,-4,-5,0,-2,5,-4,5,-4,7,-3,3,-10,-5,-7,-2,-7,3,-1,5,-2,12,5,3,13,4,10,5,9,7,12,10,8,4,14,6,11,2,8,0,8,4,9,0,9,1,15,-4,-6,-1,6,-3,5,2,8,-3,14,-2,18,-5,4,-3,1,-3,-6,-3,-8,-1,-22,4,-4,-1,8,-3,1,-8,6,-1,4,-2,1,3,-3,2,3,2,12,-3,4,1,-3,3,11,5,5,0,5,-2,3,4,-5,3,3,3,-4,3,14,-2,3,-3,-6,0,0,-3,4,-2,7,1,2,4,10,2,18,4,3,0,-5,-3,7,-1,3,2,10,0,7,2,6,-3,5,4,-5,3,3,1,15,-1,6,-2,19,-6,3,3,-5,3,0,1,-6,0,1,3,-2,4,-1,1,10,5,3,4,4,1,13,-1,1,-3,-5,-4,3,-2,2,-3,-1,-7,5,-3,-2,-3,-10,-7,6,-1,2,2,6,1,1,2,4,3,-3,3,3,3,-6,0,-1,3,4,5,-6,4,8,4,-1,3,3,0,2,-3,-2,-4,6,-1,-2,3,8,2,10,1,9,-3,-4,4,0,5,8,1,12,0,11,1,-4,2,6,4,6,0,9,2,14,1,1,1,13,1,4,-1,12,2,9,0,1,2,5,2,12,2,8,-1,-6,-1,11,-1,1,-3,5,2,14,0,12,-3,4,-2,-2,-2,-5,-2,-13,-3,-4,-1,6,-1,8,-1,4,1,3,-3,2,1,8,1,16,-1,1,-2,21,-1,0,4,11,-1,8,0,8,-3,2,-3,-3,-2,7,-4,7,-2,5,5,8,-2,9,1,9,-1,4,1,8,-1,-3,5,6,2,46,-3,4,-3,13,-4,20,1,10,-1,4,-2,0,-3,6,-2,6,1,9,0,10,-1,9,1,9,-5,6,2,-4,3,2,2,16,-1,11,0,14,-2,-1793,-2',
  '246,206,2,-3,2,0,2,-2,-4,0,-1,-4,-1,-2,-2,-1,0,-2,2,-4,5,-1,3,-3,7,0,8,1,1,1,-1,4,0,5,-3,1,1,4,-4,0,2,4,4,-1,5,2,-4,3,-1,3,-4,-2,-1,-3,-1,3,-1,1,1,2,0,2,-6,2,-3,4,-2,1,0,2,4,0,1,3,4,1,4,-1,1,5,-1,3,-5,0,-4,1,-6,-2,-4,-1,-3,-3,-5,-1,-5,-5,5,-5,-1,-3,6,-6,3,-3',
  '-478,346,-3,-2,-7,1,-4,0,-7,2,4,2,4,2,5,-2,3,-1,2,-1,3,-1',
  '-900,358,1800,-4,-5,0,-1,1,-1794,3',
  '-900,358,1,0,4,0,7,-2,-5,-2,-7,0,0,4',
  '-453,347,0,-5,7,4,6,-3,-2,-4,5,-3,5,4,4,4,0,5,7,0,8,-1,7,-2,0,-3,-4,-2,4,-3,-1,-2,-10,-4,-7,-1,-5,2,-1,-3,-5,-4,-2,-2,-5,-4,-8,0,-4,-2,0,-3,-6,-1,-6,-4,-5,-6,-2,-3,0,-6,7,-1,2,-5,3,-4,7,1,9,-2,5,-2,3,-2,7,-1,5,-2,8,-1,6,0,-1,-5,1,-5,4,-5,7,-5,4,2,3,5,-3,8,-3,2,8,3,6,3,2,4,0,3,-4,4,-6,4,6,5,-2,5,-2,8,4,1,9,-2,5,0,4,1,4,-1,7,-3,1,-2,9,-1,0,-4,2,-6,4,-1,4,-3,7,3,5,5,3,3,4,-5,6,-6,6,-6,-2,-3,7,-3,4,-3,8,-1,3,-2,2,-4,4,-1,2,-2,1,-5,-4,-2,-4,-2,-8,-2,-6,-4,-9,-1,-10,1,-8,0,-5,0,-4,-3,-7,-3,-7,-6,-6,-5,5,1,8,6,10,5,8,0,4,-2,-5,-4,2,-5,2,-4,6,-2,8,0,5,6,1,-4,3,-1,-6,-4,-11,-3,-5,-2,-6,-3,-4,0,0,4,9,4,-8,0,-6,0,1,-2,-5,-2,-5,-2,-6,-2,-2,-3,-1,-1,0,-2,2,-3,2,0,-1,2,2,-1,-1,-2,-3,-1,-3,0,-3,0,-2,-1,-3,0,-5,-1,8,1,1,-1,-7,-2,-3,0,0,1,-1,-2,1,0,-1,-3,-4,-4,0,1,-1,0,-2,1,1,-2,2,-1,0,-2,-2,-2,-3,-4,1,4,-2,2,-1,4,-1,-2,1,-4,-3,1,3,-1,1,-5,1,-1,1,-1,0,-5,-3,-4,-5,-1,-3,-3,-3,-1,-2,-2,-1,-1,-6,-3,-2,-3,-3,-3,0,-3,0,-4,2,-4,2,-4,0,-2,3,-6,0,-3,-1,-2,-1,-3,-1,-1,-3,1,-1,2,-2,1,-2,5,-3,3,0,2,1,4,-2,3,-4,4,-1,0,-6,-2,-3,3,-3,1,-6,-1,-4,1,-4,0,-2,-1,1,-2,0,-2,1,-1,-1,0,-2,1,-2,-1,-3,0,-4,2,-4,0,-4,1,-3,0,-4,-2,-5,-3,-5,-2,-3,-3,-1,-2,0,-4,0,-2,1,-2,-2,-4,-1,-4,0,-6,0,-3,1,-3,1,-2,1,-4,3,-4,2,-2,2,-3,5,-1,2,-2,4,1,4,1,4,1,3,0,3,2,1,3,1,5,1,1,3,1,5,1,5,0,3,1,1,-1,0,-3,-3,-3,-1,-3,1,-1,-1,-2,-1,-4,-1,2,-1,0,0,-1,0,-2,0,-2,0,-1,-1,-1,1,-1,-1,-2,-1,-2,-1,0,-1,-2,2,0,2,0,0,-1,1,1,2,0,1,0,2,0,3,0,1,0,1,1,2,0,1,-1,1,1,1,0,2,-1,1,0,2,-1,1,-1,2,-1,1,-1,0,-2,0,-1,-1,-2,-1,-2,0,-2,1,-2,0,-2,-1,0,-1,-3,1,-1,-1,-1,0,-1,1,-1,1,-3,2,-2,2,-2,2,-2,0,-1,2,0,2,-1,2,0,2,2,3,1,2,1,3,0,0,-1,2,0,3,-1,1,-1,2,-2,3,0,4,4,2,0,0,2,1,4,2,2,4,1,0,1,4,-1,4,3,2,1,2,2,2,0,1,-1,-1,-2,0,-1,-3,-1,2,-2,0,-3,-2,-3,2,-4,2,1,1,3,-2,2,0,4,6,2,0,2,1,2,2,-4,4,0,3,-3,0,-1,5,0,5,0,3,-2,4,-1,2,2,0,1,7,1,6,0,-5,-2,2,-2,4,-1,4,-2,1,-4,2,0,2,-1,4,-2,3,-3,0,-3,2,0,2,-2,2,-2,6,-1,1,1,4,0,5,-1,2,-1,4,-1,5,-4,1,-2,1,0,2,-3,2,-8,3,-1,0,-4,-3,-4,1,-1,9,-1,0,-5,4,3,6,-2,8,-3,3,-3,-1,-2,6,1,10,-3,7,1,7,-5,7,-5,4,-2,4,0,2,-1,2,-7,0,-3,-2,-8,-2,-3,-7,-7,-3,-6,-4,-4,-1,0,-2,-4,1,-9,-2,-8,0,-3,-2,-2,-1,-7,-5,-7,-1,-5,-4,-2,-1,-3,-5,0,-8,-2,-4,-2,-5,-1,-6,-4,-4,-5,-1,-4,1,-3,-1,-5,-1,-2,-4,-3,-5,-9,-5,-4,-3,-2,-3,-5,-3,-3,-2,-3,-6,-3,-3,1,-3,0,-5,2,-3,0,-3,2,0,-2,6,-4,-1,-4,3,-2,0,-3,-5,-6,-7,-3,-10,-1,-6,1,1,-3,-1,-4,1,-2,-3,-2,-5,-1,-5,2,-2,-1,1,-5,3,-2,3,2,2,-3,-5,-1,-4,-3,-1,-6,-1,-2,-5,0,-3,-3,-2,-4,5,-3,5,-1,-2,-5,-6,-2,-3,-6,-5,-2,-2,-3,2,-5,3,-3,-2,1,-4,0,-3,-2,-4,-1,-1,-5,-2,0,-6,1,-6,4,-6,3,-1,3,1,3,-2,3,-1,9,2,4,5,4,-7,2,5,4,1,8,6,-1,2,10,-3,1,-2,-6,-3,1,2,7,2,9,2,4,-2,5,0,5,2,0,3,8,4,8,2,8,-1,7,1,5,0,6,2,6,1,9,2,11,2,11,-1,8,-1,7,-5,3,0,2,-10,5,-9,6,-4,3,-2,4,1,1,-5,7,-4,9,-5,10,-2,2,-2,4,-4,3,-3,2,1,3,-2,4,2,4,3,3,3,4,-1,2,-2,-2,-3,2,1,1,-1,5,2,0,1,4,2,3,0,2,2,1,4,2,-1,1,2,1,0,2,1,2,2,0,2,4,2,2,-1,1,0,3,-1,5,1,1,0,4,-2,3,-2,2,-1,2,1,2,-1,0,-1,2,-3,1,-2,0,-1,-2,-2,-1,-1,-1,0,-1,2,-2,-1,-1,-1,-1,-2,0,-1,3,-1,-1,-2,1,-1,2,-2,0,-1,0,-2,0,0,-1,-1,1,-3,1,-1,1,1,1,0,1,-2,1,-2,1,-1,1,-1,2,-1,0,0,-1,-1,-1,-1,1,-1,1,-1,1,0,1,1,2,-2,0,1,1,-1,2,-3,2,-1,2,-2,1,-2,3,1,0,0,1,-2,1,-1,-1,-2,0,-2,0,-2,1,-3,1,-1,1,-3,1,-3,0,-2,1,-3,2,-6,5,-2,2,-4,1,-3,0,-4,-2,-3,-1,-3,2,-4,1,-5,2,-3,1,-6,2,-4,2,-2,2,-2,0,-5,1,-3,3,-5,3,-2,3,-2,2,2,1,-1,1,2,1,0,2,-2,2,0,2,-2,3,-5,5,-5,4,-2,3,-4,2,-1,1,1,3,-3,1,-3,3,-1,3,-3,1,-3,2,-2,3,0,1,-3,4,-2,4,0,2,-3,2,-2,0,-3,1,-1,-2,1,-2,1,-4,1,-2,4,-4,1,-1,1,0,0,-2,1,0,1,-3,2,-1,1,-2,3,-3,2,-4,1,-3,1,-2,1,-3,2,0,2,-2,2,-2,0,-1,-2,-2,-1,0,-1,3,-4,3,-3,2,-3,2,0,3,-1,3,-2,2,-3,2,-1,-1,-1,2,-3,1,-3,3,2,0,2,2,0,2,-4,3,-3,2,-1,3,-2,3,-3,4,-2,5,0,2,-4,3,-2,1,-1,1,-2,0,-2,2,-5,0,-1,1,-1,3,-5,5,-4,7,0,1,-2,2,-4,4,0,4,-3,3,1,4,0,4,-2,4,2,5,1,9,0,6,-2,5,-1,2,0,1,7,-2,3,-5,1,2,-1,4,-1,4,-1,0,-10,5,-3,2,-9,2,-3,5,1,3,-7,2,-1,4,-6,3,0,3,-2,2,-5,1,-1,5,-7,4,-2,5,-5,0,-8,0,-6,2,-10,5,-5,1,-9,1,-7,0,-10,2,-6,2,-5,-1,1,-3,-3,0,-6,-1,-4,-2,-6,-1,0,3,2,5,5,1,-1,1,-6,-2,-4,-4,-7,-3,4,-3,-5,-3,-6,-2,-5,-2,-1,-2,-8,-3,-1,-2,-6,-2,-3,0,-5,-1,-5,-2,-4,-2,-9,-1,-1,1,6,2,5,2,5,2,6,1,3,2,7,3,1,1,3,2,1,4,3,3,-6,-2,-2,1,-2,-2,-4,3,-1,-2,-2,2,-5,-2,-3,0,0,3,1,2,-4,2,-6,-1,-4,2,-4,2,0,2,-4,2,2,3,4,3,2,3,4,0,4,-1,4,3,3,-1,4,2,-1,2,-3,1,4,2,-3,0,-5,-1,-2,-1,-4,1,-7,-1,-7,1,-2,2,-7,3,7,2,12,3,4,0,-1,-3,11,1,-4,3,-7,2,-3,2,-5,2,-7,2,3,2,9,1,6,2,1,2,5,3,5,0,10,2,4,0,8,3,8,-1,3,-3,3,1,8,0,0,-1,7,-1,5,1,11,-2,10,0,3,-1,7,1,8,-2,5,0,9,-2,8,-2,5,-1,5,3,6,1,7,0,8,2,8,1,3,-2,4,1,1,2,4,0,8,-5,7,4,1,-4,6,1,2,1,6,0,7,-2,12,-2,7,-1,5,1,7,-3,-8,-2,10,-2,13,1,4,1,6,-3,5,2,-5,3,3,1,6,0,4,1,4,-1,5,-3,6,0,9,-2,7,1,8,0,-1,3,5,1,7,-2,0,-5,4,4,4,0,2,5,-6,3,-5,2,0,6,6,4,7,-1,5,-2,6,-6,-4,-2,9,-2',
  '-571,366,-2,-3,11,2,7,-3,5,3,5,-2,4,-5,3,2,-4,5,4,1,5,-1,6,-2,3,-5,2,-3,8,-3,9,-2,0,-2,-9,0,4,-2,-2,-2,-9,1,-9,1,-6,0,-9,-2,-15,-1,-7,0,-2,2,-7,1,-5,0,-6,4,4,0,7,1,7,0,7,1,-10,1,-10,0,-8,0,-2,2,11,2,-7,-1,-9,2,4,4,4,2,13,3,5,-1',
  '-523,367,-4,-3,-8,3,2,1,7,0,3,-1',
  '-382,366,1,-2,-6,0,-5,0,-5,0,-2,0,-5,3,0,1,2,1,12,-1,8,-2',
  '-433,366,4,-3,5,4,12,2,9,-5,-1,-4,10,2,5,2,11,-3,7,-2,1,-2,9,1,5,-3,12,-2,4,-2,5,-5,-9,-2,12,-4,8,-1,7,-4,8,-1,-2,-3,-9,-6,-6,2,-8,5,-6,-1,-1,-3,6,-2,6,-3,2,-1,4,-5,-2,-4,-6,2,-13,4,7,-5,5,-3,1,-1,-13,2,-11,3,-6,2,2,1,-8,3,-7,2,0,-1,-15,-1,-4,2,4,4,9,0,10,0,-1,2,1,3,7,4,-2,3,-2,1,-7,3,-10,1,3,2,-5,3,-5,0,-4,2,-2,-2,-10,0,-18,1,-10,1,-8,1,-5,2,6,2,-7,0,-2,5,4,5,5,2,13,1,-4,-3',
  '-502,369,6,-1,9,1,1,-2,-4,-2,7,-2,-1,-5,-8,-2,-5,1,-3,2,-12,4,0,1,10,0,-6,3,6,2',
  '718,366,-8,0,-10,1,-1,0,5,2,6,0,7,-2,1,-1',
  '-466,364,-5,-4,-6,0,-3,5,0,2,3,2,4,2,11,0,9,-2,-7,-4,-6,-1',
  '-602,357,-13,-2,-3,2,-12,2,2,2,4,4,4,3,-5,3,17,1,7,-1,13,0,5,-2,5,-2,-6,-1,-12,-3,-6,-4,0,-2',
  '754,375,-6,-2,-8,1,-9,2,1,1,9,0,13,-2',
  '-468,375,-3,-2,-7,0,-6,2,3,2,7,1,4,-2,2,-1',
  '725,378,-4,-4,-18,0,-8,-1,-10,3,3,4,6,1,13,-1,18,-2',
  '-492,384,3,-3,0,-2,-2,-4,-8,-1,-5,1,0,3,-9,0,0,4,6,0,7,1,7,0,1,1',
  '-541,381,2,-2,4,1,6,0,0,-3,-3,-2,-16,-1,-13,-2,-8,0,0,2,10,2,-23,-1,-7,1,7,5,5,1,14,-1,9,-3,9,-1,-7,5,4,2,5,-1,2,-2',
  '288,354,-3,-1,-17,1,-1,2,-9,1,-1,3,5,1,0,3,10,4,-4,1,12,4,-2,2,11,3,17,3,17,1,8,2,10,1,3,-2,-3,-2,-18,-2,-15,-3,-16,-4,-7,-5,-8,-5,1,-4,10,-4',
  '-473,385,5,-1,10,0,4,-2,-1,-2,6,-1,3,-1,7,0,7,-1,8,1,10,1,8,0,6,-2,1,-2,-3,-2,-8,-1,-6,1,-14,-1,-11,0,-8,1,-13,1,-2,3,0,2,-5,3,-11,0,-6,2,2,2,11,-1',
  '-581,388,-1,-4,-4,-1,-4,-1,-10,-2,-7,-1,-7,2,8,3,10,4,8,-1,7,1',
  '-469,388,-2,-1,-10,1,-1,1,10,0,3,-1',
  '-551,388,-9,-1,-8,2,4,1,8,1,7,-1,-2,-2',
  '124,389,-12,-2,-8,1,3,2,-3,1,10,1,2,-2,8,-1',
  '-548,393,-6,-1,-9,0,0,1,6,1,2,0,7,-1',
  '-479,390,-8,-1,-4,1,-2,2,0,2,6,0,3,0,6,-2,-1,-2',
  '-500,392,2,-2,-9,0,-8,2,-11,0,5,1,-6,2,0,2,9,-1,14,-2,4,-2',
  '525,392,-28,-2,9,6,4,1,4,-1,13,-2,-2,-2',
  '91,399,17,-4,-13,-2,-3,-4,-4,-1,-2,-4,-6,0,-11,3,4,2,-7,1,-10,4,-4,4,14,2,3,-2,7,0,2,2,7,0,6,-1',
  '127,402,10,-2,-7,-2,-15,-1,-15,1,-1,1,-7,0,-5,3,15,1,8,-1,5,1,12,-1',
  '256,403,-7,-1,-5,0,0,-1,-6,-1,-5,1,2,2,-11,0,10,1,8,0,1,-1,2,1,5,1,8,-1,-2,-1',
  '500,394,-11,0,-14,1,-8,2,-4,4,-7,1,13,3,11,1,9,-2,12,-5,-1,-5',
  '-435,398,6,-1,-7,-2,-9,-4,-9,0,-10,1,-6,2,0,2,4,1,-9,0,-5,2,-4,2,4,2,3,2,6,0,-3,1,12,0,6,-2,9,-1,8,-1,4,-4',
  '-342,416,13,-1,11,0,9,-2,0,-1,-13,-2,-12,-1,-4,-1,11,0,-12,-4,-8,-1,-9,-4,-10,-1,-3,-1,-16,0,7,-1,-3,-1,4,-2,-5,-2,-7,-1,-3,-2,-7,-2,1,-1,8,0,1,-1,-14,-3,-13,1,-15,-1,-7,1,-9,0,-1,3,9,1,-2,4,3,0,13,-2,-7,3,-8,1,4,2,9,1,2,2,-8,2,-2,2,14,0,4,-1,8,2,-11,1,-18,0,-9,1,-4,2,-6,2,-1,1,8,1,5,1,10,0,8,2,6,0,5,-1,4,2,7,1,8,1,16,0,2,-1,15,1,11,0,11,0',
  '-135,418,31,-4,-9,-2,-20,-1,-27,0,3,-1,18,1,15,-2,9,1,5,-1,-6,-3,13,2,24,2,15,-1,3,-3,-20,-3,-3,-1,-16,-1,11,0,-5,-4,-5,-3,1,-6,6,-3,-8,0,-8,-2,9,-3,1,-4,-5,0,6,-5,-11,0,6,-2,-2,-2,-7,0,-7,0,6,-4,0,-2,-9,2,-3,-1,7,-2,6,-3,2,-4,-9,-1,-4,2,-6,3,2,-3,-6,-3,13,0,7,0,-13,-5,-14,-4,-14,-1,-6,0,-5,-2,-7,-6,-11,-3,-3,0,-7,-2,-7,-1,-4,-3,0,-3,-3,-4,-8,-4,2,-3,-2,-5,-3,-5,-7,0,-7,4,-10,0,-5,3,-4,5,-8,6,-3,3,0,5,-7,5,1,3,-3,2,5,6,8,2,2,2,1,4,-6,-2,-3,-1,-4,-1,-6,2,-1,3,2,3,5,0,10,-1,-9,3,-4,2,-5,-1,-4,1,5,5,-3,2,-4,3,-6,6,-6,1,0,3,-13,3,-11,0,-13,0,-13,-1,-5,2,-9,3,13,2,10,0,-21,1,-11,2,0,2,19,3,18,2,2,2,-13,2,4,2,18,3,7,1,-2,2,12,1,15,1,15,0,6,-2,13,3,12,-2,7,0,10,-2,-11,3,0,2,17,3,18,0,6,2,18,0,40,0'
];
