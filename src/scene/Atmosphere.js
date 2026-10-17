import * as THREE from 'three';

export class Atmosphere {
  constructor(scene) {
    this.scene = scene;
    this.uniforms = {
      uTime: { value: 0 },
      uTopColor: { value: new THREE.Color('#6da0cc') },
      uBottomColor: { value: new THREE.Color('#d4e5dd') },
      uSunColor: { value: new THREE.Color('#fff2cf') },
      uSunPos: { value: new THREE.Vector3(140, 95, -70) }
    };

    this.cloudParticles = null;
    this.snowDust = null;
    this.skyMesh = null;
    this.sunLight = null;
    this.hemiLight = null;

    // Smooth transition target colors
    this.targetTop = new THREE.Color('#6da0cc');
    this.targetBottom = new THREE.Color('#cde0d5');
    this.targetSun = new THREE.Color('#ffe4a0');
    this.targetSunLight = new THREE.Color('#fff8e7');
    this.targetSunIntensity = 2.2;
    this.targetHemiSky = new THREE.Color('#88baee');
    this.targetHemiGround = new THREE.Color('#3d5e34');
    this.targetFogColor = new THREE.Color('#dce5f0');

    this.initSky();
    this.initLighting();
    this.initSnowFog();
    this.initSnowDust();
  }

  createSoftPuffTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.3, 'rgba(240, 245, 250, 0.45)');
    grad.addColorStop(0.7, 'rgba(220, 230, 245, 0.12)');
    grad.addColorStop(1.0, 'rgba(200, 215, 235, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    return texture;
  }

  initSky() {
    // Sky Dome with smooth vertical gradient and sun glow
    const skyGeo = new THREE.SphereGeometry(600, 32, 24);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: this.uniforms.uTopColor,
        uBottomColor: this.uniforms.uBottomColor,
        uSunColor: this.uniforms.uSunColor,
        uSunPos: this.uniforms.uSunPos
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform vec3 uSunColor;
        uniform vec3 uSunPos;
        varying vec3 vWorldPos;

        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y * 1.5 + 0.15, 0.0, 1.0);
          vec3 sky = mix(uBottomColor, uTopColor, h);

          // Subtle sun glow on the horizon
          vec3 sunDir = normalize(uSunPos);
          float sunDot = max(0.0, dot(dir, sunDir));
          float sunGlow = pow(sunDot, 64.0) * 1.8 + pow(sunDot, 8.0) * 0.35;
          sky += uSunColor * sunGlow;

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
  }

  initLighting() {
    // Ambient / Hemisphere light mimicking Swiss sky bounce
    this.hemiLight = new THREE.HemisphereLight(
      new THREE.Color('#88baee'), // Clear alpine sky blue
      new THREE.Color('#3d5e34'), // Lush meadow green reflection bounce
      1.15
    );
    this.scene.add(this.hemiLight);

    // Warm Directional Alpine Sun
    this.sunLight = new THREE.DirectionalLight(new THREE.Color('#fff7e8'), 2.2);
    this.sunLight.position.copy(this.uniforms.uSunPos.value);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 800;
    this.sunLight.shadow.camera.left = -250;
    this.sunLight.shadow.camera.right = 250;
    this.sunLight.shadow.camera.top = 250;
    this.sunLight.shadow.camera.bottom = -250;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Secondary fill light for soft shadowed valleys
    const fillLight = new THREE.DirectionalLight(new THREE.Color('#78a08c'), 0.55);
    fillLight.position.set(-100, 60, 120);
    this.scene.add(fillLight);
  }

  initSnowFog() {
    // Clustered volumetric snow-fog billboards hugging valleys and mountain passes
    const cloudTexture = this.createSoftPuffTexture();
    const count = 350;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const opacities = new Float32Array(count);
    const rotations = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Concentrate in lower valleys and mountain saddle passes
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.7) * 220;
      positions[i * 3] = Math.cos(angle) * dist;
      // Heights around valleys (-45 to 15)
      positions[i * 3 + 1] = THREE.MathUtils.randFloat(-40, 12);
      positions[i * 3 + 2] = Math.sin(angle) * dist;

      scales[i] = THREE.MathUtils.randFloat(35, 95);
      opacities[i] = THREE.MathUtils.randFloat(0.12, 0.32);
      rotations[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
    geometry.setAttribute('aRotation', new THREE.BufferAttribute(rotations, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: cloudTexture },
        uTime: this.uniforms.uTime,
        uFogColor: { value: new THREE.Color('#dce5f0') }
      },
      vertexShader: `
        attribute float aScale;
        attribute float aOpacity;
        attribute float aRotation;
        varying float vOpacity;
        varying float vRot;
        uniform float uTime;

        void main() {
          vOpacity = aOpacity;
          vRot = aRotation + uTime * 0.02;

          vec3 pos = position;
          // Slow atmospheric drift
          pos.x += sin(uTime * 0.05 + position.z * 0.02) * 8.0;
          pos.z += cos(uTime * 0.04 + position.x * 0.02) * 8.0;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aScale * (450.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec3 uFogColor;
        varying float vOpacity;
        varying float vRot;

        void main() {
          // Rotate point sprite coordinate
          vec2 uv = gl_PointCoord - vec2(0.5);
          float c = cos(vRot);
          float s = sin(vRot);
          uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) + vec2(0.5);

          vec4 tex = texture2D(uTexture, uv);
          gl_FragColor = vec4(uFogColor, tex.a * vOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.cloudParticles = new THREE.Points(geometry, material);
    this.scene.add(this.cloudParticles);
  }

  initSnowDust() {
    // Sparkling airborne ice crystals / snow glitter
    const count = 1800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = THREE.MathUtils.randFloatSpread(320);
      positions[i * 3 + 1] = THREE.MathUtils.randFloat(-40, 80);
      positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(320);
      speeds[i] = THREE.MathUtils.randFloat(0.4, 1.2);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: this.uniforms.uTime
      },
      vertexShader: `
        attribute float aSpeed;
        uniform float uTime;
        varying float vAlpha;

        void main() {
          vec3 pos = position;
          // Drifting motion
          pos.x += sin(uTime * 0.5 * aSpeed + position.y * 0.05) * 4.0;
          pos.y -= mod(uTime * 1.5 * aSpeed, 80.0);
          if (pos.y < -40.0) pos.y += 120.0;
          pos.z += cos(uTime * 0.4 * aSpeed + position.x * 0.05) * 4.0;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = (1.5 + sin(uTime * 3.0 + aSpeed * 10.0) * 0.8) * (200.0 / -mvPosition.z);
          vAlpha = smoothstep(-15.0, -35.0, mvPosition.z) * 0.85;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float spark = pow(1.0 - d * 2.0, 2.0);
          gl_FragColor = vec4(1.0, 1.0, 1.0, spark * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.snowDust = new THREE.Points(geometry, material);
    this.scene.add(this.snowDust);
  }

  setPreset(timeOfDay = 'greenery') {
    if (timeOfDay === 'jade') timeOfDay = 'about';      // LIGHT dropdown names
    if (timeOfDay === 'aurora') timeOfDay = 'contact';
    if (timeOfDay === 'mint') {
      // Services: pale mint sky with silver-green mist
      this.targetTop.set('#5f9f8f');
      this.targetBottom.set('#cfe9dc');
      this.targetSun.set('#f2fff4');
      this.targetSunLight.set('#f0fff6');
      this.targetSunIntensity = 2.1;
      this.targetHemiSky.set('#a8e6cf');
      this.targetHemiGround.set('#2f5e4a');
      this.targetFogColor.set('#8fbfae');
    } else if (timeOfDay === 'pine') {
      // Careers: deep evergreen pine forest at dusk
      this.targetTop.set('#0c2219');
      this.targetBottom.set('#355e4a');
      this.targetSun.set('#d9f7c6');
      this.targetSunLight.set('#e8ffe0');
      this.targetSunIntensity = 2.0;
      this.targetHemiSky.set('#6fae8a');
      this.targetHemiGround.set('#0b2016');
      this.targetFogColor.set('#244536');
    } else if (timeOfDay === 'spring') {
      // Careers: fresh spring green under a warm golden sunrise sky
      this.targetTop.set('#3d6b78');
      this.targetBottom.set('#f3d9a4');
      this.targetSun.set('#ffd27a');
      this.targetSunLight.set('#fff1d0');
      this.targetSunIntensity = 2.4;
      this.targetHemiSky.set('#bfe3a8');
      this.targetHemiGround.set('#3f6b24');
      this.targetFogColor.set('#c9cf9c');
    } else if (timeOfDay === 'olive') {
      // Warm golden olive hills
      this.targetTop.set('#56633a');
      this.targetBottom.set('#c4bd86');
      this.targetSun.set('#ffd98a');
      this.targetSunLight.set('#fff0c8');
      this.targetSunIntensity = 2.2;
      this.targetHemiSky.set('#b8b874');
      this.targetHemiGround.set('#3a3a1a');
      this.targetFogColor.set('#858556');
    } else if (timeOfDay === 'sage') {
      // Soft dusty sage, overcast highland
      this.targetTop.set('#7f907d');
      this.targetBottom.set('#c6cebd');
      this.targetSun.set('#f1ecd2');
      this.targetSunLight.set('#f6f3e4');
      this.targetSunIntensity = 1.9;
      this.targetHemiSky.set('#b5c2ab');
      this.targetHemiGround.set('#3c4636');
      this.targetFogColor.set('#96a18d');
    } else if (timeOfDay === 'contact') {
      // Aurora Emerald Cyber Night Sky matching Contact branding
      this.targetTop.set('#03120e');
      this.targetBottom.set('#04241b');
      this.targetSun.set('#00ff88');
      this.targetSunLight.set('#a7f3d0');
      this.targetSunIntensity = 2.2;
      this.targetHemiSky.set('#10b981');
      this.targetHemiGround.set('#021a14');
      this.targetFogColor.set('#031813');
    } else if (timeOfDay === 'about') {
      // Deep Jade twilight sky matching the About branding (was Sapphire / Cyan)
      this.targetTop.set('#04201a');
      this.targetBottom.set('#0a4a38');
      this.targetSun.set('#8dffc9');
      this.targetSunLight.set('#e0ffee');
      this.targetSunIntensity = 2.4;
      this.targetHemiSky.set('#3ddc97');
      this.targetHemiGround.set('#052e1f');
      this.targetFogColor.set('#07382a');
    } else if (timeOfDay === 'sunset') {
      this.targetTop.set('#875252');
      this.targetBottom.set('#3a2432');
      this.targetSun.set('#ff9e43');
      this.targetSunLight.set('#ffaa55');
      this.targetSunIntensity = 2.2;
      this.targetHemiSky.set('#c4776b');
      this.targetHemiGround.set('#291823');
      this.targetFogColor.set('#5a3232');
    } else if (timeOfDay === 'night') {
      this.targetTop.set('#0b1626');
      this.targetBottom.set('#040913');
      this.targetSun.set('#4da3ff');
      this.targetSunLight.set('#4da3ff');
      this.targetSunIntensity = 0.6;
      this.targetHemiSky.set('#1a293d');
      this.targetHemiGround.set('#060b12');
      this.targetFogColor.set('#091422');
    } else if (timeOfDay === 'day' || timeOfDay === 'dawn') {
      // Classic Swiss Alpine Dawn
      this.targetTop.set('#8597af');
      this.targetBottom.set('#3c4e5f');
      this.targetSun.set('#ffe1b3');
      this.targetSunLight.set('#fff0db');
      this.targetSunIntensity = 1.8;
      this.targetHemiSky.set('#9bb0c9');
      this.targetHemiGround.set('#384654');
      this.targetFogColor.set('#5c7083');
    } else {
      // Lush Greenery Mountain & Sunny Alpine Sky (Home mode)
      this.targetTop.set('#6da0cc');
      this.targetBottom.set('#cde0d5');
      this.targetSun.set('#ffe4a0');
      this.targetSunLight.set('#fff8e7');
      this.targetSunIntensity = 2.2;
      this.targetHemiSky.set('#88baee');
      this.targetHemiGround.set('#3d5e34');
      this.targetFogColor.set('#6e8e86');
    }
  }

  update(dt, elapsedTime) {
    this.uniforms.uTime.value = elapsedTime;
    const lerpSpeed = Math.min(1.0, dt * 3.2);

    this.uniforms.uTopColor.value.lerp(this.targetTop, lerpSpeed);
    this.uniforms.uBottomColor.value.lerp(this.targetBottom, lerpSpeed);
    this.uniforms.uSunColor.value.lerp(this.targetSun, lerpSpeed);

    if (this.sunLight) {
      this.sunLight.color.lerp(this.targetSunLight, lerpSpeed);
      this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, this.targetSunIntensity, lerpSpeed);
    }

    if (this.hemiLight) {
      this.hemiLight.color.lerp(this.targetHemiSky, lerpSpeed);
      this.hemiLight.groundColor.lerp(this.targetHemiGround, lerpSpeed);
    }

    if (this.cloudParticles?.material?.uniforms?.uFogColor) {
      this.cloudParticles.material.uniforms.uFogColor.value.lerp(this.targetFogColor, lerpSpeed);
    }

    if (this.scene.fog) {
      this.scene.fog.color.lerp(this.targetFogColor, lerpSpeed);
    }
  }
}