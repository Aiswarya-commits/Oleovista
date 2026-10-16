import * as THREE from 'three';

/*
  Teammeadow.js  (self-contained: grass meadow surface + Team camera, no other files or images needed)
  ---------------------------------------------------------------------------------------------------
  Runs ONLY on the Team view (#team-view has class "active").

  Scroll progress (cameraRig progress 0..1):
    0.00 - 0.03  hero: your mountain in the Greenery theme (set by UIManager), held still
    0.03 - 0.15  the camera tips down and dives through a soft green haze onto the meadow
    0.15 - 1.00  you look straight down at a living grass surface (wind, flowers, pollen, drifting
                 cloud shadows). The camera glides over it as you scroll, so the surface moves up
                 together with the team cards laid on top of it.

  The grass is real 3D "shell" grass: thin stacked layers, so blades show depth as the camera moves.
*/

const MEADOW_Y = -6000;            // the meadow sits far below the mountain
const DIVE_START = 0.03;
const DIVE_END = 0.15;
const LAYERS = 16;                 // grass shells
const GRASS_H = 0.9;               // blade height (world units)
const DENSITY = 3.4;               // blades per world unit
const CAM_H = 15;                  // camera height above the grass when settled
const ARRIVE_H = 70;               // camera height when it first reaches the meadow
const TRAVEL = 70;                 // how far the camera glides over the meadow across the scroll
const HAZE = new THREE.Color('#2c3d14');
const BG = new THREE.Color('#1b2609');

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const NOISE_GLSL = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += noise(p) * a; p = p * 2.03 + 17.1; a *= 0.5; }
    return s / 0.9375;
  }`;

/* ------------------------------------------------------------------ */
/* Shell grass                                                         */
/* ------------------------------------------------------------------ */
function grassMat(layer, shared) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLayer: { value: layer }, uGround: { value: layer === 0 ? 1 : 0 },
      uTime: shared.uTime, uFade: shared.uFade, uHaze: { value: HAZE }
    },
    vertexShader: `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uLayer, uGround, uTime, uFade; uniform vec3 uHaze;
      varying vec3 vW;
      ${NOISE_GLSL}
      // one blade per cell: x = inside the blade at this layer, y = height along the blade (0..1), z = random tint
      vec3 blade(vec2 q, float clump, float salt) {
        vec2 cell = floor(q);
        vec2 f = fract(q) - 0.5;
        float bh = mix(0.3, 1.0, hash(cell + salt)) * mix(0.55, 1.15, clump);
        vec2 c = (vec2(hash(cell + 3.1 + salt), hash(cell + 7.7 + salt)) - 0.5) * 0.7;
        float tip = uLayer / bh;
        float ok = (tip <= 1.0 && length(f - c) <= 0.42 * (1.0 - tip * 0.85)) ? 1.0 : 0.0;
        return vec3(ok, tip, hash(cell + 11.0 + salt));
      }
      void main() {
        vec2 p = vW.xz;
        float clump = fbm(p * 0.09);
        // wind: blades lean more towards their tips
        float gust = fbm(p * 0.05 + vec2(uTime * 0.18, uTime * 0.07));
        vec2 wind = vec2(sin(uTime * 1.4 + p.x * 0.3 + p.y * 0.2), cos(uTime * 1.1 + p.y * 0.35)) * (0.12 + 0.35 * gust);
        vec2 q = p * ${DENSITY.toFixed(2)} + wind * uLayer * uLayer * 2.2;
        // two offset, rotated blade lattices so the grass never looks like a grid
        vec3 b1 = blade(q, clump, 0.0);
        vec3 b2 = blade(mat2(0.8, -0.6, 0.6, 0.8) * q * 1.31 + vec2(0.37, 0.71), clump, 5.3);
        if (uGround < 0.5 && b1.x < 0.5 && b2.x < 0.5) discard;
        vec3 b = b1.x > 0.5 ? b1 : b2;
        float tip = uGround > 0.5 ? 0.0 : b.y;
        float hue = b.z;

        vec3 low = vec3(0.12, 0.19, 0.04), mid = vec3(0.34, 0.49, 0.12), high = vec3(0.72, 0.82, 0.32);
        vec3 col = mix(low, mid, smoothstep(0.0, 0.45, uLayer));
        col = mix(col, high * mix(0.7, 1.12, hue), smoothstep(0.35, 1.0, tip));
        col = mix(col, col * vec3(1.25, 1.1, 0.6), step(0.8, hue) * 0.6 * tip);     // a few dry, golden blades
        float dry = smoothstep(0.55, 0.85, fbm(p * 0.045 + 40.0));                   // sun-dried patches
        col = mix(col, col * vec3(1.3, 1.12, 0.65), dry * 0.55);
        col *= mix(0.72, 1.15, clump);

        // tiny flowers on the tallest blades
        float fl = fract(hue * 97.31);
        if (fl > 0.982 && tip > 0.72) col = mix(vec3(1.0, 0.85, 0.28), vec3(0.97, 0.96, 0.88), step(0.5, fract(hue * 13.7)));

        if (uGround > 0.5) col = vec3(0.11, 0.16, 0.04) * (0.7 + 0.6 * fbm(p * 0.7));

        // drifting cloud shadows and sun patches
        float sun = smoothstep(0.3, 0.75, fbm(p * 0.03 + vec2(uTime * 0.025, uTime * 0.015)));
        col *= mix(0.72, 1.3, sun);
        col *= 0.7 + 0.3 * smoothstep(0.0, 0.6, uLayer + uGround * 0.2);            // self-shadow near the ground

        gl_FragColor = vec4(mix(uHaze, col, uFade), 1.0);
      }`
  });
}

function buildGrass(shared) {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(130, TRAVEL + 120, 1, 1).rotateX(-Math.PI / 2);
  for (let i = 0; i < LAYERS; i++) {
    const t = i / (LAYERS - 1);
    const m = new THREE.Mesh(geo, grassMat(t, shared));
    m.position.set(0, MEADOW_Y + t * GRASS_H, -TRAVEL / 2);
    m.renderOrder = i;
    m.frustumCulled = false;
    g.add(m);
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* Pollen sparkles near the grass + soft bokeh floating near the lens */
/* ------------------------------------------------------------------ */
function buildSparkles(shared, count, yMin, yMax, sizeMin, sizeMax, soft) {
  const pos = new Float32Array(count * 3), size = new Float32Array(count), ph = new Float32Array(count), warm = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 1] = MEADOW_Y + yMin + Math.random() * (yMax - yMin);
    pos[i * 3 + 2] = 40 - Math.random() * (TRAVEL + 60);
    size[i] = sizeMin + Math.random() * (sizeMax - sizeMin);
    ph[i] = Math.random() * 6.28;
    warm[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aWarm', new THREE.BufferAttribute(warm, 1));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uFade: shared.uFade, uSoft: { value: soft ? 1 : 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSize, aPhase, aWarm; uniform float uTime, uSoft; varying float vA; varying vec3 vC;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.4 + aPhase) * (0.4 + uSoft * 1.5);
        p.z += cos(uTime * 0.3 + aPhase * 1.3) * (0.4 + uSoft * 1.5);
        p.y += sin(uTime * 0.6 + aPhase * 2.0) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float tw = uSoft > 0.5 ? 0.6 + 0.4 * sin(uTime * 0.8 + aPhase) : 0.25 + 0.75 * pow(0.5 + 0.5 * sin(uTime * 2.6 + aPhase * 3.0), 3.0);
        vA = tw;
        vC = mix(vec3(1.0, 0.95, 0.7), vec3(0.85, 1.0, 0.55), aWarm);
        gl_PointSize = aSize * (60.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uFade, uSoft; varying float vA; varying vec3 vC;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = uSoft > 0.5 ? smoothstep(1.0, 0.55, d) * 0.16 : pow(smoothstep(1.0, 0.0, d), 2.2);
        gl_FragColor = vec4(vC, a * vA * uFade);
      }`
  }));
  pts.frustumCulled = false;
  return pts;
}

