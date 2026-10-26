import * as THREE from 'three';

/*
  Aboutocean.js  (About Us page: the REAL ship + ocean photo, brought to life)
  -------------------------------------------------------------------------------
  Runs ONLY on the About Us view (#about-view). Home keeps the normal mountain.

  The page uses your own aerial photo  public/assets/ocean.jpg  (tanker + open ocean, bow to the right):
    - the camera looks straight down on the photo like a drone, and glides, zooms and turns as you scroll
    - the WATER keeps moving: the photo's own waves and wake stream slowly past the ship (flow animation)
      with a light shimmer, while the SHIP itself stays sharp and still
    - beyond the photo's edges the ocean continues seamlessly (mirrored photo water that blends into
      a tile of the photo's open water), so no edge is ever visible, even when the camera turns
    - on open, the camera drops down out of a soft sea mist (ARRIVE_SECS)

  Smooth scrolling: the camera follows ONE continuous curve through the key views (no stop at each
  key), and the scroll position is softly smoothed on top, so it glides instead of stepping.

  USING A DIFFERENT / SHARPER PHOTO
    A higher-resolution version of the same photo (e.g. 2400 px wide or more) looks much sharper;
    just replace public/assets/ocean.jpg. If the ship sits elsewhere in a new photo, update SHIP_RECT
    (and OPEN_WATER) below: values go from 0 to 1 across the photo (left->right, top->bottom).
*/

const ENABLED_VIEWS = ['about'];         // About Us only - Home keeps its normal mountain
const PHOTO_URL = '/assets/Ships.jpg';
const SHIP_RECT = [0.118, 0.572, 0.395, 0.56];   // ship in the photo: [left, right, top, bottom] (0..1)
const OPEN_WATER = [0.66, 0.99, 0.03, 0.97];     // plain open water used to extend the ocean: [left, right, top, bottom]
const PHOTO_W = 640;                    // photo width in world units (height follows the photo's shape)
const FLOW_SPEED = 0.0075;              // how far the water slides past the ship per flow cycle (photo widths)
const SEA_Y = -900;                     // the sea lies far below the mountain
const ARRIVE_SECS = 1.8;                // how long the "drop onto the sea" takes when the page opens
const ARRIVE_LIFT = 300;                // how much higher the camera starts
const SCROLL_SMOOTH = 5;                // extra scroll smoothing (higher = follows faster)
const SAIL_BOOST = 26;                  // how much faster the water streams past the ship while you scroll (ship "sails")
const SCROLL_PX = 2.6;                  // About page: pixels the content moves per wheel unit (keeps the longer page comfortable)
const MIST = new THREE.Color('#c9d6e2');
const WATER = new THREE.Color('#0b3478');   // shown for a moment while the photo loads

// Key views, passed through in order over the whole scroll (evenly spaced, joined by a smooth curve):
// [camera height, angle of the ship on screen (deg), ship screen x, ship screen y]
// screen x / y go from -1 (left / bottom) to 1 (right / top); angle 0 = bow points right
const KEYS = [
  [440, -26, -0.32, -0.34],   // hero: ship lower-left, clear of the centred title
  [390, -32, -0.30, -0.30],
  [335, -20, -0.14, -0.14],   // close, diagonal
  [360, -7, 0.00, 0.00],      // turning level
  [390, 0, 0.04, 0.05],
  [410, 3, 0.00, 0.08],
  [440, 0, -0.04, 0.10]       // level, sailing to the right
];

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const lerp = THREE.MathUtils.lerp;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// smooth Catmull-Rom curve through the key views (continuous speed, no stops at the keys)
function keyAt(t) {
  const n = KEYS.length - 1;
  const f = clamp01(t) * n;
  const i = Math.min(Math.floor(f), n - 1);
  const u = f - i, u2 = u * u, u3 = u2 * u;
  const p0 = KEYS[Math.max(i - 1, 0)], p1 = KEYS[i], p2 = KEYS[i + 1], p3 = KEYS[Math.min(i + 2, n)];
  return p1.map((_, j) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * u +
    (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * u3));
}

