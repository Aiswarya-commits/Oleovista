import * as THREE from 'three';

/*
  Servicesholo.js  (self-contained: hologram world + Services camera, no other files needed)
  -----------------------------------------------------------------------------------------
  Runs ONLY on the Services view (#services-view has class "active").

  Scroll progress (cameraRig progress 0..1):
    0.00 - 0.04  hero: your mountain, held still
    0.04 - 0.16  a burst of light carries you into a dark hologram world
    0.16 - 1.00  the camera glides past glowing holograms that build themselves
                 with a scan line as you arrive:
                   storage tank farm  (01 ACERS platform)
                   refinery           (02 Risk analytics & compliance)
                   tankers at sea     (03 Workflow automation & delivery)
*/

const HOLO_Y = -2400;             // the hologram world sits far below the mountain
const DIVE_START = 0.04;
const DIVE_END = 0.16;
const CYAN = new THREE.Color('#235427');
const BG = new THREE.Color('#02060b');

// camera keys (relative to HOLO_Y), passed through in order between DIVE_END and 1.0
const CAM_POS = [
  [0, 160, 460], [-130, 85, 150], [95, 65, 115], [170, 95, -30],
  [370, 70, -90], [-40, 70, -290], [-110, 40, -330], [-30, 170, -250]
];
const CAM_LOOK = [
  [0, 90, -320], [0, 12, 0], [5, 10, -5], [260, 35, -180],
  [255, 30, -190], [-220, 8, -420], [-245, 6, -430], [-235, 0, -470]
];
// when each hologram builds itself  [start, end] of scroll progress
const REVEAL = { tanks: [0.15, 0.27], refinery: [0.38, 0.5], ships: [0.62, 0.74] };

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const V = (a) => new THREE.Vector3(a[0], a[1] + HOLO_Y, a[2]);

