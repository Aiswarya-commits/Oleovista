import * as THREE from 'three';

export class Water {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.uniforms = {
      uTime: { value: 0 },
      uWaterColor: { value: new THREE.Color('#14452b') }, // Emerald green in Greenery mode
      uWaterFoam: { value: new THREE.Color('#58a673') },
      uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() }
    };
    this.targetWaterColor = new THREE.Color('#14452b');
    this.targetWaterFoam = new THREE.Color('#58a673');
    this.init();
  }

  init() {
    // Large lake plane spanning the valley
    const geometry = new THREE.PlaneGeometry(600, 600, 64, 64);
    geometry.rotateX(-Math.PI * 0.5);

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec2 vUv;
        uniform float uTime;

        void main() {
          vUv = uv;
          vec3 pos = position;
          // Gentle undulating lake ripples
          float wave1 = sin(pos.x * 0.15 + uTime * 1.5) * cos(pos.z * 0.15 + uTime * 1.2) * 0.4;
          float wave2 = sin(pos.x * 0.35 - uTime * 2.0 + pos.z * 0.2) * 0.2;
          pos.y += wave1 + wave2;

          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uWaterColor;
        uniform vec3 uWaterFoam;
        uniform vec3 uSunDir;
        varying vec3 vWorldPos;
        varying vec2 vUv;

        void main() {
          // Normal reconstruction from waves
          float dx = sin(vWorldPos.x * 0.25 + uTime * 1.5) * 0.08;
          float dz = cos(vWorldPos.z * 0.25 + uTime * 1.3) * 0.08;
          vec3 normal = normalize(vec3(dx, 1.0, dz));

          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 3.0);

          // Specular sun highlight
          vec3 halfVec = normalize(uSunDir + viewDir);
          float spec = pow(max(0.0, dot(normal, halfVec)), 128.0) * 1.5;

          vec3 water = mix(uWaterColor, uWaterFoam, fresnel * 0.6);
          water += vec3(1.0, 0.95, 0.8) * spec;

          // Soft depth opacity
          gl_FragColor = vec4(water, 0.88);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = -46.5; // Lake surface elevation in low valley
    this.scene.add(this.mesh);
  }

  setPreset(preset) {
    if (preset === 'contact') {
      this.targetWaterColor.set('#022419');
      this.targetWaterFoam.set('#00ff88');
    } else if (preset === 'about') {
      // Deep Jade green lake (was blue)
      this.targetWaterColor.set('#04281c');
      this.targetWaterFoam.set('#34a77a');
    } else if (preset === 'greenery') {
      this.targetWaterColor.set('#14452b');
      this.targetWaterFoam.set('#58a673');
    } else if (preset === 'sunset') {
      this.targetWaterColor.set('#3a2432');
      this.targetWaterFoam.set('#ff9e70');
    } else if (preset === 'night') {
      this.targetWaterColor.set('#0a1824');
      this.targetWaterFoam.set('#4da3ff');
    } else {
      // Day / Dawn
      this.targetWaterColor.set('#163547');
      this.targetWaterFoam.set('#789bb3');
    }
  }

  update(dt, elapsedTime) {
    this.uniforms.uTime.value = elapsedTime;
    const lerpSpeed = Math.min(1.0, dt * 3.0);
    this.uniforms.uWaterColor.value.lerp(this.targetWaterColor, lerpSpeed);
    this.uniforms.uWaterFoam.value.lerp(this.targetWaterFoam, lerpSpeed);
  }
}