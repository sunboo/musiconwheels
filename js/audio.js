// Audio engine.
// - Short, percussive voices are rendered once with an OfflineAudioContext and reused
//   (1 buffer source + 1 gain per note instead of 3–9 nodes).
// - Sustained voices (pad, sub bass) are synthesised live with a gate so note length is real.
// - Every voice is registered, so playback can be flushed instantly and polyphony capped.
import { INST, midiToFreq, chordMidis, drumsOf, ringVoicing } from './theory.js';

const ACCENT = { 1: 0.42, 2: 0.68, 3: 1.0 };

// ---------- Context-agnostic synth voices (work on live and offline contexts) ----------
const noiseCache = new WeakMap();
function noise(c) {
  let b = noiseCache.get(c);
  if (!b) {
    b = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(c, b);
  }
  return b;
}
function env(c, t, peak, attack, end) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  return g;
}
function osc(c, type, f, t, end) {
  const o = c.createOscillator();
  o.type = type; o.frequency.setValueAtTime(f, t);
  o.start(t); o.stop(end + 0.02);
  return o;
}
function noiseSrc(c, t, end) {
  const s = c.createBufferSource();
  s.buffer = noise(c); s.loop = true;
  s.start(t); s.stop(end + 0.02);
  return s;
}

// Each returns the list of source nodes it started (the first one carries onended).
const SYNTH = {
  grand_piano(c, out, t, f, dur) {
    const end = t + dur;
    const a = osc(c, 'triangle', f, t, end), b = osc(c, 'sine', f * 2, t, end), d = osc(c, 'sine', f * 3, t, end);
    const gb = c.createGain(); gb.gain.value = 0.26;
    const gd = c.createGain(); gd.gain.value = 0.09;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(640, t + 0.9);
    const g = env(c, t, 0.25, 0.012, end);
    a.connect(lp); b.connect(gb).connect(lp); d.connect(gd).connect(lp); lp.connect(g).connect(out);
    return [a, b, d];
  },
  electric_piano(c, out, t, f, dur) {
    const end = t + dur;
    const car = osc(c, 'sine', f, t, end), mod = osc(c, 'sine', f * 2, t, end);
    const mg = c.createGain();
    mg.gain.setValueAtTime(f * 0.55, t); mg.gain.exponentialRampToValueAtTime(0.1, t + 0.35);
    const g = env(c, t, 0.24, 0.008, end);
    mod.connect(mg).connect(car.frequency); car.connect(g).connect(out);
    return [car, mod];
  },
  marimba(c, out, t, f, dur) {
    const end = t + dur;
    const a = osc(c, 'sine', f, t, end), b = osc(c, 'sine', f * 4, t, end);
    const gb = c.createGain();
    gb.gain.setValueAtTime(0.18, t); gb.gain.exponentialRampToValueAtTime(0.0005, t + 0.055);
    const g = env(c, t, 0.28, 0.006, end);
    a.connect(g); b.connect(gb).connect(g); g.connect(out);
    return [a, b];
  },
  acoustic_bass(c, out, t, f, dur) {
    const end = t + dur;
    const a = osc(c, 'sawtooth', f, t, end), s = osc(c, 'sine', f, t, end);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(f * 6.5, t); lp.frequency.exponentialRampToValueAtTime(f * 1.7, t + 0.25);
    const g = env(c, t, 0.3, 0.01, end);
    a.connect(lp); s.connect(lp); lp.connect(g).connect(out);
    return [a, s];
  },
  // Live, gated: sustains for `dur`, then releases.
  sub_bass(c, out, t, f, dur) {
    const rel = 0.14, end = t + dur + rel;
    const a = osc(c, 'triangle', f, t, end), h = osc(c, 'sine', f * 2, t, end);
    const gh = c.createGain(); gh.gain.value = 0.22; // 2nd harmonic: audible on laptop/phone speakers
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(f * 4, t); lp.frequency.exponentialRampToValueAtTime(Math.max(120, f * 2.2), t + 0.4);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.26, t + Math.max(0.05, Math.min(dur, 0.6)));
    g.gain.setValueAtTime(0.26, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    a.connect(lp); h.connect(gh).connect(lp); lp.connect(g).connect(out);
    return [a, h];
  },
  strings(c, out, t, f, dur) {
    const rel = 0.45, end = t + dur + rel;
    const a = osc(c, 'sawtooth', f * 0.997, t, end), b = osc(c, 'sawtooth', f * 1.003, t, end);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.13, t + Math.min(0.16, dur * 0.5));
    g.gain.setValueAtTime(0.13, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    a.connect(lp); b.connect(lp); lp.connect(g).connect(out);
    return [a, b];
  },
  sleigh_bells(c, out, t, _f, dur) {
    const end = t + dur;
    const n = noiseSrc(c, t, end);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
    const gn = env(c, t, 0.09, 0.003, t + 0.16);
    n.connect(hp).connect(gn).connect(out);
    const srcs = [n];
    [4250, 5680, 7120].forEach(fr => {
      const o = osc(c, 'sine', fr, t, end);
      const g = env(c, t, 0.025, 0.003, t + 0.12);
      o.connect(g).connect(out); srcs.push(o);
    });
    return srcs;
  }
};