/* ------------------------------------------------------------------ */
/* Hologram materials                                                  */
/* ------------------------------------------------------------------ */
const HOLO_VERT = `
  varying vec3 vW; varying vec3 vN;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

function surfMat(u) {
  return new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: HOLO_VERT,
    fragmentShader: `
      uniform vec3 uColor; uniform float uReveal, uBase, uHeight, uTime, uFade;
      varying vec3 vW; varying vec3 vN;
      void main() {
        float f = (vW.y - uBase) / max(uHeight, 1.0);
        if (f > uReveal) discard;
        float scan = exp(-abs(f - uReveal) * 28.0) * 2.4;
        float grid = pow(sin(vW.y * 3.14159 * 1.2), 2.0) * 0.45;
        vec3 V = normalize(cameraPosition - vW);
        float edge = pow(1.0 - abs(dot(normalize(vN), V)), 2.2) * 0.75;
        float a = (edge * 0.5 + grid * 0.25 + scan) * uFade;
        gl_FragColor = vec4(uColor * (1.0 + scan * 1.5), a);
      }`
  });
}

function edgeMat(u) {
  return new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: HOLO_VERT,
    fragmentShader: `
      uniform vec3 uColor; uniform float uReveal, uBase, uHeight, uFade;
      varying vec3 vW;
      void main() {
        float f = (vW.y - uBase) / max(uHeight, 1.0);
        if (f > uReveal) discard;
        float scan = exp(-abs(f - uReveal) * 28.0);
        gl_FragColor = vec4(uColor * (1.2 + scan * 2.0), (0.75 + scan) * uFade);
      }`
  });
}

/* ------------------------------------------------------------------ */
/* Hologram object container                                          */
/* ------------------------------------------------------------------ */
class Holo {
  constructor(baseY, height, shared) {
    this.group = new THREE.Group();
    this.u = {
      uColor: { value: CYAN },
      uBase: { value: baseY },
      uHeight: { value: height },
      uReveal: { value: 0 },
      uTime: shared.uTime,
      uFade: shared.uFade
    };
    this.sMat = surfMat(this.u);
    this.eMat = edgeMat(this.u);
  }
  add(geo, x = 0, y = 0, z = 0, rx = 0, ry = 0) {
    const p = new THREE.Group();
    p.add(new THREE.Mesh(geo, this.sMat));
    p.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 24), this.eMat));
    p.position.set(x, y, z);
    p.rotation.set(rx, ry, 0);
    this.group.add(p);
    return p;
  }
  pipe(a, b, r = 0.5) {
    const vA = new THREE.Vector3(...a), vB = new THREE.Vector3(...b);
    const len = vA.distanceTo(vB);
    const p = this.add(new THREE.CylinderGeometry(r, r, len, 8, 1, true));
    p.position.copy(vA).add(vB).multiplyScalar(0.5);
    p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vB.clone().sub(vA).normalize());
    return p;
  }
}

/* ------------------------------------------------------------------ */
/* Hologram scenes: tanks, refinery, ships, ground, beam, streaks     */
/* ------------------------------------------------------------------ */
function buildTankFarm(shared) {
  const h = new Holo(HOLO_Y, 45, shared);
  const tank = (r, H, x, z) => {
    h.add(new THREE.CylinderGeometry(r, r, H, 32, 1, true), x, H / 2, z);
    h.add(new THREE.ConeGeometry(r * 1.02, H * 0.18, 32, 1, true), x, H + H * 0.09, z);
    h.add(new THREE.TorusGeometry(r, 0.4, 6, 32), x, H, z, Math.PI / 2);
  };
  const positions = [
    [-90, -40, 24, 32], [-30, -35, 28, 36], [35, -45, 24, 30], [95, -40, 20, 26],
    [-70, 30, 22, 28],  [-15, 35, 26, 34],  [45, 30, 28, 36],  [100, 25, 22, 28],
    [-45, 95, 20, 26],  [15, 100, 22, 28],  [70, 95, 24, 30]
  ];
  positions.forEach(([x, z, r, H]) => tank(r, H, x, z));

  // pipe manifold linking tanks
  for (let i = 0; i < positions.length - 1; i++) {
    const [x1, z1] = positions[i], [x2, z2] = positions[i + 1];
    h.pipe([x1, 2, z1], [x2, 2, z2], 0.6);
  }
  // bund walls
  h.add(new THREE.BoxGeometry(250, 4, 3), 0, 2, -75);
  h.add(new THREE.BoxGeometry(250, 4, 3), 0, 2, 135);
  h.add(new THREE.BoxGeometry(3, 4, 210), -115, 2, 30);
  h.add(new THREE.BoxGeometry(3, 4, 210), 125, 2, 30);
  h.group.position.set(0, HOLO_Y, 0);
  return h;
}

function buildRefinery(shared) {
  const h = new Holo(HOLO_Y, 110, shared);
  // distillation columns
  [[-25, -20, 5, 80], [-8, -25, 6.5, 95], [12, -20, 4.5, 70], [28, -25, 3.8, 60]].forEach(([x, z, r, H]) => {
    h.add(new THREE.CylinderGeometry(r, r, H, 24, 1, true), x, H / 2, z);
    for (let y = 12; y < H; y += 14) h.add(new THREE.TorusGeometry(r + 1.2, 0.3, 6, 32), x, 3 + y, z, Math.PI / 2);
  });
  h.add(new THREE.CylinderGeometry(0.9, 1.4, 92, 8, 6, true), 45, 49, -25);                // flare stack
  [[-35, 25], [-10, 28]].forEach(([x, z]) => {                                              // spheres on legs
    h.add(new THREE.SphereGeometry(10, 32, 16), x, 17, z);
    [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([a, b]) => h.pipe([x + a, 3, z + b], [x + a * 0.8, 13, z + b * 0.8], 0.6));
  });
  h.add(new THREE.BoxGeometry(80, 1.2, 2.4), 0, 16, 18);                                     // pipe rack
  for (let x = -38; x <= 38; x += 12) h.pipe([x, 3, 18], [x, 16, 18], 0.5);
  h.pipe([-25, 30, -10], [-8, 26, -15], 0.9);
  h.pipe([-8, 22, -15], [10, 22, -12], 0.9);
  h.group.position.set(260, HOLO_Y, -180);
  return h;
}

function tankerHull(L, W, D) {
  const s = new THREE.Shape();
  s.moveTo(-L / 2, -W / 2); s.lineTo(L * 0.3, -W / 2);
  s.quadraticCurveTo(L * 0.47, -W * 0.45, L / 2, 0);
  s.quadraticCurveTo(L * 0.47, W * 0.45, L * 0.3, W / 2);
  s.lineTo(-L / 2, W / 2); s.quadraticCurveTo(-L * 0.52, 0, -L / 2, -W / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false, curveSegments: 12 });
  g.rotateX(-Math.PI / 2);
  return g;
}

function buildShips(shared) {
  const h = new Holo(HOLO_Y, 30, shared);
  const ship = (x, z, ry, k) => {
    const g = new THREE.Group();
    const L = 120 * k, W = 20 * k;
    const parts = [
      [tankerHull(L, W, 8 * k), 0, 0, 0],
      [new THREE.BoxGeometry(13 * k, 9 * k, 18 * k), -L * 0.42, 12.5 * k, 0],
      [new THREE.BoxGeometry(5 * k, 1.2 * k, 23 * k), -L * 0.38, 16 * k, 0],
      [new THREE.CylinderGeometry(1.8 * k, 2.1 * k, 9 * k, 12, 1, true), -L * 0.47, 20 * k, 0],
      [new THREE.BoxGeometry(L * 0.75, 1 * k, 1.6 * k), L * 0.05, 9 * k, 0]
    ];
    for (let i = -3; i <= 3; i++) parts.push([new THREE.BoxGeometry(2 * k, 1.2 * k, 14 * k), L * 0.05 + i * 12 * k, 9 * k, 0]);
    parts.forEach(([geo, px, py, pz]) => {
      const p = h.add(geo, px, py, pz);
      g.add(p);
    });
    // glowing wake trail
    const wake = new THREE.Mesh(
      new THREE.PlaneGeometry(260 * k, 26 * k, 1, 1).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        uniforms: { uTime: shared.uTime, uFade: shared.uFade, uReveal: h.u.uReveal, uColor: { value: CYAN } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform float uTime, uFade, uReveal; uniform vec3 uColor; varying vec2 vUv;
          void main(){
            float along = vUv.x;                         // 1 = at the stern
            float across = abs(vUv.y - 0.5) * 2.0;
            float width = mix(0.15, 1.0, 1.0 - along);
            float core = smoothstep(width, 0.0, across) * pow(along, 1.5);
            float ripple = 0.75 + 0.25 * sin(vUv.x * 18.0 + uTime * 4.0);
            gl_FragColor = vec4(uColor, core * ripple * 0.35 * uFade * uReveal);
          }`
      })
    );
    wake.position.set(-L / 2 - 130 * k, 0.3, 0);
    g.add(wake);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    h.group.add(g);
  };
  ship(0, 0, 0.5, 1);
  ship(-150, -120, 0.42, 0.7);
  ship(140, -260, 0.55, 0.55);
  h.group.position.set(-220, HOLO_Y, -420);
  return h;
}