/* ------------------------------------------------------------------ */
/* Team-page controller                                                */
/* ------------------------------------------------------------------ */
export class TeamMeadow {
  constructor({ scene, camera, cameraRig, terrain, forest, water, atmosphere }) {
    Object.assign(this, { scene, camera, cameraRig, terrain, forest, water, atmosphere });
    this.active = false;
    this.built = false;
    this.current = 'mountain';
    this.shared = { uTime: { value: 0 }, uFade: { value: 0 } };
    this.prevBg = scene.background;
    this.baseFogDensity = 0.0018;

    // soft green haze the camera dives through between the mountain and the meadow
    this.veil = document.createElement('div');
    this.veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;' +
      'background:radial-gradient(ellipse at 50% 55%,#5d7a2a 0%,#334a16 50%,#1c2909 100%);';
    document.body.appendChild(this.veil);

    // gentle vignette over the grass so cards and text stay readable
    this.shade = document.createElement('div');
    this.shade.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;' +
      'background:radial-gradient(ellipse at 50% 50%,rgba(8,14,3,0) 0%,rgba(8,14,3,0.25) 70%,rgba(6,10,2,0.55) 100%);' +
      'transition:opacity 0.5s ease;';
    document.body.appendChild(this.shade);

    this._p = new THREE.Vector3();
    this._l = new THREE.Vector3();
    this._f = new THREE.Vector3();
  }

