import { Storage } from './storage.js';

// All audio is synthesised at runtime: no samples, no licensing surprises.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.noiseBuffer = null;
    this.muted = Storage.getMuted();
    this.playingMusic = false;
    this.musicTimer = null;
    this.nextStep = 0;
    this.step = 0;
    this.stepDur = 60 / 96 / 4;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        this.ctx = new AC();
      } catch {
        return false;
      }

      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.82;
      this.sfxBus.connect(this.master);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);

      const n = Math.floor(this.ctx.sampleRate * 1.2);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    Storage.setMuted(muted);
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, t, 0.02);
    }
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  tone(freq, dur, { type = 'sine', gain = 0.1, when = 0, attack = 0.005, slideTo = null, bus = null, filter = null } = {}) {
    if (!this.ctx) return;
    const t = when || this.ctx.currentTime + 0.001;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let node = osc;
    if (filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.value = filter.freq || 1200;
      f.Q.value = filter.q || 0.7;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(bus || this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  noise(dur, { gain = 0.06, when = 0, type = 'highpass', freq = 1200, q = 0.8, slideTo = null } = {}) {
    if (!this.ctx || !this.noiseBuffer) return;
    const t = when || this.ctx.currentTime + 0.001;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name, opts = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.001;

    switch (name) {
      case 'launch': {
        this.noise(0.2, { gain: 0.055, when: t, type: 'bandpass', freq: 520, slideTo: 2200, q: 0.9 });
        this.tone(150, 0.14, { type: 'sine', gain: 0.05, when: t, slideTo: 70 });
        break;
      }
      case 'rim': {
        const p = Math.min(1, Math.max(0, (opts.impact || 300) / 1200));
        const f = 190 + p * 190;
        this.tone(f, 0.2, { type: 'triangle', gain: 0.075, when: t, slideTo: f * 0.72 });
        this.tone(f * 2.7, 0.14, { type: 'sine', gain: 0.035, when: t, slideTo: f * 2.1 });
        this.noise(0.05, { gain: 0.03, when: t, type: 'highpass', freq: 2200 });
        break;
      }
      case 'board': {
        this.tone(96, 0.16, { type: 'sine', gain: 0.1, when: t, slideTo: 52 });
        this.noise(0.09, { gain: 0.05, when: t, type: 'lowpass', freq: 900 });
        break;
      }
      case 'swish': {
        this.noise(0.24, { gain: 0.075, when: t, type: 'highpass', freq: 1300, slideTo: 3600 });
        break;
      }
      case 'score': {
        this.noise(0.2, { gain: 0.055, when: t, type: 'highpass', freq: 1500, slideTo: 4200 });
        const streak = opts.streak || 0;
        const base = 523.25 * Math.pow(2, Math.min(streak, 12) / 24);
        const notes = opts.clean ? [0, 4, 7] : [0, 3];
        notes.forEach((semi, i) => {
          const f = base * Math.pow(2, semi / 12);
          this.tone(f, 0.22, {
            type: 'triangle',
            gain: opts.clean ? 0.055 : 0.04,
            when: t + i * 0.065,
            attack: 0.01,
          });
        });
        break;
      }
      case 'power': {
        const t0 = t;
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.tone(f, 0.14, {
            type: 'sawtooth',
            gain: 0.035,
            when: t0 + i * 0.06,
            attack: 0.006,
            filter: { type: 'lowpass', freq: 2200 },
          });
        });
        this.noise(0.3, { gain: 0.04, when: t0, type: 'bandpass', freq: 900, slideTo: 3000, q: 1.2 });
        break;
      }
      case 'count': {
        this.tone(660, 0.07, { type: 'square', gain: 0.035, when: t });
        break;
      }
      case 'go': {
        this.tone(990, 0.18, { type: 'square', gain: 0.05, when: t });
        this.tone(1485, 0.14, { type: 'sine', gain: 0.03, when: t + 0.04 });
        break;
      }
      case 'buzzer': {
        this.tone(116, 0.85, { type: 'sawtooth', gain: 0.055, when: t, filter: { type: 'lowpass', freq: 760 } });
        this.tone(174, 0.8, { type: 'square', gain: 0.025, when: t, filter: { type: 'lowpass', freq: 520 } });
        break;
      }
      case 'final': {
        [659.25, 987.77].forEach((f, i) => {
          this.tone(f, 0.32, { type: 'triangle', gain: 0.045, when: t + i * 0.1, attack: 0.008 });
        });
        break;
      }
      case 'miss': {
        this.tone(170, 0.18, { type: 'sine', gain: 0.03, when: t, slideTo: 110 });
        break;
      }
      case 'ui': {
        this.tone(540, 0.045, { type: 'square', gain: 0.02, when: t });
        break;
      }
      default:
        break;
    }
  }

  startMusic() {
    if (!this.unlock() || this.muted) return;
    if (this.playingMusic) return;
    this.playingMusic = true;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(Math.max(0.0001, this.musicBus.gain.value), t);
    this.musicBus.gain.setTargetAtTime(0.2, t, 0.5);
    this.nextStep = t + 0.08;
    this.step = 0;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 30);
    this.scheduleMusic();
  }

  stopMusic() {
    this.playingMusic = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ctx && this.musicBus) {
      const t = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(t);
      this.musicBus.gain.setTargetAtTime(0.0001, t, 0.22);
    }
  }

  scheduleMusic() {
    if (!this.ctx || !this.playingMusic) return;
    const horizon = this.ctx.currentTime + 0.16;
    while (this.nextStep < horizon) {
      this.playStep(this.step, this.nextStep);
      this.nextStep += this.stepDur;
      this.step = (this.step + 1) % 32;
    }
  }

  playStep(step, when) {
    if (!this.ctx) return;
    const chords = [
      { root: 55.0, notes: [220.0, 261.63, 329.63] }, // Am
      { root: 43.65, notes: [174.61, 220.0, 261.63] }, // F
      { root: 65.41, notes: [261.63, 329.63, 392.0] }, // C
      { root: 49.0, notes: [196.0, 246.94, 293.66] }, // G
    ];
    const chord = chords[Math.floor(step / 8) % 4];

    if (step % 8 === 0) {
      chord.notes.forEach((f, i) => {
        this.tone(f, 2.4, {
          type: 'triangle',
          gain: 0.016,
          when: when + i * 0.015,
          attack: 0.9,
          bus: this.musicBus,
          filter: { type: 'lowpass', freq: 1300 },
        });
      });
    }

    if (step % 8 === 0 || step === 3 || step === 6) {
      this.tone(chord.root, 0.22, {
        type: 'sine',
        gain: 0.05,
        when,
        attack: 0.01,
        slideTo: chord.root * 0.82,
        bus: this.musicBus,
      });
    }

    if (step % 2 === 1) {
      const arp = chord.notes[Math.floor(step / 2) % 3] * 2;
      this.tone(arp, 0.16, {
        type: 'triangle',
        gain: 0.012,
        when,
        attack: 0.01,
        bus: this.musicBus,
        filter: { type: 'lowpass', freq: 3200 },
      });
    }

    if (step % 2 === 0 && this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 7200;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.007, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
      src.connect(f);
      f.connect(g);
      g.connect(this.musicBus);
      src.start(when);
      src.stop(when + 0.06);
    }
  }
}
