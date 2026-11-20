// Song library: public-domain melodies written in a compact text format, expanded into rings.
//   melody: "E4:2 D4:2 C4:4 r:2 ..."  note + octave (or r = rest), ":n" = length in steps (default 1)
//   chords: "C:4 G7:2 N:2"            chord symbol per beat count (N = no chord)
// Accents come from the metre (bar start = accent, beat start = medium, else soft).
import { makeSteps } from './content-helpers.js';

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const KIND = { '': 'major', m: 'minor', '7': 'dom7', m7: 'm7', maj7: 'maj7', sus4: 'sus4', dim: 'dim', add9: 'add9', '5': 'fifth' };

export function parseNote(tok) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(tok);
  if (!m) throw new Error(`Bad note "${tok}"`);
  let pc = PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  let oct = Number(m[3]);
  if (pc < 0) { pc += 12; oct -= 1; }
  if (pc > 11) { pc -= 12; oct += 1; }
  return { pc, oct };
}
export function parseChord(sym) {
  const m = /^([A-G])([#b]?)(m7|maj7|m|7|sus4|dim|add9|5)?$/.exec(sym);
  if (!m) throw new Error(`Bad chord "${sym}"`);
  const pc = (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  return { pc, chord: KIND[m[3] || ''] };
}

export function melodyRing(str, spb, barBeats, name, instrument) {
  const map = {}; let i = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [n, d] = tok.split(':'); const len = Number(d || 1);
    if (n !== 'r') {
      const { pc, oct } = parseNote(n);
      const acc = i % (spb * barBeats) === 0 ? 3 : i % spb === 0 ? 2 : 1;
      map[i] = { pc, oct, acc, ...(len > 1 ? { len } : { len: 1 }) };
    }
    i += len;
  }
  return { ring: { name, instrument, role: 'melody', steps: makeSteps(i, map) }, steps: i };
}

export function chordRings(str, beats, bassStyle, padInst, bassInst) {
  const pad = {}, bass = {}; let b = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [sym, d] = tok.split(':'); const len = Number(d || 1);
    if (sym !== 'N') {
      const { pc, chord } = parseChord(sym);
      pad[b] = { pc, oct: 3, acc: 2, chord, len };
      if (bassStyle === 'alt' && len >= 2) {
        const half = Math.floor(len / 2);
        bass[b] = { pc, oct: 2, acc: 3, len: half };
        bass[b + half] = { pc: (pc + (chord === 'dim' ? 6 : 7)) % 12, oct: pc + 7 > 11 ? 2 : 1, acc: 2, len: len - half };
      } else if (bassStyle === 'waltz') {
        bass[b] = { pc, oct: 2, acc: 3, len: 1 };
      } else bass[b] = { pc, oct: 2, acc: 3, len };
      if (bassStyle === 'waltz') { // oom-pah-pah: chords on 2 and 3
        delete pad[b];
        for (let k = 1; k < len; k++) pad[b + k] = { pc, oct: 3, acc: 1, chord, len: 1 };
      }
    }
    b += len;
  }
  if (b !== beats) throw new Error(`Chords cover ${b} beats, expected ${beats}`);
  return [
    { name: 'Bass', instrument: bassInst, role: 'bass', steps: makeSteps(beats, bass) },
    { name: 'Chords', instrument: padInst, role: 'harmony', steps: makeSteps(beats, pad) }
  ];
}

const DRUMS = {
  '4/4': n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, i % 4 === 0 ? 'kick+hat' : i % 4 === 2 ? 'snare+hat' : 'hat'])),
  march: n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, i % 2 === 0 ? 'kick' : 'snare'])),
  '3/4': n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, i % 3 === 0 ? 'kick' : 'hat'])),
  '6/8': n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, i % 6 === 0 ? 'kick' : i % 6 === 3 ? 'snare' : 'hat']))
};


