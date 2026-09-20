/**
 * UI sound, synthesised — no files, no licences, nothing to download.
 *
 * Off by default. A visitor turns it on in the footer; the choice persists. Nothing can play before a real
 * gesture (browser policy) and nothing plays under reduced motion. Every voice is a short envelope on an
 * oscillator or a noise burst, mixed well under the level of speech so it reads as touch, not as music.
 */
type Voice = 'throw' | 'back' | 'gate' | 'land' | 'tick';

const KEY = 'nx-sound';
const GAIN = 0.16;

class Sound {
  private ctx: AudioContext | null = null;
  private bus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  on = false;

  constructor() {
    try { this.on = localStorage.getItem(KEY) === 'on'; } catch { /* private mode: stays off */ }
  }

  /** Created lazily inside a gesture, so the context is never born suspended. */
  private boot() {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    const bus = ctx.createGain();
    bus.gain.value = GAIN;
    bus.connect(ctx.destination);
    // One second of noise, reused by every filtered sweep.
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ctx = ctx; this.bus = bus; this.noise = buf;
    return ctx;
  }

  set(on: boolean) {
    this.on = on;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* nothing to persist */ }
    if (on) { this.boot(); this.play('tick'); }
  }

  play(voice: Voice) {
    if (!this.on || !document.documentElement.classList.contains('motion')) return;
    const ctx = this.boot();
    if (!ctx || !this.bus) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => { /* still waiting for a gesture */ });
    const t = ctx.currentTime;

    const env = (node: AudioNode, peak: number, attack: number, decay: number) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
      node.connect(g); g.connect(this.bus!);
      return g;
    };

    if (voice === 'throw' || voice === 'gate') {
      // A filtered noise sweep: paper leaving a hand, or a wall passing the lens.
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = voice === 'gate' ? 0.9 : 1.6;
      const from = voice === 'gate' ? 320 : 900;
      const to = voice === 'gate' ? 1800 : 2600;
      f.frequency.setValueAtTime(from, t);
      f.frequency.exponentialRampToValueAtTime(to, t + (voice === 'gate' ? 0.5 : 0.19));
      src.connect(f);
      env(f, voice === 'gate' ? 0.5 : 0.36, 0.008, voice === 'gate' ? 0.5 : 0.2);
      src.start(t); src.stop(t + 0.75);
      return;
    }

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    if (voice === 'land') { osc.frequency.setValueAtTime(110, t); osc.frequency.exponentialRampToValueAtTime(72, t + 0.16); env(osc, 0.5, 0.004, 0.19); }
    else if (voice === 'back') { osc.frequency.setValueAtTime(680, t); osc.frequency.exponentialRampToValueAtTime(1180, t + 0.1); env(osc, 0.2, 0.005, 0.11); }
    else { osc.frequency.setValueAtTime(1200, t); env(osc, 0.16, 0.003, 0.07); }
    osc.start(t); osc.stop(t + 0.5);
  }
}

export const sound = new Sound();

export function initSound() {
  document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((btn) => {
    const label = btn.querySelector('[data-sound-label]');
    const sync = () => {
      btn.setAttribute('aria-pressed', String(sound.on));
      if (label) label.textContent = sound.on ? 'Sound on' : 'Sound off';
    };
    btn.hidden = false;
    sync();
    btn.addEventListener('click', () => { sound.set(!sound.on); sync(); });
  });
}
