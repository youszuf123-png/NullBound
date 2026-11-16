class PixelAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  isMuted() {
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume = 0.08,
    delay = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  playClick() {
    this.playTone(580, 320, 0.045, 'square', 0.04);
  }

  playMagic() {
    this.playTone(680, 260, 0.12, 'triangle', 0.07);
    this.playTone(960, 440, 0.08, 'sine', 0.04, 0.02);
  }

  playSlash() {
    this.playTone(420, 120, 0.09, 'sawtooth', 0.06);
  }

  playPunch() {
    this.playTone(170, 52, 0.11, 'square', 0.09);
  }

  playHit(heavy = false) {
    if (heavy) {
      this.playTone(140, 38, 0.16, 'sawtooth', 0.11);
      this.playTone(95, 32, 0.14, 'square', 0.08, 0.01);
    } else {
      this.playTone(230, 85, 0.07, 'square', 0.055);
    }
  }

  playHurt() {
    this.playTone(190, 65, 0.16, 'sawtooth', 0.09);
  }

  playDash() {
    this.playTone(280, 580, 0.09, 'triangle', 0.055);
  }

  playSpecial() {
    this.playTone(300, 880, 0.18, 'square', 0.075);
    this.playTone(450, 1120, 0.22, 'triangle', 0.06, 0.04);
  }

  playHeal() {
    this.playTone(440, 660, 0.12, 'sine', 0.07);
    this.playTone(660, 880, 0.15, 'triangle', 0.07, 0.08);
  }

  playBossGlitch() {
    this.playTone(110, 45, 0.25, 'sawtooth', 0.09);
    this.playTone(540, 120, 0.14, 'square', 0.06, 0.05);
    this.playTone(790, 210, 0.12, 'square', 0.05, 0.11);
  }

  playChestOpen() {
    this.playTone(392, 440, 0.09, 'square', 0.07, 0);
    this.playTone(523, 554, 0.09, 'square', 0.07, 0.09);
    this.playTone(659, 784, 0.22, 'triangle', 0.09, 0.18);
  }

  playVictory() {
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((n, i) => {
      this.playTone(n, n * 1.02, 0.18, 'triangle', 0.08, i * 0.1);
    });
  }

  playDefeat() {
    const notes = [330, 293.66, 246.94, 174.61];
    notes.forEach((n, i) => {
      this.playTone(n, n * 0.92, 0.22, 'sawtooth', 0.07, i * 0.14);
    });
  }
}

export const soundFX = new PixelAudioEngine();
