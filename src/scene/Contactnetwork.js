import * as THREE from 'three';

/*
  Contactnetwork.js  (self-contained: 3D "reach us" world + Contact camera, no other files or images needed)
  ---------------------------------------------------------------------------------------------------------
  Runs ONLY on the Contact view (#contact-view has class "active").
  Same class name and file name as before, so main.js and UIManager.js need no changes.

  The Contact page now OPENS DIRECTLY IN THE SIGNAL WORLD (no mountain first):
    on open      the emerald haze clears and the camera descends towards the pin (ARRIVE_SECS)
    0.00 - 1.00  a night-time "signal" world: a large glowing 3D location pin hovers over a
                 holographic city map of the office (Carnival Infopark, Kochi) with signal waves,
                 floating 3D contact icons (phone, mail, chat, web) circling it and paper planes
                 looping through the air. The camera slowly orbits the pin as you scroll, while
                 the contact sections scroll over it.
*/

const NET_Y = -8000;               // far below every other scene
const ARRIVE_SECS = 1.8;           // length of the arrival animation when the page opens (no mountain first)
const BG = new THREE.Color('#020b08');
const HAZE = new THREE.Color('#0a2a1d');
const EMERALD = new THREE.Color('#2fe39a');
const LIME = new THREE.Color('#9be564');

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const NOISE = `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }`;

const FOG = `
  vec3 applyFog(vec3 c, vec3 w) {
    float d = length(cameraPosition - w);
    float f = 1.0 - exp(-pow(d * 0.0032, 2.0));
    return mix(c, uBg, clamp(f, 0.0, 1.0));
  }`;

/* ------------------------------------------------------------------ */
/* Lit "glass-metal" material (no scene lights needed)                */
/* ------------------------------------------------------------------ */
function litMat(base, { rim = EMERALD, glow = 0, opacity = 1, side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: new THREE.Color(base) }, uRim: { value: rim.clone() },
      uGlow: { value: glow }, uFade: { value: 0 }, uBg: { value: BG }, uOpacity: { value: opacity }
    },
    transparent: opacity < 1, side,
    vertexShader: `
      varying vec3 vN; varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform vec3 uBase, uRim, uBg; uniform float uGlow, uFade, uOpacity;
      varying vec3 vN; varying vec3 vW;
      ${FOG}
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        vec3 V = normalize(cameraPosition - vW);
        vec3 L = normalize(vec3(0.45, 0.8, 0.35));
        float dif = max(dot(n, L), 0.0);
        float hemi = 0.5 + 0.5 * n.y;
        float spec = pow(max(dot(n, normalize(L + V)), 0.0), 48.0);
        float fres = pow(1.0 - max(dot(n, V), 0.0), 2.4);
        vec3 c = uBase * (0.22 + 0.55 * hemi + 0.75 * dif);
        c += vec3(0.85, 1.0, 0.9) * spec * 0.8;
        c += uRim * fres * 1.25;
        c += uRim * uGlow;
        c = applyFog(c, vW);
        gl_FragColor = vec4(mix(uBg, c, uFade), uOpacity);
      }`
  });
}

function edgeLines(geo, color = LIME, threshold = 30) {
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  return new THREE.LineSegments(new THREE.EdgesGeometry(geo, threshold), m);
}