  build() {
    this.world = new THREE.Group();
    this.world.visible = false;
    this.world.add(buildGrass(this.shared));
    this.world.add(buildSparkles(this.shared, 2600, GRASS_H * 0.7, 2.5, 1.4, 3.0, false));   // pollen / dew glints
    this.world.add(buildSparkles(this.shared, 70, 4, CAM_H - 3, 5, 12, true));              // soft bokeh
    this.scene.add(this.world);
    this.built = true;
  }

  isOpen() {
    return !!document.getElementById('team-view')?.classList.contains('active');
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
      console.error('[TeamMeadow] update error:', err);
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
    this.active = true;

    const t = this.cameraRig.getProgress();
    const cam = this.camera;
    const d = clamp01((t - DIVE_START) / (DIVE_END - DIVE_START));
    const inMeadow = d >= 0.5;

    if (!inMeadow) {
      // on the mountain: hero vista, then tip the camera down towards the valley floor
      const k = ease(d * 2);
      this.cameraRig.cameraCurve.getPointAt(0, this._p);
      this.cameraRig.targetCurve.getPointAt(0, this._l);
      this._f.subVectors(this._l, this._p).setY(0).normalize();
      const down = this._p.clone().addScaledVector(this._f, 30);
      down.y -= 160;
      this._l.lerp(down, k);
      this._p.y -= k * 55;
      cam.up.set(0, 1, 0);
      cam.position.copy(this._p);
      cam.lookAt(this._l);
    } else {
      // over the meadow, looking down; the camera glides along so the surface rises with the cards
      const k = ease((d - 0.5) * 2);
      const s = clamp01((t - DIVE_END) / (1 - DIVE_END));
      const z = 20 - s * TRAVEL;
      const h = lerp(ARRIVE_H, CAM_H, k) + Math.sin(s * Math.PI) * 1.5;
      this._p.set(Math.sin(s * 5.0) * 1.2, MEADOW_Y + GRASS_H + h, z);
      this._l.set(this._p.x * 0.6, MEADOW_Y, z - 3.5);
      cam.up.set(0, 0, -1);
      cam.position.copy(this._p);
      cam.lookAt(this._l);
    }
    const m = this.cameraRig.mouse;
    cam.translateX(m.x * (inMeadow ? 0.8 : 1.5));
    cam.translateY(m.y * (inMeadow ? 0.8 : 2.0));

    const veil = d < 0.5 ? smooth(0.15, 0.5, d) : 1 - smooth(0.5, 0.82, d);
    this.veil.style.opacity = (d > 0 && d < 1 ? veil : 0).toFixed(3);

    this.setMountain(!inMeadow);
    this.world.visible = inMeadow;
    this.current = inMeadow ? 'meadow' : 'mountain';
    this.shade.style.opacity = inMeadow ? '1' : '0';

    if (inMeadow) {
      this.scene.background = BG;
      if (this.scene.fog) { this.scene.fog.color.copy(BG); this.scene.fog.density = 0; }
      this.shared.uFade.value = smooth(0.5, 0.9, d);
      this.shared.uTime.value = elapsed;
    } else {
      this.scene.background = this.prevBg;
      if (this.scene.fog) {
        const k = smooth(0, 0.5, d);
        this.scene.fog.density = lerp(this.baseFogDensity, 0.009, k);
        if (this.atmosphere?.targetFogColor) this.scene.fog.color.copy(this.atmosphere.targetFogColor).lerp(HAZE, k);
      }
    }
  }
}