/* ------------------------------------------------------------------ */
/* Living photo sea                                                    */
/* ------------------------------------------------------------------ */
function makeSea() {
  const uniforms = {
    uPhoto: { value: null },
    uReady: { value: 0 },
    uTexel: { value: new THREE.Vector2(1 / 612, 1 / 334) },
    uTime: { value: 0 },
    uFlowT: { value: 0 },
    uMist: { value: 1 },
    uShipRect: { value: new THREE.Vector4(...SHIP_RECT) },
    uOpen: { value: new THREE.Vector4(...OPEN_WATER) },
    uPhotoSize: { value: new THREE.Vector2(PHOTO_W, PHOTO_W * 334 / 612) },
    uMistColor: { value: MIST.clone() },
    uWater: { value: WATER.clone() }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    depthWrite: false,
    vertexShader: `
      varying vec2 vXZ;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vXZ = w.xz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform sampler2D uPhoto;
      uniform vec2 uTexel, uPhotoSize;
      uniform float uTime, uMist, uReady, uFlowT;
      uniform vec4 uShipRect, uOpen;
      uniform vec3 uMistColor, uWater;
      varying vec2 vXZ;

      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float mirror(float x) { return 1.0 - abs(mod(x, 2.0) - 1.0); }

      // photo lookup in "top-left" photo coordinates (u right, v down); the texture mirrors past its edges
      vec3 tap(vec2 uv) { return texture2D(uPhoto, vec2(uv.x, 1.0 - uv.y)).rgb; }
      // gentle sharpening (the photo is small, this keeps the ship and waves crisp when enlarged).
      // 3 texture reads (centre + two diagonal neighbours) keep it light for the GPU and quick to compile
      vec3 photo(vec2 uv) {
        vec3 c = tap(uv);
        vec3 n = tap(uv + uTexel * vec2(0.7, 0.7)) + tap(uv - uTexel * vec2(0.7, 0.7));
        return c + (c - n * 0.5) * 0.5;
      }
      // tile of plain open water from the photo, mirrored so it repeats without seams
      vec3 openWater(vec2 uv) {
        vec2 sz = uOpen.yw - uOpen.xz;
        vec2 q = vec2(mirror((uv.x - uOpen.x) / sz.x), mirror((uv.y - uOpen.z) / sz.y));
        return tap(uOpen.xz + q * sz);
      }
      // what the sea looks like at photo position uv (photo near the photo, open water further out)
      vec3 sea(vec2 uv, float outside) {
        float behind = -uv.x * uPhotoSize.x;            // world units behind the photo's left (stern) edge
        if (behind > 0.0) {
          // behind the stern the wake keeps trailing away: repeat the photo's own strip of real wake
          // (the first 10% of the photo, mirrored so it joins seamlessly), slowly widening, wandering
          // and thinning out, then fading into open water
          float strip = 0.1;
          float sx = mirror(behind / (strip * uPhotoSize.x)) * strip;
          float spread = 1.0 + behind * 0.0012;               // the wake widens as it trails off
          float wc = 0.48;                                      // wake centre line in the photo
          float wy = wc + (uv.y - wc) / spread + sin(behind * 0.018) * 0.012 * smoothstep(0.0, 150.0, behind);
          vec3 trail = tap(vec2(sx, wy));
          vec3 ow = openWater(uv);
          float churn = noise(vec2((behind + uFlowT * 30.0) * 0.03, uv.y * 30.0));
          trail = mix(trail, ow, smoothstep(0.45, 1.0, churn) * smoothstep(0.0, 200.0, behind) * 0.6);
          vec3 c = mix(trail, ow, smoothstep(60.0, 380.0, behind));
          float side = max(-uv.y, uv.y - 1.0) * uPhotoSize.y;
          return mix(c, ow, smoothstep(0.0, 50.0, side));
        }
        vec3 c = photo(uv);
        if (outside > 0.0) c = mix(c, openWater(uv), smoothstep(0.0, 55.0, outside));
        return c;
      }

      void main() {
        vec2 uv = vXZ / uPhotoSize + 0.5;                // the photo is centred on the world origin

        // ship mask: the ship stays perfectly still and sharp; everything else is water that flows
        vec2 sc = vec2(uShipRect.x + uShipRect.y, uShipRect.z + uShipRect.w) * 0.5;
        vec2 sh = vec2(uShipRect.y - uShipRect.x, uShipRect.w - uShipRect.z) * 0.5;
        vec2 dq = (abs(uv - sc) - sh) * uPhotoSize;
        float ship = 1.0 - smoothstep(-2.0, 4.0, max(dq.x, dq.y));
        float water = 1.0 - ship;

        // distance outside the photo, in world units
        vec2 o = max(-uv, uv - 1.0) * uPhotoSize;
        float outside = max(o.x, o.y);

        // flow animation: two copies of the water slide towards the stern and cross-fade,
        // so the waves and the wake keep streaming past the ship without ever jumping
        float speed = 0.2;
        float ph0 = fract(uFlowT * speed), ph1 = fract(uFlowT * speed + 0.5);
        vec2 fl = vec2(FLOW, 0.0) * water;
        // tiny shimmer of the surface
        vec2 nq = uv * vec2(70.0, 128.0);
        vec2 jit = (vec2(noise(nq + uTime * 0.7), noise(nq + 17.0 - uTime * 0.6)) - 0.5) * uTexel * 1.3 * water;
        float w0 = 1.0 - abs(2.0 * ph0 - 1.0);
        vec3 col = sea(uv + fl * ph0 + jit, outside) * w0 + sea(uv + fl * ph1 + jit, outside) * (1.0 - w0);

        // sparkle: the water's brightness breathes a little, like sunlight on moving ripples
        float sp = noise(uv * vec2(150.0, 275.0) + uTime * vec2(0.9, 0.35));
        col *= 1.0 + (sp - 0.5) * 0.14 * water;
        // very large, slow light/dark variation far out, so the extended ocean never looks repeated
        float far = smoothstep(40.0, 260.0, outside);
        col *= 1.0 + (noise(vXZ * 0.0045 + uTime * 0.01) - 0.5) * 0.22 * far;

        col = mix(uWater, col, uReady);                  // plain ocean blue for a moment while the photo loads
        col = mix(col, uMistColor, uMist);               // sea mist on arrival
        gl_FragColor = vec4(col, 1.0);
      }`.replace('FLOW', FLOW_SPEED.toFixed(5))
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), mat);
  mesh.position.y = SEA_Y;
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = -1;

  // load the photo (mirrored edges + mipmaps for smooth zooming)
  new THREE.TextureLoader().load(PHOTO_URL, (tex) => {
    tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    const img = tex.image;
    uniforms.uPhoto.value = tex;
    uniforms.uTexel.value.set(1 / img.width, 1 / img.height);
    uniforms.uPhotoSize.value.set(PHOTO_W, PHOTO_W * img.height / img.width);
    uniforms.ready = true;
  }, undefined, (err) => console.warn('[AboutOcean] could not load', PHOTO_URL, err));

  return { mesh, uniforms };
}

