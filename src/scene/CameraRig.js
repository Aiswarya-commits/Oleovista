import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { cameraPoints, targetPoints } from '../curveData.js';

export class CameraRig {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Convert raw points to Vector3
    const cPts = cameraPoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    const tPts = targetPoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));

    this.cameraCurve = new THREE.CatmullRomCurve3(cPts, true);
    this.targetCurve = new THREE.CatmullRomCurve3(tPts, true);

    // Scroll state
    this.scrollProgress = 0.0;
    this.targetProgress = 0.0;
    this.scrollVelocity = 0.0;
    this.scrollSpeed = 0.0006;

    // Mouse parallax look-around
    this.mouse = new THREE.Vector2(0, 0);
    this.targetMouse = new THREE.Vector2(0, 0);
    this.parallaxIntensity = 1.0;

    // Vectors for interpolation
    this.currentCamPos = new THREE.Vector3();
    this.currentTargetPos = new THREE.Vector3();
    this.baseCamPos = new THREE.Vector3();
    this.baseTargetPos = new THREE.Vector3();

    // Mode state
    this.mode = 'scroll'; // 'scroll', 'orbit', 'auto'
    this.autoSpeed = 0.015;

    // Orbit controls for free flight exploration
    this.orbitControls = new OrbitControls(this.camera, this.domElement);
    this.orbitControls.enabled = false;
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.maxDistance = 550;
    this.orbitControls.minDistance = 10;
    this.orbitControls.maxPolarAngle = Math.PI * 0.49; // don't go below ground

    this.initEvents();
    this.updateCameraToProgress(0);
  }

  initEvents() {
    // Wheel scroll
    window.addEventListener('wheel', (e) => {
      if (this.mode !== 'scroll') return;
      // Smooth delta normalization across trackpads and mousewheels
      const delta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100);
      this.targetProgress += delta * this.scrollSpeed;
      this.targetProgress = Math.max(0, Math.min(1.0, this.targetProgress));
    }, { passive: true });

    // Touch events for mobile/tablet swipe
    let touchStartY = 0;
    let isTouchActive = false;
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
        isTouchActive = true;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isTouchActive || this.mode !== 'scroll' || e.touches.length === 0) return;
      // Do not hijack touch if user is interacting with form controls, chat, menu, or modal panels
      if (e.target.closest('input, textarea, select, .ct-chat-msgs, .menu-drawer, .modal-card, .job-panel, .header-dropdown-menu')) {
        return;
      }
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      touchStartY = touchY;
      this.targetProgress += deltaY * (this.scrollSpeed * 1.5);
      this.targetProgress = Math.max(0, Math.min(1.0, this.targetProgress));
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isTouchActive = false;
    }, { passive: true });

    // Mouse movement for parallax look-around
    window.addEventListener('mousemove', (e) => {
      // Normalized coordinates from -1 to +1
      this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Keyboard arrow controls
    window.addEventListener('keydown', (e) => {
      if (this.mode !== 'scroll') return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        this.targetProgress = Math.min(1.0, this.targetProgress + 0.04);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        this.targetProgress = Math.max(0.0, this.targetProgress - 0.04);
      }
    });
  }

  setMode(newMode) {
    this.mode = newMode;
    if (newMode === 'orbit') {
      this.orbitControls.enabled = true;
      this.orbitControls.target.copy(this.currentTargetPos);
      this.orbitControls.update();
    } else {
      this.orbitControls.enabled = false;
      this.updateCameraToProgress(this.scrollProgress);
    }
  }

  jumpToProgress(prog, smooth = true) {
    prog = Math.max(0, Math.min(1.0, prog));
    if (this.currentTween) {
      this.currentTween.kill();
      this.currentTween = null;
    }
    this.targetProgress = prog;
    if (!smooth) {
      this.scrollProgress = prog;
      this.updateCameraToProgress(prog);
    }
  }

  glideTo(prog, duration = 1.4, onComplete = null) {
    prog = Math.max(0, Math.min(1.0, prog));
    if (this.currentTween) {
      this.currentTween.kill();
    }
    this.currentTween = gsap.to(this, {
      scrollProgress: prog,
      targetProgress: prog,
      duration: duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.updateCameraToProgress(this.scrollProgress);
      },
      onComplete: () => {
        this.currentTween = null;
        if (onComplete) onComplete();
      }
    });
  }

  updateCameraToProgress(prog) {
    this.cameraCurve.getPointAt(prog, this.baseCamPos);
    this.targetCurve.getPointAt(prog, this.baseTargetPos);
  }

  update(dt) {
    if (this.mode === 'orbit') {
      this.orbitControls.update();
      return;
    }

    if (this.mode === 'auto') {
      this.targetProgress = (this.targetProgress + dt * this.autoSpeed) % 1.0;
    }

    // Smooth inertia / damping lerp
    this.scrollProgress = THREE.MathUtils.lerp(this.scrollProgress, this.targetProgress, dt * 5.0);

    // Calculate position and target from spline curves
    this.cameraCurve.getPointAt(this.scrollProgress, this.baseCamPos);
    this.targetCurve.getPointAt(this.scrollProgress, this.baseTargetPos);

    // Mouse parallax interpolation
    this.mouse.lerp(this.targetMouse, dt * 4.0);

    // Apply camera base position
    this.currentCamPos.copy(this.baseCamPos);
    this.currentTargetPos.copy(this.baseTargetPos);

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentTargetPos);

    // Mouse look-around parallax: translate and tilt slightly in camera local space
    // Identical to Montfort's native camera parallax mathematics
    const px = this.mouse.x * this.parallaxIntensity;
    const py = this.mouse.y * this.parallaxIntensity;

    this.camera.translateX(px * 1.5);
    this.camera.translateY(py * 2.0);
    this.camera.rotateY(-px * 0.04);
    this.camera.rotateX(py * 0.04);
  }

  getProgress() {
    return this.scrollProgress;
  }
}
