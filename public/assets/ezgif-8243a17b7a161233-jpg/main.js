import * as THREE from 'three';
import { gsap } from 'gsap';

// ==========================================================================
// CONFIGURATION & CONSTANTS
// ==========================================================================
const TOTAL_FRAMES = 280;
const FRAME_PATH_PREFIX = './aurora-frames/ezgif-frame-';
const FRAME_PATH_SUFFIX = '.jpg';

// DOM Elements
const preloader = document.getElementById('preloader');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const startBtn = document.getElementById('start-btn');

const auroraCanvas = document.getElementById('aurora-canvas');
const auroraCtx = auroraCanvas.getContext('2d');
const webglCanvas = document.getElementById('webgl-canvas');

const soundBtn = document.getElementById('sound-btn');
const tourBtn = document.getElementById('tour-btn');
const copyEmailBtn = document.getElementById('copy-email-btn');
const contactForm = document.getElementById('contact-form');
const formFeedback = document.getElementById('form-feedback');

// State Variables
const frameImages = [];
let loadedFramesCount = 0;
let currentFrameIndex = 0;
let isExperienceStarted = false;
let isCinematicTourActive = false;
let isAudioActive = false;
let tourAnimationId = null;

// Mouse Parallax State
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

// ==========================================================================
// 1. FRAME PRELOADER SYSTEM (280 AURORA FRAMES)
// ==========================================================================
function padFrameNumber(num) {
  return String(num).padStart(3, '0');
}

