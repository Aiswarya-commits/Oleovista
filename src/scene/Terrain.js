import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// =====================================================================
//  EXTRA GREEN MOUNTAIN THEMES
//  Each entry is one look for the mountain. Numbers are colour multipliers
//  (R, G, B) applied on the rock texture - bigger G = greener.
//  To add another theme: copy one block, give it a new name, change numbers,
//  then add the same name to Atmosphere.js (setPreset), UIManager.js (THEMES)
//  and a <button data-time="name"> in the LIGHT dropdown in index.html.
// =====================================================================
export const GREEN_THEMES = {
  // Services page - pale cool mint with silver mist
  mint: {
    meadow:   [0.85, 1.55, 1.05],
    slope:    [0.55, 1.25, 0.85],
    crevasse: [0.20, 0.50, 0.38],
    cliff:    [0.55, 0.68, 0.62],
    summit:   [0.92, 1.00, 0.96],
    drift:    [0.80, 1.10, 0.95],
    sun:      [1.05, 1.18, 1.02],
    shadow:   [0.20, 0.36, 0.32],
    rim:      [0.70, 1.25, 1.00],
    ripple:   [0.45, 1.10, 0.85],
    pulse:    [0.05, 0.22, 0.16]
  },
  // Careers page - deep evergreen pine forest at dusk
  pine: {
    meadow:   [0.30, 0.95, 0.40],
    slope:    [0.16, 0.70, 0.28],
    crevasse: [0.04, 0.22, 0.08],
    cliff:    [0.26, 0.34, 0.28],
    summit:   [0.80, 0.92, 0.84],
    drift:    [0.55, 0.95, 0.60],
    sun:      [0.95, 1.22, 0.90],
    shadow:   [0.06, 0.20, 0.10],
    rim:      [0.45, 1.15, 0.55],
    ripple:   [0.30, 1.05, 0.45],
    pulse:    [0.03, 0.18, 0.06]
  },
  // Careers page - fresh bright spring green under a golden sunrise
  spring: {
    meadow:   [0.75, 1.75, 0.35],
    slope:    [0.45, 1.35, 0.25],
    crevasse: [0.12, 0.42, 0.10],
    cliff:    [0.45, 0.52, 0.38],
    summit:   [0.98, 1.00, 0.90],
    drift:    [0.95, 1.15, 0.55],
    sun:      [1.25, 1.15, 0.80],
    shadow:   [0.20, 0.34, 0.18],
    rim:      [1.00, 1.10, 0.45],
    ripple:   [0.60, 1.20, 0.35],
    pulse:    [0.08, 0.22, 0.05]
  },
  // Extra - warm golden olive hills
  olive: {
    meadow:   [1.30, 1.32, 0.40],
    slope:    [0.92, 0.96, 0.30],
    crevasse: [0.30, 0.32, 0.12],
    cliff:    [0.52, 0.50, 0.38],
    summit:   [0.95, 0.93, 0.82],
    drift:    [1.05, 1.00, 0.55],
    sun:      [1.20, 1.10, 0.75],
    shadow:   [0.26, 0.28, 0.14],
    rim:      [1.00, 0.95, 0.45],
    ripple:   [0.85, 0.95, 0.40],
    pulse:    [0.16, 0.16, 0.05]
  },
  // Extra - soft dusty sage grey-green
  sage: {
    meadow:   [0.85, 1.15, 0.72],
    slope:    [0.62, 0.88, 0.56],
    crevasse: [0.26, 0.34, 0.24],
    cliff:    [0.50, 0.54, 0.48],
    summit:   [0.90, 0.92, 0.88],
    drift:    [0.90, 1.00, 0.85],
    sun:      [1.10, 1.12, 0.98],
    shadow:   [0.24, 0.30, 0.24],
    rim:      [0.80, 0.95, 0.70],
    ripple:   [0.60, 0.90, 0.60],
    pulse:    [0.10, 0.14, 0.09]
  }
};
const THEME_KEYS = ['meadow', 'slope', 'crevasse', 'cliff', 'summit', 'drift', 'sun', 'shadow', 'rim', 'ripple', 'pulse'];
const uName = (k) => 'uC' + k.charAt(0).toUpperCase() + k.slice(1);

