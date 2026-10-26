/*
  OliviaOrb.js  -  the 3D glass orb + misty background for Olivia
  ------------------------------------------------------------------
  One full-screen WebGL canvas (no Three.js needed) that draws:
    - a ray-marched glass sphere with glowing gyroid "filaments" inside
    - a colourful, wobbling corona around it
    - expanding ripples while Olivia speaks, an orbiting comet while she thinks
    - soft white/mint smoke drifting behind the chat when she is active
  The orb follows the position/size of a placeholder element (.olivia-orb-wrap),
  so CSS controls the layout (big on desktop, small on mobile).
*/

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  uRes;        // canvas size in px
uniform vec3  uOrb;        // orb centre (px, GL coords) + radius px
uniform float uTime;
uniform float uSpin;       // accumulated rotation
uniform float uEnergy;     // 0..1 inner motion
uniform float uLevel;      // 0..1 voice level (smoothed)
uniform float uActive;     // 0..1 corona + smoke
uniform float uLoading;    // 0..1 thinking comet
uniform float uWake;       // 0..1 colour (0 = sleepy grey-green)
uniform vec2  uPointer;    // -1..1
uniform float uRipple[16]; // voice history for ripples
uniform int   uSteps;

const vec3 C_EMERALD = vec3(0.02, 0.74, 0.45);
const vec3 C_LIME    = vec3(0.55, 0.88, 0.20);
const vec3 C_TEAL    = vec3(0.00, 0.62, 0.58);
const vec3 C_DEEP    = vec3(0.04, 0.45, 0.32);
const vec3 C_MINT    = vec3(0.80, 1.00, 0.89);
const vec3 C_SKY     = vec3(0.25, 0.82, 0.85);

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i), n100 = hash13(i + vec3(1,0,0)), n010 = hash13(i + vec3(0,1,0)), n110 = hash13(i + vec3(1,1,0));
  float n001 = hash13(i + vec3(0,0,1)), n101 = hash13(i + vec3(1,0,1)), n011 = hash13(i + vec3(0,1,1)), n111 = hash13(i + vec3(1,1,1));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y), mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z) * 2.0 - 1.0;
}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for(int i = 0; i < 3; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

vec3 ramp(float t){
  t = fract(t) * 4.0;
  vec3 c = mix(C_EMERALD, C_LIME, smoothstep(0.0, 1.0, t));
  c = mix(c, C_SKY,  smoothstep(1.0, 2.0, t));
  c = mix(c, C_TEAL, smoothstep(2.0, 3.0, t));
  return mix(c, C_EMERALD, smoothstep(3.0, 4.0, t));
}

// premultiplied "over"
void over(inout vec4 dst, vec3 c, float a){ a = clamp(a, 0.0, 1.0); dst.rgb = c * a + dst.rgb * (1.0 - a); dst.a = a + dst.a * (1.0 - a); }

float field(vec3 p, mat2 rA, mat2 rB){
  p *= 2.3;
  p.xy *= rA; p.yz *= rB;
  float g1 = dot(sin(p), cos(p.zxy));
  vec3 q = p * 1.9 + vec3(1.7, -2.1, 0.6);
  q.xz *= rA;
  float g2 = dot(sin(q), cos(q.yzx));
  return min(abs(g1) * 0.55, abs(g2) * 0.42 + 0.08);
}

vec4 smoke(vec2 px){
  if(uActive < 0.01) return vec4(0.0);
  vec2 p = px / max(uRes.x, uRes.y) * 2.4;
  float t = uTime * 0.045;
  float wx = fbm(vec3(p * 1.2, t));
  vec2 q = p + vec2(wx, -wx * 0.7) * 1.4 + vec2(t * 0.6, 0.0);
  float n = fbm(vec3(q * 1.3, t * 1.3 + 4.0));
  float wisp = smoothstep(0.0, 0.5, n);
  float fold = smoothstep(0.12, 0.0, abs(n - 0.22));            // bright ridges
  vec3 col = mix(vec3(1.0), vec3(0.88, 0.98, 0.93), clamp(0.5 - wx, 0.0, 1.0));
  float a = (wisp * 0.8 + fold * 0.35) * uActive;
  return vec4(col * a, a);
}

void main(){
  vec2 px = gl_FragCoord.xy;
  vec4 outc = smoke(px);

  vec2 uv = (px - uOrb.xy) / uOrb.z;   // sphere silhouette at |uv| = 1
  float sr = length(uv);
  float wake = uWake;

  if(sr < 1.75){
    float ang = atan(uv.y, uv.x);
    float t = uTime;

    /* ---------- corona (behind the glass) ---------- */
    if(sr > 0.6){
      vec2 dir = uv / max(sr, 1e-4);
      float corona = 0.0; vec3 ccol = vec3(0.0);
      for(int k = 0; k < 3; k++){
        float fk = float(k);
        float wob = vnoise(vec3(dir * 1.3 + fk * 7.3, uSpin * 0.6 + fk * 3.0));
        float outer = 1.06 + fk * 0.075 + wob * (0.07 + uEnergy * 0.04 + uLevel * 0.10) + uLevel * 0.05 + sin(t * 1.1 + fk) * 0.012;
        float inner = 0.8;
        float band = (1.0 - smoothstep(outer - 0.17, outer, sr)) * smoothstep(inner, inner + 0.14, sr);
        vec3 c = ramp(ang / 6.2831853 + uSpin * 0.08 + fk * 0.31 + wob * 0.05);
        ccol += c * band * (1.0 - fk * 0.22);
        corona += band * (1.0 - fk * 0.22);
      }
      corona = clamp(corona, 0.0, 1.0);
      ccol = ccol / max(corona, 1e-3);
      over(outc, ccol, corona * (0.18 + 0.72 * uActive) * mix(0.55, 1.0, wake));
    }

    /* ---------- voice ripples ---------- */
    if(sr > 1.0 && uLevel > 0.001){
      float d = sr - 1.0;
      float fi = clamp(d / 0.045, 0.0, 15.0);
      float env = 0.0;
      for(int i = 0; i < 16; i++){ env += uRipple[i] * max(0.0, 1.0 - abs(fi - float(i))); }
      float rr = smoothstep(0.05, 0.6, env) * exp(-d * 4.0);
      over(outc, mix(C_EMERALD, C_MINT, 0.4), rr * 0.45);
    }

    /* ---------- glass body (ray-marched) ---------- */
    float D = 3.2;
    vec3 ro = vec3(0.0, 0.0, D);
    vec3 rd = normalize(vec3(uv * 0.3288, -1.0));
    float ry = -uPointer.y * 0.25, rx = uPointer.x * 0.25 + uSpin * 0.35;
    ro.yz *= rot(ry); rd.yz *= rot(ry);
    ro.xz *= rot(rx); rd.xz *= rot(rx);

    float b = dot(ro, rd);
    float c = dot(ro, ro) - 1.0;
    float disc = b * b - c;
    float aa = clamp(disc / max(fwidth(disc), 1e-5) + 0.5, 0.0, 1.0);
    if(disc > 0.0 || aa > 0.0){
      float h = sqrt(max(disc, 0.0));
      float tN = max(0.0, -b - h), tF = -b + h;
      vec3 sn = normalize(ro + rd * tN);
      float facing = clamp(dot(sn, -rd), 0.0, 1.0);
      vec3 L = normalize(vec3(-0.35, 0.55, 0.6));

      // milky glass fill
      vec3 glass = mix(vec3(0.93, 0.99, 0.96), C_MINT, 0.35);
      glass = mix(glass, vec3(0.85, 0.9, 0.88), 1.0 - wake);
      over(outc, glass, (0.30 + 0.15 * (1.0 - facing)) * aa);

      // filaments
      vec3 acc = vec3(0.0); float dens = 0.0;
      float slab = tF - tN;
      float dt = slab / float(uSteps);
      float tt = tN + hash12(px) * dt;
      mat2 rA = rot(t * (0.05 + uEnergy * 0.12) + 0.3);
      mat2 rB = rot(t * (0.035 + uEnergy * 0.08) - 0.2);
      for(int i = 0; i < 48; i++){
        if(i >= uSteps) break;
        vec3 p = ro + rd * tt;
        float dist = length(p);
        float fade = 1.0 - smoothstep(0.78, 0.99, dist);
        float f = field(p * vec3(1.15, 0.85, 1.0), rA, rB);
        float glow = (0.014 + uEnergy * 0.012 + uLevel * 0.014) / (f * f + 0.010);
        float lit = 0.55 + 0.45 * max(dot(normalize(p), L), 0.0);
        vec3 col = ramp(dist * 0.55 + f * 1.2 - t * 0.035 + p.y * 0.2) * lit;
        acc += col * glow * fade * dt;
        dens += glow * fade * dt;
        tt += dt;
      }
      float da = 1.0 - exp(-dens * 1.4);
      vec3 fil = acc / max(dens, 1e-3);
      float luma = dot(fil, vec3(0.299, 0.587, 0.114));
      fil = mix(vec3(luma) * vec3(0.8, 0.92, 0.86), fil, mix(0.25, 1.15, wake));
      fil = mix(fil, fil * fil * 1.25, 0.35);  // deepen mid-tones
      over(outc, fil, da * 0.95 * aa);

      // fresnel rim + inner edge glow
      float fres = pow(1.0 - facing, 3.0);
      vec3 rimC = mix(C_LIME, C_MINT, 0.45);
      rimC = mix(vec3(0.8, 0.86, 0.84), rimC, wake);
      over(outc, rimC, fres * 0.75 * aa);
      // specular highlight
      float spec = pow(max(dot(reflect(rd, sn), L), 0.0), 60.0);
      over(outc, vec3(1.0), spec * 0.9 * aa);
      // soft top-left sheen
      float sheen = smoothstep(0.75, 0.0, length(uv - vec2(-0.38, 0.42))) * 0.22;
      over(outc, vec3(1.0), sheen * aa);
    }

    /* ---------- thinking comet ---------- */
    if(uLoading > 0.01){
      float orbitR = 1.16;
      float head = -t * 2.6;
      float behind = mod(ang - head, 6.2831853);
      float band = exp(-pow((sr - orbitR) / 0.035, 2.0));
      float comet = band * exp(-behind * 1.8);
      over(outc, mix(C_EMERALD, C_LIME, 0.3), comet * uLoading);
    }
  }
  gl_FragColor = outc;
}
`;

export class OliviaOrb {
  /**
   * @param {HTMLCanvasElement} canvas  full-screen canvas
   * @param {HTMLElement} anchor        element whose box defines the orb
   */
  constructor(canvas, anchor) {
    this.canvas = canvas;
    this.anchor = anchor;
    this.ok = false;
    this.running = false;
    this.state = { energy: 0.3, level: 0, active: 0, loading: 0, wake: 0.25 };
    this.target = { energy: 0.3, level: 0, active: 0, loading: 0, wake: 0.25 };
    this.time = Math.random() * 50;
    this.spin = 0;
    this.pointer = [0, 0];
    this.pointerT = [0, 0];
    this.ripple = new Float32Array(16);
    this.rippleAcc = 0;
    this.speakT = 0;
    this.speaking = false;
    const mobile = window.matchMedia('(max-width: 768px)').matches;
    this.steps = mobile ? 24 : 40;
    this.maxDpr = mobile ? 1 : 1.25;
    this.quality = 1;          // lowered automatically on slow devices
    this.slow = 0;
    this.fixedQuality = /[?&]olivia-hq\b/.test(location.search);
    try { this.init(); } catch (e) { console.warn('[Olivia] WebGL orb unavailable', e); this.ok = false; }
    this.loop = this.loop.bind(this);
    this.onMove = (e) => {
      const r = this.anchor.getBoundingClientRect();
      this.pointerT[0] = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      this.pointerT[1] = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
    };
  }

  init() {
    const gl = this.canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'high-performance' });
    if (!gl) return;
    gl.getExtension('OES_standard_derivatives');
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, type === gl.FRAGMENT_SHADER ? '#extension GL_OES_standard_derivatives : enable\n' + src : src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n) => gl.getUniformLocation(prog, n);
    this.u = {
      res: u('uRes'), orb: u('uOrb'), time: u('uTime'), spin: u('uSpin'), energy: u('uEnergy'), level: u('uLevel'),
      active: u('uActive'), loading: u('uLoading'), wake: u('uWake'), pointer: u('uPointer'), ripple: u('uRipple[0]'), steps: u('uSteps')
    };
    gl.clearColor(0, 0, 0, 0);
    this.gl = gl;
    this.ok = true;
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ok = false; });
  }

  /* ---- state API used by Olivia.js ---- */
  setMode(mode) {
    // 'sleep' | 'idle' | 'listening' | 'thinking' | 'speaking'
    const T = this.target;
    T.wake = mode === 'sleep' ? 0.25 : 1;
    T.active = mode === 'sleep' ? 0 : mode === 'idle' ? 0.35 : 1;
    T.energy = mode === 'thinking' ? 0.95 : mode === 'speaking' ? 0.7 : mode === 'listening' ? 0.6 : 0.3;
    T.loading = mode === 'thinking' ? 1 : 0;
    this.speaking = mode === 'speaking';
    if (this.speaking) this.speakT = 0;
    this.mode = mode;
  }
  setLevel(v) { this.extLevel = v; }

  resize() {
    if (!this.ok) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr) * this.quality;
    const w = Math.round(this.canvas.clientWidth * dpr), h = Math.round(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.dpr = dpr;
  }

  start() {
    if (!this.ok || this.running) return;
    this.running = true;
    this.last = performance.now();
    window.addEventListener('pointermove', this.onMove, { passive: true });
    this.resize();
    requestAnimationFrame(this.loop);
  }
  stop() { this.running = false; window.removeEventListener('pointermove', this.onMove); }

  loop(now) {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const raw = (now - this.last) / 1000;
    const dt = Math.min(0.05, raw);
    this.last = now;
    // adaptive quality: if frames are slow for ~1s, render fewer pixels / steps
    if (raw > 0.03 && raw < 1) this.slow += raw; else this.slow = Math.max(0, this.slow - raw * 0.5);
    if (this.slow > 1 && this.quality > 0.5 && !this.fixedQuality) { this.quality -= 0.15; this.steps = Math.max(16, this.steps - 8); this.slow = 0; }
    const S = this.state, T = this.target;
    const k = 1 - Math.exp(-dt * 3);
    for (const key of ['energy', 'active', 'loading', 'wake']) S[key] += (T[key] - S[key]) * k;

    // simulated speech envelope (works with any TTS), or external level
    let lvl = 0;
    if (this.speaking) {
      this.speakT += dt;
      const e = this.speakT;
      const syll = 0.5 + 0.5 * Math.sin(e * 13) * Math.cos(e * 7.7 + 0.4);
      const phrase = Math.max(0, 0.55 + 0.45 * Math.sin(e * 1.7) * Math.sin(e * 0.63 + 1.2));
      lvl = Math.min(1, phrase * (0.35 + 0.65 * syll));
    }
    if (typeof this.extLevel === 'number') lvl = Math.max(lvl, this.extLevel);
    S.level += (lvl - S.level) * (lvl > S.level ? 0.35 : 0.12);
    this.rippleAcc += dt;
    while (this.rippleAcc > 0.05) {
      this.rippleAcc -= 0.05;
      this.ripple.copyWithin(1, 0, 15);
      this.ripple[0] = S.level;
    }
    this.pointer[0] += (this.pointerT[0] - this.pointer[0]) * 0.05;
    this.pointer[1] += (this.pointerT[1] - this.pointer[1]) * 0.05;
    const speed = 0.5 + S.energy * 1.1 + S.level * 0.6;
    this.time += dt * speed;
    this.spin += dt * (0.12 + S.energy * 0.35 + S.level * 0.3);
    this.draw();
  }

  draw() {
    const gl = this.gl;
    this.resize();
    const r = this.anchor.getBoundingClientRect();
    const c = this.canvas.getBoundingClientRect();
    const dpr = this.dpr;
    const cx = (r.left - c.left + r.width / 2) * dpr;
    const cy = (c.height - (r.top - c.top + r.height / 2)) * dpr;
    const rad = (Math.min(r.width, r.height) / 2) * 0.78 * dpr; // leave room for the corona
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const S = this.state, U = this.u;
    gl.uniform2f(U.res, this.canvas.width, this.canvas.height);
    gl.uniform3f(U.orb, cx, cy, Math.max(4, rad));
    gl.uniform1f(U.time, this.time);
    gl.uniform1f(U.spin, this.spin);
    gl.uniform1f(U.energy, S.energy);
    gl.uniform1f(U.level, S.level);
    gl.uniform1f(U.active, S.active);
    gl.uniform1f(U.loading, S.loading);
    gl.uniform1f(U.wake, S.wake);
    gl.uniform2f(U.pointer, this.pointer[0], this.pointer[1]);
    gl.uniform1fv(U.ripple, this.ripple);
    gl.uniform1i(U.steps, this.steps);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}