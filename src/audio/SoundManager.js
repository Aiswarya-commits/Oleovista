export class SoundManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.isPlaying = false;
    this.audio = null;
    this.audioContext = null;
    this.analyser = null;
    this.synthGain = null;
    this.dataArray = null;

    this.initAudio();
  }

  initAudio() {
    this.audio = new Audio('/assets/sounds/sound.mp3');
    this.audio.loop = true;
    this.audio.volume = 0.5;

    // Handle user interaction requirement
    this.audio.addEventListener('error', () => {
      console.warn('Audio file error, falling back to Web Audio alpine wind synthesizer');
    });
  }

  setupSynthWind() {
    if (this.synthGain) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();

      // Create pink noise buffer for realistic alpine wind
      const bufferSize = this.audioContext.sampleRate * 2;
      const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.06;
        b6 = white * 0.115926;
      }

      const whiteNoise = this.audioContext.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Lowpass filter simulating mountain breeze
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;

      // LFO for subtle wind gusts
      const lfo = this.audioContext.createOscillator();
      lfo.frequency.value = 0.15;
      const lfoGain = this.audioContext.createGain();
      lfoGain.gain.value = 140;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      this.synthGain = this.audioContext.createGain();
      this.synthGain.gain.value = 0.0;

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 32;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      whiteNoise.connect(filter);
      filter.connect(this.synthGain);
      this.synthGain.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      whiteNoise.start();
      lfo.start();
    } catch (e) {
      console.warn('Web Audio synthesis error:', e);
    }
  }

  toggle() {
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.play();
    } else {
      this.pause();
    }

    return this.isPlaying;
  }

  play() {
    this.isPlaying = true;
    if (this.audio) {
      this.audio.play().catch(() => {
        // Fallback to synth if mp3 playback is blocked or fails
        this.setupSynthWind();
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        if (this.synthGain) {
          this.synthGain.gain.setTargetAtTime(0.25, this.audioContext.currentTime, 0.5);
        }
      });
    }
    this.setupSynthWind();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    if (this.synthGain) {
      this.synthGain.gain.setTargetAtTime(0.2, this.audioContext.currentTime, 0.5);
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.audio) {
      this.audio.pause();
    }
    if (this.synthGain && this.audioContext) {
      this.synthGain.gain.setTargetAtTime(0.0, this.audioContext.currentTime, 0.2);
    }
  }

  drawVisualizer(elapsedTime) {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    const barCount = 4;
    const barWidth = 2.5;
    const gap = 3;
    const startX = (w - (barCount * barWidth + (barCount - 1) * gap)) / 2;

    this.ctx.fillStyle = '#2D628C';

    for (let i = 0; i < barCount; i++) {
      let barH;
      if (this.isPlaying) {
        // Animated rhythmic wave height
        const wave = Math.sin(elapsedTime * 6.0 + i * 1.5) * 0.5 + 0.5;
        barH = Math.max(3, wave * (h * 0.75));
      } else {
        barH = 3; // flat resting line
      }

      const x = startX + i * (barWidth + gap);
      const y = h / 2 - barH / 2;
      this.ctx.fillRect(x, y, barWidth, barH);
    }
  }
}