function preloadAuroraFrames() {
  return new Promise((resolve) => {
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNumStr = padFrameNumber(i);
      img.src = `${FRAME_PATH_PREFIX}${frameNumStr}${FRAME_PATH_SUFFIX}`;
      
      img.onload = () => {
        loadedFramesCount++;
        const percent = Math.floor((loadedFramesCount / TOTAL_FRAMES) * 100);
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}%`;

        if (loadedFramesCount === TOTAL_FRAMES) {
          onAllFramesLoaded();
          resolve();
        }
      };

      img.onerror = () => {
        // Fallback for missing frame
        loadedFramesCount++;
        if (loadedFramesCount === TOTAL_FRAMES) {
          onAllFramesLoaded();
          resolve();
        }
      };

      frameImages.push(img);
    }
  });
}

function onAllFramesLoaded() {
  if (progressText) progressText.textContent = "READY";
  if (startBtn) {
    startBtn.classList.remove('hidden');
    gsap.from(startBtn, { scale: 0.8, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
  }
}

// Start experience trigger
startBtn?.addEventListener('click', () => {
  launchExperience();
});

function launchExperience() {
  isExperienceStarted = true;
  document.body.classList.remove('loading-state');
  
  if (preloader) {
    preloader.classList.add('fade-out');
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 800);
  }

  // Initial resize and render loop start
  resizeCanvas();
  requestAnimationFrame(mainRenderLoop);
  initThreeJS();
  initParallaxEffects();
  initStatCounters();
  initTradingDemo();
}

// ==========================================================================
// 2. CONTINUOUS 60FPS AURORA CANVAS RENDERER
// ==========================================================================
let lastTime = 0;
const fpsInterval = 1000 / 30; // Smooth 30-60fps loop

function resizeCanvas() {
  if (!auroraCanvas) return;
  auroraCanvas.width = window.innerWidth;
  auroraCanvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
  resizeCanvas();
  if (renderer && camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

function renderAuroraFrame(timestamp) {
  if (!auroraCtx || frameImages.length === 0) return;

  if (timestamp - lastTime > fpsInterval) {
    lastTime = timestamp;

    // Calculate frame offset: combination of continuous playback + scroll scrub
    const scrollProgress = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight || 1);
    const scrollFrameOffset = Math.floor(scrollProgress * (TOTAL_FRAMES - 1));
    
    // Continuous loop increment
    currentFrameIndex = (currentFrameIndex + 1) % TOTAL_FRAMES;

    // Blend current frame with scroll offset
    const activeIndex = (currentFrameIndex + scrollFrameOffset) % TOTAL_FRAMES;
    const img = frameImages[activeIndex];

    if (img && img.complete && img.naturalWidth > 0) {
      // Draw cover scaled to viewport
      const hRatio = auroraCanvas.width / img.width;
      const vRatio = auroraCanvas.height / img.height;
      const ratio = Math.max(hRatio, vRatio);

      const centerShiftX = (auroraCanvas.width - img.width * ratio) / 2;
      const centerShiftY = (auroraCanvas.height - img.height * ratio) / 2;

      auroraCtx.clearRect(0, 0, auroraCanvas.width, auroraCanvas.height);
      auroraCtx.drawImage(
        img,
        0, 0, img.width, img.height,
        centerShiftX, centerShiftY, img.width * ratio, img.height * ratio
      );
    }
  }
}

// ==========================================================================
// 3. THREE.JS 3D PARTICLE & VOLUMETRIC ATMOSPHERE
// ==========================================================================
let scene, camera, renderer, starParticles, auroraBeamsGroup;

function initThreeJS() {
  if (!webglCanvas) return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 30;

  renderer = new THREE.WebGLRenderer({ canvas: webglCanvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 1. Starfield Particles
  const particleCount = 1800;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  const color1 = new THREE.Color(0x00f5a0); // Emerald
  const color2 = new THREE.Color(0x00d9f5); // Cyan
  const color3 = new THREE.Color(0xffffff); // White star

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

    const mixedColor = Math.random() > 0.6 ? color1 : (Math.random() > 0.3 ? color2 : color3);
    colors[i * 3] = mixedColor.r;
    colors[i * 3 + 1] = mixedColor.g;
    colors[i * 3 + 2] = mixedColor.b;

    sizes[i] = Math.random() * 2 + 0.5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });

  starParticles = new THREE.Points(geometry, material);
  scene.add(starParticles);

  // 2. Volumetric Glowing Light Planes
  auroraBeamsGroup = new THREE.Group();
  for (let b = 0; b < 6; b++) {
    const beamGeo = new THREE.PlaneGeometry(40, 15);
    const beamMat = new THREE.MeshBasicMaterial({
      color: b % 2 === 0 ? 0x00f5a0 : 0x00d9f5,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30);
    beam.rotation.z = Math.random() * Math.PI;
    beam.rotation.x = Math.random() * 0.5;
    auroraBeamsGroup.add(beam);
  }
  scene.add(auroraBeamsGroup);
}

function updateThreeJSScene() {
  if (!scene || !camera || !renderer) return;

  // Rotate starfield slowly
  if (starParticles) {
    starParticles.rotation.y += 0.0004;
    starParticles.rotation.x += 0.0002;
  }

  // Shift light beams
  if (auroraBeamsGroup) {
    auroraBeamsGroup.children.forEach((beam, index) => {
      beam.rotation.z += 0.001 * (index % 2 === 0 ? 1 : -1);
      beam.position.y += Math.sin(Date.now() * 0.001 + index) * 0.02;
    });
  }

  // Camera 3D mouse smooth interpolation
  mouse.x += (mouse.targetX - mouse.x) * 0.05;
  mouse.y += (mouse.targetY - mouse.y) * 0.05;

  camera.position.x = mouse.x * 4;
  camera.position.y = -mouse.y * 4;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

// ==========================================================================
// 4. MOUSE & 3D GLASS CARD TILT PARALLAX
// ==========================================================================
function initParallaxEffects() {
  const cards = document.querySelectorAll('.floating-3d');

  window.addEventListener('mousemove', (e) => {
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;

    // Apply tilt matrix to floating glass cards
    cards.forEach((card) => {
      const depth = parseFloat(card.getAttribute('data-depth')) || 0.3;
      const rotateX = mouse.targetY * 12 * depth;
      const rotateY = mouse.targetX * 16 * depth;
      const translateZ = 20 * depth;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${translateZ}px)`;
    });
  });
}

// Main RAF loop combining canvas sequence & Three.js
function mainRenderLoop(timestamp) {
  if (isExperienceStarted) {
    renderAuroraFrame(timestamp);
    updateThreeJSScene();
  }
  requestAnimationFrame(mainRenderLoop);
}

// ==========================================================================
// 5. CINEMATIC MOVIE MODE (AUTO-WALKTHROUGH)
// ==========================================================================
tourBtn?.addEventListener('click', () => {
  isCinematicTourActive = !isCinematicTourActive;
  
  if (isCinematicTourActive) {
    tourBtn.classList.add('active-tour');
    tourBtn.querySelector('.btn-text').textContent = "Exit Movie Mode";
    startCinematicMovieTour();
    if (!isAudioActive) toggleAudioSynth();
  } else {
    tourBtn.classList.remove('active-tour');
    tourBtn.querySelector('.btn-text').textContent = "Cinematic Movie Mode";
    stopCinematicMovieTour();
  }
});

