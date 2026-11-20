// Lessons added in the content pass: intervals, minor scales, cadences, rounds, tempo ramps,
// Module 7 (Indian taals and ragas) and Module 8 (blues, pentatonic and swing).
import { makeSteps } from './content-helpers.js';
import { melodyRing, chordRings } from './songs.js';

const mel = (str, name = 'Melody', inst = 'marimba', spb = 2, bar = 4) => melodyRing(str, spb, bar, name, inst).ring;
const chords = (str, beats, pad = 'grand_piano', bass = 'acoustic_bass') => chordRings(str, beats, 'root', pad, bass);
const drone = (pc = 0, name = 'Tanpura (Sa + Pa)') => ({ name, instrument: 'strings', role: 'bass', steps: makeSteps(1, { 0: { pc, oct: 3, acc: 2, chord: 'fifth' } }) });
const kit = (n, map, name = 'Drums') => ({ name, instrument: 'percussion', role: 'percussion', steps: makeSteps(n, Object.fromEntries(Object.entries(map).map(([i, d]) => [i, { pc: 0, oct: 3, acc: d.includes('kick') || d.includes('snare') ? 3 : d === 'hat' ? 1 : 2, drum: d }]))) });
const rotate = (ring, k, name, instrument) => {
  const n = ring.steps.length;
  return { ...ring, name, instrument, steps: ring.steps.map((_, i) => ({ ...ring.steps[((i - k) % n + n) % n] })) };
};

// ---------- Tabla ----------
const BOL = { dha: 'dha', dhin: 'dhin', dhi: 'dhin', tin: 'tin', ti: 'tin', ta: 'na', na: 'na', ge: 'ge', ke: 'ke', ka: 'ke', tun: 'tin' };
/** "Dha Dhin Dhin Dha | …" → percussion ring; accents follow the vibhag marks. */
function theka(bols, marks, name = 'Tabla (theka)') {
  const list = bols.replace(/\|/g, ' ').trim().split(/\s+/);
  return {
    name, instrument: 'percussion', role: 'percussion', kit: 'tabla',
    steps: makeSteps(list.length, Object.fromEntries(list.map((b, i) => [i, { pc: 0, oct: 3, acc: i === 0 ? 3 : marks[i] != null ? 3 : 2, drum: BOL[b.toLowerCase()] }])))
  };
}
/** Hand-counting ring: a clap on each tali (and sam); khali is a silent wave. */
function claps(n, marks) {
  return { name: 'Clap & wave', instrument: 'percussion', role: 'percussion', steps: makeSteps(n, Object.fromEntries(Object.entries(marks).filter(([, m]) => m !== '0').map(([i]) => [i, { pc: 0, oct: 3, acc: Number(i) === 0 ? 3 : 2, drum: 'clap' }]))) };
}
function taalCaptions(bols, marks, extra = {}) {
  const list = bols.replace(/\|/g, ' ').trim().split(/\s+/);
  const what = m => (m === 'X' ? 'Sam (X): the cycle’s heaviest beat, clap' : m === '0' ? 'Khali (0): the "empty" section, wave your hand' : m != null ? `Tali ${m}: clap` : '');
  return list.map((b, i) => `Matra ${i + 1} — “${b}”${marks[i] != null ? ' · ' + what(marks[i]) : ''}${extra[i] ? ' · ' + extra[i] : ''}`);
}
function taalLesson(o) {
  const n = o.bols.replace(/\|/g, ' ').trim().split(/\s+/).length;
  return {
    id: o.id, group: 'Module 7 · Taal & Raga (Indian Rhythm and Melody)', eyebrow: `MODULE 7 · LESSON ${o.id}`,
    title: o.title, hook: o.hook, tryPrompt: o.tryPrompt || 'Clap on the X and the numbers, wave on the 0, and say the bols aloud with the tabla.',
    behindSound: o.why, source: o.source || 'Standard Hindustani theka (traditional)', beats: n, bpm: o.bpm, timeSig: `${o.division}`,
    marks: o.marks, tonic: 0, sargam: true, beatCaptions: taalCaptions(o.bols, o.marks),
    rings: [drone(), claps(n, o.marks), theka(o.bols, o.marks)]
  };
}

