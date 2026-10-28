import * as THREE from 'three';
import { Terrain } from './scene/Terrain.js';
import { Forest } from './scene/Forest.js';
import { Atmosphere } from './scene/Atmosphere.js';
import { Water } from './scene/Water.js';
import { TradingObjects } from './scene/TradingObjects.js';
import { CameraRig } from './scene/CameraRig.js';
import { SoundManager } from './audio/SoundManager.js';
import { UIManager } from './ui/UIManager.js';
import { AboutOcean } from './scene/Aboutocean.js';
import { ServicesHolo } from './scene/Servicesholo.js';
import { CareersGlobe } from './scene/Careersglobe.js';
import { TeamMeadow } from './scene/Teammeadow.js';
import { ContactNetwork } from './scene/Contactnetwork.js';
import { MobileSmoothScroll } from './ui/Mobilesmoothscroll.js';
import { OliviaAssistant } from './ui/Olivia.js';
import { HomeParticles } from './home/HomeParticles.js';
class App {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouseCoords = new THREE.Vector2(-999, -999);
    this.hoverPos = new THREE.Vector3(0, 0, 0);
    this.hoverStrength = 0;

    this.initThree();
    this.initScene();
    this.initEvents();
  }

  initThree() {
    if (THREE.DefaultLoadingManager && !THREE.DefaultLoadingManager.abortController) {
      THREE.DefaultLoadingManager.abortController = new AbortController();
    }

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.5,
      2000
    );

    // 3. Scene
    this.scene = new THREE.Scene();
    // Montfort atmospheric alpine fog blending mountains into the horizon
    this.scene.fog = new THREE.FogExp2('#6e8e86', 0.0018);
  }

  async initScene() {
    // Loading Manager
    const loadingManager = new THREE.LoadingManager();
    if (!loadingManager.abortController) {
      loadingManager.abortController = new AbortController();
    }
    let loadedCount = 0;
    const totalEst = 10;

    loadingManager.onProgress = (url, loaded, total) => {
      loadedCount = loaded;
      this.uiManager?.updateProgress(loaded, total || totalEst);
    };

    // Subsystems
    this.atmosphere = new Atmosphere(this.scene);
    this.water = new Water(this.scene);
    this.cameraRig = new CameraRig(this.camera, this.renderer.domElement);

    const soundCanvas = document.getElementById('sound-canvas');
    this.soundManager = new SoundManager(soundCanvas);

    // Load 3D Terrain
    this.terrain = new Terrain(this.scene, loadingManager);
    this.tradingObjects = new TradingObjects(this.scene, loadingManager);
    this.uiManager = new UIManager(this.cameraRig, this.soundManager, this.atmosphere, this.terrain, this.water, this.tradingObjects);
    this.mobileSmoothScroll = new MobileSmoothScroll(this.cameraRig);

    // Olivia AI assistant (created after UIManager, so she knows which page is open)
    this.olivia = new OliviaAssistant({ uiManager: this.uiManager });

    // Home page: particle animation (replaces the mountain on Home only)
    this.homeParticles = new HomeParticles();

        // Default look: Dawn (applied instantly, so there is no fade from Greenery on load)
    this.atmosphere.setPreset('day');
    this.atmosphere.update(1, 0);
    this.water.setPreset('day');
    this.water.update(1, 0);
    this.terrain.setGreenery(0);
    this.terrain.uniforms.uGreenery.value = 0;
    // Load 3D Terrain & Trading 3D Assets concurrently
    const [terrainMesh] = await Promise.all([
      this.terrain.load(),
      this.tradingObjects.load()
    ]);

    // Generate Pine Forest on mountain slopes (fast precomputed layout)
    this.forest = new Forest(this.scene, terrainMesh);
    this.forest.generateForest(1500);

    this.aboutOcean = new AboutOcean({
      scene: this.scene, camera: this.camera, cameraRig: this.cameraRig,
      terrain: this.terrain, forest: this.forest, water: this.water, atmosphere: this.atmosphere
    });

    this.servicesHolo = new ServicesHolo({
      scene: this.scene, camera: this.camera, cameraRig: this.cameraRig,
      terrain: this.terrain, forest: this.forest, water: this.water, atmosphere: this.atmosphere
    });

    this.careersGlobe = new CareersGlobe({
      scene: this.scene, camera: this.camera, cameraRig: this.cameraRig,
      terrain: this.terrain, forest: this.forest, water: this.water, atmosphere: this.atmosphere
    });

    this.teamMeadow = new TeamMeadow({
      scene: this.scene, camera: this.camera, cameraRig: this.cameraRig,
      terrain: this.terrain, forest: this.forest, water: this.water, atmosphere: this.atmosphere
    });

    this.contactNetwork = new ContactNetwork({
      scene: this.scene, camera: this.camera, cameraRig: this.cameraRig,
      terrain: this.terrain, forest: this.forest, water: this.water, atmosphere: this.atmosphere
    });

    // Prepare every page's 3D world now, behind the loading screen, so switching pages never freezes
    if (this.uiManager.loaderText) this.uiManager.loaderText.textContent = 'Preparing 3D scenes...';
    await this.prewarmScenes();

    // Complete loading
    this.uiManager.updateProgress(1, 1);
    this.uiManager.onLoaded();

    // Start render loop
    this.animate();
  }

  /*
    PERFORMANCE: without this, the first visit to each page froze the screen for a few seconds
    (About: the photo-sea shader being compiled for the GPU; Careers / Team / Contact: their 3D worlds
    and textures being built). Doing it all once during the loading screen makes every page switch instant.
  */
  async prewarmScenes() {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
      // 1. let the About photo finish loading (max 3 s), so it can be uploaded to the GPU now
      for (let i = 0; i < 30 && !this.aboutOcean?.sea?.uniforms?.ready; i++) await wait(100);

      // 2. build the worlds that are normally created on first visit
      for (const c of [this.careersGlobe, this.teamMeadow, this.contactNetwork]) {
        try { if (c && !c.built && typeof c.build === 'function') c.build(); } catch (e) { console.warn('[prewarm] build failed', e); }
        await wait(0);                                   // let the loading screen repaint between builds
      }

      // 3. briefly show every hidden 3D object, compile all shaders and upload all textures, then hide again
      const hidden = [];
      this.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
      if (typeof this.renderer.compileAsync === 'function') await this.renderer.compileAsync(this.scene, this.camera);
      else this.renderer.compile(this.scene, this.camera);
      const seen = new Set();
      this.scene.traverse((o) => {
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => {
          const texs = [m.map, ...Object.values(m.uniforms || {}).map((u) => u && u.value)];
          texs.forEach((t) => { if (t && t.isTexture && !seen.has(t)) { seen.add(t); this.renderer.initTexture(t); } });
        });
      });
      hidden.forEach((o) => { o.visible = false; });
    } catch (e) {
      console.warn('[prewarm] skipped:', e);   // never block the site; pages will just prepare on first visit
    }
  }

  initEvents() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseCoords.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseCoords.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // Home page shows the particle animation: the mountain world is hidden, so skip all its work
    if (this.homeParticles?.active) {
      this.uiManager?.update(dt, elapsed);
      this.soundManager?.drawVisualizer(elapsed);
      return;
    }

    // Raycast mouse to terrain for interactive wireframe ripple
    if (this.terrain?.mesh && this.aboutOcean?.current !== 'ocean' && this.servicesHolo?.current !== 'holo' && this.careersGlobe?.current !== 'globe' && this.teamMeadow?.current !== 'meadow' && this.contactNetwork?.current !== 'network') {
      this.raycaster.setFromCamera(this.mouseCoords, this.camera);
      const hits = this.raycaster.intersectObject(this.terrain.mesh, false);
      if (hits.length > 0) {
        this.hoverPos.copy(hits[0].point);
        this.hoverStrength = 1.0;
      } else {
        this.hoverStrength = 0.0;
      }
    }

    // Update subsystems
    this.cameraRig?.update(dt);
    this.mobileSmoothScroll?.update(dt);   // smooth continuous scroll on phones
    this.terrain?.update(dt, elapsed, this.hoverPos, this.hoverStrength);
    this.forest?.update(dt, elapsed);
    this.atmosphere?.update(dt, elapsed);
    this.water?.update(dt, elapsed);

    const scrollProg = this.cameraRig?.getProgress() || 0;
    this.tradingObjects?.update(dt, elapsed, scrollProg);
    this.uiManager?.update(dt, elapsed);
    this.soundManager?.drawVisualizer(elapsed);
    this.aboutOcean?.update(dt, elapsed);   // About Us sea + tanker (does nothing on other pages)
    this.servicesHolo?.update(dt, elapsed); // Services hologram world (does nothing on other pages)
    this.careersGlobe?.update(dt, elapsed); // Careers Earth globe (does nothing on other pages)
    this.teamMeadow?.update(dt, elapsed);   // Team meadow surface (does nothing on other pages)
    this.contactNetwork?.update(dt, elapsed); // Contact 3D connectivity network (does nothing on other pages)

    // PERFORMANCE: the Team meadow is drawn as 16 full-screen grass layers, so on high-DPI /
    // scaled laptop screens render it at a slightly lower resolution (invisible on grass).
    // Other pages keep full sharpness. setPixelRatio only runs when the value actually changes.
    const maxRatio = this.teamMeadow?.current === 'meadow' ? 1.25 : 2;
    const ratio = Math.min(window.devicePixelRatio, maxRatio);
    if (this.renderer.getPixelRatio() !== ratio) this.renderer.setPixelRatio(ratio);

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new App();
});