/* ------------------------------------------------------------------ */
/* About-page controller                                              */
/* ------------------------------------------------------------------ */
export class AboutOcean {
  constructor({ scene, camera, cameraRig, terrain, forest, water, atmosphere }) {
    Object.assign(this, { scene, camera, cameraRig, terrain, forest, water, atmosphere });
    this.active = false;
    this.current = 'mountain';
    this.sp = 0;                      // smoothed scroll progress
    this.flowT = 0;                   // water-flow clock (runs faster while scrolling = ship sails)
    this.sailBoost = 0;

    this.sea = makeSea();
    scene.add(this.sea.mesh);

    // ship centre in world space (the photo is centred on the world origin)
    this.shipXZ = new THREE.Vector2();

    this._p = new THREE.Vector3();
    this._t = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._r = new THREE.Vector3();

    // soft vignette like the edges of drone footage; sits under the content cards
    this.vignette = document.createElement('div');
    this.vignette.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;' +
      'background:radial-gradient(ellipse at 50% 45%,rgba(3,14,40,0) 45%,rgba(3,12,34,.35) 80%,rgba(2,8,24,.7) 100%)';
    document.body.appendChild(this.vignette);
  }

  isAboutOpen() {
    const on = (id) => !!document.getElementById(id)?.classList.contains('active');
    return (ENABLED_VIEWS.includes('home') && on('home-view')) ||
           (ENABLED_VIEWS.includes('about') && on('about-view'));
  }

  updateShipCentre() {
    const s = this.sea.uniforms.uPhotoSize.value;
    this.shipXZ.set(((SHIP_RECT[0] + SHIP_RECT[1]) / 2 - 0.5) * s.x, ((SHIP_RECT[2] + SHIP_RECT[3]) / 2 - 0.5) * s.y);
  }

