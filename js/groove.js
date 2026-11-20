// Random Groove (POST-08): fills the current rings with a musically sensible idea.
// Picks a key and a common progression, then writes each ring according to its role:
// bass on chord roots, harmony on chord changes, melody from chord tones on strong steps
// and scale steps in between, drums with a backbeat that fits the meter.

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
const PROGRESSIONS = {
  major: [[0, 4, 5, 3], [0, 3, 4, 0], [0, 5, 3, 4], [1, 4, 0, 0], [0, 3, 0, 4]],
  minor: [[0, 5, 2, 6], [0, 3, 4, 0], [0, 6, 5, 6], [0, 5, 3, 4]]
};
const pc = n => ((n % 12) + 12) % 12;
const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];
const rest = () => ({ active: false, pitchClass: 0, octave: 4, accent: 2, chord: 'single' });
const note = (p, octave, accent, extra = {}) => ({ active: true, pitchClass: pc(p), octave, accent, chord: 'single', ...extra });

export function makeKey(rand = Math.random) {
  const mode = rand() < 0.6 ? 'major' : 'minor';
  const scale = mode === 'major' ? MAJOR : MINOR;
  const root = pick([0, 2, 4, 5, 7, 9], rand);
  const degrees = pick(PROGRESSIONS[mode], rand);
  const chords = degrees.map(d => {
    const r = scale[d], third = pc(scale[(d + 2) % 7] - r), fifth = pc(scale[(d + 4) % 7] - r);
    let quality = fifth === 6 ? 'dim' : third === 4 ? 'major' : 'minor';
    if (mode === 'minor' && d === 4) quality = 'major'; // raised leading tone: V in minor
    return { root: pc(root + r), quality, degree: d };
  });
  return { root, mode, scale: scale.map(s => pc(root + s)), chords };
}

const TONES = { major: [0, 4, 7], minor: [0, 3, 7], dim: [0, 3, 6] };

export function randomGroove(rings, beats, rand = Math.random) {
  const key = makeKey(rand);
  const nCh = beats < 4 ? 2 : 4;
  const chordAt = f => key.chords[Math.min(nCh - 1, Math.floor(f * nCh)) % key.chords.length];
  const segStart = (i, n) => Math.floor((i / n) * nCh) !== Math.floor(((i - 1 + n) % n / n) * nCh) || i === 0;
  const onBeat = (i, n) => Number.isInteger((i * beats) / n);
  const density = 0.35 + rand() * 0.3;

  const out = rings.map(ring => {
    const n = ring.steps.length;
    const steps = Array.from({ length: n }, rest);
    const role = ring.role;

    if (ring.instrument === 'percussion' || role === 'percussion') {
      const spb = n / beats;
      for (let i = 0; i < n; i++) {
        const b = (i * beats) / n, isBeat = Number.isInteger(b);
        const hits = [];
        if (isBeat && (b === 0 || (beats % 2 === 0 && b === beats / 2) || (beats % 2 === 1 && b % 3 === 0) || rand() < 0.15)) hits.push('kick');
        if (isBeat && beats % 2 === 0 && b % 2 === 1) hits.push(beats >= 8 && rand() < 0.5 ? 'clap' : 'snare');
        if (spb >= 2 ? (i % Math.max(1, Math.round(spb / 2)) === 0) : true) hits.push('hat');
        if (hits.length) steps[i] = note(hits.includes('kick') ? 0 : hits.includes('snare') || hits.includes('clap') ? 4 : 9, 3, hits.length > 1 ? 3 : 1, { drum: hits.join('+') });
      }
      return { ...ring, steps };
    }
    if (ring.instrument === 'sleigh_bells') {
      for (let i = 0; i < n; i++) if (onBeat(i, n)) steps[i] = note(0, 5, i === 0 ? 2 : 1);
      return { ...ring, steps };
    }
    if (role === 'bass') {
      for (let i = 0; i < n; i++) {
        const ch = chordAt(i / n);
        if (segStart(i, n)) steps[i] = note(ch.root, 2, 3);
        else if (onBeat(i, n) && rand() < 0.35) steps[i] = note(rand() < 0.6 ? ch.root : ch.root + (ch.quality === 'dim' ? 6 : 7), 2, 2);
      }
      return { ...ring, steps };
    }
    if (role === 'harmony') {
      for (let i = 0; i < n; i++) {
        const ch = chordAt(i / n);
        if (segStart(i, n)) {
          let chord = ch.quality;
          if (rand() < 0.3) chord = ch.quality === 'major' ? (ch.degree === 4 ? 'dom7' : 'maj7') : ch.quality === 'minor' ? 'm7' : 'dim';
          steps[i] = note(ch.root, 3, 2, { chord });
        }
      }
      return { ...ring, steps };
    }
    // melody
    let prev = null;
    for (let i = 0; i < n; i++) {
      const ch = chordAt(i / n), strong = onBeat(i, n);
      if (!(i === 0 || rand() < (strong ? density + 0.25 : density))) continue;
      let p, oct;
      if (strong || prev === null) {
        const tones = TONES[ch.quality].map(t => pc(ch.root + t));
        p = pick(tones, rand);
      } else {
        const idx = key.scale.indexOf(prev.p);
        p = key.scale[(idx + pick([-2, -1, -1, 1, 1, 2], rand) + 7) % 7];
      }
      oct = prev ? (Math.abs(p - prev.p) > 6 ? prev.oct + (p < prev.p ? 1 : -1) : prev.oct) : 4;
      oct = Math.max(4, Math.min(5, oct));
      steps[i] = note(p, oct, strong ? 3 : rand() < 0.5 ? 2 : 1);
      prev = { p, oct };
    }
    return { ...ring, steps };
  });
  const names = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  return { rings: out, label: `${names[key.root]} ${key.mode}` };
}