/* ------------------------------------------------------------------ */
/* Holographic city map of the office surroundings                     */
/* ------------------------------------------------------------------ */
function buildMap(shared) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uFade: shared.uFade, uColor: { value: EMERALD }, uLime: { value: LIME } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime, uFade; uniform vec3 uColor, uLime; varying vec3 vL;
      ${NOISE}
      float line(float x, float w) { return smoothstep(w, 0.0, abs(x)); }
      void main() {
        vec2 p = vL.xy;                                  // circle lies in its own XY plane
        float r = length(p);
        vec2 q = p + 7.0 * vec2(noise(p * 0.018), noise(p * 0.018 + 9.0)) - 3.5;   // bent, organic streets
        vec2 g1 = abs(fract(q / 9.0) - 0.5) * 9.0;
        vec2 g2 = abs(fract(q / 31.0 + 0.27) - 0.5) * 31.0;
        float minor = max(line(g1.x, 0.18), line(g1.y, 0.18)) * 0.35;
        float major = max(line(g2.x, 0.45), line(g2.y, 0.45));
        float hwy = line(dot(p, normalize(vec2(1.0, 0.62))) + 14.0, 0.9);       // main road
        float riverC = p.x - (26.0 + 9.0 * sin(p.y * 0.05));                    // a river along one side
        float river = smoothstep(4.0, 2.8, abs(riverC));
        float riverEdge = line(abs(riverC) - 3.4, 0.35);
        vec2 cell = floor(q / 2.6);
        float bld = step(0.62, hash(cell)) * step(0.9, 1.0 - max(minor, major)) * (0.25 + 0.75 * hash(cell + 3.0));
        float ang = atan(p.y, p.x);
        float sweep = pow(fract((ang + 3.14159) / 6.28318 - uTime * 0.08), 10.0) * smoothstep(75.0, 5.0, r);
        float rings = line(r - 20.0, 0.25) + line(r - 40.0, 0.25) + line(r - 62.0, 0.35);
        float centerGlow = exp(-r * 0.12) * 0.9;
        float fade = smoothstep(78.0, 48.0, r);
        vec3 c = uColor * (minor + major * 0.8 + bld * 0.14 + rings * 0.45 + sweep * 0.55)
               + uLime * (hwy * 0.9 + centerGlow)
               + vec3(0.05, 0.25, 0.35) * river * 0.6 + uColor * riverEdge * 0.5;
        gl_FragColor = vec4(c * fade * uFade, 1.0);
      }`
  });
  const disk = new THREE.Mesh(new THREE.CircleGeometry(80, 96), mat);
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = 0.2;
  return disk;
}

function buildFloor(shared) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uFade: shared.uFade, uColor: { value: EMERALD } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uFade; uniform vec3 uColor; varying vec3 vL;
      void main() {
        vec2 p = vL.xy; float r = length(p);
        vec2 g = abs(fract(p / 24.0) - 0.5) * 24.0;
        float grid = max(smoothstep(0.25, 0.0, g.x), smoothstep(0.25, 0.0, g.y));
        float fade = smoothstep(520.0, 90.0, r) * smoothstep(70.0, 110.0, r);
        gl_FragColor = vec4(uColor * grid * fade * 0.16 * uFade, 1.0);
      }`
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(520, 64), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.05;
  return m;
}

function buildCity(shared) {
  // small glowing buildings scattered over the map (instanced)
  const N = 260;
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const mat = litMat('#0d2a1f', { rim: EMERALD, glow: 0.05 });
  const inst = new THREE.InstancedMesh(geo, mat, N);
  const d = new THREE.Object3D();
  let n = 0;
  for (let i = 0; i < N * 4 && n < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 9 + Math.pow(Math.random(), 0.8) * 62;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x - (26 + 9 * Math.sin(-z * 0.05))) < 6) continue;   // keep the river clear
    const h = (1.2 + Math.random() * 5) * (1.6 - r / 75);
    d.position.set(x, 0.2, z);
    d.scale.set(1.6 + Math.random() * 2.6, Math.max(0.6, h), 1.6 + Math.random() * 2.6);
    d.rotation.y = Math.random() * 0.4;
    d.updateMatrix();
    inst.setMatrixAt(n++, d.matrix);
  }
  inst.count = n;
  return inst;
}