function buildGround(shared) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uFade: shared.uFade, uColor: { value: CYAN } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    extensions: { derivatives: true },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uTime, uFade; uniform vec3 uColor; varying vec3 vW;
      float grid(vec2 p, float s) {
        vec2 q = p / s;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main(){
        float dist = length(cameraPosition.xz - vW.xz);
        float fade = exp(-dist * 0.0016);
        float g = grid(vW.xz, 20.0) * 0.09 + grid(vW.xz, 100.0) * 0.22;
        float pulse = 0.5 + 0.5 * sin(length(vW.xz) * 0.02 - uTime * 1.2);
        gl_FragColor = vec4(uColor, g * fade * (0.7 + 0.3 * pulse) * uFade);
      }`
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000).rotateX(-Math.PI / 2), mat);
  m.position.y = HOLO_Y - 0.2;
  m.frustumCulled = false;
  return m;
}

function buildStreaks(shared) {
  const grp = new THREE.Group();
  for (let i = 0; i < 46; i++) {
    const len = 300 + Math.random() * 700;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: shared.uTime, uFade: shared.uFade, uColor: { value: CYAN },
        uPhase: { value: Math.random() }, uSpeed: { value: 0.05 + Math.random() * 0.12 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime, uFade, uPhase, uSpeed; uniform vec3 uColor; varying vec2 vUv;
        void main(){
          float head = fract(uPhase + uTime * uSpeed);
          float d = head - vUv.x;
          float tail = d > 0.0 ? exp(-d * 9.0) : 0.0;              // bright head, fading tail
          float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
          gl_FragColor = vec4(uColor, tail * across * 0.55 * uFade);
        }`
    });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.2).rotateX(-Math.PI / 2), mat);
    const ang = Math.random() * Math.PI * 2;
    const r0 = 60 + Math.random() * 200;
    s.position.set(Math.cos(ang) * (r0 + len / 2), HOLO_Y + 0.4, -320 + Math.sin(ang) * (r0 + len / 2));
    s.rotation.y = -ang;
    grp.add(s);
  }
  return grp;
}

