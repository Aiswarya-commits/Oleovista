import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class TradingObjects {
  constructor(scene, loadingManager) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    this.oilGroup = new THREE.Group();
    this.metalGroup = new THREE.Group();
    this.barrels = [];
    this.metals = [];
    this.activeChapter = 'Hero'; // 'Hero', 'Strategy', 'Oil', 'Metals', 'Global'
    this.opacity = { oil: 0, metal: 0 };
    this.enabled = true;
  }

  setEnabled(val) {
    this.enabled = val;
  }

  async load() {
    const loader = new GLTFLoader(this.loadingManager);
    if (loader.manager && !loader.manager.abortController) {
      loader.manager.abortController = new AbortController();
    }
    const gltf = await loader.loadAsync('/assets/models/oil-metals.glb');

    const barrelMesh = gltf.scene.getObjectByName('Barrel');
    const metalMesh = gltf.scene.getObjectByName('metal');

    // Create 4 floating oil barrels clustered at the Oil section
    if (barrelMesh) {
      const barrelMat = new THREE.MeshStandardMaterial({
        color: 0x1f3647,
        metalness: 0.8,
        roughness: 0.25,
        wireframe: false
      });

      for (let i = 0; i < 5; i++) {
        const b = barrelMesh.clone();
        b.material = barrelMat.clone();
        const angle = (i / 5) * Math.PI * 2;
        b.position.set(Math.cos(angle) * 8, (i - 2) * 2.5, Math.sin(angle) * 8);
        b.rotation.set(0.4 + i * 0.2, angle, 0.2);
        b.scale.setScalar(2.2);
        this.oilGroup.add(b);
        this.barrels.push({
          mesh: b,
          baseY: b.position.y,
          speed: 0.8 + i * 0.2,
          rotSpeed: 0.5 + i * 0.1
        });
      }
    }

    // Create 5 floating metallic ingots clustered at the Metals section
    if (metalMesh) {
      const metalMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Golden bronze
        metalness: 0.95,
        roughness: 0.15
      });

      for (let i = 0; i < 5; i++) {
        const m = metalMesh.clone();
        m.material = metalMat.clone();
        const angle = (i / 5) * Math.PI * 2;
        m.position.set(Math.cos(angle) * 9, (i - 2) * 2.8, Math.sin(angle) * 9);
        m.rotation.set(-0.3 + i * 0.2, angle + 1.0, 0.4);
        m.scale.setScalar(2.6);
        this.metalGroup.add(m);
        this.metals.push({
          mesh: m,
          baseY: m.position.y,
          speed: 0.7 + i * 0.15,
          rotSpeed: 0.6 + i * 0.15
        });
      }
    }

    // Position groups along the scenic flight path
    // Oil section is around curve progress ~0.35 - 0.55
    this.oilGroup.position.set(-110, -8, 60);
    // Metals section is around curve progress ~0.60 - 0.80
    this.metalGroup.position.set(40, 22, -40);

    this.scene.add(this.oilGroup);
    this.scene.add(this.metalGroup);
  }

  update(dt, elapsedTime, scrollProgress) {
    // Determine visibility based on scroll progress:
    // 0.0 - 0.2: Hero & Strategy
    // 0.25 - 0.55: Oil Division
    // 0.55 - 0.82: Metals Division
    // 0.82 - 1.0: Global Trading Hubs

    const oilTarget = this.enabled && scrollProgress >= 0.22 && scrollProgress <= 0.56 ? 1 : 0;
    const metalTarget = this.enabled && scrollProgress >= 0.56 && scrollProgress <= 0.85 ? 1 : 0;

    this.opacity.oil = THREE.MathUtils.lerp(this.opacity.oil, oilTarget, dt * 4);
    this.opacity.metal = THREE.MathUtils.lerp(this.opacity.metal, metalTarget, dt * 4);

    this.oilGroup.visible = this.opacity.oil > 0.01;
    this.metalGroup.visible = this.opacity.metal > 0.01;

    // Levitation and rotation
    this.barrels.forEach((item, idx) => {
      item.mesh.position.y = item.baseY + Math.sin(elapsedTime * item.speed + idx) * 1.2;
      item.mesh.rotation.y += dt * item.rotSpeed;
      item.mesh.rotation.x += dt * 0.2;
    });

    this.metals.forEach((item, idx) => {
      item.mesh.position.y = item.baseY + Math.cos(elapsedTime * item.speed + idx) * 1.4;
      item.mesh.rotation.y += dt * item.rotSpeed;
      item.mesh.rotation.z += dt * 0.25;
    });
  }
}