const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const CH_SUFFIX = { major: '', minor: 'm', dom7: '7', m7: 'm7', maj7: 'maj7', sus4: 'sus4', dim: 'dim', add9: 'add9', fifth: '5' };
/** "Bar 2 · beat 1 — E D C · chord C" from the rings themselves, so captions never disagree with the notes. */
function autoCaptions(rings, melody, beats, spb, bar) {
  const harm = rings.find(r => r.role === 'harmony' && r.steps.length === beats);
  let lastChord = '';
  return Array.from({ length: beats }, (_, b) => {
    const notes = [];
    for (let k = b * spb; k < (b + 1) * spb; k++) { const st = melody.steps[k]; if (st && st.active) notes.push(NAMES[st.pitchClass]); }
    const h = harm && harm.steps[b];
    let chord = '';
    if (h && h.active && h.chord !== 'single') { chord = NAMES[h.pitchClass] + (CH_SUFFIX[h.chord] ?? ''); }
    const showChord = chord && chord !== lastChord; if (chord) lastChord = chord;
    const where = bar > 1 ? `Bar ${Math.floor(b / bar) + 1}, beat ${(b % bar) + 1}` : `Beat ${b + 1}`;
    return `${where} — ${notes.length ? notes.join(' ') : 'held'}${showChord ? ` · chord ${chord}` : ''}`;
  });
}

/** Build a full song item from the compact description. */
export function song(o) {
  const spb = o.spb || 2, bar = o.bar || 4;
  const mel = melodyRing(o.melody, spb, bar, o.leadName || 'Melody', o.lead || 'marimba');
  const beats = mel.steps / spb;
  if (!Number.isInteger(beats)) throw new Error(`${o.id}: melody length ${mel.steps} is not a whole number of beats`);
  const rings = o.chords ? chordRings(o.chords, beats, o.bass || 'root', o.pad || 'grand_piano', o.bassInst || 'acoustic_bass') : [];
  if (o.drone) rings.unshift({ name: 'Drone', instrument: 'strings', role: 'bass', steps: makeSteps(1, { 0: { pc: parseNote(o.drone).pc, oct: parseNote(o.drone).oct, acc: 2, chord: o.droneChord || 'single' } }) });
  rings.push(mel.ring);
  if (o.drums) {
    const n = o.drums === '4/4' || o.drums === 'march' ? beats * 2 : o.drums === '6/8' ? beats * 3 : beats;
    const map = DRUMS[o.drums](n);
    rings.push({ name: 'Drums', instrument: 'percussion', role: 'percussion', steps: makeSteps(n, Object.fromEntries(Object.entries(map).map(([i, d]) => [i, { pc: d.includes('kick') ? 0 : d.includes('snare') ? 4 : 9, oct: 3, acc: d.includes('kick') ? 3 : d.includes('snare') ? 2 : 1, drum: d }]))) });
  }
  (o.extra || []).forEach(r => rings.splice(o.extraAt ?? rings.length - 1, 0, r));
  return {
    id: o.id, group: o.group, title: o.title, hook: o.hook, tryPrompt: o.tryPrompt || 'Press Edit to change a note, or use Remix for a new spin.',
    behindSound: o.why, source: o.source, rights: 'pd', isFamousSong: true, beats, bpm: o.bpm, timeSig: o.timeSig || `${bar}/4`,
    tags: o.tags || [], locked: !!o.locked, category: o.category,
    beatCaptions: o.captions || autoCaptions(rings, mel.ring, beats, spb, bar),
    rings
  };
}

const NUR = 'Nursery & Children', HOL = 'Holiday', WOR = 'Folk & World', CLA = 'Classical Moments', ANT = 'Anthems of the World';