  // camera straight above the water, turned so the ship shows at the key angle and screen position
  aerialPose(t, outPos, outTarget, outUp) {
    const [H, angDeg, sx, sy] = keyAt(t);
    const a = THREE.MathUtils.degToRad(angDeg);
    this._r.set(Math.cos(a), 0, Math.sin(a));          // screen-right on the water
    outUp.set(Math.sin(a), 0, -Math.cos(a));           // screen-up on the water
    const halfH = H * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const halfW = halfH * this.camera.aspect;
    outTarget.set(this.shipXZ.x, SEA_Y, this.shipXZ.y)
      .addScaledVector(this._r, -sx * halfW)
      .addScaledVector(outUp, -sy * halfH);
    outPos.copy(outTarget);
    outPos.y = SEA_Y + H;
  }

  setVisibility(showMtn, showSea) {
    if (this.terrain?.mesh) this.terrain.mesh.visible = showMtn;
    if (this.forest?.instancedMesh) this.forest.instancedMesh.visible = showMtn;
    if (this.water?.mesh) this.water.mesh.visible = showMtn;
    if (this.atmosphere?.skyMesh) this.atmosphere.skyMesh.visible = showMtn;
    if (this.atmosphere?.cloudParticles) this.atmosphere.cloudParticles.visible = showMtn;
    if (this.atmosphere?.snowDust) this.atmosphere.snowDust.visible = showMtn;
    this.sea.mesh.visible = showSea;
  }

  // About is a long scrolling page: scale the wheel speed to its length while it is open,
  // and give the normal speed back when the page closes
  adaptScrollSpeed() {
    const rig = this.cameraRig;
    if (this.baseScrollSpeed === undefined) this.baseScrollSpeed = rig.scrollSpeed;
    const view = document.getElementById('about-view');
    const max = view ? view.offsetHeight - window.innerHeight : 0;
    if (max > 400 && view.classList.contains('m-strip')) {
      rig.scrollSpeed = Math.min(this.baseScrollSpeed, Math.max(0.00012, SCROLL_PX / max));
    } else {
      rig.scrollSpeed = this.baseScrollSpeed;
    }
  }

  exit() {
    if (this.baseScrollSpeed !== undefined) this.cameraRig.scrollSpeed = this.baseScrollSpeed;
    this.active = false;
    this.current = 'mountain';
    this.setVisibility(true, false);
    this.vignette.style.opacity = '0';
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
    const t = this.cameraRig.getProgress();
    if (!this.active) { this.enterAt = elapsed; this.sp = t; }   // page just opened -> start the arrival
    this.active = true;
    this.current = 'ocean';
    this.setVisibility(false, true);
    this.updateShipCentre();

    // extra-soft scroll: glide towards the real scroll position
    const prevSp = this.sp;
    this.sp += (t - this.sp) * (1 - Math.exp(-dt * SCROLL_SMOOTH));
    if ((this._speedTick = (this._speedTick || 0) + 1) % 20 === 1) this.adaptScrollSpeed();

    // the ship "sails": while you scroll, the water streams past it faster, then calms down again
    const vel = dt > 0 ? Math.abs(this.sp - prevSp) / dt : 0;           // progress per second
    const want = Math.min(4, vel * SAIL_BOOST);
    this.sailBoost += (want - this.sailBoost) * (1 - Math.exp(-dt * (want > this.sailBoost ? 6 : 1.5)));
    this.flowT += dt * (1 + this.sailBoost);

    // 0 -> 1 over ARRIVE_SECS after the page opens
    const a = ease(clamp01((elapsed - this.enterAt) / ARRIVE_SECS));

    const cam = this.camera;
    this.aerialPose(this.sp, this._p, this._t, this._up);
    this._p.y += (1 - a) * ARRIVE_LIFT;
    cam.position.copy(this._p);
    cam.up.copy(this._up);
    cam.lookAt(this._t);
    cam.up.set(0, 1, 0);

    // gentle mouse parallax (a slow drone drift)
    const m = this.cameraRig.mouse;
    cam.translateX(m.x * 3.0);
    cam.translateY(m.y * 3.0);

    const u = this.sea.uniforms;
    u.uTime.value = elapsed;
    u.uFlowT.value = this.flowT;
    u.uMist.value = (1 - a) * 0.85;
    if (u.ready) u.uReady.value = Math.min(1, u.uReady.value + dt * 2.5);
    this.vignette.style.opacity = a.toFixed(3);

    // the sea plane always sits under the camera (it is huge, so this just keeps far edges away)
    this.sea.mesh.position.x = 0;
    this.sea.mesh.position.z = 0;
  }
}