const DRUM = {
  kick(c, out, t) {
    const o = osc(c, 'sine', 140, t, t + 0.3);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = env(c, t, 0.55, 0.002, t + 0.28);
    o.connect(g).connect(out);
    return [o];
  },
  stomp(c, out, t) {
    const o = osc(c, 'sine', 95, t, t + 0.35);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    const g = env(c, t, 0.6, 0.003, t + 0.32);
    const n = noiseSrc(c, t, t + 0.12);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const gn = env(c, t, 0.35, 0.002, t + 0.1);
    o.connect(g).connect(out); n.connect(lp).connect(gn).connect(out);
    return [o, n];
  },
  snare(c, out, t) {
    const n = noiseSrc(c, t, t + 0.22);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.8;
    const gn = env(c, t, 0.32, 0.002, t + 0.2);
    const o = osc(c, 'triangle', 200, t, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    const go = env(c, t, 0.18, 0.002, t + 0.1);
    n.connect(bp).connect(gn).connect(out); o.connect(go).connect(out);
    return [n, o];
  },
  hat(c, out, t) {
    const n = noiseSrc(c, t, t + 0.07);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7200;
    const g = env(c, t, 0.12, 0.001, t + 0.055);
    n.connect(hp).connect(g).connect(out);
    return [n];
  },
  clap(c, out, t) {
    const n = noiseSrc(c, t, t + 0.4);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.011, 0.023].forEach(d => { g.gain.setValueAtTime(0.5, t + d); g.gain.exponentialRampToValueAtTime(0.06, t + d + 0.009); });
    g.gain.setValueAtTime(0.32, t + 0.034);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    n.connect(bp).connect(g).connect(out);
    return [n];
  },
  // ---------- Tabla (synthesised approximations) ----------
  // Dayan (right, tuned head): "na" rings bright, "tin" rings soft, "ke"/"ka" (left, flat) is a dry slap.
  // Bayan (left, bass head): "ge" booms with a rising pitch bend. "dha" = ge + na; "dhin" = ge + tin.
  na(c, out, t) {
    const srcs = [];
    [[523, 0.2, 0.5], [1046, 0.07, 0.25], [1570, 0.04, 0.12]].forEach(([f, p, d]) => {
      const o = osc(c, 'sine', f, t, t + d); o.connect(env(c, t, p, 0.002, t + d)).connect(out); srcs.push(o);
    });
    const n = noiseSrc(c, t, t + 0.03);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000;
    n.connect(bp).connect(env(c, t, 0.12, 0.001, t + 0.025)).connect(out); srcs.push(n);
    return srcs;
  },
  tin(c, out, t) {
    const o = osc(c, 'sine', 523, t, t + 0.6), o2 = osc(c, 'sine', 784, t, t + 0.3);
    o.connect(env(c, t, 0.16, 0.004, t + 0.6)).connect(out);
    o2.connect(env(c, t, 0.05, 0.004, t + 0.3)).connect(out);
    return [o, o2];
  },
  ge(c, out, t) {
    const o = osc(c, 'sine', 82, t, t + 0.55);
    o.frequency.setValueAtTime(78, t); o.frequency.linearRampToValueAtTime(118, t + 0.22);
    o.connect(env(c, t, 0.5, 0.004, t + 0.52)).connect(out);
    return [o];
  },
  ke(c, out, t) {
    const n = noiseSrc(c, t, t + 0.06);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    n.connect(lp).connect(env(c, t, 0.4, 0.001, t + 0.05)).connect(out);
    const o = osc(c, 'sine', 160, t, t + 0.05); o.connect(env(c, t, 0.2, 0.001, t + 0.045)).connect(out);
    return [n, o];
  },
  dha(c, out, t) { return [...DRUM.ge(c, out, t), ...DRUM.na(c, out, t)]; },
  dhin(c, out, t) { return [...DRUM.ge(c, out, t), ...DRUM.tin(c, out, t)]; }
};