function startCinematicMovieTour() {
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  
  gsap.to(window, {
    scrollTo: { y: scrollHeight, autoKill: false },
    duration: 35,
    ease: "none",
    onComplete: () => {
      // Loop back to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

function stopCinematicMovieTour() {
  gsap.killTweensOf(window);
}

// Stop tour if user manually scrolls
window.addEventListener('wheel', () => {
  if (isCinematicTourActive) {
    isCinematicTourActive = false;
    tourBtn.classList.remove('active-tour');
    tourBtn.querySelector('.btn-text').textContent = "Cinematic Movie Mode";
    stopCinematicMovieTour();
  }
});

// ==========================================================================
// 6. WEB AUDIO API AMBIENT AURORA SYNTHESIZER
// ==========================================================================
let audioCtx = null;
let masterGain = null;

function toggleAudioSynth() {
  if (!audioCtx) {
    initAudioSynth();
  }

  isAudioActive = !isAudioActive;

  if (isAudioActive) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    masterGain.gain.setTargetAtTime(0.15, audioCtx.currentTime, 1);
    soundBtn.querySelector('.icon-sound-off').classList.add('hidden');
    soundBtn.querySelector('.icon-sound-on').classList.remove('hidden');
    soundBtn.classList.add('highlight');
  } else {
    masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
    soundBtn.querySelector('.icon-sound-off').classList.remove('hidden');
    soundBtn.querySelector('.icon-sound-on').classList.add('hidden');
    soundBtn.classList.remove('highlight');
  }
}

soundBtn?.addEventListener('click', toggleAudioSynth);

function initAudioSynth() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioCtx.destination);

  // Deep Cosmic Drone (Root C2 & G2)
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();

  osc1.type = 'sine';
  osc1.frequency.value = 65.41; // C2
  osc2.type = 'triangle';
  osc2.frequency.value = 98.00; // G2

  filter.type = 'lowpass';
  filter.frequency.value = 350;

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(masterGain);

  osc1.start();
  osc2.start();

  // Gentle Aurora Sparkle Chimes
  setInterval(() => {
    if (!isAudioActive || masterGain.gain.value < 0.01) return;
    playSparkleChime();
  }, 4000);
}

function playSparkleChime() {
  if (!audioCtx) return;
  const chimeOsc = audioCtx.createOscillator();
  const chimeGain = audioCtx.createGain();

  const frequencies = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // Pentatonic notes
  const note = frequencies[Math.floor(Math.random() * frequencies.length)];

  chimeOsc.type = 'sine';
  chimeOsc.frequency.value = note;

  chimeGain.gain.setValueAtTime(0, audioCtx.currentTime);
  chimeGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.3);
  chimeGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.0);

  chimeOsc.connect(chimeGain);
  chimeGain.connect(masterGain);

  chimeOsc.start();
  chimeOsc.stop(audioCtx.currentTime + 3.2);
}

