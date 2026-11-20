// Canvas renderer. Still parts (dial, rings, dots) are drawn once into an offscreen layer and
// only redrawn when something changes. Each frame blits that layer and draws the moving parts.
import { colorOf, INST, ringGates, CHORDS, NOTE_NAMES } from './theory.js';
import { MAX_STEPS } from './scheduler.js';

const BOLS = { dha: 'Dha', dhin: 'Dhi', na: 'Na', tin: 'Ti', ge: 'Ge', ke: 'Ka', clap: 'Cl', stomp: 'St' };
const drumLabel = d => { const f = String(d || 'kick').split('+')[0]; return BOLS[f] || f[0].toUpperCase(); };
const TAU = Math.PI * 2;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export class WheelRenderer {
  constructor(canvas, staticCanvas, view) {
    // Two stacked canvases: the browser composites them, so the still layer costs nothing per frame.
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.layer = staticCanvas;
    this.lctx = staticCanvas.getContext('2d');
    this.view = view; // () => { rings, beats, bpm, isAudible(r), hovered, editing, playing, phase, flash, audioNow }
    this.dirty = true;
    this.dpr = 1;
    this.w = 0; this.h = 0;
    this.layout = { cx: 0, cy: 0, outerR: 200, heartR: 30, tempoArc: null };
    this.dots = []; // { r, s, x, y, rad, color, active, audible }
    this.maxDpr = 2;
  }

  setMaxDpr(v) { this.maxDpr = v; this.resize(this.stageW, this.stageH); }

  /** Canvases cover only the square the wheel needs, not the whole stage: fewer pixels to composite. */
  resize(stageW, stageH) {
    if (!stageW || !stageH) return;
    this.stageW = stageW; this.stageH = stageH;
    const side = Math.floor(Math.min(stageW, stageH));
    const w = side, h = side;
    this.w = w; this.h = h;
    this.dpr = Math.min(this.maxDpr, window.devicePixelRatio || 1);
    for (const c of [this.canvas, this.layer]) {
      c.width = Math.round(w * this.dpr);
      c.height = Math.round(h * this.dpr);
      c.style.width = `${w}px`; c.style.height = `${h}px`;
      c.style.left = `${Math.round((stageW - w) / 2)}px`; c.style.top = `${Math.round((stageH - h) / 2)}px`;
    }
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.lctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.dirty = true;
  }

  invalidate() { this.dirty = true; }

  drawStatic() {
    const v = this.view(), c = this.lctx, w = this.w, h = this.h;
    c.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const outerR = Math.max(110, Math.min(w, h) * 0.39);
    const heartR = Math.max(24, outerR * 0.14);
    this.layout = { cx, cy, outerR, heartR, tempoArc: null };

    // Dial
    const g = c.createRadialGradient(cx, cy, heartR, cx, cy, outerR * 1.07);
    g.addColorStop(0, 'rgba(24,28,36,0.76)'); g.addColorStop(0.75, 'rgba(16,19,26,0.9)'); g.addColorStop(1, 'rgba(10,12,17,0.97)');
    c.beginPath(); c.arc(cx, cy, outerR * 1.05, 0, TAU); c.fillStyle = g; c.fill();

    // Beat wedges, dividers, numbers
    const beats = v.beats;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let b = 0; b < beats; b++) {
      const a0 = (b / beats) * TAU - Math.PI / 2, a1 = ((b + 1) / beats) * TAU - Math.PI / 2;
      c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, outerR, a0, a1); c.closePath();
      c.fillStyle = b % 2 === 0 ? 'rgba(255,255,255,0.014)' : 'rgba(0,0,0,0.06)'; c.fill();
      c.beginPath();
      c.moveTo(cx + Math.cos(a0) * (heartR + 6), cy + Math.sin(a0) * (heartR + 6));
      c.lineTo(cx + Math.cos(a0) * (outerR + 6), cy + Math.sin(a0) * (outerR + 6));
      c.strokeStyle = b === 0 ? 'rgba(251,191,36,0.45)' : 'rgba(255,255,255,0.08)';
      c.lineWidth = b === 0 ? 1.5 : 1; c.stroke();
      c.font = `${b === 0 ? 600 : 500} 13px ${FONT}`;
      c.fillStyle = b === 0 ? 'rgba(251,191,36,0.85)' : 'rgba(255,255,255,0.45)';
      c.fillText(String(b + 1), cx + Math.cos(a0) * (outerR + 15), cy + Math.sin(a0) * (outerR + 15));
      const mk = v.marks && v.marks[b];
      if (mk != null) { // taal marks: X = sam, 0 = khali, numbers = tali
        const am = a0 + Math.min(0.09, (a1 - a0) * 0.3), rm = outerR * 0.955;
        c.font = `700 12px ${FONT}`;
        c.fillStyle = mk === 'X' ? '#fbbf24' : mk === '0' ? '#67e8f9' : 'rgba(255,255,255,0.8)';
        c.fillText(mk, cx + Math.cos(am) * rm, cy + Math.sin(am) * rm);
      }
    }
    c.beginPath(); c.arc(cx, cy, outerR, 0, TAU); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1.25; c.stroke();
    if (v.editMode) { // unmistakable edit mode (DR-03)
      c.beginPath(); c.arc(cx, cy, outerR * 1.05, 0, TAU); c.strokeStyle = 'rgba(34,211,238,0.6)'; c.lineWidth = 2.5; c.stroke();
    }

    // Tempo arc
    const arcR = outerR + 28, s0 = -Math.PI * 0.36, s1 = -Math.PI * 0.04;
    const norm = Math.max(0, Math.min(1, (v.bpm - 40) / 180));
    const thumb = s0 + norm * (s1 - s0);
    this.layout.tempoArc = { r: arcR, start: s0, end: s1 };
    c.lineCap = 'round'; c.lineWidth = 3;
    c.beginPath(); c.arc(cx, cy, arcR, s0, s1); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.stroke();
    c.beginPath(); c.arc(cx, cy, arcR, s0, thumb); c.strokeStyle = 'rgba(251,191,36,0.78)'; c.stroke();
    const mark = v.bpm < 60 ? 'Largo' : v.bpm < 76 ? 'Adagio' : v.bpm < 104 ? 'Andante' : v.bpm < 124 ? 'Moderato' : v.bpm < 160 ? 'Allegro' : 'Presto';
    const la = s0 - 0.07;
    c.font = `500 12px ${FONT}`; c.fillStyle = 'rgba(255,255,255,0.5)'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(`${mark} · ${Math.round(v.bpm)}`, cx + Math.cos(la) * (arcR + 6), cy + Math.sin(la) * (arcR + 6));
    c.beginPath(); c.arc(cx + Math.cos(thumb) * arcR, cy + Math.sin(thumb) * arcR, 5.2, 0, TAU); c.fillStyle = '#fbbf24'; c.fill();

    // Rings
    const rings = v.rings, nR = rings.length;
    const maxR = outerR * 0.85, minR = Math.max(heartR + 24, outerR * 0.30);
    const span = nR > 1 ? (maxR - minR) / (nR - 1) : 0;
    this.dots = [];
    rings.forEach((ring, r) => {
      const radius = nR === 1 ? (maxR + minR) * 0.52 : maxR - r * span;
      const audible = v.isAudible(r);
      const n = ring.steps.length;
      c.beginPath(); c.arc(cx, cy, radius, 0, TAU);
      c.strokeStyle = audible ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.04)';
      c.lineWidth = r === 0 ? 2.1 : 1.4; c.stroke();

      // Held notes: arcs along the ring
      const meta = INST[ring.instrument];
      if (meta && meta.sustain) {
        const gates = ringGates(ring);
        c.lineWidth = 3; c.lineCap = 'round';
        ring.steps.forEach((s, i) => {
          if (!s.active || gates[i] < 2) return;
          const a0 = (i / n) * TAU - Math.PI / 2;
          const a1 = ((i + gates[i]) / n) * TAU - Math.PI / 2 - Math.min(0.12, 2.5 / radius * 6);
          c.globalAlpha = audible ? 0.32 : 0.08;
          c.strokeStyle = colorOf(s.pitchClass, s.octave);
          c.beginPath(); c.arc(cx, cy, radius, a0, a1); c.stroke();
        });
        c.globalAlpha = 1;
      }

      ring.steps.forEach((s, i) => {
        const a = (i / n) * TAU - Math.PI / 2;
        const x = cx + Math.cos(a) * radius, y = cy + Math.sin(a) * radius;
        if (!s.active) {
          c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.07)'; c.fill();
          this.dots.push({ r, s: i, x, y, rad: 3.5, active: false, audible });
          return;
        }
        const rad = s.accent === 3 ? 11 : s.accent === 2 ? 8.2 : 5.8;
        const col = colorOf(s.pitchClass, s.octave);
        c.globalAlpha = audible ? 1 : 0.22;
        if (s.chord && s.chord !== 'single') this.halo(c, x, y, rad, s.chord, col);
        c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fillStyle = col; c.fill();
        c.lineWidth = 1.1; c.strokeStyle = 'rgba(255,255,255,0.36)'; c.stroke();
        if (v.showLetters && rad >= 8) { // note letters for colour-blind users (DR-06); bols / sargam when the lesson uses them
          const label = ring.instrument === 'percussion' ? drumLabel(s.drum) : v.labelOf ? v.labelOf(s.pitchClass) : NOTE_NAMES[s.pitchClass];
          c.fillStyle = 'rgba(8,10,14,0.88)'; c.font = `700 ${rad >= 11 ? 10 : 8.5}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(label, x, y + 0.5);
        }
        c.globalAlpha = 1;
        this.dots.push({ r, s: i, x, y, rad, color: col, active: true, audible, chord: s.chord });
      });
    });
    this.dirty = false;
  }

  halo(c, x, y, rad, chord, col) {
    c.save();
    c.strokeStyle = col; c.lineWidth = 1.35;
    const g = c.globalAlpha;
    c.globalAlpha = g * 0.6;
    if (chord === 'dim') {
      const k = rad + 5;
      c.beginPath(); c.moveTo(x, y - k); c.lineTo(x + k, y); c.lineTo(x, y + k); c.lineTo(x - k, y); c.closePath(); c.stroke();
    } else if (chord === 'sus4') {
      c.setLineDash([3, 3]); c.beginPath(); c.arc(x, y, rad + 3.6, 0, TAU); c.stroke();
    } else {
      c.beginPath(); c.arc(x, y, rad + 3.6, 0, TAU); c.stroke();
      if (chord === 'dom7' || chord === 'm7' || chord === 'maj7') {
        c.globalAlpha = g * 0.32; c.lineWidth = 1;
        c.beginPath(); c.arc(x, y, rad + 6.4, 0, TAU); c.stroke();
      }
      if (chord === 'add9') {
        c.fillStyle = col;
        for (let k = 0; k < 3; k++) { const a = k * TAU / 3 - Math.PI / 2; c.beginPath(); c.arc(x + Math.cos(a) * (rad + 6.5), y + Math.sin(a) * (rad + 6.5), 1.4, 0, TAU); c.fill(); }
      }
    }
    c.restore();
  }

  /** Draw one frame. Returns true if something is still animating (flash decay). */
  draw() {
    if (!this.w) return false;
    if (this.dirty) this.drawStatic();
    const v = this.view(), c = this.ctx, L = this.layout;
    const { cx, cy, outerR, heartR } = L;
    c.clearRect(0, 0, this.w, this.h);

    const beats = v.beats, phase = v.phase;
    let animating = false;

    if (v.playing) {
      const b = Math.floor(phase * beats) % beats;
      const a0 = (b / beats) * TAU - Math.PI / 2, a1 = ((b + 1) / beats) * TAU - Math.PI / 2;
      c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, outerR, a0, a1); c.closePath();
      c.fillStyle = 'rgba(251,191,36,0.068)'; c.fill();
      c.font = `600 13px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fbbf24';
      c.fillText(String(b + 1), cx + Math.cos(a0) * (outerR + 15), cy + Math.sin(a0) * (outerR + 15));
    }

    // Struck notes: a ripple that lasts as long as the note sounds (JI-04), hover/edit/focus highlights
    const flash = v.flash, fdur = v.flashDur, now = v.audioNow;
    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i];
      const isHover = v.hovered && v.hovered.r === d.r && v.hovered.s === d.s;
      const isEdit = v.editing && v.editing.r === d.r && v.editing.s === d.s;
      const isFocus = v.focus && v.focus.r === d.r && v.focus.s === d.s;
      let boost = 0, ripple = -1;
      if (d.active && flash && d.r < 8 && d.s < MAX_STEPS) {
        const k = d.r * MAX_STEPS + d.s, age = now - flash[k], dur = fdur ? fdur[k] || 0.3 : 0.3;
        if (age >= 0 && age < dur) { ripple = age / dur; animating = true; }
        if (age >= 0 && age < 0.24) boost = 1 - age / 0.24;
      }
      if (isFocus) {
        c.save(); c.setLineDash([3, 3]); c.strokeStyle = '#fff'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(d.x, d.y, Math.max(d.rad, 6) + 7, 0, TAU); c.stroke(); c.restore();
      }
      if (ripple < 0 && !boost && !isHover && !isEdit) continue;
      if (!d.active) {
        c.beginPath(); c.arc(d.x, d.y, 5.2, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.24)'; c.fill();
        continue;
      }
      if (!d.audible && !isEdit) continue;
      if (ripple >= 0 && !v.reduceMotion) {
        c.globalAlpha = (1 - ripple) * 0.5;
        c.beginPath(); c.arc(d.x, d.y, d.rad + 4 + ripple * 18, 0, TAU);
        c.strokeStyle = d.color; c.lineWidth = 1.5; c.stroke();
        if (d.chord && d.chord !== 'single') { // chord constellation: one satellite per extra chord tone
          const n = (CHORDS[d.chord] || [0]).length - 1, rr = d.rad + 10;
          c.fillStyle = d.color;
          for (let j = 0; j < n; j++) {
            const ang = -Math.PI / 2 + (j + 0.5) * TAU / n;
            const sx = d.x + Math.cos(ang) * rr, sy = d.y + Math.sin(ang) * rr;
            c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(sx, sy); c.lineWidth = 1; c.stroke();
            c.beginPath(); c.arc(sx, sy, 2.2, 0, TAU); c.fill();
          }
        }
        c.globalAlpha = 1;
      }
      if (!boost && !isHover && !isEdit) continue;
      const rad = d.rad + boost * 4.2 + (isHover ? 1.8 : 0);
      c.globalAlpha = 0.25 * (boost || 0.8);
      c.beginPath(); c.arc(d.x, d.y, rad + 8, 0, TAU); c.fillStyle = d.color; c.fill();
      c.globalAlpha = 1;
      c.beginPath(); c.arc(d.x, d.y, rad, 0, TAU); c.fillStyle = d.color; c.fill();
      c.lineWidth = isEdit ? 2.2 : 1.1; c.strokeStyle = isEdit ? '#fff' : 'rgba(255,255,255,0.36)'; c.stroke();
    }

    // Needle
    const na = phase * TAU - Math.PI / 2;
    c.beginPath();
    c.moveTo(cx + Math.cos(na) * (heartR + 2), cy + Math.sin(na) * (heartR + 2));
    c.lineTo(cx + Math.cos(na) * (outerR + 4), cy + Math.sin(na) * (outerR + 4));
    c.strokeStyle = v.playing ? 'rgba(251,191,36,0.92)' : 'rgba(255,255,255,0.32)'; c.lineWidth = 2; c.lineCap = 'round'; c.stroke();
    c.beginPath(); c.arc(cx + Math.cos(na) * (outerR + 4), cy + Math.sin(na) * (outerR + 4), 4.2, 0, TAU);
    c.fillStyle = v.playing ? '#fbbf24' : 'rgba(255,255,255,0.5)'; c.fill();

    // Centre TAP hub
    const pulse = v.playing ? Math.max(0, 1 - ((phase * beats) % 1) * 3.5) : 0;
    const hR = heartR + pulse * 3.2;
    c.beginPath(); c.arc(cx, cy, hR, 0, TAU); c.fillStyle = '#1c212b'; c.fill();
    c.strokeStyle = pulse > 0.2 ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.18)'; c.lineWidth = 1.5; c.stroke();
    c.font = `600 12px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = pulse > 0.2 ? '#fbbf24' : 'rgba(255,255,255,0.72)';
    c.fillText('TAP', cx, cy);
    return animating;
  }

  /** Nearest dot within reach (touch gets a bigger reach). */
  hit(x, y, touch) {
    const reach = touch ? 24 : 15;
    let best = null, bd = Infinity;
    for (const d of this.dots) {
      const dist = Math.hypot(x - d.x, y - d.y);
      if (dist <= Math.max(reach, d.rad + 5) && dist < bd) { bd = dist; best = d; }
    }
    return best;
  }

  inHeart(x, y) { return Math.hypot(x - this.layout.cx, y - this.layout.cy) <= this.layout.heartR + 4; }

  nearTempoArc(x, y) {
    const A = this.layout.tempoArc; if (!A) return false;
    const dx = x - this.layout.cx, dy = y - this.layout.cy;
    const ang = Math.atan2(dy, dx);
    return Math.abs(Math.hypot(dx, dy) - A.r) < 18 && ang >= A.start - 0.12 && ang <= A.end + 0.12;
  }

  tempoFromPoint(x, y) {
    const A = this.layout.tempoArc;
    const ang = Math.atan2(y - this.layout.cy, x - this.layout.cx);
    const n = Math.max(0, Math.min(1, (ang - A.start) / (A.end - A.start)));
    return Math.round(40 + n * 180);
  }
}
