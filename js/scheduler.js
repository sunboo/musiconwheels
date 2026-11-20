// Look-ahead scheduler: the AudioContext clock is the master clock.
// Notes are queued ~120 ms ahead at exact audio times; visuals read their position from the same clock.
import { ringVoicing, ringGates, INST } from './theory.js';
const sustains = id => !!(INST[id] && INST[id].sustain);

export const MAX_STEPS = 128;

export class Scheduler {
  constructor(audio, hooks) {
    this.audio = audio;
    this.hooks = hooks; // { getRings, isAudible, getLoop, version }
    this.playing = false;
    this.t0 = 0;           // audio time where phase 0 of the current loop grid sits
    this.last = [];        // per ring: audio time of the last scheduled step
    this.startFrom = 0;
    this.flash = new Float64Array(8 * MAX_STEPS).fill(-1); // audio time each (ring, step) last fired
    this.flashDur = new Float32Array(8 * MAX_STEPS).fill(0.3); // how long that note sounds (for ripples)
    this.cache = { version: -1, voicings: [], gates: [] };
    try {
      this.worker = new Worker(new URL('./clock-worker.js', import.meta.url));
      this.worker.onmessage = () => this.tick();
    } catch (e) {
      this.worker = null;
    }
  }

  get lookahead() { return document.hidden ? 1.5 : 0.12; }

  start(phase = 0) {
    const c = this.audio.ensureContext();
    const loop = this.hooks.getLoop();
    this.t0 = c.currentTime + 0.06 - phase * loop;
    this.startFrom = c.currentTime + 0.06 - 1e-6;
    this.startAt = c.currentTime + 0.06; this.startPhase = phase;
    this.last = [];
    this.flash.fill(-1);
    this.playing = true;
    if (this.worker) this.worker.postMessage('start');
    else if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  }

  stop() {
    this.playing = false;
    if (this.worker) this.worker.postMessage('stop');
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.audio.stopAll();
  }

  /** Keep the current position when tempo or loop length changes. */
  rebase(oldLoop, newLoop) {
    if (!this.playing) return;
    const now = this.audio.now;
    const ph = this.phaseAt(now, oldLoop);
    this.t0 = now - ph * newLoop;
  }

  phaseAt(time, loop = this.hooks.getLoop()) {
    const p = (time - this.t0) / loop;
    return ((p % 1) + 1) % 1;
  }

  /** Phase of what the listener hears right now (corrects for output / Bluetooth latency). */
  audiblePhase() {
    const t = this.audio.now - this.audio.outputLatency - (this.extraLatency || 0);
    if (this.playing && t < this.startAt) return this.startPhase; // nothing audible yet: don't report a wrap-around
    return this.phaseAt(t);
  }

  derived(rings) {
    const v = this.hooks.version();
    if (this.cache.version !== v || this.cache.voicings.length !== rings.length) {
      this.cache = { version: v, voicings: rings.map(ringVoicing), gates: rings.map(ringGates) };
    }
    return this.cache;
  }

  tick() {
    if (!this.playing) return;
    const audio = this.audio, c = audio.ctx;
    if (!c || c.state !== 'running') return;
    const now = c.currentTime, horizon = now + this.lookahead;
    const loop = this.hooks.getLoop();
    const rings = this.hooks.getRings();
    const { voicings, gates } = this.derived(rings);
    rings.forEach((ring, r) => {
      const n = ring.steps.length;
      if (!n) return;
      const d = loop / n;
      const from = this.last[r] ?? Math.max(this.startFrom, now);
      let k = Math.floor((from - this.t0) / d + 1e-6) + 1;
      if (this.last[r] === undefined && this.t0 + (k - 1) * d >= from - 1e-6) k -= 1;
      const audible = this.hooks.isAudible(r);
      // Swing: delay every second subdivision. swing = where the off-beat lands (0.5 straight, 0.67 triplet).
      const beats = this.hooks.getBeats ? this.hooks.getBeats() : 4, sw = this.hooks.getSwing ? this.hooks.getSwing() : 0.5;
      const spb = n / beats, swingDelay = sw > 0.5 && Number.isInteger(spb) && spb % 2 === 0 ? (sw - 0.5) * 2 * d : 0;
      for (let t = this.t0 + k * d; t < horizon; k++, t = this.t0 + k * d) {
        const idx = ((k % n) + n) % n;
        const step = ring.steps[idx];
        this.last[r] = t;
        if (!step || !step.active) continue;
        const late = swingDelay && idx % 2 === 1 ? swingDelay : 0;
        const gate = Math.max(0.05, gates[r][idx] * d * 0.96 - late);
        if (r < 8 && idx < MAX_STEPS) {
          this.flash[r * MAX_STEPS + idx] = t + late;
          this.flashDur[r * MAX_STEPS + idx] = sustains(ring.instrument) ? Math.min(1.4, Math.max(0.3, gate)) : 0.3;
        }
        if (audible) audio.playStep(step, ring.instrument, t + late, gate, voicings[r][idx]);
      }
    });
  }
}