// ==========================================================================
// 7. STAT COUNTERS ANIMATION
// ==========================================================================
function initStatCounters() {
  const counters = document.querySelectorAll('.counter-number');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.getAttribute('data-target')) || 0;
        gsap.to(entry.target, {
          innerText: target,
          duration: 2.5,
          snap: { innerText: 1 },
          ease: "power2.out"
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach((c) => observer.observe(c));
}

// ==========================================================================
// 8. INTERACTIVE ETRM TRADING DASHBOARD SIMULATOR
// ==========================================================================
let simChartCanvas, simCtx;
let tradeData = [120, 125, 122, 130, 135, 128, 142, 140, 148, 155, 160];

function initTradingDemo() {
  simChartCanvas = document.getElementById('trading-chart');
  if (!simChartCanvas) return;

  simCtx = simChartCanvas.getContext('2d');
  resizeSimChart();

  window.addEventListener('resize', resizeSimChart);

  // Simulated button interactions
  document.getElementById('sim-buy-btn')?.addEventListener('click', () => {
    const last = tradeData[tradeData.length - 1];
    tradeData.push(last + Math.floor(Math.random() * 8 + 3));
    if (tradeData.length > 20) tradeData.shift();
    drawTradingChart();
    updateSimStats(50, 24500);
  });

  document.getElementById('sim-sell-btn')?.addEventListener('click', () => {
    const last = tradeData[tradeData.length - 1];
    tradeData.push(Math.max(80, last - Math.floor(Math.random() * 8 + 3)));
    if (tradeData.length > 20) tradeData.shift();
    drawTradingChart();
    updateSimStats(-30, -12000);
  });

  drawTradingChart();
}

function resizeSimChart() {
  if (!simChartCanvas) return;
  simChartCanvas.width = simChartCanvas.parentElement.clientWidth;
  simChartCanvas.height = simChartCanvas.parentElement.clientHeight;
  drawTradingChart();
}

function drawTradingChart() {
  if (!simCtx || !simChartCanvas) return;
  const w = simChartCanvas.width;
  const h = simChartCanvas.height;

  simCtx.clearRect(0, 0, w, h);

  // Draw Grid Lines
  simCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  simCtx.lineWidth = 1;
  for (let y = 0; y < h; y += 40) {
    simCtx.beginPath();
    simCtx.moveTo(0, y);
    simCtx.lineTo(w, y);
    simCtx.stroke();
  }

  // Draw Line Chart
  const maxVal = Math.max(...tradeData, 200);
  const minVal = Math.min(...tradeData, 50);
  const stepX = w / (tradeData.length - 1);

  simCtx.beginPath();
  tradeData.forEach((val, i) => {
    const x = i * stepX;
    const y = h - ((val - minVal) / (maxVal - minVal || 1)) * (h - 40) - 20;
    if (i === 0) simCtx.moveTo(x, y);
    else simCtx.lineTo(x, y);
  });

  simCtx.strokeStyle = '#00f5a0';
  simCtx.lineWidth = 3;
  simCtx.shadowColor = 'rgba(0, 245, 160, 0.6)';
  simCtx.shadowBlur = 12;
  simCtx.stroke();
  simCtx.shadowBlur = 0; // reset

  // Gradient fill under line
  const grad = simCtx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(0, 245, 160, 0.3)');
  grad.addColorStop(1, 'rgba(0, 245, 160, 0)');
  simCtx.lineTo(w, h);
  simCtx.lineTo(0, h);
  simCtx.closePath();
  simCtx.fillStyle = grad;
  simCtx.fill();
}

function updateSimStats(lotsDelta, pnlDelta) {
  const posEl = document.getElementById('stat-positions');
  const pnlEl = document.getElementById('stat-pnl');

  if (posEl) {
    const curPos = parseInt(posEl.textContent) || 1420;
    posEl.textContent = `${curPos + lotsDelta} Lots`;
  }

  if (pnlEl) {
    const curPnL = 482910 + pnlDelta;
    pnlEl.textContent = `+$${curPnL.toLocaleString()}`;
  }
}

// ==========================================================================
// 9. COPY EMAIL & FORM HANDLER
// ==========================================================================
copyEmailBtn?.addEventListener('click', () => {
  navigator.clipboard.writeText('corporate@oleovista.com').then(() => {
    const copyText = document.getElementById('copy-text');
    if (copyText) {
      copyText.textContent = "Copied! ✓";
      setTimeout(() => {
        copyText.textContent = "Copy";
      }, 2500);
    }
  });
});

contactForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (formFeedback) {
    formFeedback.classList.remove('hidden');
    formFeedback.textContent = "Thank you! Your enterprise request has been logged. Our ETRM team will contact you shortly.";
    contactForm.reset();
    setTimeout(() => {
      formFeedback.classList.add('hidden');
    }, 6000);
  }
});

// Privacy Modal handlers
const modalBackdrop = document.getElementById('modal-backdrop');
const privacyLink = document.getElementById('privacy-link');
const modalClose = document.getElementById('modal-close');

privacyLink?.addEventListener('click', (e) => {
  e.preventDefault();
  modalBackdrop?.classList.remove('hidden');
});

modalClose?.addEventListener('click', () => {
  modalBackdrop?.classList.add('hidden');
});

modalBackdrop?.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) {
    modalBackdrop.classList.add('hidden');
  }
});

// Execute preloader on page load
preloadAuroraFrames();
