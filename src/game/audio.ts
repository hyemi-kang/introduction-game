type SfxName = "jump" | "attack" | "hit" | "kill" | "coin" | "hurt" | "enter" | "levelup" | "select" | "squash" | "bomb";

// C メジャーペンタトニック基調の簡易チップチューン
const N = (semi: number) => 261.63 * Math.pow(2, semi / 12);
const THEMES = {
  outdoor: {
    bpm: 128,
    lead: [0, 4, 7, 12, 9, 7, 4, 7, 5, 9, 12, 14, 12, 9, 7, 4],
    bass: [-12, -12, -5, -5, -3, -3, -7, -7],
  },
  indoor: {
    bpm: 88,
    lead: [4, -1, 0, -1, 7, -1, 4, -1, 5, -1, 2, -1, 4, -1, 0, -1],
    bass: [-12, -12, -12, -12, -8, -8, -10, -10],
  },
} as const;

export class Sfx {
  private ctx?: AudioContext;
  private master?: GainNode;
  muted = false;
  private theme: keyof typeof THEMES = "outdoor";
  private timer?: ReturnType<typeof setInterval>;
  private step = 0;

  /** ユーザー操作の中で呼ぶこと */
  init() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  play(name: SfxName) {
    switch (name) {
      case "jump":
        this.tone(300, 0.14, "square", 0.12, 640);
        break;
      case "attack":
        this.tone(520, 0.09, "sawtooth", 0.1, 140);
        break;
      case "hit":
        this.tone(180, 0.1, "square", 0.16, 70);
        break;
      case "kill":
        this.tone(260, 0.2, "square", 0.14, 60);
        this.tone(520, 0.12, "triangle", 0.1, 120, 0.04);
        break;
      case "coin":
        this.tone(988, 0.07, "square", 0.09);
        this.tone(1319, 0.14, "square", 0.09, undefined, 0.06);
        break;
      case "hurt":
        this.tone(220, 0.25, "sawtooth", 0.14, 55);
        break;
      case "enter":
        [392, 523, 659].forEach((f, i) => this.tone(f, 0.12, "square", 0.09, undefined, i * 0.07));
        break;
      case "levelup":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, "square", 0.1, undefined, i * 0.09));
        break;
      case "select":
        this.tone(660, 0.06, "square", 0.07);
        break;
      case "squash":
        this.tone(420, 0.08, "square", 0.12, 90);
        break;
      case "bomb":
        this.tone(140, 0.4, "sawtooth", 0.18, 35);
        break;
    }
  }

  setTheme(theme: keyof typeof THEMES) {
    if (this.theme === theme) return;
    this.theme = theme;
    this.step = 0;
    this.restart();
  }

  private restart() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    if (!this.ctx) return;
    const th = THEMES[this.theme];
    const stepMs = 60000 / th.bpm / 2;
    this.timer = setInterval(() => {
      if (this.muted) return;
      const lead = th.lead[this.step % th.lead.length];
      if (lead !== -1) this.tone(N(lead), (stepMs / 1000) * 0.9, "square", 0.035);
      if (this.step % 2 === 0) {
        const b = th.bass[(this.step / 2) % th.bass.length];
        this.tone(N(b), (stepMs / 1000) * 1.8, "triangle", 0.07);
      }
      this.step++;
    }, stepMs);
  }

  startBgm() {
    this.restart();
  }

  stopBgm() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }
}