function buildBeam() {
  const N = 700, pos = [], col = [];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.pow(Math.random(), 2) * 45;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, top = 150 + Math.random() * 550;
    pos.push(x, 0, z, x * 0.3, top, z * 0.3);
    const b = 0.5 + Math.random() * 0.5;
    col.push(0.45 * b, 0.8 * b, 1.0 * b, 0, 0, 0);          // bright at the base, fades out going up
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(g, m);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(220, 64).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: CYAN }, uOpacity: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
        void main(){
          float r = length(vUv - 0.5) * 2.0;
          float a = exp(-r * 3.6) * 0.55 * uOpacity;
          gl_FragColor = vec4(uColor, a);
        }`
    })
  );
  glow.position.y = 0.1;
  const grp = new THREE.Group();
  grp.add(lines, glow);
  grp.position.set(0, HOLO_Y, 0);
  return { group: grp, lineMat: m, glowMat: glow.material };
}

function buildDust(shared) {
  const N = 850, p = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i += 3) {
    p[i] = (Math.random() - 0.5) * 900;
    p[i + 1] = HOLO_Y + 1 + Math.random() * 110;
    p[i + 2] = (Math.random() - 0.5) * 900;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({
    color: CYAN, size: 2.2, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
}

/* ------------------------------------------------------------------ */
/* Services-page controller                                            */
/* ------------------------------------------------------------------ */
export class ServicesHolo {
  constructor({ scene, camera, cameraRig, terrain, forest, water, atmosphere }) {
    Object.assign(this, { scene, camera, cameraRig, terrain, forest, water, atmosphere });
    this.active = false;
    this.current = 'mountain';
    this.shared = { uTime: { value: 0 }, uFade: { value: 0 } };

    this.world = new THREE.Group();
    this.world.visible = false;
    this.tanks = buildTankFarm(this.shared);
    this.refinery = buildRefinery(this.shared);
    this.ships = buildShips(this.shared);
    // this.beam = buildBeam();
this.world.add(buildGround(this.shared), buildStreaks(this.shared), buildDust(this.shared),
  this.tanks.group, this.refinery.group, this.ships.group);    scene.add(this.world);

    this.posCurve = new THREE.CatmullRomCurve3(CAM_POS.map(V), false, 'catmullrom', 0.5);
    this.lookCurve = new THREE.CatmullRomCurve3(CAM_LOOK.map(V), false, 'catmullrom', 0.5);

    this.prevBg = scene.background;
    this.baseFogDensity = 0.0018;

    // light-burst flash that hides the jump from the mountain into the hologram world
    this.flash = document.createElement('div');
    this.flash.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;' +
      'background:radial-gradient(ellipse at 50% 50%,#b5e5ff 0%,#3da8f5 45%,rgba(2,6,11,0) 80%);' +
      'mix-blend-mode:screen;transition:opacity 0.08s linear;';
    document.body.appendChild(this.flash);

    // subtle dark vignette kept while in the hologram world
    this.vignette = document.createElement('div');
    this.vignette.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;' +
      'background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 55%,rgba(1,4,8,0.7) 100%);' +
      'transition:opacity 0.4s ease;';
    document.body.appendChild(this.vignette);

    this._p = new THREE.Vector3();
    this._l = new THREE.Vector3();
    this._p0 = new THREE.Vector3();
    this._l0 = new THREE.Vector3();
  }

  isOpen() {
    return !!document.getElementById('services-view')?.classList.contains('active');
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
    this.world.visible = false;
    if (this.flash) this.flash.style.opacity = '0';
    if (this.vignette) this.vignette.style.opacity = '0';
    this.scene.background = this.prevBg;
    if (this.scene.fog) {
      this.scene.fog.density = this.baseFogDensity;
      if (this.atmosphere?.targetFogColor) {
        this.scene.fog.color.copy(this.atmosphere.targetFogColor);
      }
    }
    this.current = 'mountain';
    this.camera.up.set(0, 1, 0);
  }

  update(dt, elapsed) {
    try {
      this._update(dt, elapsed);
    } catch (err) {
      console.error('[ServicesHolo] update error:', err);
      this.active = false;
      try { this.exit(); } catch (e) { /* ignore */ }
    }
  }

  _update(dt, elapsed) {
    const open = this.isOpen() && this.cameraRig.mode !== 'orbit';
    if (!open) {
      if (this.active) this.exit();
      return;
    }
    this.active = true;

    const t = this.cameraRig.getProgress();
    const cam = this.camera;

    // phase of the transition: 0 = on mountain, 1 = in hologram world
    const d = clamp01((t - DIVE_START) / (DIVE_END - DIVE_START));
    const inHolo = d >= 0.5;

    if (d < 0.5) {
      // still on the mountain: hold the camera at the initial hero vista
      this.cameraRig.cameraCurve.getPointAt(0, this._p0);
      this.cameraRig.targetCurve.getPointAt(0, this._l0);
      cam.up.set(0, 1, 0);
      cam.position.copy(this._p0);
      cam.lookAt(this._l0);
    } else {
      // in the hologram world: glide along the hologram spline
      const u = clamp01((t - DIVE_END) / (1.0 - DIVE_END));
      this.posCurve.getPoint(u, this._p);
      this.lookCurve.getPoint(u, this._l);
      const back = ease(1 - (d - 0.5) * 2);             // arrive from slightly further back
      this._p.y += back * 80;
      this._p.z += back * 160;
      cam.up.set(0, 1, 0);
      cam.position.copy(this._p);
      cam.lookAt(this._l);
    }
    // same gentle mouse parallax as the mountain
    const m = this.cameraRig.mouse;
    cam.translateX(m.x * 1.5);
    cam.translateY(m.y * 2.0);

    // light-burst flash peaks exactly when the scene swaps
    const flash = Math.pow(1 - Math.abs(d - 0.5) * 2, 1.6);
    this.flash.style.opacity = (d > 0 && d < 1 ? flash : 0).toFixed(3);

    // what is visible
    this.setMountain(!inHolo);
    this.world.visible = inHolo;
    this.current = inHolo ? 'holo' : 'mountain';
    this.vignette.style.opacity = inHolo ? '1' : '0';

    if (inHolo) {
      this.scene.background = BG;
      if (this.scene.fog) {
        this.scene.fog.color.copy(BG);
        this.scene.fog.density = 0.0012;
      }
      this.shared.uFade.value = smooth(0.5, 1.0, d);
      this.shared.uTime.value = elapsed;

      this.tanks.u.uReveal.value = smooth(REVEAL.tanks[0], REVEAL.tanks[1], t);
      this.refinery.u.uReveal.value = smooth(REVEAL.refinery[0], REVEAL.refinery[1], t);
      this.ships.u.uReveal.value = smooth(REVEAL.ships[0], REVEAL.ships[1], t);
    } else {
      this.scene.background = this.prevBg;
      if (this.scene.fog) {
        this.scene.fog.density = lerp(this.baseFogDensity, 0.004, d * 2);
        if (this.atmosphere?.targetFogColor) {
          this.scene.fog.color.lerp(this.atmosphere.targetFogColor, 0.08);
        }
      }
    }
  }
}
