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
    // FAST LOADING: the mountain, its 1500 trees and the floating barrels were only used by the old
    // Home page. Home is now the particle animation and every other page has its own 3D world, so they
    // are no longer loaded (this was the slow part of the loading screen and caused freezes).
    // They are only loaded if the particle Home page cannot start (then Home shows the mountain as before).
    if (this.homeParticles.disabled) {
      const [terrainMesh] = await Promise.all([
        this.terrain.load(),
        this.tradingObjects.load()
      ]);
      this.forest = new Forest(this.scene, terrainMesh);
      this.forest.generateForest(1500);
    }

    // FAST START: Home (the particle animation) is shown right away. The other pages' 3D worlds are
    // prepared afterwards in small steps, once the Home intro has played, so Home never stutters.
    // If a visitor opens a page before that is finished, that page is built on the spot (no loading screen).
    this.ready = false;
    this.rush = false;
    const fastStart = !this.homeParticles.disabled;
    if (fastStart) {
      this.uiManager.updateProgress(1, 1);
      this.uiManager.onLoaded();
      this.animate();
      await this.homePause(4500);
    }
    const step = () => this.idleStep(fastStart);

    for (const name of ['aboutOcean', 'servicesHolo', 'careersGlobe', 'teamMeadow', 'contactNetwork']) {
      this.makeWorld(name);
      if (name === 'careersGlobe') this.careersGlobe?.prepareTextures?.();   // paints the Earth on a background thread
      await step();
    }

    if (!fastStart && this.uiManager.loaderText) this.uiManager.loaderText.textContent = 'Preparing 3D scenes...';
    await this.prewarmScenes(step);
    this.ready = true;

    if (!fastStart) {
      this.uiManager.updateProgress(1, 1);
      this.uiManager.onLoaded();
      this.animate();
    }
  }

  // Creates one page's 3D world (does nothing if it already exists)
  makeWorld(name) {
    if (this[name]) return;
    const Cls = { aboutOcean: AboutOcean, servicesHolo: ServicesHolo, careersGlobe: CareersGlobe, teamMeadow: TeamMeadow, contactNetwork: ContactNetwork }[name];
    try {
      this[name] = new Cls({
        scene: this.scene, camera: this.camera, cameraRig: this.cameraRig,
        terrain: this.terrain, forest: this.forest, water: this.water, atmosphere: this.atmosphere
      });
    } catch (e) { console.warn('[world] could not create', name, e); }
  }

  // Waits on the Home page so its intro plays smoothly; ends early if the visitor opens another page
  async homePause(ms) {
    const t0 = performance.now();
    while (!this.rush && performance.now() - t0 < ms) await new Promise((r) => setTimeout(r, 100));
  }

  // A break between heavy steps: the next step only runs when the visitor has not scrolled, swiped or
  // typed for a moment and the browser is idle, so a step never interrupts scrolling.
  // (No break when a visitor is waiting for a page.)
  async idleStep(fastStart) {
    if (!fastStart || this.rush) return new Promise((r) => setTimeout(r, 0));
    if (!this.inputWatch) {
      this.inputWatch = true;
      this.lastInput = performance.now();
      const mark = () => { this.lastInput = performance.now(); };
      ['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown'].forEach((ev) => window.addEventListener(ev, mark, { passive: true, capture: true }));
      window.addEventListener('scroll', mark, { passive: true, capture: true });
    }
    await new Promise((r) => setTimeout(r, 250));
    while (!this.rush && performance.now() - this.lastInput < 1200) await new Promise((r) => setTimeout(r, 150));
    if (this.rush) return;
    await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 1500 }) : setTimeout(r, 200)));
  }

  /*
    PERFORMANCE: builds the worlds that are normally created on first visit and prepares every page's
    shaders and textures for the graphics card, so switching pages never freezes.
  */
  async prewarmScenes(step = () => Promise.resolve()) {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
      for (let i = 0; i < 30 && !this.aboutOcean?.sea?.uniforms?.ready; i++) await wait(100);

      // the globe's Earth pictures are painted on a background thread; wait for them (max 8 s) so building is quick
      if (!this.rush && this.careersGlobe?.prepareTextures) {
        await Promise.race([this.careersGlobe.prepareTextures(), wait(8000)]);
        await step();
      }
      for (const c of [this.careersGlobe, this.teamMeadow, this.contactNetwork]) {
        try { if (c && !c.built && typeof c.build === 'function') c.build(); } catch (e) { console.warn('[prewarm] build failed', e); }
        await step();
      }

      // compile shaders and upload textures (only while Home is showing, so hidden objects never flash on another page)
      if (this.rush) return;
      this.prewarming = true;
      const hidden = [];
      this.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
      try {
        if (typeof this.renderer.compileAsync === 'function') await this.renderer.compileAsync(this.scene, this.camera);
        else this.renderer.compile(this.scene, this.camera);
      } finally { hidden.forEach((o) => { o.visible = false; }); this.prewarming = false; }
      await step();
      const seen = new Set();
      this.scene.traverse((o) => {
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => {
          const texs = [m.map, ...Object.values(m.uniforms || {}).map((u) => u && u.value)];
          texs.forEach((t) => { if (t && t.isTexture && !seen.has(t)) { seen.add(t); this.renderer.initTexture(t); } });
        });
      });
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
    const onHome = (this.uiManager?.currentMode || 'home') === 'home';
    if ((onHome && !this.homeParticles?.disabled) || this.prewarming) {
      this.uiManager?.update(dt, elapsed);
      this.soundManager?.drawVisualizer(elapsed);
      return;
    }
    // a page was opened before its 3D world was prepared: create the worlds right now (no loading screen)
    if (!this.ready) {
      this.rush = true;
      ['aboutOcean', 'servicesHolo', 'careersGlobe', 'teamMeadow', 'contactNetwork'].forEach((n) => this.makeWorld(n));
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