/* ------------------------------------------------------------------ */
/* The big location pin + beam + signal waves + label                  */
/* ------------------------------------------------------------------ */
function buildPin(shared) {
  const g = new THREE.Group();
  const prof = [[0, 0], [0.9, 1.6], [2.4, 5.2], [4.1, 8.8], [5.4, 11.8], [6.1, 14.4], [6.2, 16.2], [5.8, 18.2], [4.7, 19.9], [2.8, 21.1], [0, 21.5]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.LatheGeometry(prof, 64);
  const pinMat = litMat('#0f8a55', { rim: LIME, glow: 0.08 });
  const pin = new THREE.Mesh(body, pinMat);
  g.add(pin);
  // glowing "eye" of the pin (seen from every side)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 16), new THREE.MeshBasicMaterial({ color: '#eafff2', transparent: true, opacity: 0 }));
  eye.position.y = 15;
  eye.scale.set(1, 1, 2.45);              // pokes through both faces of the pin
  g.add(eye);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.45, 12, 48), litMat('#d7ffe9', { rim: LIME, glow: 0.5 }));
  halo.position.set(0, 15, 0);
  halo.scale.set(1, 1, 14);                // a short tube around the eye, visible front and back
  g.add(halo);
  g.scale.setScalar(1.35);
  g.position.y = 10;

  // light beam from the pin tip down to the map
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 7, 13.5, 32, 1, true).translate(0, 6.75, 0),
    new THREE.ShaderMaterial({
      uniforms: { uFade: shared.uFade, uColor: { value: LIME } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uFade; uniform vec3 uColor; varying vec2 vUv;
        void main(){ gl_FragColor = vec4(uColor * pow(1.0 - vUv.y, 1.5) * 0.45 * uFade, 1.0); }`
    })
  );

  // expanding signal waves on the ground
  const waves = [];
  const waveGroup = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(
      new THREE.RingGeometry(0.93, 1, 96),
      new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    w.rotation.x = -Math.PI / 2;
    w.position.y = 0.4;
    waveGroup.add(w);
    waves.push(w);
  }
  return { group: g, pin, eye, halo, pinMat, haloMat: halo.material, beam, waveGroup, waves };
}

/* ------------------------------------------------------------------ */
/* Floating 3D contact icons                                           */
/* ------------------------------------------------------------------ */
function roundRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
const EXT = (depth) => ({ depth, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 3, curveSegments: 10 });

function iconPhone(mat, mats) {
  const g = new THREE.Group();
  const bodyGeo = new THREE.ExtrudeGeometry(roundRect(4.6, 8.8, 0.9), EXT(0.5)).center();
  g.add(new THREE.Mesh(bodyGeo, mat), edgeLines(bodyGeo));
  const screenMat = litMat('#0b3b28', { rim: EMERALD, glow: 0.35 });
  mats.push(screenMat);
  const screen = new THREE.Mesh(new THREE.ExtrudeGeometry(roundRect(3.8, 7.2, 0.5), { depth: 0.1, bevelEnabled: false }).center(), screenMat);
  screen.position.z = 0.55;
  g.add(screen);
  // a little "call" glyph on the screen
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.16, 8, 32), litMat('#e5ffe9', { rim: LIME, glow: 0.6 }));
  mats.push(ring.material);
  ring.position.set(0, -2.2, 0.7);
  g.add(ring);
  return g;
}

function iconMail(mat, mats) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(roundRect(9, 6, 0.6), EXT(0.6)).center();
  g.add(new THREE.Mesh(geo, mat), edgeLines(geo));
  const flap = new THREE.Shape();
  flap.moveTo(-4.3, 2.8); flap.lineTo(0, -0.6); flap.lineTo(4.3, 2.8); flap.lineTo(3.6, 2.8); flap.lineTo(0, 0.2); flap.lineTo(-3.6, 2.8);
  const flapGeo = new THREE.ExtrudeGeometry(flap, { depth: 0.2, bevelEnabled: false });
  const flapMat = litMat('#d8ffe8', { rim: LIME, glow: 0.45 });
  mats.push(flapMat);
  const f = new THREE.Mesh(flapGeo, flapMat);
  f.position.z = 0.65;
  g.add(f);
  return g;
}

function iconChat(mat, mats) {
  const g = new THREE.Group();
  const s = roundRect(9, 6.2, 1.8);
  const tail = new THREE.Shape();
  tail.moveTo(-3.2, -2.6); tail.lineTo(-4.4, -5.0); tail.lineTo(-0.8, -2.8);
  const geo = new THREE.ExtrudeGeometry([s, tail], EXT(0.9));
  geo.translate(0, 0, -0.45);
  g.add(new THREE.Mesh(geo, mat), edgeLines(geo, LIME, 40));
  const dotMat = litMat('#eafff2', { rim: LIME, glow: 0.7 });
  mats.push(dotMat);
  [-2.2, 0, 2.2].forEach((x) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), dotMat);
    d.position.set(x, 0, 0.85);
    g.add(d);
  });
  return g;
}

function iconGlobe(mats) {
  const g = new THREE.Group();
  const coreMat = litMat('#0c4a31', { rim: LIME, glow: 0.1, opacity: 0.85 });
  mats.push(coreMat);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(3.6, 32, 20), coreMat));
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(3.75, 12, 8)),
    new THREE.LineBasicMaterial({ color: LIME, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  g.add(wire);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.16, 8, 64), litMat('#d8ffe8', { rim: LIME, glow: 0.6 }));
  mats.push(orbit.material);
  orbit.rotation.x = 1.2;
  g.add(orbit);
  return g;
}

function buildIcons() {
  const mats = [];
  const shell = litMat('#11563a', { rim: LIME, glow: 0.06 });
  mats.push(shell);
  const list = [iconPhone(shell, mats), iconMail(shell, mats), iconChat(shell, mats)];
  const group = new THREE.Group();
  list.forEach((ic, i) => {
    ic.userData.base = (i / list.length) * Math.PI * 2;
    ic.userData.h = 20 + (i % 2) * 9;
    ic.scale.setScalar(1.25);
    group.add(ic);
  });
  return { group, list, mats };
}

/* ------------------------------------------------------------------ */
/* Paper planes ("message sent") with fading trails                    */
/* ------------------------------------------------------------------ */
function planeGeometry() {
  const v = [
    0, 0, 3,   -2.2, 0, -2,   0, 0, -1.4,      // left wing
    0, 0, 3,   0, 0, -1.4,    2.2, 0, -2,      // right wing
    0, 0, 3,   0, -0.9, -1.6, 0, 0, -1.4,      // keel
    0, 0, 3,   0, 0, -1.4,    0, -0.9, -1.6
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

function buildPlanes(shared) {
  const planes = [];
  const group = new THREE.Group();
  const mat = litMat('#e9fff1', { rim: LIME, glow: 0.15, side: THREE.DoubleSide });
  const TR = 48;
  const cfg = [
    { r: 58, h: 30, tilt: 0.25, speed: 0.045, phase: 0.0 },
    { r: 72, h: 42, tilt: -0.3, speed: 0.035, phase: 0.4 },
    { r: 46, h: 52, tilt: 0.45, speed: 0.055, phase: 0.75 }
  ];
  cfg.forEach((c) => {
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * c.r, c.h + Math.sin(a * 2) * 6 + Math.sin(a) * c.tilt * 20, Math.sin(a) * c.r * 0.85));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const mesh = new THREE.Mesh(planeGeometry(), mat);
    mesh.scale.setScalar(1.3);
    const trailGeo = new THREE.BufferGeometry();
    const tp = new Float32Array(TR * 3), ta = new Float32Array(TR);
    for (let i = 0; i < TR; i++) ta[i] = i / (TR - 1);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(tp, 3));
    trailGeo.setAttribute('aT', new THREE.BufferAttribute(ta, 1));
    const trail = new THREE.Line(trailGeo, new THREE.ShaderMaterial({
      uniforms: { uFade: shared.uFade, uColor: { value: LIME } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uFade; uniform vec3 uColor; varying float vT; void main(){ gl_FragColor = vec4(uColor, pow(vT, 1.6) * 0.7 * uFade); }`
    }));
    trail.frustumCulled = false;
    group.add(mesh, trail);
    planes.push({ curve, mesh, trail, tp, c, primed: false });
  });
  return { group, planes, mat, TR };
}

