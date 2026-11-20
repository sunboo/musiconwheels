// Pitch, colour, chords, voice leading and note lengths. No DOM, no audio.

export const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export const CHORDS = {
  single: [0],
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  add9: [0, 4, 7, 14],
  fifth: [0, 7]
};
export const CHORD_LABELS = { single: 'Single', major: 'Major', minor: 'Minor', dom7: '7', m7: 'm7', maj7: 'maj7', sus4: 'sus4', dim: 'dim', add9: 'add9', fifth: '5' };

// Instruments. `cached`: rendered once to a buffer and reused (short, percussive).
// `sustain`: honours note length (gate) with a sustain/release envelope.
export const INSTRUMENTS = [
  { id: 'sub_bass', label: 'Sub Bass', sustain: true, cached: false },
  { id: 'acoustic_bass', label: 'Pluck Bass', sustain: true, cached: true, tail: 0.9 },
  { id: 'grand_piano', label: 'Soft Keys', sustain: true, cached: true, tail: 1.5 },
  { id: 'electric_piano', label: 'Electric Piano', sustain: true, cached: true, tail: 1.1 },
  { id: 'marimba', label: 'Marimba', sustain: false, cached: true, tail: 0.6 },
  { id: 'strings', label: 'Warm Pad', sustain: true, cached: false },
  { id: 'sleigh_bells', label: 'Sleigh Bells', sustain: false, cached: true, tail: 0.25 },
  { id: 'percussion', label: 'Drum Kit', sustain: false, cached: true, tail: 0.45 }
];
export const INST = Object.fromEntries(INSTRUMENTS.map(i => [i.id, i]));

export const midiOf = (pc, oct) => (oct + 1) * 12 + pc;
export const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);
export const pcOf = m => ((m % 12) + 12) % 12;

export function formatNoteName(pc, oct) {
  return `${NOTE_NAMES[pcOf(pc)]}${oct}`;
}

// Colour: hue = pitch class, lightness = octave. Two palettes:
//  'rainbow' — chromatic order (neighbouring semitones look alike).
//  'fifths'  — circle-of-fifths order (notes that sound good together look related).
export const PALETTE_HUES = {
  rainbow: [0, 25, 45, 65, 90, 130, 165, 195, 225, 255, 285, 320],
  fifths: [0, 210, 60, 270, 120, 330, 180, 30, 240, 90, 300, 150]
};
export const HUE_NAMES = {
  rainbow: ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'teal', 'sky blue', 'blue', 'indigo', 'violet', 'magenta'],
  fifths: ['red', 'blue', 'yellow', 'violet', 'green', 'pink', 'teal', 'orange', 'royal blue', 'lime', 'purple', 'sea green']
};
const LIGHT = { 1: 36, 2: 42, 3: 50, 4: 58, 5: 66, 6: 74 };
let palette = 'rainbow';
export let COLOR = [];
function build() {
  COLOR = PALETTE_HUES[palette].map(h => [0, 1, 2, 3, 4, 5, 6].map(o => {
    const oct = Math.max(1, Math.min(6, o || 1));
    const sat = oct <= 2 ? 78 : oct === 3 ? 82 : oct === 4 ? 86 : 90;
    return `hsl(${h}, ${sat}%, ${LIGHT[oct]}%)`;
  }));
}
build();
export function setPalette(p) { if (PALETTE_HUES[p]) { palette = p; build(); } }
export const getPalette = () => palette;
export const hueOf = pc => PALETTE_HUES[palette][pcOf(pc)];
export const hueName = pc => HUE_NAMES[palette][pcOf(pc)];
export const colorOf = (pc, oct) => COLOR[pcOf(pc)][Math.max(1, Math.min(6, oct))];

