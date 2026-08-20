export type SoundEffect =
  | 'laser'
  | 'hit'
  | 'lock'
  | 'shieldLoss'
  | 'correct'
  | 'wrongSoft'
  | 'combo'
  | 'victory'
  | 'click';

class SoundBus {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private masterGain: GainNode | null = null;

  constructor() {
    // Initialized lazily on first user interaction
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public play(sfx: SoundEffect) {
    if (!this.enabled) return;

    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;

      switch (sfx) {
        case 'click': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.04);
          break;
        }

        case 'laser': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }

        case 'lock': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.setValueAtTime(780, now + 0.05);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }

        case 'hit': {
          // White noise + low thump for explosion
          const bufferSize = this.ctx.sampleRate * 0.18;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }

          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1000, now);
          filter.frequency.exponentialRampToValueAtTime(80, now + 0.18);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);
          noise.start(now);
          break;
        }

        case 'correct': {
          // Harmonious dual chime (C6 - G6)
          const notes = [1046.5, 1567.98];
          notes.forEach((freq, idx) => {
            if (!this.ctx || !this.masterGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + idx * 0.07;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.25, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(start);
            osc.stop(start + 0.25);
          });
          break;
        }

        case 'wrongSoft': {
          // Soft warm tone
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(190, now + 0.25);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }

        case 'shieldLoss': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.linearRampToValueAtTime(80, now + 0.35);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.35);
          break;
        }

        case 'combo': {
          // Arpeggio C5 -> E5 -> G5 -> C6
          const freqs = [523.25, 659.25, 783.99, 1046.5];
          freqs.forEach((freq, idx) => {
            if (!this.ctx || !this.masterGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + idx * 0.05;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.28, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(start);
            osc.stop(start + 0.22);
          });
          break;
        }

        case 'victory': {
          // Fanfare chords
          const fanfare = [
            { f: 523.25, t: 0.0 },
            { f: 659.25, t: 0.1 },
            { f: 783.99, t: 0.2 },
            { f: 1046.5, t: 0.35 }
          ];
          fanfare.forEach(note => {
            if (!this.ctx || !this.masterGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + note.t;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(note.f, start);
            gain.gain.setValueAtTime(0.3, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(start);
            osc.stop(start + 0.4);
          });
          break;
        }
      }
    } catch {
      // Audio context error recovery
    }
  }
}

export const soundBus = new SoundBus();