export const SONGS = [
  // ---------- Nursery & children ----------
  song({ id: 'pd-hot-cross-buns', group: NUR, category: 'nursery', title: 'Hot Cross Buns', bpm: 100,
    hook: 'Only three notes (E, D, C): the perfect first tune.', why: 'A three-note melody that steps down the major scale. Every note is a neighbour of the next, which is why it is so easy to sing.',
    source: 'Traditional · public domain',
    melody: 'E4:2 D4:2 C4:4 E4:2 D4:2 C4:4 C4 C4 C4 C4 D4 D4 D4 D4 E4:2 D4:2 C4:4', chords: 'C:4 C:4 C:2 G:2 C:4' }),
  song({ id: 'pd-mary-lamb', group: NUR, category: 'nursery', title: 'Mary Had a Little Lamb', bpm: 112, spb: 1,
    hook: 'Four notes, lots of repetition: a stepping-stone melody.', why: 'The tune walks between neighbouring notes and repeats them. It uses I and V7 only.',
    source: 'Traditional (1830s) · public domain',
    melody: 'E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2 E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4:4', chords: 'C:8 G:4 C:4 C:8 G:4 C:4' }),
  song({ id: 'pd-row-row', group: NUR, category: 'nursery', title: 'Row, Row, Row Your Boat', bpm: 66, spb: 3, bar: 2, timeSig: '6/8',
    hook: '6/8 time: two big beats, each split into three.', why: 'Compound metre: each beat divides into three, which gives a rocking, boat-like feel. It is also a famous round.',
    source: 'Traditional (1852) · public domain',
    melody: 'C4:3 C4:3 C4:2 D4 E4:3 E4:2 D4 E4:2 F4 G4:6 C5 C5 C5 G4 G4 G4 E4 E4 E4 C4 C4 C4 G4:2 F4 E4:2 D4 C4:6', chords: 'C:12 G:2 C:2' }),
  song({ id: 'pd-london-bridge', group: NUR, category: 'nursery', title: 'London Bridge Is Falling Down', bpm: 104,
    hook: 'Down and back up again: a melody shaped like a bridge.', why: 'A short falling pattern answered by a rising one. Questions and answers in music often work like this.',
    source: 'Traditional · public domain',
    melody: 'G4:3 A4 G4:2 F4:2 E4:2 F4:2 G4:4 D4:2 E4:2 F4:4 E4:2 F4:2 G4:4', chords: 'C:8 G:4 C:4' }),
  song({ id: 'pd-old-macdonald', group: NUR, category: 'nursery', title: 'Old MacDonald Had a Farm', bpm: 116,
    hook: '"E-I-E-I-O": a falling answer after a repeated opening.', why: 'Repetition makes it easy to remember; the "E-I-E-I-O" steps down to the home note.',
    source: 'Traditional · public domain',
    melody: 'G4:2 G4:2 G4:2 D4:2 E4:2 E4:2 D4:4 B4:2 B4:2 A4:2 A4:2 G4:6 D4:2', chords: 'G:4 C:2 G:2 G:2 D:2 G:4' }),
  song({ id: 'pd-this-old-man', group: NUR, category: 'nursery', title: 'This Old Man', bpm: 112,
    hook: 'A counting song built on the notes G and E.', why: 'The opening bounces between G and E (a minor third), the sound of a playground call.',
    source: 'Traditional · public domain',
    melody: 'G4:2 E4:2 G4:4 G4:2 E4:2 G4:4 A4:2 G4:2 F4:2 E4:2 D4:2 E4:2 F4:4', chords: 'C:4 C:4 F:2 C:2 G7:4' }),
  song({ id: 'pd-happy-birthday', group: NUR, category: 'nursery', title: 'Happy Birthday to You', bpm: 100, bar: 3, timeSig: '3/4',
    hook: 'The most-sung song in the world, in 3/4 with a pickup.', why: 'It starts before the first strong beat (a pickup, "Hap-py"). Watch the two G notes at the end of the loop leading back to Beat 1.',
    source: 'Hill sisters (1893) · public domain (US court ruling 2015–16)',
    melody: 'A4:2 G4:2 C5:2 B4:4 G4 G4 A4:2 G4:2 D5:2 C5:4 G4 G4', chords: 'C:3 G7:3 G7:3 C:3' }),
  song({ id: 'pd-frere-jacques', group: NUR, category: 'nursery', title: 'Frère Jacques', bpm: 104,
    hook: 'The classic round: open the Rounds lesson to hear it overlap itself.', why: 'A round works because every bar fits over every other bar: the whole tune sits on one chord.',
    source: 'Traditional French · public domain',
    melody: 'C4:2 D4:2 E4:2 C4:2 C4:2 D4:2 E4:2 C4:2 E4:2 F4:2 G4:4 E4:2 F4:2 G4:4', chords: 'C:16' }),

  // ---------- Holiday ----------
  song({ id: 'pd-silent-night', group: HOL, category: 'holiday', title: 'Silent Night', bpm: 50, spb: 3, bar: 2, timeSig: '6/8', pad: 'strings', lead: 'grand_piano',
    hook: 'A gentle 6/8 lullaby: three chords, endless calm.', why: 'Franz Gruber wrote it in 1818. The harmony is just I, V7 and back: simple chords let the melody breathe.',
    source: 'Franz Gruber (1818) · public domain',
    melody: 'G4:3 A4 G4:2 E4:6 G4:3 A4 G4:2 E4:6 D5:4 D5:2 B4:6 C5:4 C5:2 G4:6', chords: 'C:8 G7:4 C:4' }),
  song({ id: 'pd-joy-to-the-world', group: HOL, category: 'holiday', title: 'Joy to the World', bpm: 92,
    hook: 'A whole major scale, falling in one breath.', why: 'The first line walks straight down the C major scale from high C to low C.',
    source: 'Arr. Lowell Mason (1839) · public domain',
    melody: 'C5:4 B4:3 A4 G4:6 F4:2 E4:4 D4:4 C4:6 G4:2', chords: 'C:4 C:2 G7:2 C:2 G:2 C:4' }),
  song({ id: 'pd-we-wish-you', group: HOL, category: 'holiday', title: 'We Wish You a Merry Christmas', bpm: 132, bar: 3, timeSig: '3/4',
    hook: 'A rising sequence in a bright 3/4.', why: 'Each line starts a step higher than the last (a sequence), which builds excitement.',
    source: 'English traditional · public domain',
    melody: 'G4:2 G4 A4 G4 F#4 E4:2 E4:2 E4:2 A4:2 A4 B4 A4 G4 F#4:2 D4:2 D4:2', chords: 'G:3 C:3 A:3 D:3' }),
  song({ id: 'pd-auld-lang-syne', group: HOL, category: 'holiday', title: 'Auld Lang Syne', bpm: 80,
    hook: 'A pentatonic melody: only five different notes.', why: 'The tune avoids the 4th and 7th of the scale (the pentatonic scale), the same five notes as Raga Bhupali.',
    source: 'Scottish traditional (1788) · public domain',
    melody: 'F4:3 E4 F4:2 A4:2 G4:3 F4 G4:2 A4:2 F4:3 F4 A4:2 C5:2 D5:6 C4:2', chords: 'F:4 C:4 F:4 Bb:4' }),

  // ---------- Folk & world ----------
  song({ id: 'pd-korobeiniki', group: WOR, category: 'world', title: 'Korobeiniki (Russian folk song)', bpm: 144,
    hook: 'The minor-key folk tune famous from a classic falling-blocks video game.', why: 'Published as a poem in 1861 and sung as a folk song. Try Remix > Faster each loop to hear how the folk dance speeds up.',
    source: 'Russian folk (1861) · public domain (melody)', tags: ['accelerando'],
    melody: 'E5:2 B4 C5 D5:2 C5 B4 A4:2 A4 C5 E5:2 D5 C5 B4:3 C5 D5:2 E5:2 C5:2 A4:2 A4:4', chords: 'E:4 Am:4 E:4 Am:4', drums: '4/4' }),
  song({ id: 'pd-sakura', group: WOR, category: 'world', title: 'Sakura Sakura (Japan)', bpm: 66, lead: 'electric_piano', drone: 'A2',
    hook: 'The Japanese "in" scale: pentatonic with half-steps.', why: 'A traditional Japanese melody about cherry blossoms. Its scale has small half-steps (B–C and E–F) that give it a gentle, bittersweet colour.',
    source: 'Japanese traditional · public domain',
    melody: 'A4:2 A4:2 B4:4 A4:2 A4:2 B4:4 A4:2 B4:2 C5:2 B4:2 A4:2 B4 A4 F4:4' }),
  song({ id: 'pd-amazing-grace', group: WOR, category: 'world', title: 'Amazing Grace', bpm: 76, bar: 3, timeSig: '3/4', pad: 'strings', lead: 'grand_piano',
    hook: 'Major pentatonic: the same five notes as Raga Bhupali.', why: 'The tune "New Britain" (1829) uses only do, re, mi, sol, la. Compare it with Raga Bhupali in Module 7.',
    source: 'Tune "New Britain" (1829) · public domain',
    melody: 'G4:4 B4 G4 B4:4 A4:2 G4:4 E4:2 D4:4 D4:2', chords: 'G:3 G:3 C:3 G:3' }),
  song({ id: 'pd-when-the-saints', group: WOR, category: 'world', title: 'When the Saints Go Marching In', bpm: 160, spb: 1,
    hook: 'Call and response in a New Orleans march.', why: 'A gospel tune that became a jazz standard. Turn on Remix > Swing to hear it lilt.',
    source: 'Traditional · public domain',
    melody: 'r C4 E4 F4 G4:4 r C4 E4 F4 G4:4', chords: 'C:16', drums: 'march' }),

  // ---------- Classical moments ----------
  song({ id: 'pd-ode-to-joy', group: CLA, category: 'classical', title: 'Ode to Joy — Beethoven', bpm: 104,
    hook: 'A melody that almost never jumps: every note steps to a neighbour.', why: 'From Beethoven’s 9th Symphony (1824). Stepwise motion makes it easy to sing and remember.',
    source: 'L. van Beethoven, Symphony No. 9 (1824) · public domain',
    melody: 'E4:2 E4:2 F4:2 G4:2 G4:2 F4:2 E4:2 D4:2 C4:2 C4:2 D4:2 E4:2 E4:3 D4 D4:4', chords: 'C:4 G:4 C:4 C:2 G:2', lead: 'grand_piano', pad: 'strings' }),
  song({ id: 'pd-fur-elise', group: CLA, category: 'classical', title: 'Für Elise — Beethoven', bpm: 140, bar: 3, timeSig: '3/8', lead: 'grand_piano',
    hook: 'E and D♯ shimmering a half-step apart: like Jaws, but beautiful.', why: 'The famous opening rocks between neighbouring notes before falling into an A minor arpeggio, the left hand rippling underneath.',
    source: 'L. van Beethoven (1810) · public domain',
    melody: 'E5 D#5 E5 B4 D5 C5 A4:2 r C4 E4 A4 B4:2 r E4 G#4 B4 C5:2 r E4 E5 D#5',
    extra: [{ name: 'Left hand', instrument: 'grand_piano', role: 'harmony', steps: (() => { const s = {}; [[6, 9], [12, 4], [18, 9]].forEach(([at, pc]) => { s[at] = { pc, oct: 2, acc: 2, len: 1 }; s[at + 1] = { pc: pc === 4 ? 11 : 4, oct: pc === 4 ? 2 : 3, acc: 1, len: 1 }; s[at + 2] = { pc: pc === 4 ? 4 : 9, oct: 3, acc: 1, len: 1 }; }); return makeSteps(24, s); })() }], extraAt: 0 }),
  song({ id: 'pd-beethoven-5', group: CLA, category: 'classical', title: 'Symphony No. 5 (opening) — Beethoven', bpm: 108, bar: 2, timeSig: '2/4', lead: 'strings',
    hook: 'Short-short-short-LONG: the most famous rhythm in classical music.', why: 'A four-note motif (three quick notes and a held one) that the whole symphony grows from.',
    source: 'L. van Beethoven, Symphony No. 5 (1808) · public domain',
    melody: 'r G4 G4 G4 Eb4:4 r F4 F4 F4 D4:4',
    extra: [{ name: 'Low strings', instrument: 'acoustic_bass', role: 'bass', steps: (() => { const s = {}; [[1, 7], [2, 7], [3, 7], [4, 3, 4], [9, 5], [10, 5], [11, 5], [12, 2, 4]].forEach(([i, pc, len]) => { s[i] = { pc, oct: 3, acc: 2, len: len || 1 }; }); return makeSteps(16, s); })() }], extraAt: 0 }),
  song({ id: 'pd-eine-kleine', group: CLA, category: 'classical', title: 'Eine kleine Nachtmusik — Mozart', bpm: 120,
    hook: 'The arpeggio "rocket": a G major chord shooting upward.', why: 'Mozart (1787) opens with the notes of the chord itself, broken and launched upward, then answers on D7.',
    source: 'W. A. Mozart, K. 525 (1787) · public domain',
    melody: 'G4:2 r D4 G4:2 r D4 G4 D4 G4 B4 D5:4 C5:2 r A4 C5:2 r A4 C5 A4 F#4 A4 D4:4', chords: 'G:8 D7:8', lead: 'strings', pad: 'grand_piano' }),
  song({ id: 'pd-mountain-king', group: CLA, category: 'classical', title: 'In the Hall of the Mountain King — Grieg', bpm: 96, lead: 'electric_piano',
    hook: 'A sneaking minor scale that gets faster and louder. Try Remix > Faster each loop.', why: 'Grieg (1875) repeats one minor-key phrase while the tempo and volume build: a lesson in accelerando and crescendo.',
    source: 'E. Grieg, Peer Gynt (1875) · public domain', tags: ['accelerando'],
    melody: 'B3 C#4 D4 E4 F#4 D4 F#4:2 F4 C#4 F4:2 E4 C4 E4:2 B3 C#4 D4 E4 F#4 D4 F#4 B4 A4 F#4 D4 F#4 A4:4', chords: 'Bm:4 C#:2 C:2 Bm:4 D:4', bassInst: 'acoustic_bass' }),
  song({ id: 'pd-zarathustra', group: CLA, category: 'classical', title: 'Also sprach Zarathustra — R. Strauss', bpm: 60, lead: 'strings', pad: 'strings',
    hook: 'C → G → C: a perfect fifth, then the octave. The famous film sunrise.', why: 'Strauss (1896) climbs the natural overtones of C, then flips the chord from major (E) to minor (E♭), the drama in one note.',
    source: 'Richard Strauss (1896) · public domain',
    melody: 'C4:4 G4:4 C5:4 E5:2 Eb5:2', chords: 'N:4 C:3 Cm:1',
    extra: [{ name: 'Timpani', instrument: 'sub_bass', role: 'bass', steps: makeSteps(8, { 4: { pc: 0, oct: 2, acc: 3, len: 1 }, 5: { pc: 7, oct: 1, acc: 2, len: 1 }, 6: { pc: 0, oct: 2, acc: 3, len: 1 }, 7: { pc: 7, oct: 1, acc: 2, len: 1 } }) }], extraAt: 0 }),
  song({ id: 'pd-rondo-alla-turca', group: CLA, category: 'classical', title: 'Rondo alla Turca — Mozart', bpm: 120, spb: 4, bar: 2, timeSig: '2/4', lead: 'grand_piano',
    hook: 'A fast neighbour-note figure climbing through A minor.', why: 'Mozart (1783) circles each note with its lower neighbour (B–A–G♯–A), then leaps up to the next.',
    source: 'W. A. Mozart, K. 331 (1783) · public domain',
    melody: 'B4 A4 G#4 A4 C5:4 D5 C5 B4 C5 E5:4 F5 E5 D#5 E5 B5 A5 G#5 A5 B5 A5 G#5 A5 C6:4', chords: 'Am:2 C:2 Am:2 E:1 Am:1', bass: 'root' }),
  song({ id: 'pd-toccata', group: CLA, category: 'classical', title: 'Toccata in D minor (opening) — attrib. J. S. Bach', bpm: 72, lead: 'strings', pad: 'strings',
    hook: 'The spooky mordent, then a falling run over a D pedal.', why: 'An ornament (A–G–A) then a fast descent to C♯, the leading note, pulling home to D. (Free rhythm, approximated to the grid.)',
    source: 'Attrib. J. S. Bach · public domain',
    melody: 'A4 G4 A4:8 G4 F4 E4 D4 C#4:3 D4:7', chords: 'Dm:12' }),
  song({ id: 'pd-morning-mood', group: CLA, category: 'classical', title: 'Morning Mood — Grieg', bpm: 60, spb: 3, bar: 2, timeSig: '6/8', lead: 'electric_piano', pad: 'strings',
    hook: 'A sunrise drawn with five notes: the pentatonic scale.', why: 'Grieg (1875) uses only G, E, D, C and A here, the major pentatonic, which sounds open and calm.',
    source: 'E. Grieg, Peer Gynt (1875) · public domain · rhythm simplified',
    melody: 'G4 E4 D4 C4 D4 E4 G4 E4 D4 C4 D4 E4 D4 E4 G4 E4 G4 A4 E4 A4 G4 E4 D4 C4', chords: 'C:8' }),
  song({ id: 'pd-moonlight', group: CLA, category: 'classical', title: 'Moonlight Sonata (opening) — Beethoven', bpm: 54, spb: 3, lead: 'grand_piano',
    hook: 'Triplet arpeggios: a chord broken into a slow ripple.', why: 'Beethoven (1801) keeps the same three-note pattern rolling while the bass slowly walks down.',
    source: 'L. van Beethoven, Op. 27 No. 2 (1801) · public domain',
    melody: 'G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4',
    extra: [{ name: 'Octave bass', instrument: 'sub_bass', role: 'bass', steps: makeSteps(2, { 0: { pc: 1, oct: 2, acc: 3, len: 1 }, 1: { pc: 11, oct: 1, acc: 3, len: 1 } }) }], extraAt: 0 }),
  song({ id: 'pd-mars', group: CLA, category: 'classical', title: 'Mars, the Bringer of War — Holst', bpm: 152, spb: 6, bar: 5, timeSig: '5/4', lead: 'acoustic_bass', leadName: 'Ostinato',
    hook: 'A relentless 5/4 rhythm on one note: the public-domain cousin of Take Five.', why: 'Holst (1914–16) hammers a single G in five beats (a triplet, two long notes, two short and one long), proving rhythm alone can be terrifying.',
    source: 'G. Holst, The Planets (1916) · public domain',
    melody: 'G2:2 G2:2 G2:2 G2:6 G2:6 G2:3 G2:3 G2:6', drums: null,
    extra: [{ name: 'Snare', instrument: 'percussion', role: 'percussion', steps: makeSteps(30, { 0: { pc: 4, oct: 3, acc: 2, drum: 'snare' }, 2: { pc: 4, oct: 3, acc: 1, drum: 'snare' }, 4: { pc: 4, oct: 3, acc: 1, drum: 'snare' }, 6: { pc: 0, oct: 3, acc: 3, drum: 'kick+snare' }, 12: { pc: 0, oct: 3, acc: 3, drum: 'kick+snare' }, 18: { pc: 4, oct: 3, acc: 2, drum: 'snare' }, 21: { pc: 4, oct: 3, acc: 2, drum: 'snare' }, 24: { pc: 0, oct: 3, acc: 3, drum: 'kick+snare' } }) }] }),
  song({ id: 'pd-habanera', group: CLA, category: 'classical', title: 'Habanera (Carmen) — Bizet', bpm: 72, bar: 2, timeSig: '2/4', lead: 'strings', bassInst: 'acoustic_bass',
    hook: 'A slinking chromatic line over the habanera rhythm.', why: 'Bizet (1875) slides down one half-step at a time over a bass pattern (long-short-short-short) that is a cousin of the tresillo in Lesson 1.6.',
    source: 'G. Bizet, Carmen (1875) · public domain · rhythm simplified',
    melody: 'D5:3 C#5 C5:2 B4:2 Bb4:3 A4 Ab4:2 G4:2',
    extra: [{ name: 'Habanera bass', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(32, Object.fromEntries([0, 8, 16, 24].flatMap(b => [[b, { pc: 2, oct: 2, acc: 3, len: 3 }], [b + 3, { pc: 9, oct: 2, acc: 1, len: 1 }], [b + 4, { pc: 9, oct: 2, acc: 2, len: 2 }], [b + 6, { pc: 2, oct: 3, acc: 2, len: 2 }]]))) }], extraAt: 0 }),

  // ---------- Anthems (play-only) ----------
  song({ id: 'anthem-usa', group: ANT, category: 'anthem', locked: true, title: 'United States — The Star-Spangled Banner (opening)', bpm: 84, bar: 3, timeSig: '3/4', lead: 'grand_piano', pad: 'strings',
    hook: 'The opening outlines the major chord: down, then all the way up.', why: 'The melody is from an 18th-century song (1773). "O say can you see" falls through the chord (G–E–C) and climbs back up to high C.',
    source: 'Music: John Stafford Smith (1773) · public domain', tags: ['anthem'],
    melody: 'C4:2 E4:2 G4:2 C5:4 E5 D5 C5:2 E4:2 F#4:2 G4:4 G4 E4', chords: 'C:3 C:3 C:2 D7:1 G:3' }),
  song({ id: 'anthem-uk', group: ANT, category: 'anthem', locked: true, title: 'United Kingdom — God Save the King (opening)', bpm: 76, bar: 3, timeSig: '3/4', lead: 'grand_piano', pad: 'strings',
    hook: 'A stately 3/4 hymn; the same tune as "My Country, ’Tis of Thee".', why: 'A traditional melody from the 1740s, used by several countries over the centuries. Six bars, mostly stepwise.',
    source: 'Traditional (1740s) · public domain', tags: ['anthem'],
    melody: 'G4:2 G4:2 A4:2 F#4:3 G4 A4:2 B4:2 B4:2 C5:2 B4:3 A4 G4:2 A4:2 G4:2 F#4:2 G4:6', chords: 'G:3 D:3 G:3 G:3 D7:3 G:3' })
];