// Drum voices for percussion steps. Old presets without `drum` fall back to pitchClass % 3.
export const DRUM_VOICES = ['kick', 'snare', 'hat', 'clap', 'stomp', 'dha', 'dhin', 'na', 'tin', 'ge', 'ke'];
export const KIT_VOICES = ['kick', 'snare', 'hat', 'clap', 'stomp'];
export const TABLA_VOICES = ['dha', 'dhin', 'na', 'tin', 'ge', 'ke'];
export function drumsOf(step) {
  if (step.drum) return String(step.drum).split('+').filter(d => DRUM_VOICES.includes(d));
  return [['kick', 'snare', 'hat'][step.pitchClass % 3]];
}

export function chordMidis(step) {
  const root = midiOf(step.pitchClass, step.octave);
  return (CHORDS[step.chord] || CHORDS.single).map(i => root + i);
}

// ---------- Voice leading ----------
const LO = 48, HI = 79; // keep upper voices between C3 and G5

function candidates(pcs) {
  // every placement of each pitch class inside [LO, HI], within a 15-semitone span
  const opts = pcs.map(pc => { const o = []; for (let m = LO; m <= HI; m++) if (pcOf(m) === pc) o.push(m); return o; });
  const out = [];
  const rec = (i, acc) => {
    if (i === opts.length) {
      const s = [...acc].sort((a, b) => a - b);
      if (s[s.length - 1] - s[0] <= 15) out.push(s);
      return;
    }
    for (const m of opts[i]) rec(i + 1, [...acc, m]);
  };
  rec(0, []);
  return out;
}
const motion = (a, b) => a.reduce((sum, m) => sum + Math.min(...b.map(x => Math.abs(x - m))), 0)
  + b.reduce((sum, m) => sum + Math.min(...a.map(x => Math.abs(x - m))), 0);

function nearest(pcs, prev, target) {
  let best = null, bestCost = Infinity;
  for (const c of candidates(pcs)) {
    const cost = prev ? motion(c, prev) : Math.abs(c[0] - target) * 2 + (c[c.length - 1] - c[0]);
    if (cost < bestCost) { bestCost = cost; best = c; }
  }
  return best;
}

/** Returns, per step, the MIDI notes to play (null for rests). Chords are voice-led unless ring.voiceLead === false. */
export function ringVoicing(ring) {
  const steps = ring.steps;
  const out = steps.map(s => (s.active ? chordMidis(s) : null));
  const lead = ring.voiceLead !== false && ring.instrument !== 'percussion' && ring.instrument !== 'sleigh_bells';
  if (!lead) return out;
  const chordIdx = steps.map((s, i) => (s.active && s.chord && s.chord !== 'single' ? i : -1)).filter(i => i >= 0);
  if (chordIdx.length < 2) return out;
  const pcsOf = s => [...new Set((CHORDS[s.chord] || [0]).map(i => pcOf(s.pitchClass + i)))];
  // two passes so the first chord also connects smoothly from the last (the loop wraps)
  let prev = null;
  for (let pass = 0; pass < 2; pass++) {
    for (const i of chordIdx) {
      const s = steps[i];
      const target = Math.max(LO, midiOf(s.pitchClass, s.octave));
      const v = nearest(pcsOf(s), prev, target);
      if (v) { out[i] = v; prev = v; }
    }
  }
  return out;
}

/** Note length in steps for each active step: explicit `len`, else until the next active step. */
export function ringGates(ring) {
  const steps = ring.steps, n = steps.length;
  return steps.map((s, i) => {
    if (!s.active) return 0;
    if (s.len) return Math.min(n, s.len);
    for (let k = 1; k <= n; k++) if (steps[(i + k) % n].active) return k;
    return n;
  });
}

export function defaultRole(rIdx, total, instrument) {
  if (instrument === 'percussion' || instrument === 'sleigh_bells') return 'percussion';
  if (total === 1) return 'melody';
  if (rIdx === 0) return 'bass';
  if (rIdx === total - 1) return 'melody';
  return 'harmony';
}
export const ROLE_LABEL = { bass: 'Bass', harmony: 'Harmony', melody: 'Melody', percussion: 'Percussion' };
export const ROLE_COLOR = { bass: 'bg-rose-500', harmony: 'bg-amber-400', melody: 'bg-cyan-400', percussion: 'bg-emerald-400' };