function silentWavUrl() {
  const sr = 8000, n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export class AudioEngine {
  constructor(tier) {
    this.tier = tier; // 'full' | 'lite'
    this.ctx = null;
    this.voices = [];
    this.maxVoices = tier === 'lite' ? 12 : 24;
    this.cache = new Map();
    this.cacheBytes = 0;
    this.cacheCap = (tier === 'lite' ? 3 : 8) * 1024 * 1024;
    this.renderSR = tier === 'lite' ? 22050 : 32000;
    this.pending = new Set();
    this.queue = Promise.resolve();
    this.onStateChange = null;
    this.isRecording = false;
    this.nodesCreated = 0; // diagnostics (bench)
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    try {
      this.ctx = this.tier === 'lite' ? new AC({ latencyHint: 'interactive', sampleRate: 24000 }) : new AC({ latencyHint: 'interactive' });
    } catch (e) {
      this.ctx = new AC();
    }
    const c = this.ctx;
    this.bus = c.createGain();
    const comp = c.createDynamicsCompressor(); // gentle glue
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    const lim = c.createDynamicsCompressor(); // safety limiter
    lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1;
    this.master = c.createGain(); this.master.gain.value = 0.82;
    this.bus.connect(comp); comp.connect(lim); lim.connect(this.master); this.master.connect(c.destination);
    if (this.tier !== 'lite' && c.createConvolver) {
      const conv = c.createConvolver();
      conv.buffer = this.makeImpulse(1.6);
      const send = c.createGain(); send.gain.value = 0.16;
      this.bus.connect(send); send.connect(conv); conv.connect(comp);
    }
    if (c.createMediaStreamDestination) {
      this.recDest = c.createMediaStreamDestination();
      this.master.connect(this.recDest);
    }
    c.onstatechange = () => this.onStateChange && this.onStateChange(c.state);
    return c;
  }

  makeImpulse(seconds) {
    const c = this.ctx, len = Math.floor(c.sampleRate * seconds);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return b;
  }

  /** Call from the first user gesture. Handles autoplay rules and the iOS silent switch. */
  unlock() {
    const c = this.ensureContext();
    if (c.state !== 'running') c.resume().catch(() => {});
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!this.silentEl) {
      this.silentEl = new Audio(silentWavUrl());
      this.silentEl.loop = true;
      this.silentEl.setAttribute('playsinline', '');
    }
    this.silentEl.play().catch(() => {});
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }
  get outputLatency() {
    const c = this.ctx;
    if (!c) return 0;
    return (c.outputLatency || 0) + (c.baseLatency || 0);
  }

  // ---------- Voice cache ----------
  cacheKey(inst, note) { return `${inst}:${note}`; }

  getBuffer(key) {
    const b = this.cache.get(key);
    if (b) { this.cache.delete(key); this.cache.set(key, b); } // LRU touch
    return b || null;
  }

  requestRender(inst, note) {
    const key = this.cacheKey(inst, note);
    if (this.cache.has(key) || this.pending.has(key) || typeof OfflineAudioContext === 'undefined') return;
    this.pending.add(key);
    this.queue = this.queue.then(() => this.render(inst, note, key)).catch(() => {}).finally(() => this.pending.delete(key));
  }

  async render(inst, note, key) {
    const tail = inst === 'percussion' ? (note === 'clap' || note === 'stomp' ? 0.42 : 0.3) : INST[inst].tail;
    const sr = this.renderSR;
    const oc = new OfflineAudioContext(1, Math.ceil(sr * tail), sr);
    if (inst === 'percussion') DRUM[note](oc, oc.destination, 0);
    else SYNTH[inst](oc, oc.destination, 0, midiToFreq(note), tail);
    const buf = await oc.startRendering();
    this.cache.set(key, buf);
    this.cacheBytes += buf.length * 4;
    while (this.cacheBytes > this.cacheCap && this.cache.size > 1) {
      const [k, b] = this.cache.entries().next().value;
      this.cache.delete(k); this.cacheBytes -= b.length * 4;
    }
  }

  /** Render every cached voice the given rings will need, before playback reaches them. */
  prewarm(rings) {
    if (!this.ctx) return;
    rings.forEach(ring => {
      const meta = INST[ring.instrument];
      if (!meta || !meta.cached) return;
      if (ring.instrument === 'percussion') {
        ring.steps.forEach(s => s.active && drumsOf(s).forEach(d => this.requestRender('percussion', d)));
      } else if (ring.instrument === 'sleigh_bells') {
        if (ring.steps.some(s => s.active)) this.requestRender('sleigh_bells', 84);
      } else {
        ringVoicing(ring).forEach(m => m && m.forEach(n => this.requestRender(ring.instrument, n)));
      }
    });
  }

  // ---------- Playback ----------
  /**
   * Play one step. t = absolute AudioContext time. gate = sounding length in seconds.
   * midis = pre-voiced notes (from ringVoicing); defaults to root-position chord.
   */
  playStep(step, inst, t, gate = 0.5, midis = null) {
    if (!step || !step.active) return;
    this.ensureContext();
    const vel = ACCENT[step.accent] || 0.68;
    if (inst === 'percussion') {
      drumsOf(step).forEach(d => this.voice('percussion', d, t, vel, gate));
      return;
    }
    if (inst === 'sleigh_bells') { this.voice('sleigh_bells', 84, t, vel, gate); return; }
    const notes = midis || chordMidis(step);
    const att = notes.length > 1 ? 0.56 : 1;
    notes.forEach((m, i) => this.voice(inst, m, t, vel * att * (i === 0 ? 1 : 0.86), gate));
  }

  voice(inst, note, t, vel, gate) {
    const c = this.ctx, meta = INST[inst] || INST.marimba;
    const now = c.currentTime;
    t = Math.max(t, now);
    this.prune(now);
    if (this.voices.length >= this.maxVoices) this.steal(now);

    const out = c.createGain();
    out.gain.value = vel;
    out.connect(this.bus);
    let srcs, end;
    const buf = meta.cached ? this.getBuffer(this.cacheKey(inst, note)) : null;
    if (buf) {
      const s = c.createBufferSource();
      s.buffer = buf; s.connect(out); s.start(t);
      srcs = [s]; end = t + buf.duration;
      this.nodesCreated += 2;
    } else {
      if (meta.cached) this.requestRender(inst, note);
      const dur = meta.cached ? meta.tail || 0.4 : Math.max(0.06, gate);
      srcs = inst === 'percussion' ? DRUM[note](c, out, t) : SYNTH[inst](c, out, t, midiToFreq(note), dur);
      end = t + dur + 0.5;
      this.nodesCreated += 6;
    }
    // Gate: cut sustained cached voices at the note's length (with a short release).
    if (meta.sustain && meta.cached && gate < end - t) {
      const rel = 0.09;
      out.gain.setValueAtTime(vel, t + gate);
      out.gain.linearRampToValueAtTime(0.0001, t + gate + rel);
      end = t + gate + rel + 0.02;
      srcs.forEach(s => { try { s.stop(end); } catch (e) {} });
    }
    const v = { t, end, out, srcs };
    srcs[0].onended = () => { try { out.disconnect(); } catch (e) {} };
    this.voices.push(v);
  }

  prune(now) {
    if (this.voices.length < 8) return;
    this.voices = this.voices.filter(v => v.end > now);
  }

  steal(now) {
    // stop the oldest voice that has already started
    let idx = this.voices.findIndex(v => v.t <= now);
    if (idx < 0) idx = 0;
    const [v] = this.voices.splice(idx, 1);
    this.kill(v, now);
  }

  kill(v, now) {
    try {
      v.out.gain.cancelScheduledValues(now);
      v.out.gain.setTargetAtTime(0.0001, now, 0.01);
      v.srcs.forEach(s => { try { s.stop(now + 0.06); } catch (e) {} });
    } catch (e) {}
  }

  /** Stop everything, including notes already scheduled for the future. */
  stopAll() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.voices.forEach(v => this.kill(v, now));
    this.voices = [];
  }

  /** Short sound for UI feedback (tap tempo, editing). */
  audition(step, inst, midis = null) {
    this.ensureContext();
    this.playStep(step, inst, this.ctx.currentTime + 0.005, 0.45, midis);
  }

  tick() { // tap-tempo click
    this.ensureContext();
    this.voice('percussion', 'hat', this.ctx.currentTime, 0.8, 0.05);
  }

  toggleRecording(onState, toast) {
    this.ensureContext();
    if (this.isRecording) {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
      this.isRecording = false; onState(false); return;
    }
    if (!this.recDest || typeof MediaRecorder === 'undefined') { toast('Audio recording is not supported in this browser.'); return; }
    try {
      const chunks = [];
      const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
      this.mediaRecorder = new MediaRecorder(this.recDest.stream, mime ? { mimeType: mime } : undefined);
      this.mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      this.mediaRecorder.onstop = () => {
        const type = this.mediaRecorder.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunks, { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `concentric-recording-${Date.now()}.${type.includes('mp4') ? 'm4a' : 'webm'}`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast('Recording saved.');
      };
      this.mediaRecorder.start();
      this.isRecording = true; onState(true);
      toast('Recording… click REC again to save.');
    } catch (e) {
      toast('Unable to start recording.');
    }
  }
}