function buildDust(shared) {
  const N = 1400, pos = new Float32Array(N * 3), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 170;
    pos.set([Math.cos(a) * r, 2 + Math.random() * 90, Math.sin(a) * r], i * 3);
    ph[i] = Math.random() * 6.28;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const p = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uFade: shared.uFade, uColor: { value: EMERALD } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aPhase; uniform float uTime; varying float vA;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.35 + aPhase) * 2.0;
        p.x += cos(uTime * 0.25 + aPhase * 1.7) * 1.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * 1.8 + aPhase * 3.0), 3.0);
        gl_PointSize = (1.2 + 1.6 * fract(aPhase * 7.1)) * (180.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uFade; uniform vec3 uColor; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(uColor, smoothstep(1.0, 0.0, d) * vA * 0.8 * uFade); }`
  }));
  p.frustumCulled = false;
  return p;
}

/* ------------------------------------------------------------------ */
/* Contact-page controller (same name/API as the old file)             */
/* ------------------------------------------------------------------ */
export class ContactNetwork {
  constructor({ scene, camera, cameraRig, terrain, forest, water, atmosphere }) {
    Object.assign(this, { scene, camera, cameraRig, terrain, forest, water, atmosphere });
    this.active = false;
    this.built = false;
    this.current = 'mountain';
    this.shared = { uTime: { value: 0 }, uFade: { value: 0 } };
    this.prevBg = scene.background;
    this.baseFogDensity = 0.0018;

    this.veil = document.createElement('div');
    this.veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;' +
      'background:radial-gradient(ellipse at 50% 55%,#1d6b47 0%,#0b2d1f 50%,#020b08 100%);';
    document.body.appendChild(this.veil);

    this.shade = document.createElement('div');
    this.shade.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;' +
      'background:radial-gradient(ellipse at 50% 45%,rgba(2,11,8,0) 0%,rgba(2,11,8,0.35) 65%,rgba(1,6,4,0.75) 100%);' +
      'transition:opacity 0.5s ease;';
    document.body.appendChild(this.shade);

    this._p = new THREE.Vector3();
    this._l = new THREE.Vector3();
    this._f = new THREE.Vector3();
    this._v = new THREE.Vector3();
  }

  build() {
    const w = new THREE.Group();
    w.position.y = NET_Y;
    w.visible = false;

    this.mats = [];
    w.add(buildFloor(this.shared), buildMap(this.shared));
    const city = buildCity(this.shared);
    this.mats.push(city.material);
    w.add(city);

    this.pin = buildPin(this.shared);
    this.mats.push(this.pin.pinMat, this.pin.haloMat);
    w.add(this.pin.waveGroup);

    this.icons = buildIcons();
    this.mats.push(...this.icons.mats);
    w.add(this.icons.group);

    this.planes = buildPlanes(this.shared);
    this.mats.push(this.planes.mat);
    w.add(this.planes.group);

    w.add(buildDust(this.shared));

    // collect additive line materials that fade in with the scene
    this.lineMats = [];
    w.traverse((o) => { if ((o.isLineSegments) && o.material?.isLineBasicMaterial) this.lineMats.push(o.material); });

    this.scene.add(w);
    this.world = w;
    this.built = true;
  }

  isOpen() {
    return !!document.getElementById('contact-view')?.classList.contains('active');
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
  }

  update(dt, elapsed) {
    try {
      this._update(dt, elapsed);
    } catch (err) {
      console.error('[ContactNetwork] update error:', err);
      if (!this.built) this.broken = true;
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
    if (!this.active) this.enterAt = elapsed;     // page just opened -> start the arrival
    this.active = true;

    const t = this.cameraRig.getProgress();
    const cam = this.camera;
    // arrival phase: 0.5 = just opened, 1 = settled (the page now starts in the signal world, no mountain)
    const d = 0.5 + 0.5 * clamp01((elapsed - this.enterAt) / ARRIVE_SECS);
    const inWorld = true;

    {
      // descend from high above, then slowly orbit the pin as you scroll
      const k = ease((d - 0.5) * 2);
      const s = clamp01(t);
      const a = -0.55 + s * Math.PI * 1.25;
      const r = lerp(150, 118 - 22 * Math.sin(s * Math.PI), k);
      const h = lerp(190, 44 + 14 * Math.cos(s * Math.PI * 2), k);
      this._p.set(Math.sin(a) * r, NET_Y + h, Math.cos(a) * r);
      this._l.set(0, NET_Y + lerp(0, 22, k), 0);
      cam.up.set(0, 1, 0);
      cam.position.copy(this._p);
      cam.lookAt(this._l);
    }
    const m = this.cameraRig.mouse;
    cam.translateX(m.x * 1.5);
    cam.translateY(m.y * 1.8);

    const veil = d < 0.5 ? smooth(0.15, 0.5, d) : 1 - smooth(0.5, 0.82, d);
    this.veil.style.opacity = (d > 0 && d < 1 ? veil : 0).toFixed(3);

    this.setMountain(!inWorld);
    this.world.visible = inWorld;
    this.current = inWorld ? 'network' : 'mountain';
    this.shade.style.opacity = inWorld ? '1' : '0';

    if (!inWorld) {
      this.scene.background = this.prevBg;
      if (this.scene.fog) {
        const k = smooth(0, 0.5, d);
        this.scene.fog.density = lerp(this.baseFogDensity, 0.009, k);
        if (this.atmosphere?.targetFogColor) this.scene.fog.color.copy(this.atmosphere.targetFogColor).lerp(HAZE, k);
      }
      return;
    }

    this.scene.background = BG;
    if (this.scene.fog) { this.scene.fog.color.copy(BG); this.scene.fog.density = 0; }
    const fade = smooth(0.5, 0.9, d);
    this.shared.uFade.value = fade;
    this.shared.uTime.value = elapsed;
    this.mats.forEach((mt) => { mt.uniforms.uFade.value = fade; });
    this.lineMats.forEach((mt) => { mt.opacity = 0.55 * fade; });

    // pin: hover, spin, glow
    const P = this.pin;
    P.group.position.y = 10 + Math.sin(elapsed * 1.3) * 1.2;
    P.group.rotation.y = elapsed * 0.45;
    P.eye.material.opacity = 0.95 * fade;
    P.waves.forEach((w, i) => {
      const c = (elapsed * 0.32 + i / P.waves.length) % 1;
      const sc = 3 + c * 70;
      w.scale.set(sc, sc, sc);
      w.material.opacity = (1 - c) * 0.75 * fade;
    });

    // icons circle the pin and turn to face outwards
    const orbit = elapsed * 0.12 + t * 2.2;
    this.icons.list.forEach((ic, i) => {
      const a = ic.userData.base + orbit;
      ic.position.set(Math.cos(a) * 44, ic.userData.h + Math.sin(elapsed * 1.1 + i * 1.7) * 2.2, Math.sin(a) * 44);
      ic.rotation.y = -a + Math.PI / 2 + Math.sin(elapsed * 0.8 + i) * 0.35;
      ic.rotation.x = Math.sin(elapsed * 0.6 + i * 2.1) * 0.15;
    });

    // paper planes loop with trails
    const PL = this.planes;
    PL.planes.forEach((pl) => {
      const u = (elapsed * pl.c.speed + pl.c.phase) % 1;
      pl.curve.getPointAt(u, this._v);
      pl.mesh.position.copy(this._v);
      pl.curve.getPointAt((u + 0.004) % 1, this._f);
      pl.mesh.lookAt(this._f);
      pl.mesh.rotateZ(Math.sin(elapsed * 1.5 + pl.c.phase * 6) * 0.35);
      const tp = pl.tp, n = PL.TR;
      if (!pl.primed) { for (let i = 0; i < n; i++) tp.set([this._v.x, this._v.y, this._v.z], i * 3); pl.primed = true; }
      tp.copyWithin(0, 3);
      tp.set([this._v.x, this._v.y, this._v.z], (n - 1) * 3);
      pl.trail.geometry.attributes.position.needsUpdate = true;
    });
  }
}