export class Terrain {
  constructor(scene, loadingManager) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    this.mesh = null;
    this.targetGreenery = 1.0; // Default to lush greenery mountain matching user logo
    this.targetAboutTheme = 0.0; // Deep Jade Green Theme for About page
    this.targetContactTheme = 0.0; // Aurora Emerald Cyber Theme for Contact page
    this.targetCustomTheme = 0.0;  // Extra green themes (Mint / Pine / Olive / Sage)
    this.customThemeName = 'mint';
    this.customTargets = {};
    this.uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uHoverPos: { value: new THREE.Vector3(0, 0, 0) },
      uHoverStrength: { value: 0.0 },
      uSunDirection: { value: new THREE.Vector3(0.6, 0.75, -0.3).normalize() },
      uGreenery: { value: 1.0 },
      uAboutTheme: { value: 0.0 },
      uContactTheme: { value: 0.0 },
      uCustomTheme: { value: 0.0 },
      uLightmap: { value: null },
      uRockDiffuse: { value: null },
      uRockNormal: { value: null },
      uSnowRockMix: { value: null },
      uPerlin: { value: null },
      uNoise: { value: null }
    };
    // colour uniforms for the extra green themes (start on Mint)
    THEME_KEYS.forEach((k) => {
      const v = GREEN_THEMES.mint[k];
      this.uniforms[uName(k)] = { value: new THREE.Vector3(v[0], v[1], v[2]) };
      this.customTargets[k] = new THREE.Vector3(v[0], v[1], v[2]);
    });
  }

  async load() {
    const texLoader = new THREE.TextureLoader(this.loadingManager);
    
    const [
      lightmap,
      rockDiffuse,
      rockNormal,
      snowRockMix,
      perlinNoise,
      noise
    ] = await Promise.all([
      texLoader.loadAsync('/assets/textures/trading-lightmap.webp'),
      texLoader.loadAsync('/assets/textures/rock_diffuse.webp'),
      texLoader.loadAsync('/assets/textures/rock_normal.webp'),
      texLoader.loadAsync('/assets/textures/snowRockMix.webp'),
      texLoader.loadAsync('/assets/textures/perlinNoise.webp'),
      texLoader.loadAsync('/assets/textures/noise.webp')
    ]);

    [rockDiffuse, rockNormal, perlinNoise, noise].forEach(t => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
    });

    this.uniforms.uLightmap.value = lightmap;
    this.uniforms.uRockDiffuse.value = rockDiffuse;
    this.uniforms.uRockNormal.value = rockNormal;
    this.uniforms.uSnowRockMix.value = snowRockMix;
    this.uniforms.uPerlin.value = perlinNoise;
    this.uniforms.uNoise.value = noise;

    const gltfLoader = new GLTFLoader(this.loadingManager);
    if (gltfLoader.manager && !gltfLoader.manager.abortController) {
      gltfLoader.manager.abortController = new AbortController();
    }
    const gltf = await gltfLoader.loadAsync('/assets/models/mountains.glb');
    
    // Find the Mountain mesh
    let mountainMesh = null;
    gltf.scene.traverse(child => {
      if (child.isMesh && (child.name.includes('Mountain') || child.name.includes('Mesher'))) {
        mountainMesh = child;
      }
    });

    if (!mountainMesh) {
      console.warn('Mountain mesh not found by name, using largest mesh');
      let maxVerts = 0;
      gltf.scene.traverse(child => {
        if (child.isMesh && child.geometry?.attributes?.position?.count > maxVerts) {
          maxVerts = child.geometry.attributes.position.count;
          mountainMesh = child;
        }
      });
    }

    if (mountainMesh) {
      this.setupMaterial(mountainMesh);
      mountainMesh.castShadow = true;
      mountainMesh.receiveShadow = true;
      this.mesh = mountainMesh;
      this.scene.add(mountainMesh);
    }

    return this.mesh;
  }

  setupMaterial(mesh) {
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.1,
      color: 0xffffff
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      shader.uniforms.uMouse = this.uniforms.uMouse;
      shader.uniforms.uHoverPos = this.uniforms.uHoverPos;
      shader.uniforms.uHoverStrength = this.uniforms.uHoverStrength;
      shader.uniforms.uSunDirection = this.uniforms.uSunDirection;
      shader.uniforms.uGreenery = this.uniforms.uGreenery;
      shader.uniforms.uAboutTheme = this.uniforms.uAboutTheme;
      shader.uniforms.uContactTheme = this.uniforms.uContactTheme;
      shader.uniforms.uCustomTheme = this.uniforms.uCustomTheme;
      THEME_KEYS.forEach((k) => { shader.uniforms[uName(k)] = this.uniforms[uName(k)]; });
      shader.uniforms.uLightmap = this.uniforms.uLightmap;
      shader.uniforms.uRockDiffuse = this.uniforms.uRockDiffuse;
      shader.uniforms.uRockNormal = this.uniforms.uRockNormal;
      shader.uniforms.uSnowRockMix = this.uniforms.uSnowRockMix;
      shader.uniforms.uPerlin = this.uniforms.uPerlin;
      shader.uniforms.uNoise = this.uniforms.uNoise;

      shader.vertexShader = `
        varying vec3 vWorldPosition;
        varying vec3 vObjectPosition;
        varying vec3 vTerrainNormal;
        varying vec2 vTerrainUv;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vObjectPosition = position;
        vTerrainNormal = normal;
        vTerrainUv = uv;
        `
      );

      shader.fragmentShader = `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec3 uHoverPos;
        uniform float uHoverStrength;
        uniform vec3 uSunDirection;
        uniform float uGreenery;
        uniform float uAboutTheme;
        uniform float uContactTheme;
        uniform float uCustomTheme;
        uniform vec3 uCMeadow;
        uniform vec3 uCSlope;
        uniform vec3 uCCrevasse;
        uniform vec3 uCCliff;
        uniform vec3 uCSummit;
        uniform vec3 uCDrift;
        uniform vec3 uCSun;
        uniform vec3 uCShadow;
        uniform vec3 uCRim;
        uniform vec3 uCRipple;
        uniform vec3 uCPulse;
        uniform sampler2D uLightmap;
        uniform sampler2D uRockDiffuse;
        uniform sampler2D uRockNormal;
        uniform sampler2D uSnowRockMix;
        uniform sampler2D uPerlin;
        uniform sampler2D uNoise;

        varying vec3 vWorldPosition;
        varying vec3 vObjectPosition;
        varying vec3 vTerrainNormal;
        varying vec2 vTerrainUv;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        // 1. Slope angle calculation
        vec3 norm = normalize(vTerrainNormal);
        float slope = 1.0 - clamp(norm.y, 0.0, 1.0); // 0 = flat meadow/plateau, 1 = vertical cliff

        // 2. High frequency rock detail normal and texture
        vec2 rockUv = vTerrainUv * 25.0;
        vec3 rockTex = texture2D(uRockDiffuse, rockUv).rgb;
        vec3 rockNorm = texture2D(uRockNormal, rockUv).rgb * 2.0 - 1.0;

        // 3. Snow vs Rock blend
        vec4 mixSample = texture2D(uSnowRockMix, vTerrainUv);
        float snowFactor = smoothstep(0.7, 0.25, slope + mixSample.r * 0.4);

        // Elevation-based altitude line
        float altitude = clamp((vObjectPosition.y + 30.0) / 70.0, 0.0, 1.0);
        snowFactor = clamp(snowFactor * (0.6 + 0.5 * altitude), 0.0, 1.0);

        // --- A. CLASSIC SWISS ALPINE PALETTE (Dawn/Sunset/Night) ---
        vec3 snowColorClassic = vec3(0.92, 0.95, 0.99);
        vec3 rockColorClassic = rockTex * vec3(0.42, 0.45, 0.48);
        vec3 classicTerrain = mix(rockColorClassic, snowColorClassic, snowFactor);

        // --- B. LUSH OLEOVISTA GREENERY PALETTE (Initial Landing Page State) ---
        vec3 emeraldGrass = rockTex * vec3(0.70, 1.50, 0.52);
        vec3 sunlitMeadow = rockTex * vec3(1.18, 1.68, 0.62);
        vec3 mossyCrevasse = rockTex * vec3(0.38, 0.78, 0.30);

        float macroNoise = texture2D(uPerlin, vTerrainUv * 3.5).r;
        vec3 greenSlope = mix(mossyCrevasse, emeraldGrass, smoothstep(0.25, 0.65, macroNoise));
        greenSlope = mix(greenSlope, sunlitMeadow, smoothstep(0.55, 0.85, macroNoise) * (1.0 - slope));

        vec3 greenCliffRock = rockTex * vec3(0.48, 0.54, 0.42);
        float summitVeins = smoothstep(0.65, 0.95, altitude) * smoothstep(0.35, 0.65, mixSample.r);
        greenCliffRock = mix(greenCliffRock, vec3(0.90, 0.94, 0.94), summitVeins * 0.75);

        float greenVegetationFactor = smoothstep(0.65, 0.25, slope + mixSample.r * 0.35);
        vec3 greenTerrain = mix(greenCliffRock, greenSlope, greenVegetationFactor);

        // --- C. OLEOVISTA DEEP JADE GREEN PALETTE (About Company Mode) ---
        // (variable names kept the same as before, only the colour numbers are now jade green)
        vec3 cyanGlowMeadow = rockTex * vec3(0.30, 1.55, 0.95);      // bright jade meadow
        vec3 sapphireSlope = rockTex * vec3(0.12, 1.00, 0.55);       // deep jade slope
        vec3 deepOceanCrevasse = rockTex * vec3(0.03, 0.34, 0.20);   // forest-dark crevasse

        vec3 aboutSlope = mix(deepOceanCrevasse, sapphireSlope, smoothstep(0.25, 0.65, macroNoise));
        aboutSlope = mix(aboutSlope, cyanGlowMeadow, smoothstep(0.55, 0.85, macroNoise) * (1.0 - slope));

        vec3 aboutCliffRock = rockTex * vec3(0.22, 0.42, 0.34);
        aboutCliffRock = mix(aboutCliffRock, vec3(0.72, 1.15, 0.90), summitVeins * 0.9);

        float aboutVegetationFactor = smoothstep(0.65, 0.25, slope + mixSample.r * 0.35);
        vec3 aboutTerrain = mix(aboutCliffRock, aboutSlope, aboutVegetationFactor);

        // Blend base classic/green terrain, then smoothly into About Theme, then into Contact Theme:
        vec3 baseTerrain = mix(classicTerrain, greenTerrain, uGreenery);
        vec3 terrainWithAbout = mix(baseTerrain, aboutTerrain, uAboutTheme);

        // --- D. CONTACT THEME: AURORA EMERALD CYBER PALETTE ---
        vec3 cyberEmerald = rockTex * vec3(0.08, 1.85, 0.75);
        vec3 neonMintSlope = rockTex * vec3(0.12, 1.45, 0.90);
        vec3 darkObsidianCrevasse = rockTex * vec3(0.04, 0.14, 0.10);

        vec3 contactSlope = mix(darkObsidianCrevasse, neonMintSlope, smoothstep(0.25, 0.65, macroNoise));
        contactSlope = mix(contactSlope, cyberEmerald, smoothstep(0.55, 0.85, macroNoise) * (1.0 - slope));

        vec3 contactCliffRock = rockTex * vec3(0.16, 0.28, 0.22);
        contactCliffRock = mix(contactCliffRock, vec3(0.25, 0.95, 0.65), summitVeins * 0.95);

        float contactVegetationFactor = smoothstep(0.65, 0.25, slope + mixSample.r * 0.35);
        vec3 contactTerrain = mix(contactCliffRock, contactSlope, contactVegetationFactor);
        vec3 terrainColor = mix(terrainWithAbout, contactTerrain, uContactTheme);

        // --- E. EXTRA GREEN THEMES (Mint / Pine / Olive / Sage) ---
        vec3 cSlope = mix(rockTex * uCCrevasse, rockTex * uCSlope, smoothstep(0.25, 0.65, macroNoise));
        cSlope = mix(cSlope, rockTex * uCMeadow, smoothstep(0.55, 0.85, macroNoise) * (1.0 - slope));
        vec3 cCliff = mix(rockTex * uCCliff, uCSummit, summitVeins * 0.85);
        vec3 customTerrain = mix(cCliff, cSlope, smoothstep(0.65, 0.25, slope + mixSample.r * 0.35));
        terrainColor = mix(terrainColor, customTerrain, uCustomTheme);

        // 4. Windy blowing drifts (Snow drift in classic mode, Golden grass shimmer in green mode, Jade crystals in about mode, Neon emerald in contact mode)
        vec2 windUv = vTerrainUv * vec2(2.0, 12.0) + vec2(uTime * 0.02, uTime * 0.005);
        float windDrift = texture2D(uPerlin, windUv).r;
        windDrift = smoothstep(0.55, 0.95, windDrift);
        vec3 driftColor = mix(
          mix(mix(vec3(0.95, 0.98, 1.0), vec3(0.85, 1.05, 0.5), uGreenery), vec3(0.60, 1.10, 0.80), uAboutTheme),
          vec3(0.15, 1.15, 0.65),
          uContactTheme
        );
        driftColor = mix(driftColor, uCDrift, uCustomTheme);
        terrainColor += windDrift * (0.35 + 0.25 * max(max(uAboutTheme, uContactTheme), uCustomTheme)) * snowFactor * driftColor;

        // 5. Lightmap tinting (baked ambient lighting)
        vec4 lmSample = texture2D(uLightmap, vTerrainUv);
        vec3 dawnSun = mix(
          mix(mix(vec3(1.0, 0.75, 0.55), vec3(1.15, 1.08, 0.85), uGreenery), vec3(0.80, 1.30, 0.95), uAboutTheme),
          vec3(0.25, 1.35, 0.85),
          uContactTheme
        );
        vec3 slateShadow = mix(
          mix(mix(vec3(0.25, 0.34, 0.44), vec3(0.24, 0.38, 0.25), uGreenery), vec3(0.04, 0.26, 0.18), uAboutTheme),
          vec3(0.04, 0.18, 0.14),
          uContactTheme
        );
        dawnSun = mix(dawnSun, uCSun, uCustomTheme);
        slateShadow = mix(slateShadow, uCShadow, uCustomTheme);
        vec3 ambientAtmosphere = mix(slateShadow, dawnSun, smoothstep(0.2, 0.85, lmSample.r));
        ambientAtmosphere *= 1.0 + 0.55 * max(max(max(uGreenery, uAboutTheme), uContactTheme), uCustomTheme) * smoothstep(0.5, 0.9, lmSample.r);
        terrainColor *= ambientAtmosphere * 1.6;

        // 6. Luminous Rim Lighting (Sun Scattering in Greenery, Jade Glow in About, Emerald Glow in Contact)
        if (uGreenery > 0.01 || uAboutTheme > 0.01 || uContactTheme > 0.01 || uCustomTheme > 0.01) {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          vec3 sunDir = normalize(uSunDirection);
          float fresnel = pow(1.0 - max(0.0, dot(viewDir, norm)), 3.0);
          float sunAlign = max(0.0, dot(sunDir, -viewDir) + 0.4);
          float rimScatter = fresnel * sunAlign * max(0.0, dot(norm, sunDir) + 0.2);
          vec3 greenRim = vec3(0.82, 1.05, 0.48) * uGreenery;
          vec3 aboutRim = vec3(0.35, 1.40, 0.85) * uAboutTheme;
          vec3 contactRim = vec3(0.15, 1.45, 0.75) * uContactTheme;
          vec3 customRim = uCRim * uCustomTheme;
          vec3 rimColor = (greenRim + aboutRim + contactRim + customRim) * rimScatter * 1.8;
          terrainColor += rimColor;
        }

        // 7. Interactive mouse wireframe grid ripple
        float distToHover = length(vWorldPosition - uHoverPos);
        float ripple = smoothstep(25.0, 0.0, distToHover) * uHoverStrength;
        if (ripple > 0.01) {
          vec2 gridUv = fract(vWorldPosition.xz * 0.25);
          float line = step(0.92, gridUv.x) + step(0.92, gridUv.y);
          vec3 rippleColor = mix(
            mix(mix(vec3(0.35, 0.75, 1.0), vec3(0.40, 0.95, 0.65), uGreenery), vec3(0.25, 1.20, 0.75), uAboutTheme),
            vec3(0.15, 1.20, 0.60),
            uContactTheme
          );
          rippleColor = mix(rippleColor, uCRipple, uCustomTheme);
          terrainColor = mix(terrainColor, rippleColor, ripple * line * 0.8);
          vec3 pulseGlow = mix(
            mix(mix(vec3(0.05, 0.15, 0.3), vec3(0.06, 0.20, 0.12), uGreenery), vec3(0.03, 0.28, 0.16), uAboutTheme),
            vec3(0.02, 0.22, 0.14),
            uContactTheme
          );
          pulseGlow = mix(pulseGlow, uCPulse, uCustomTheme);
          terrainColor += pulseGlow * ripple;
        }

        diffuseColor = vec4(terrainColor, 1.0);
        `
      );
    };

    mesh.material = material;
  }

  setGreenery(val) {
    this.targetGreenery = val;
    if (val > 0.5) {
      this.targetAboutTheme = 0.0;
      this.targetContactTheme = 0.0;
      this.targetCustomTheme = 0.0;
    }
  }

  setAboutTheme(val) {
    this.targetAboutTheme = val;
    if (val > 0.5) {
      this.targetGreenery = 0.0;
      this.targetContactTheme = 0.0;
      this.targetCustomTheme = 0.0;
    }
  }

  setContactTheme(val) {
    this.targetContactTheme = val;
    if (val > 0.5) {
      this.targetGreenery = 0.0;
      this.targetAboutTheme = 0.0;
      this.targetCustomTheme = 0.0;
    }
  }

  // One call for every LIGHT theme name:
  //   greenery, jade (= about), aurora (= contact), day / dawn, sunset, night,
  //   and the extra greens in GREEN_THEMES (mint, pine, olive, sage ...)
  setTheme(name) {
    const n = (name || '').toLowerCase();
    if (n === 'greenery') return this.setGreenery(1.0);
    if (n === 'jade' || n === 'about') return this.setAboutTheme(1.0);
    if (n === 'aurora' || n === 'contact') return this.setContactTheme(1.0);
    this.targetGreenery = 0.0;
    this.targetAboutTheme = 0.0;
    this.targetContactTheme = 0.0;
    const pal = GREEN_THEMES[n];
    if (!pal) { this.targetCustomTheme = 0.0; return; } // day / sunset / night = classic snowy mountain
    const wasOff = this.uniforms.uCustomTheme.value < 0.02;
    this.customThemeName = n;
    this.targetCustomTheme = 1.0;
    THEME_KEYS.forEach((k) => {
      this.customTargets[k].set(pal[k][0], pal[k][1], pal[k][2]);
      if (wasOff) this.uniforms[uName(k)].value.copy(this.customTargets[k]);
    });
  }

  // jump straight to the current target colours (used while the page fade covers the screen)
  snapTheme() {
    this.uniforms.uGreenery.value = this.targetGreenery;
    this.uniforms.uAboutTheme.value = this.targetAboutTheme;
    this.uniforms.uContactTheme.value = this.targetContactTheme;
    this.uniforms.uCustomTheme.value = this.targetCustomTheme;
    THEME_KEYS.forEach((k) => this.uniforms[uName(k)].value.copy(this.customTargets[k]));
  }

  update(dt, elapsedTime, mouseWorldPos, mouseHoverStrength) {
    this.uniforms.uTime.value = elapsedTime;
    this.uniforms.uGreenery.value = THREE.MathUtils.lerp(
      this.uniforms.uGreenery.value,
      this.targetGreenery,
      dt * 3.5
    );
    this.uniforms.uAboutTheme.value = THREE.MathUtils.lerp(
      this.uniforms.uAboutTheme.value,
      this.targetAboutTheme,
      dt * 3.5
    );
    this.uniforms.uContactTheme.value = THREE.MathUtils.lerp(
      this.uniforms.uContactTheme.value,
      this.targetContactTheme,
      dt * 3.5
    );
    this.uniforms.uCustomTheme.value = THREE.MathUtils.lerp(
      this.uniforms.uCustomTheme.value,
      this.targetCustomTheme,
      dt * 3.5
    );
    const colLerp = Math.min(1.0, dt * 3.5);
    THEME_KEYS.forEach((k) => this.uniforms[uName(k)].value.lerp(this.customTargets[k], colLerp));
    if (mouseWorldPos) {
      this.uniforms.uHoverPos.value.lerp(mouseWorldPos, 0.1);
    }
    this.uniforms.uHoverStrength.value = THREE.MathUtils.lerp(
      this.uniforms.uHoverStrength.value,
      mouseHoverStrength,
      0.1
    );
  }
}