// ---------- Intervals (2.5) ----------
const intervalScene = (label, hook, pairs, caps) => ({
  label, beats: 4, bpm: 72, hook, beatCaptions: caps,
  rings: [
    { name: 'C drone', instrument: 'strings', role: 'bass', steps: makeSteps(1, { 0: { pc: 0, oct: 2, acc: 2, len: 1 } }) },
    { name: 'Interval', instrument: 'grand_piano', role: 'melody', steps: makeSteps(8, Object.fromEntries(pairs.flatMap(([a, b], i) => [[i * 2, { pc: a[0], oct: a[1], acc: 3 }], [i * 2 + 1, { pc: b[0], oct: b[1], acc: 2 }]]))) }
  ]
});

export const EXTRA_LESSONS = {
  after: {
    '1.6': [{
      id: '1.7', songRef: 'pd-mountain-king', group: 'Module 1 · Pulse, Meter & Space', eyebrow: 'MODULE 1 · LESSON 1.7',
      title: '1.7 Faster & Louder (Accelerando & Crescendo)',
      hook: 'Grieg repeats one phrase over and over. The drama comes from tempo and volume growing every time.',
      tryPrompt: 'Press Play and leave it: each loop is faster and adds a ring. Press Stop to reset. Remix → turn off "Faster each loop" to compare.',
      behindSound: 'Accelerando means gradually getting faster; crescendo means gradually getting louder. In "In the Hall of the Mountain King" (1875) the melody barely changes: the orchestra speeds up and adds instruments until it explodes. Here each loop adds 6 BPM, and the rings enter one by one.',
      source: 'E. Grieg, Peer Gynt Suite No. 1 (1875) · public domain',
      autoRemix: { faster: true, build: true }
    }],
    '2.4': [
      {
        id: '2.5', group: 'Module 2 · Pitch, Color & Intervals', eyebrow: 'MODULE 2 · LESSON 2.5',
        title: '2.5 Intervals: The Distance Between Two Notes',
        hook: 'Every melody is a chain of intervals. Learn a few by the tunes that start with them.',
        tryPrompt: 'Switch between the three sets. On each beat the low note is C; listen to how far the second note travels.',
        behindSound: 'An interval is counted in half-steps (semitones). Small intervals (2nds) sound like steps; 3rds sound sweet; perfect 4ths, 5ths and octaves sound open because their frequencies form simple ratios (4:3, 3:2, 2:1); the tritone (6 half-steps) and 7ths sound tense and want to move. Memory hooks use public-domain tunes: Frère Jacques (major 2nd), When the Saints (major 3rd), Wagner’s Bridal Chorus (perfect 4th), Twinkle Twinkle (perfect 5th), My Bonnie (major 6th).',
        source: 'Standard interval names (Western music theory)', labType: 'sceneFlip',
        scenes: [
          intervalScene('Steps & thirds', 'Major 2nd, major 3rd, minor 3rd, minor 2nd: small, singable distances.',
            [[[0, 4], [2, 4]], [[0, 4], [4, 4]], [[0, 4], [3, 4]], [[0, 4], [1, 4]]],
            ['Beat 1 — C → D: major 2nd (2 half-steps). “Frère Jac-…”', 'Beat 2 — C → E: major 3rd (4). “Oh when the saints…”', 'Beat 3 — C → E♭: minor 3rd (3). Darker than the major 3rd.', 'Beat 4 — C → D♭: minor 2nd (1). The smallest step: the shark-movie rub.']),
          intervalScene('Perfect & wide', 'Perfect 4th, perfect 5th, octave, major 6th: open, strong leaps.',
            [[[0, 4], [5, 4]], [[0, 4], [7, 4]], [[0, 4], [0, 5]], [[0, 4], [9, 4]]],
            ['Beat 1 — C → F: perfect 4th (5). “Here comes the bride…”', 'Beat 2 — C → G: perfect 5th (7). “Twinkle, twinkle…”', 'Beat 3 — C → C: octave (12). The same colour, one shade lighter.', 'Beat 4 — C → A: major 6th (9). “My Bon-nie lies over the ocean…”']),
          intervalScene('Tense', 'Tritone, minor 7th, major 7th, minor 6th: intervals that want to move.',
            [[[0, 4], [6, 4]], [[0, 4], [10, 4]], [[0, 4], [11, 4]], [[0, 4], [8, 4]]],
            ['Beat 1 — C → F♯: tritone (6). Exactly half an octave; once called “the devil in music”.', 'Beat 2 — C → B♭: minor 7th (10). The bluesy pull of a 7th chord.', 'Beat 3 — C → B: major 7th (11). One step short of home: very tense.', 'Beat 4 — C → A♭: minor 6th (8). Bittersweet.'])
        ]
      },
      {
        id: '2.6', group: 'Module 2 · Pitch, Color & Intervals', eyebrow: 'MODULE 2 · LESSON 2.6',
        title: '2.6 Three Minor Scales (Natural, Harmonic, Melodic)',
        hook: 'Raise one note of the minor scale and the V chord suddenly pulls home.',
        tryPrompt: 'Compare the three scenes. Watch the 7th note change colour: G (natural) becomes G♯ (harmonic and melodic).',
        behindSound: 'Natural minor (A B C D E F G) has no leading note: its V chord is E minor, which pulls home only weakly. Harmonic minor raises G to G♯, making an E major chord with a strong pull to A, at the cost of an exotic leap from F to G♯. Melodic minor also raises F to F♯ on the way up, smoothing that leap; classical musicians traditionally use natural minor on the way down.',
        source: 'Standard minor-scale forms (Western music theory)', labType: 'sceneFlip',
        scenes: [
          { label: 'Natural', beats: 4, bpm: 80, hook: 'A B C D E F G A: the V chord is E minor.',
            beatCaptions: ['Beat 1 — A minor chord; the scale starts on A.', 'Beat 2 — C and D: the minor 3rd above A gives the sad colour.', 'Beat 3 — E minor chord (v). E, F…', 'Beat 4 — G → A: a whole step. It arrives without much pull.'],
            rings: [...chords('Am:2 Em:2', 4), mel('A3 B3 C4 D4 E4 F4 G4 A4', 'Scale')] },
          { label: 'Harmonic', beats: 4, bpm: 80, hook: 'Raise G to G♯: the V chord becomes E major.',
            beatCaptions: ['Beat 1 — A minor chord, same start.', 'Beat 2 — C and D, unchanged.', 'Beat 3 — E MAJOR chord (V). F → G♯ is a wide, exotic step.', 'Beat 4 — G♯ → A: a half-step. Strong pull home.'],
            rings: [...chords('Am:2 E:2', 4), mel('A3 B3 C4 D4 E4 F4 G#4 A4', 'Scale')] },
          { label: 'Melodic', beats: 4, bpm: 80, hook: 'Raise F and G on the way up: smooth and strong.',
            beatCaptions: ['Beat 1 — A minor chord.', 'Beat 2 — C and D: still minor at the bottom.', 'Beat 3 — E major chord. F♯ → G♯ are whole steps now: no awkward leap.', 'Beat 4 — G♯ → A: the same pull home as harmonic minor.'],
            rings: [...chords('Am:2 E:2', 4), mel('A3 B3 C4 D4 E4 F#4 G#4 A4', 'Scale')] }
        ]
      }
    ],
    '4.3': [{
      id: '4.4', group: 'Module 4 · Progressions & Cadences', eyebrow: 'MODULE 4 · LESSON 4.4',
      title: '4.4 Four Cadences: How Phrases End',
      hook: 'A cadence is musical punctuation: a full stop, an “Amen”, a plot twist or a comma.',
      tryPrompt: 'Compare the four endings. Each starts on C; listen to the last two chords.',
      behindSound: 'Authentic cadence (V → I) is a full stop. Plagal cadence (IV → I) is the “Amen” at the end of hymns. Deceptive cadence (V → vi) sets up home and then swerves to a minor chord. Half cadence (… → V) stops on V, like a comma or a question.',
      source: 'Standard cadence types (Western music theory)', labType: 'sceneFlip',
      scenes: [
        ['Authentic', 'V → I: the full stop.', 'C:1 F:1 G7:1 C:1', 'G4:2 A4:2 B4:2 C5:2', ['Beat 1 — I (C): home.', 'Beat 2 — IV (F): moving away.', 'Beat 3 — V7 (G7): B, the leading note, wants C.', 'Beat 4 — I (C): resolved. Full stop.']],
        ['Plagal', 'IV → I: the “Amen”.', 'C:1 G7:1 F:1 C:1', 'G4:2 G4:2 A4:2 G4:2', ['Beat 1 — I (C).', 'Beat 2 — V7 (G7).', 'Beat 3 — IV (F): “A-…”', 'Beat 4 — I (C): “…-men”. Gentle and warm.']],
        ['Deceptive', 'V → vi: a plot twist.', 'C:1 F:1 G7:1 Am:1', 'G4:2 A4:2 B4:2 C5:2', ['Beat 1 — I (C).', 'Beat 2 — IV (F).', 'Beat 3 — V7 (G7): you expect C next…', 'Beat 4 — vi (A minor)! The melody still lands on C, but the bass swerves to A.']],
        ['Half', '… → V: a comma, or a question.', 'C:1 Am:1 F:1 G:1', 'E4:2 E4:2 F4:2 D4:2', ['Beat 1 — I (C).', 'Beat 2 — vi (A minor).', 'Beat 3 — IV (F).', 'Beat 4 — V (G): it stops here, unfinished. The next phrase must answer.']]
      ].map(([label, hook, ch, m, caps]) => ({ label, hook, beats: 4, bpm: 66, beatCaptions: caps, rings: [...chords(ch, 4), mel(m)] }))
    }],
    '5.3': [(() => {
      const fj = mel('C4:2 D4:2 E4:2 C4:2 C4:2 D4:2 E4:2 C4:2 E4:2 F4:2 G4:4 E4:2 F4:2 G4:4 G4 A4 G4 F4 E4:2 C4:2 G4 A4 G4 F4 E4:2 C4:2 C4:2 G3:2 C4:4 C4:2 G3:2 C4:4', 'Voice 1', 'marimba');
      const bass = { name: 'Bass', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(16, Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i, { pc: i % 2 ? 7 : 0, oct: 2, acc: i % 2 ? 1 : 2 }]))) };
      const v2 = rotate(fj, 16, 'Voice 2 (enters bar 3)', 'grand_piano'), v3 = rotate(fj, 32, 'Voice 3 (bar 5)', 'electric_piano'), v4 = rotate(fj, 48, 'Voice 4 (bar 7)', 'strings');
      v2.role = v3.role = v4.role = 'harmony';
      const caps = n => Array.from({ length: 32 }, (_, i) => `Bar ${Math.floor(i / 4) + 1}, beat ${(i % 4) + 1} — ${n}`);
      return {
        id: '5.4', group: 'Module 5 · Song Architecture', eyebrow: 'MODULE 5 · LESSON 5.4',
        title: '5.4 Rounds & Canons (Frère Jacques)',
        hook: 'One melody, started at different times, harmonises with itself.',
        tryPrompt: 'Switch from 1 voice to 2 and 4. Each new ring is the same melody, rotated two bars around the circle.',
        behindSound: 'In a round (a simple canon) every voice sings the same tune, entering one phrase later. It only works when every phrase fits over every other phrase: here all four phrases sit on a C major chord. On the wheel, a later entry is literally a rotation of the same ring. Pachelbel’s Canon (in Famous Songs) uses the same idea over a repeating bass.',
        source: 'Frère Jacques (traditional French) · public domain', labType: 'sceneFlip',
        scenes: [
          { label: '1 voice', beats: 32, bpm: 132, hook: 'The tune alone: four phrases, each sung twice.', beatCaptions: caps('one voice'), rings: [bass, fj] },
          { label: '2 voices', beats: 32, bpm: 132, hook: 'Voice 2 starts two bars later: the same ring, rotated.', beatCaptions: caps('two voices: phrase against the next phrase'), rings: [bass, fj, v2] },
          { label: '4 voices', beats: 32, bpm: 132, hook: 'The full four-part round.', beatCaptions: caps('four voices: every phrase at once'), rings: [bass, fj, v2, v3, v4] }
        ]
      };
    })()],
    '6.2': [
      taalLesson({ id: '7.1', title: '7.1 Teentaal: 16 Beats in Four Parts', bpm: 96, division: '4+4+4+4',
        bols: 'Dha Dhin Dhin Dha | Dha Dhin Dhin Dha | Dha Tin Tin Ta | Ta Dhin Dhin Dha', marks: { 0: 'X', 4: '2', 8: '0', 12: '3' },
        hook: 'The most common taal in Hindustani music: 16 matras, grouped 4 + 4 + 4 + 4.',
        why: 'A taal is a rhythmic cycle. Teentaal (“three claps”) has claps on matras 1, 5 and 13 and a wave on 9, the khali (“empty”) section, where the tabla drops its bass strokes (Dha becomes Ta, Dhin becomes Tin). Musicians always know where sam (matra 1) is: improvisations end on it.' }),
      taalLesson({ id: '7.2', title: '7.2 Jhaptaal: 10 Beats (2 + 3 + 2 + 3)', bpm: 108, division: '2+3+2+3',
        bols: 'Dhi Na | Dhi Dhi Na | Ti Na | Dhi Dhi Na', marks: { 0: 'X', 2: '2', 5: '0', 7: '3' },
        hook: 'Uneven groups of two and three, like a 5/4 that repeats twice.',
        why: 'Jhaptaal’s ten matras are grouped 2 + 3 + 2 + 3. Compare it with Take Five and Holst’s Mars (5/4): the same long-short feel, organised as a cycle.' }),
      taalLesson({ id: '7.3', title: '7.3 Rupak: 7 Beats, Starting on the Wave', bpm: 104, division: '3+2+2',
        bols: 'Tin Tin Na | Dhi Na | Dhi Na', marks: { 0: '0', 3: '1', 5: '2' },
        hook: 'Seven matras (3 + 2 + 2), and sam falls on the khali: the cycle begins with a wave.',
        why: 'Rupak is unusual: its first matra is both sam and khali, so it starts light (Tin, no bass) and the heavy Dhi strokes come later. It is common in light classical music and bhajans.' }),
      {
        id: '7.4', group: 'Module 7 · Taal & Raga (Indian Rhythm and Melody)', eyebrow: 'MODULE 7 · LESSON 7.4',
        title: '7.4 Keherwa & Dadra: Folk and Film Grooves',
        hook: 'Keherwa (8) and Dadra (6) drive most folk, bhajan and film songs.',
        tryPrompt: 'Compare the two. Keherwa feels like 4/4; Dadra feels like 6/8 or a waltz.',
        behindSound: 'Keherwa has 8 matras (4 + 4) and Dadra has 6 (3 + 3). Both have one clap (sam) and one wave (khali). They are light taals: drummers vary them freely, unlike the stricter classical thekas.',
        source: 'Standard Hindustani theka (traditional)', labType: 'sceneFlip', tonic: 0, sargam: true,
        scenes: [
          { label: 'Keherwa (8)', beats: 8, bpm: 100, timeSig: '4+4', marks: { 0: 'X', 4: '0' }, hook: 'Dha Ge Na Ti | Na Ke Dhi Na',
            beatCaptions: taalCaptions('Dha Ge Na Ti | Na Ke Dhi Na', { 0: 'X', 4: '0' }), rings: [drone(), claps(8, { 0: 'X', 4: '0' }), theka('Dha Ge Na Ti | Na Ke Dhi Na', { 0: 'X', 4: '0' })] },
          { label: 'Dadra (6)', beats: 6, bpm: 120, timeSig: '3+3', marks: { 0: 'X', 3: '0' }, hook: 'Dha Dhi Na | Dha Ti Na',
            beatCaptions: taalCaptions('Dha Dhi Na | Dha Ti Na', { 0: 'X', 3: '0' }), rings: [drone(), claps(6, { 0: 'X', 3: '0' }), theka('Dha Dhi Na | Dha Ti Na', { 0: 'X', 3: '0' })] }
        ]
      },
      {
        id: '7.5', group: 'Module 7 · Taal & Raga (Indian Rhythm and Melody)', eyebrow: 'MODULE 7 · LESSON 7.5',
        title: '7.5 Raga Bhupali: Five Notes, Evening Calm',
        hook: 'Sa Re Ga Pa Dha: the same five notes as Amazing Grace and Auld Lang Syne.',
        tryPrompt: 'Turn on Sargam to see Sa Re Ga on the dots. Then open Amazing Grace in the Library and compare.',
        behindSound: 'A raga is more than a scale: it has its own notes, phrases, mood and time of day. Bhupali uses only Sa Re Ga Pa Dha (no Ma, no Ni): the major pentatonic. It is sung in the early evening. Here Sa = C, over a tanpura drone of Sa and Pa and a Keherwa groove.',
        source: 'Raga Bhupali (Hindustani tradition)', tonic: 0, sargam: true, beats: 16, bpm: 76, timeSig: 'Keherwa ×2',
        marks: { 0: 'X', 4: '0', 8: 'X', 12: '0' },
        beatCaptions: ['Aaroh (going up): Sa', 'Re', 'Ga', 'Pa', 'Dha', 'Sa′ (upper Sa)', '…held', '…held', 'Avaroh (coming down): Sa′', 'Dha', 'Pa', 'Ga', 'Re', 'Sa', '…held', '…held'].map((t, i) => `Beat ${i + 1} — ${t}`),
        rings: [drone(), theka('Dha Ge Na Ti Na Ke Dhi Na Dha Ge Na Ti Na Ke Dhi Na', { 0: 'X', 4: '0', 8: 'X', 12: '0' }), mel('C4:2 D4:2 E4:2 G4:2 A4:2 C5:6 C5:2 A4:2 G4:2 E4:2 D4:2 C4:6', 'Bhupali (bansuri)', 'electric_piano')]
      },
      {
        id: '7.6', group: 'Module 7 · Taal & Raga (Indian Rhythm and Melody)', eyebrow: 'MODULE 7 · LESSON 7.6',
        title: '7.6 Raga Yaman: The Sharp Ma',
        hook: 'Yaman raises Ma (F → F♯): one changed note gives a bright, yearning colour.',
        tryPrompt: 'Watch for the F♯ dot (tivra Ma). Edit it to F and hear the raga lose its character.',
        behindSound: 'Yaman uses all seven notes, but its Ma is tivra (sharp): Sa Re Ga Ma♯ Pa Dha Ni. Its ascent usually starts from the Ni below Sa (N R G M♯ D N S′), skipping Pa. It is among the first ragas students learn and is sung after sunset. In Western terms it is the Lydian mode.',
        source: 'Raga Yaman (Hindustani tradition)', tonic: 0, sargam: true, beats: 16, bpm: 72, timeSig: 'Keherwa ×2',
        marks: { 0: 'X', 4: '0', 8: 'X', 12: '0' },
        beatCaptions: ['Aaroh: Ni (below Sa)', 'Re', 'Ga', 'Ma♯ (tivra Ma, F♯)', 'Dha', 'Ni', 'Sa′', '…held', 'Avaroh: Sa′', 'Ni', 'Dha', 'Pa', 'Ma♯', 'Ga', 'Re', 'Sa'].map((t, i) => `Beat ${i + 1} — ${t}`),
        rings: [drone(), theka('Dha Ge Na Ti Na Ke Dhi Na Dha Ge Na Ti Na Ke Dhi Na', { 0: 'X', 4: '0', 8: 'X', 12: '0' }), mel('B3:2 D4:2 E4:2 F#4:2 A4:2 B4:2 C5:4 C5:2 B4:2 A4:2 G4:2 F#4:2 E4:2 D4:2 C4:2', 'Yaman (bansuri)', 'electric_piano')]
      },
      // ---------- Module 8 ----------
      (() => {
        const prog = ['C7', 'F7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'];
        const PCS = { C7: 0, F7: 5, G7: 7 };
        const roman = { C7: 'I7 (C7)', F7: 'IV7 (F7)', G7: 'V7 (G7)' };
        const bass = { name: 'Boogie bass', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(48, Object.fromEntries(prog.flatMap((c, b) => [0, 4, 7, 9].map((iv, k) => [b * 4 + k, { pc: (PCS[c] + iv) % 12, oct: 2, acc: k === 0 ? 3 : 2 }])))) };
        const ch = { name: 'Piano (7th chords)', instrument: 'grand_piano', role: 'harmony', steps: makeSteps(12, Object.fromEntries(prog.map((c, b) => [b, { pc: PCS[c], oct: 3, acc: 2, chord: 'dom7' }]))) };
        const dr = kit(48, Object.fromEntries(Array.from({ length: 48 }, (_, i) => [i, i % 2 === 0 ? 'kick+hat' : 'snare+hat'])));
        return {
          id: '8.1', group: 'Module 8 · Blues, Pentatonic & Swing', eyebrow: 'MODULE 8 · LESSON 8.1',
          title: '8.1 The 12-Bar Blues',
          hook: 'Twelve bars, three chords: the form behind blues, early rock’n’roll and countless jams.',
          tryPrompt: 'Follow the chord names in the caption: each wedge of four beats is one bar. Then try Remix → Faster each loop.',
          behindSound: 'The 12-bar blues uses I, IV and V, all as 7th chords: I I I I | IV IV I I | V IV I V. The last bar (the turnaround) sends you back to the top. The bass plays a boogie pattern (root, 3rd, 5th, 6th), one note per beat. Played live, the eighth notes in between would swing (see 8.3).',
          source: 'Traditional 12-bar blues form', beats: 48, bpm: 132, timeSig: '4/4 × 12 bars',
          beatCaptions: Array.from({ length: 48 }, (_, i) => `Bar ${Math.floor(i / 4) + 1} of 12 · ${roman[prog[Math.floor(i / 4)]]}${Math.floor(i / 4) === 11 ? ' — turnaround' : ''}`),
          rings: [bass, ch, dr]
        };
      })(),
      {
        id: '8.2', group: 'Module 8 · Blues, Pentatonic & Swing', eyebrow: 'MODULE 8 · LESSON 8.2',
        title: '8.2 Pentatonic & Blues Scales', swing: 0.62,
        hook: 'Five notes that never clash, and the one “blue note” that makes them cry.',
        tryPrompt: 'Compare the three scales. In the blues scale, find the F♯ dot: the blue note between F and G.',
        behindSound: 'The major pentatonic (C D E G A) leaves out the two notes that create half-steps, so nothing clashes: it is found from Scottish folk to Raga Bhupali. The minor pentatonic (C E♭ F G B♭) is the backbone of blues and rock solos. Add the flat 5th (F♯/G♭) and you get the blues scale.',
        source: 'Standard scale forms', labType: 'sceneFlip',
        scenes: [
          ['Major pentatonic', 'C D E G A: bright, open, no clashes.', 'C:8', 'C4 D4 E4 G4 A4 C5 A4 G4 E4 D4 C4:2 r:4'],
          ['Minor pentatonic', 'C E♭ F G B♭: the rock and blues solo scale.', 'Cm:8', 'C4 Eb4 F4 G4 Bb4 C5 Bb4 G4 F4 Eb4 C4:2 r:4'],
          ['Blues scale', 'Minor pentatonic plus the blue note F♯.', 'C7:8', 'C4 Eb4 F4 F#4 G4 Bb4 C5:2 Bb4 G4 F#4 F4 Eb4 C4:3']
        ].map(([label, hook, c, m]) => ({ label, hook, beats: 8, bpm: 104, swing: 0.62,
          beatCaptions: Array.from({ length: 8 }, (_, i) => `Beat ${i + 1} — ${i < 3 ? 'climbing' : i < 6 ? 'coming down' : 'home on C'}`),
          rings: [...chords(c, 8, 'strings'), mel(m, 'Scale', 'electric_piano'), kit(16, Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i, i % 4 === 0 ? 'kick+hat' : i % 4 === 2 ? 'snare+hat' : 'hat'])))] }))
      },
      {
        id: '8.3', group: 'Module 8 · Blues, Pentatonic & Swing', eyebrow: 'MODULE 8 · LESSON 8.3',
        title: '8.3 Swing vs. Straight',
        hook: 'The same notes. Delay every second eighth note and it starts to swing.',
        tryPrompt: 'Switch between Straight, Swing and Hard swing. Watch the off-beat dots: they don’t move, but they sound later.',
        behindSound: 'In straight time, eighth notes split the beat 50/50. In swing they split it long-short, roughly 2:1 (a triplet feel). Jazz, blues and shuffle grooves live here. Swing is not written in the notes: it’s a way of playing them, which is why the dots stay put.',
        source: 'Jazz and blues performance practice', labType: 'sceneFlip',
        scenes: [['Straight', 0.5, 'Even eighths: 50/50.'], ['Swing', 0.62, 'Long-short: about 62/38.'], ['Hard swing', 0.67, 'Triplet swing: 2:1, a shuffle.']].map(([label, swing, hook]) => ({
          label, swing, hook, beats: 4, bpm: 132,
          beatCaptions: ['Beat 1 — bass and kick together; the hi-hat splits the beat.', 'Beat 2 — snare backbeat. Listen to the gap before the off-beat hat.', 'Beat 3 — the riff answers on the off-beats.', 'Beat 4 — snare; the riff leads back to Beat 1.'],
          rings: [
            { name: 'Walking bass', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(4, { 0: { pc: 0, oct: 2, acc: 3 }, 1: { pc: 4, oct: 2, acc: 2 }, 2: { pc: 7, oct: 2, acc: 2 }, 3: { pc: 9, oct: 2, acc: 2 } }) },
            mel('C5 Eb5 F5 Eb5 C5 Bb4 G4 Bb4', 'Riff', 'electric_piano'),
            kit(8, { 0: 'kick+hat', 1: 'hat', 2: 'snare+hat', 3: 'hat', 4: 'kick+hat', 5: 'hat', 6: 'snare+hat', 7: 'hat' })
          ]
        }))
      }
    ]
  }
};
