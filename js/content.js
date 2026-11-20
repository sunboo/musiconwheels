// Curriculum and song data. Pure data: no DOM, no audio.
// Step fields: pc (pitch class 0–11), oct, acc (1 ghost · 2 medium · 3 accent),
// chord (see theory.js CHORDS), len (length in steps; default = until next note),
// drum ('kick' | 'snare' | 'hat' | 'clap' | 'stomp', '+'-joined for several).

import { makeSteps } from './content-helpers.js';
import { SONGS } from './songs.js';
import { EXTRA_LESSONS } from './lessons-extra.js';
export { makeSteps };

export const RAW_ITEMS = [
  // ---------------- MODULE 1: PULSE, METER & SPACE ----------------
  {
    id: '1.1',
    group: 'Module 1 · Pulse, Meter & Space',
    eyebrow: 'MODULE 1 · LESSON 1.1',
    title: '1.1 The Heartbeat (Pulse & BPM)',
    hook: 'Before melody or harmony exist, music begins with an unbroken human pulse.',
    tryPrompt: 'Tap the center TAP Heart jewel to set your own tempo, or toggle off Beat 3 to feel what happens when a pulse drops out.',
    behindSound: 'Tempo (BPM — Beats Per Minute) measures the speed of your foot tap, not the number of notes. At 60 BPM, every beat is one second; at 120 BPM, the pulse doubles.',
    source: 'Universal Metronome & Maelzel Pulse Scale',
    beats: 4,
    bpm: 84,
    beatCaptions: [
      'Beat 1 — Downbeat anchor on C2 (Outermost Bass Ring).',
      'Beat 2 — Steady forward pulse on C2.',
      'Beat 3 — Halfway around the circle; equal spacing keeps time predictable.',
      'Beat 4 — Final tap before returning home to Beat 1.'
    ],
    rings: [
      { name: 'Bass Pulse', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(4, { 0: { pc: 0, oct: 2, acc: 3 }, 1: { pc: 0, oct: 2, acc: 2 }, 2: { pc: 0, oct: 2, acc: 2 }, 3: { pc: 0, oct: 2, acc: 2 } }) }
    ]
  },
  {
    id: '1.2',
    group: 'Module 1 · Pulse, Meter & Space',
    eyebrow: 'MODULE 1 · LESSON 1.2',
    title: '1.2 Pie Slices (3/4, 4/4 & 5/4 Meter)',
    hook: 'Changing how many beats fit inside one loop transforms a march into a waltz or a spy thriller.',
    tryPrompt: 'Flip between 3/4 Waltz, 4/4 March, and 5/4 Take Five above—or switch to Your Wheel and reshape the outer pegs.',
    behindSound: 'Grouping beats into bars gives music physical gravity: 3 beats creates a swaying circular waltz, 4 beats feels grounded and symmetrical, and 5 beats adds an intriguing asymmetrical lilt.',
    source: 'Brahms’ Lullaby (3/4) · We Will Rock You (4/4) · Take Five (5/4)',
    labType: 'sceneFlip',
    scenes: [
      {
        label: '3/4 Waltz',
        beats: 3,
        bpm: 96,
        hook: 'Three equal slices per bar: heavy downbeat (1), followed by two buoyant lifts (2–3).',
        beatCaptions: [
          'Beat 1 (Strong) — Deep C2 bass anchors the waltz downbeat.',
          'Beat 2 (Light) — Mid G3 piano lifts upward.',
          'Beat 3 (Light) — Second gentle lift before spinning back to Beat 1.'
        ],
        rings: [
          { name: 'Waltz Bass', instrument: 'acoustic_bass', muted: false, solo: false, steps: makeSteps(3, { 0: { pc: 0, oct: 2, acc: 3 } }) },
          { name: 'Waltz Chords', instrument: 'grand_piano', muted: false, solo: false, steps: makeSteps(3, { 1: { pc: 7, oct: 3, acc: 2 }, 2: { pc: 7, oct: 3, acc: 1 } }) }
        ]
      },
      {
        label: '4/4 March',
        beats: 4,
        bpm: 100,
        hook: 'Four balanced slices: the bedrock meter of pop, rock, and classical symphonies.',
        beatCaptions: [
          'Beat 1 — Heavy C2 downbeat.',
          'Beat 2 — Crisp G3 backbeat response.',
          'Beat 3 — Secondary bass pulse on C2.',
          'Beat 4 — Snappy G3 turnaround into Beat 1.'
        ],
        rings: [
          { name: 'March Bass', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(4, { 0: { pc: 0, oct: 2, acc: 3 }, 2: { pc: 0, oct: 2, acc: 2 } }) },
          { name: 'Backbeat Piano', instrument: 'grand_piano', muted: false, solo: false, steps: makeSteps(4, { 1: { pc: 7, oct: 3, acc: 3 }, 3: { pc: 7, oct: 3, acc: 3 } }) }
        ]
      },
      {
        label: '5/4 Take Five',
        beats: 5,
        bpm: 112,
        hook: 'Five beats grouped as 3 + 2: an unexpected extra step that feels effortlessly cool.',
        beatCaptions: [
          'Beat 1 — Deep E♭2 anchors the 3-beat group.',
          'Beat 2 — Syncopated mid-ring B♭3 accent.',
          'Beat 3 — Completing the first 3-beat sway.',
          'Beat 4 — New 2-beat group begins on B♭2.',
          'Beat 5 — Crisp pickup back to Beat 1.'
        ],
        rings: [
          { name: '5/4 Bass', instrument: 'acoustic_bass', muted: false, solo: false, steps: makeSteps(5, { 0: { pc: 3, oct: 2, acc: 3 }, 3: { pc: 10, oct: 2, acc: 2 } }) },
          { name: '5/4 Piano', instrument: 'electric_piano', muted: false, solo: false, steps: makeSteps(5, { 1: { pc: 10, oct: 3, acc: 2 }, 4: { pc: 3, oct: 4, acc: 2 } }) }
        ]
      }
    ],
  },
  {
    id: '1.3',
    group: 'Module 1 · Pulse, Meter & Space',
    eyebrow: 'MODULE 1 · LESSON 1.3',
    title: '1.3 Chopping the Beat (4 vs 8 vs 16)',
    hook: 'One steady foot tap can hold one slow note, two quick notes, or four rapid ripples at once.',
    tryPrompt: 'Watch all three rings lock to the same 4 beats: Outer = 4 steps, Middle = 8 steps, Inner = 16 steps. Try Soloing each ring in the Layers panel!',
    behindSound: 'Subdivision is how musicians fit faster melodies over a slow heartbeat without speeding up the tempo. Quarter notes (4), eighth notes (8), and sixteenth notes (16) are pure 1:2:4 ratios.',
    source: 'Standard rhythmic subdivision: quarter, eighth and sixteenth notes',
    beats: 4,
    bpm: 82,
    beatCaptions: [
      'Beat 1 — All 3 rings align! Quarter (Outer), Eighth (Middle), and Sixteenth (Inner) strike together.',
      'Beat 2 — Outer hits once; Middle plays 2 eighth notes; Inner ripples through 4 sixteenth notes.',
      'Beat 3 — Notice the runner never speeds up—the inner ring simply slices the same angle finer.',
      'Beat 4 — Final 4-note ripple on the inner marimba leads cleanly back to Beat 1.'
    ],
    rings: [
      { name: 'Quarters (4)', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(4, { 0: { pc: 0, oct: 2, acc: 3 }, 1: { pc: 0, oct: 2, acc: 2 }, 2: { pc: 0, oct: 2, acc: 2 }, 3: { pc: 0, oct: 2, acc: 2 } }) },
      { name: 'Eighths (8)', instrument: 'grand_piano', muted: false, solo: false, steps: makeSteps(8, Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, { pc: 7, oct: 3, acc: i % 2 === 0 ? 2 : 1 }]))) },
      { name: 'Sixteenths (16)', instrument: 'marimba', muted: false, solo: false, steps: makeSteps(16, Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i, { pc: i % 4 === 0 ? 4 : 0, oct: 4, acc: i % 4 === 0 ? 2 : 1 }]))) }
    ]
  },
  {
    id: '1.4',
    group: 'Module 1 · Pulse, Meter & Space',
    eyebrow: 'MODULE 1 · LESSON 1.4',
    title: '1.4 Accents & Ghost Notes',
    hook: 'Playing the exact same note with large accents and tiny ghost notes turns a robot into a drummer.',
    tryPrompt: 'Flip between "Human Groove" and "Flat Machine" above, then click any dot in Your Wheel mode to adjust its Accent circle size!',
    behindSound: 'Funk and R&B drummers play quiet "ghost notes" on the snare between the loud backbeats on 2 and 4. You barely hear them one by one, but together they create forward momentum without overpowering the backbeat. Accents are the loud notes; ghost notes are the whispers.',
    source: 'Standard drum-kit technique: accents and ghost notes',
    labType: 'sceneFlip',
    scenes: [
      {
        label: 'Human Groove',
        beats: 4,
        bpm: 104,
        hook: 'Large dots punch Beats 1 & 3; medium dots snap Beats 2 & 4; tiny dots whisper in between.',
        beatCaptions: [
          'Beat 1 — Large crimson bass jewel anchors the downbeat; tiny ghost notes shimmer inside.',
          'Beat 2 — Crisp large backbeat accent with soft ghost subdivisions.',
          'Beat 3 — Heavy bass accent returns while ghost notes keep the pocket moving.',
          'Beat 4 — Snappy backbeat lifts into the next bar.'
        ],
        rings: [
          { name: 'Pocket Bass', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 0, oct: 2, acc: 3 }, 3: { pc: 0, oct: 2, acc: 1 }, 4: { pc: 0, oct: 2, acc: 3 }, 7: { pc: 7, oct: 2, acc: 1 } }) },
          { name: 'Backbeat & Ghosts', instrument: 'marimba', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 7, oct: 4, acc: 1 }, 1: { pc: 7, oct: 4, acc: 1 }, 2: { pc: 7, oct: 4, acc: 3 }, 3: { pc: 7, oct: 4, acc: 1 }, 4: { pc: 7, oct: 4, acc: 1 }, 5: { pc: 7, oct: 4, acc: 1 }, 6: { pc: 7, oct: 4, acc: 3 }, 7: { pc: 7, oct: 4, acc: 1 } }) }
        ]
      },
      {
        label: 'Flat Machine',
        beats: 4,
        bpm: 104,
        hook: 'Every dot is identical in size and volume—notice how quickly the groove loses its bounce.',
        beatCaptions: [
          'Beat 1 — Equal medium velocity on every step.',
          'Beat 2 — No dynamic contrast between downbeat and offbeat.',
          'Beat 3 — Mechanical repetition without human breathing.',
          'Beat 4 — Switch back to "Human Groove" to feel the difference immediately.'
        ],
        rings: [
          { name: 'Flat Bass', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 0, oct: 2, acc: 2 }, 2: { pc: 0, oct: 2, acc: 2 }, 4: { pc: 0, oct: 2, acc: 2 }, 6: { pc: 0, oct: 2, acc: 2 } }) },
          { name: 'Flat Pulse', instrument: 'marimba', muted: false, solo: false, steps: makeSteps(8, Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, { pc: 7, oct: 4, acc: 2 }]))) }
        ]
      }
    ],
  },
  {
    id: '1.5',
    group: 'Module 1 · Pulse, Meter & Space',
    eyebrow: 'MODULE 1 · LESSON 1.5',
    title: '1.5 Silence & Negative Space (Rests)',
    hook: 'Music is not the notes—it is the silence between them.',
    tryPrompt: 'Compare "Sculpted Rests" against "Crowded Wall". Then click active dots in Your Wheel mode to carve your own empty recesses!',
    behindSound: 'A saying often attributed to Claude Debussy (and to Mozart, with no reliable source for either) holds that music lives in the space between the notes. Whoever said it, strategic rests give melodies suspense and let bass notes ring cleanly.',
    source: 'Rests and syncopation (quote attribution unverified)',
    labType: 'sceneFlip',
    scenes: [
      {
        label: 'Sculpted Rests',
        beats: 4,
        bpm: 94,
        hook: 'Empty recesses create dramatic suspense—making every remaining jewel hit twice as hard.',
        beatCaptions: [
          'Beat 1 — Bold A2 bass & A4 melody strike, then immediately step aside into silence.',
          'Beat 2 — Pure rest on the downbeat; an unexpected offbeat spark answers on the "&" of 2.',
          'Beat 3 — Silence lets the harmony breathe before a crisp syncopated pickup.',
          'Beat 4 — Open space builds anticipation for Beat 1’s return.'
        ],
        rings: [
          { name: 'Sparse Bass', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 9, oct: 2, acc: 3 }, 3: { pc: 4, oct: 2, acc: 2 } }) },
          { name: 'Syncopated Lead', instrument: 'marimba', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 9, oct: 4, acc: 3 }, 3: { pc: 0, oct: 5, acc: 2 }, 5: { pc: 4, oct: 5, acc: 2 } }) }
        ]
      },
      {
        label: 'Crowded Wall',
        beats: 4,
        bpm: 94,
        hook: 'Every single step is filled—notice how the groove loses drama when nothing is left silent.',
        beatCaptions: [
          'Beat 1 — Continuous stream of notes with zero breathing room.',
          'Beat 2 — When every slot is full, no single note stands out.',
          'Beat 3 — Switch back to "Sculpted Rests" to hear negative space bring the rhythm alive.',
          'Beat 4 — Continuous eighth-note wall.'
        ],
        rings: [
          { name: 'Dense Bass', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(8, Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, { pc: 9, oct: 2, acc: 2 }]))) },
          { name: 'Dense Melody', instrument: 'marimba', muted: false, solo: false, steps: makeSteps(8, Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, { pc: (9 + i) % 12, oct: 4, acc: 2 }]))) }
        ]
      }
    ],
  },
  {
    id: '1.6',
    group: 'Module 1 · Pulse, Meter & Space',
    eyebrow: 'MODULE 1 · LESSON 1.6',
    title: '1.6 Asymmetrical Grooves (3 + 3 + 2)',
    hook: 'Slicing 8 steps unevenly into 3 + 3 + 2 creates the magnetic pull behind modern pop and Latin rhythms.',
    tryPrompt: 'Watch the middle piano & inner marimba strike on steps 1, 4, and 7 (3 + 3 + 2) against the steady 4-beat bass!',
    behindSound: 'Known globally as the "Tresillo" pulse, grouping 8 eighth-notes into 3 + 3 + 2 drives Coldplay’s "Clocks", Ed Sheeran’s "Shape of You", and Afro-Cuban son.',
    source: 'Tresillo / Clocks (3+3+2 Syncopation)',
    beats: 4,
    bpm: 118,
    beatCaptions: [
      'Beat 1 (Step 1 of 8) — Group 1 begins (3 steps long): E♭4 & E♭2 lock together.',
      'Beat 2 (Step 4 of 8) — Group 2 strikes slightly early on the "&" of 2!',
      'Beat 3 — The 3-step grouping stretches across Beat 3.',
      'Beat 4 (Step 7 of 8) — Group 3 snaps on Beat 4 (2 steps long), propelling back to Beat 1.'
    ],
    rings: [
      { name: '4-Beat Anchor', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(4, { 0: { pc: 3, oct: 2, acc: 3 }, 1: { pc: 3, oct: 2, acc: 2 }, 2: { pc: 3, oct: 2, acc: 2 }, 3: { pc: 3, oct: 2, acc: 2 } }) },
      { name: '3+3+2 Piano', instrument: 'grand_piano', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 3, oct: 4, acc: 3 }, 3: { pc: 10, oct: 3, acc: 3 }, 6: { pc: 7, oct: 3, acc: 3 } }) },
      { name: '3+3+2 Marimba', instrument: 'marimba', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 7, oct: 5, acc: 3 }, 1: { pc: 3, oct: 5, acc: 1 }, 2: { pc: 10, oct: 4, acc: 1 }, 3: { pc: 7, oct: 5, acc: 3 }, 4: { pc: 3, oct: 5, acc: 1 }, 5: { pc: 10, oct: 4, acc: 1 }, 6: { pc: 7, oct: 5, acc: 3 }, 7: { pc: 3, oct: 5, acc: 1 } }) }
    ]
  },

  // ---------------- MODULE 2: PITCH, COLOR & INTERVALS ----------------
  {
    id: '2.1',
    group: 'Module 2 · Pitch, Color & Intervals',
    eyebrow: 'MODULE 2 · LESSON 2.1',
    title: '2.1 The Color of Sound (Rainbow & Octaves)',
    hook: 'The 12 chromatic notes follow the visible rainbow from Red (C) to Magenta (B), while octaves shift luminance.',
    tryPrompt: 'Tap any of the 12 rainbow keys (C through B) or switch Octaves (1–6) below to see Hue and Value Ramp update live across every ring!',
    behindSound: 'Doubling a sound wave’s frequency (e.g., C3 at 130.8 Hz to C4 at 261.6 Hz) produces the same note name one octave higher—which is why octaves share the exact same rainbow hue while rising in brightness. Linking colour to pitch is an old idea: Isaac Newton matched his seven rainbow colours to the seven notes of a scale (Opticks, 1704), and the composer Alexander Scriabin wrote a part for a “colour organ” in Prometheus (1910). Concentric’s colours are a learning aid, not a law of nature: try the circle-of-fifths palette in Settings.',
    source: 'Octave = 2:1 frequency ratio (acoustics) · I. Newton, Opticks (1704) · A. Scriabin, Prometheus (1910)',
    labType: 'colorLab',
    selectedPC: 0,
    selectedOct: 4,
    beats: 4,
    bpm: 84,
    beatCaptions: [
      'Beat 1 — Outermost Bass Ring plays deep low-value Octave 2.',
      'Beat 2 — Middle Piano Ring plays mid-value Octave 3.',
      'Beat 3 — Inner Melody Ring plays vibrant Octave 4.',
      'Beat 4 — Octave 5 shines in luminous high-value brightness—same rainbow hue across four octaves!'
    ],
    rings: [
      { name: 'Low Octave (2)', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(4, { 0: { pc: 0, oct: 2, acc: 3 } }) },
      { name: 'Mid Octave (3)', instrument: 'grand_piano', muted: false, solo: false, steps: makeSteps(4, { 1: { pc: 0, oct: 3, acc: 3 } }) },
      { name: 'High Octaves (4–5)', instrument: 'marimba', muted: false, solo: false, steps: makeSteps(4, { 2: { pc: 0, oct: 4, acc: 3 }, 3: { pc: 0, oct: 5, acc: 3 } }) }
    ]
  },
  {
    id: '2.2',
    group: 'Module 2 · Pitch, Color & Intervals',
    eyebrow: 'MODULE 2 · LESSON 2.2',
    title: '2.2 Tension vs. Heroism (Half-step vs. Perfect 5th)',
    hook: 'One half-step creates the looming dread of a shark-movie bass line; a perfect 5th launches the sunrise heroism of Also sprach Zarathustra.',
    tryPrompt: 'Flip between "1. Half-step (Tension)" and "2. Zarathustra (Heroism)" so you hear and see one crystal-clear interval at a time.',
    behindSound: 'A Minor 2nd (1 semitone apart) causes sound waves to rub closely together, creating suspense. A Perfect 5th (7 semitones apart, a 3:2 frequency ratio) locks into pure acoustic resonance.',
    source: 'Two-note half-step ostinato (the device made famous by the film Jaws, 1975) · R. Strauss, Also sprach Zarathustra (1896, public domain)',
    labType: 'sceneFlip',
    scenes: [
      {
        label: '1. Half-step (Tension)',
        beats: 4,
        bpm: 78,
        hook: 'Half-step friction: E2 creeps up just ONE tiny half-step to F2 on Beat 2.',
        beatCaptions: [
          'Beat 1 — Deep E2 rumble (Lime) on the Outermost Bass Ring.',
          'Beat 2 — Moves just +1 semitone to F2 (Green)! Notice the nearly adjacent rainbow hues rubbing together.',
          'Beat 3 — Drops back to E2, refusing to escape the half-step trap.',
          'Beat 4 — F2 tension pulses again—pure cinematic suspense.'
        ],
        rings: [
          { name: 'Jaws Bass', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(4, { 0: { pc: 4, oct: 2, acc: 3 }, 1: { pc: 5, oct: 2, acc: 3 }, 2: { pc: 4, oct: 2, acc: 3 }, 3: { pc: 5, oct: 2, acc: 3 } }) }
        ]
      },
      {
        label: '2. Zarathustra (Heroism)',
        beats: 4,
        bpm: 60,
        hook: 'Also sprach Zarathustra (Strauss, 1896): C leaps a Perfect 5th up to G, then up to the octave C.',
        beatCaptions: [
          'Beat 1 — Grounded C4 (Red) over a low C pedal.',
          'Beat 2 — Leaps +7 semitones to G4: a Perfect 5th. Open, strong, heroic.',
          'Beat 3 — +5 more to C5: the octave. Same colour as Beat 1, brighter.',
          'Beat 4 — E5 completes the major chord: the sunrise.'
        ],
        rings: [
          { name: 'Pedal & Timpani', instrument: 'sub_bass', steps: makeSteps(4, { 0: { pc: 0, oct: 2, acc: 3, len: 4 } }) },
          { name: 'Brass Fanfare', instrument: 'strings', steps: makeSteps(4, { 0: { pc: 0, oct: 4, acc: 3 }, 1: { pc: 7, oct: 4, acc: 3 }, 2: { pc: 0, oct: 5, acc: 3 }, 3: { pc: 4, oct: 5, acc: 3 } }) }
        ]
      }
    ],
  },
  {
    id: '2.3',
    group: 'Module 2 · Pitch, Color & Intervals',
    eyebrow: 'MODULE 2 · LESSON 2.3',
    title: '2.3 Steps & Skips (The Major Scale)',
    hook: 'Seven carefully spaced steps (W–W–H–W–W–W–H) build the bright rainbow ladder behind countless melodies.',
    tryPrompt: 'Watch the rainbow spectrum climb smoothly from Red (C4) through Orange, Gold, Green, Cyan, Indigo, and Magenta back to C5!',
    behindSound: 'The Major Scale uses five Whole Steps (2 semitones) and two Half Steps (between E–F and B–C). Those two half-steps create magnetic pull toward the home note.',
    source: 'Diatonic Ionian / Major Scale Architecture',
    beats: 8,
    bpm: 96,
    beatCaptions: [
      'Beat 1 — Do (C4 · Red, the root)',
      'Beat 2 — Re (D4 · Amber)',
      'Beat 3 — Mi (E4 · Lime)',
      'Beat 4 — Fa (F4 · Green Green, half-step)',
      'Beat 5 — Sol (G4 · Sky Blue)',
      'Beat 6 — La (A4 · Indigo)',
      'Beat 7 — Ti (B4 · Magenta, magnetic pull)',
      'Beat 8 — Do! (C5 · brighter red, one octave up)'
    ],
    rings: [
      { name: 'Tonic Pedal', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 0, oct: 2, acc: 3 }, 4: { pc: 7, oct: 2, acc: 2 } }) },
      { name: 'C Major Rainbow Scale', instrument: 'marimba', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 0, oct: 4, acc: 3 }, 1: { pc: 2, oct: 4, acc: 2 }, 2: { pc: 4, oct: 4, acc: 2 }, 3: { pc: 5, oct: 4, acc: 2 }, 4: { pc: 7, oct: 4, acc: 3 }, 5: { pc: 9, oct: 4, acc: 2 }, 6: { pc: 11, oct: 4, acc: 2 }, 7: { pc: 0, oct: 5, acc: 3 } }) }
    ]
  },
  {
    id: '2.4',
    group: 'Module 2 · Pitch, Color & Intervals',
    eyebrow: 'MODULE 2 · LESSON 2.4',
    title: '2.4 Scale Moods (Major vs. Dorian vs. Aeolian)',
    hook: 'Lower two notes and Major becomes Dorian; lower one more (the 6th) and Dorian becomes dark Aeolian minor.',
    tryPrompt: 'Flip between the three scenes and listen to the long note on Beat 3: that 6th is what makes Dorian sound hopeful rather than dark.',
    behindSound: 'Dorian lowers the 3rd and 7th of the Major scale (E → E♭, B → B♭) but keeps the natural 6th (A). Natural minor (Aeolian) also lowers the 6th (A → A♭). That one note is the difference between bittersweet and sad.',
    source: 'Modes · Ionian, Dorian and Aeolian on C',
    labType: 'sceneFlip',
    scenes: [
      {
        label: 'Bright C Major',
        beats: 4,
        bpm: 84,
        hook: 'Natural E, A and B: open and optimistic.',
        beatCaptions: [
          'Beat 1 — C, then D.',
          'Beat 2 — E (major 3rd), then F.',
          'Beat 3 — G, then a long A: the natural 6th.',
          'Beat 4 — B (major 7th) leads home.'
        ],
        rings: [
          { name: 'Tonic Bass', instrument: 'sub_bass', steps: makeSteps(4, { 0: { pc: 0, oct: 2, acc: 3, len: 4 } }) },
          { name: 'Scale Melody', instrument: 'grand_piano', steps: makeSteps(8, { 0: { pc: 0, oct: 4, acc: 3 }, 1: { pc: 2, oct: 4, acc: 1 }, 2: { pc: 4, oct: 4, acc: 2 }, 3: { pc: 5, oct: 4, acc: 1 }, 4: { pc: 7, oct: 4, acc: 2 }, 5: { pc: 9, oct: 4, acc: 3, len: 2 }, 7: { pc: 11, oct: 4, acc: 2 } }) }
        ]
      },
      {
        label: 'C Dorian',
        beats: 4,
        bpm: 84,
        hook: 'E♭ and B♭ lowered, but A stays natural: bittersweet, forward-looking.',
        beatCaptions: [
          'Beat 1 — C, then D.',
          'Beat 2 — E♭ (minor 3rd) shifts the mood, then F.',
          'Beat 3 — G, then a long A natural: the Dorian note.',
          'Beat 4 — B♭ (flat 7th) leads home.'
        ],
        rings: [
          { name: 'Tonic Bass', instrument: 'sub_bass', steps: makeSteps(4, { 0: { pc: 0, oct: 2, acc: 3, len: 4 } }) },
          { name: 'Scale Melody', instrument: 'grand_piano', steps: makeSteps(8, { 0: { pc: 0, oct: 4, acc: 3 }, 1: { pc: 2, oct: 4, acc: 1 }, 2: { pc: 3, oct: 4, acc: 2 }, 3: { pc: 5, oct: 4, acc: 1 }, 4: { pc: 7, oct: 4, acc: 2 }, 5: { pc: 9, oct: 4, acc: 3, len: 2 }, 7: { pc: 10, oct: 4, acc: 2 } }) }
        ]
      },
      {
        label: 'C Aeolian (A♭)',
        beats: 4,
        bpm: 84,
        hook: 'Lower the 6th too and the mood turns dark: natural minor.',
        beatCaptions: [
          'Beat 1 — C, then D.',
          'Beat 2 — E♭, then F.',
          'Beat 3 — G, then a long A♭: the dark 6th.',
          'Beat 4 — B♭ leads home.'
        ],
        rings: [
          { name: 'Tonic Bass', instrument: 'sub_bass', steps: makeSteps(4, { 0: { pc: 0, oct: 2, acc: 3, len: 4 } }) },
          { name: 'Scale Melody', instrument: 'grand_piano', steps: makeSteps(8, { 0: { pc: 0, oct: 4, acc: 3 }, 1: { pc: 2, oct: 4, acc: 1 }, 2: { pc: 3, oct: 4, acc: 2 }, 3: { pc: 5, oct: 4, acc: 1 }, 4: { pc: 7, oct: 4, acc: 2 }, 5: { pc: 8, oct: 4, acc: 3, len: 2 }, 7: { pc: 10, oct: 4, acc: 2 } }) }
        ]
      }
    ]
  },

  // ---------------- MODULE 3: INTERACTIVE CHORD & VOICING LAB ----------------
  {
    id: '3.1',
    group: 'Module 3 · Interactive Chord & Voicing Lab',
    eyebrow: 'MODULE 3 · LESSON 3.1',
    title: '3.1 Unison vs. Major vs. Minor',
    hook: 'Lowering the middle note of a triad by just one semitone shifts a chord from bright daylight to deep reflection.',
    tryPrompt: 'Pick any Root Note (C, D, E, F, G, A, B) below and watch Beat 1 play Single Unison, Beat 2 play Major, and Beat 3 play Minor!',
    behindSound: 'A Major triad stacks Root + 4 semitones + 7 semitones. A Minor triad lowers that middle 3rd to 3 semitones above the root—one tiny key change with huge emotional power.',
    source: 'Triad Acoustics · Root–3rd–5th Construction',
    labType: 'chordLab',
    chordLabMode: 'compareQualities',
    labRoot: 0,
    labQuality: 'major',
    labVoicing: 'compare',
    beats: 4,
    bpm: 76,
    beatCaptions: [
      'Beat 1 — Single Note (Unison): solid jewel ringing alone.',
      'Beat 2 — Major Triad (1–3–5): geometric halo shows stacked Major 3rd & 5th—bright and resolved.',
      'Beat 3 — Minor Triad (1–♭3–5): middle note drops 1 semitone—reflective and emotional.',
      'Beat 4 — Rest (Silence lets your ear absorb the contrast).'
    ],
    rings: []
  },
  {
    id: '3.2',
    group: 'Module 3 · Interactive Chord & Voicing Lab',
    eyebrow: 'MODULE 3 · LESSON 3.2',
    title: '3.2 Chord Inversions (Root, 1st & 2nd)',
    hook: 'Same three notes, different bottom note: flipping which note sits on the Outer Bass Ring changes the chord’s weight.',
    tryPrompt: 'Select any chord (e.g., G Major or C Minor) and switch between Root Position, 1st Inversion, and 2nd Inversion!',
    behindSound: 'Inversions let pianists and orchestras move smoothly from one chord to the next without jumping wildly across the keyboard—known as smooth voice leading.',
    source: 'Inversion & Voice-Leading Principles',
    labType: 'chordLab',
    chordLabMode: 'inversions',
    labRoot: 7,
    labQuality: 'major',
    labVoicing: 'inv1',
    beats: 4,
    bpm: 78,
    beatCaptions: [
      'Beat 1 — Outermost Bass Ring anchors the chosen inversion bass note.',
      'Beat 2 — Middle Piano Ring & Inner Marimba Ring stack the upper chord tones.',
      'Beat 3 — Listen to how lighter inversions float compared to grounded Root Position.',
      'Beat 4 — Try switching between Root, 1st Inv, and 2nd Inv in the drawer!'
    ],
    rings: []
  },
  {
    id: '3.3',
    group: 'Module 3 · Interactive Chord & Voicing Lab',
    eyebrow: 'MODULE 3 · LESSON 3.3',
    title: '3.3 Orchestral Open Voicing (Multi-Ring)',
    hook: 'Give each instrument its own octave across the concentric rings, and three simple notes become a symphony.',
    tryPrompt: 'Choose any chord (G Major, C Minor, F Major...) and flip between "Close Bunch" and "3-Ring Open Orchestral" at Beat 1!',
    behindSound: 'When notes are bunched tightly in low octaves, they sound muddy. Spreading Root (Outer Bass), 5th (Middle Piano), and 3rd (Inner Marimba) across octaves creates crystal-clear orchestral depth.',
    source: 'Orchestral & Choral Open-Voicing Architecture',
    labType: 'chordLab',
    chordLabMode: 'orchestral',
    labRoot: 7,
    labQuality: 'major',
    labVoicing: 'open',
    beats: 4,
    bpm: 74,
    beatCaptions: [
      'Beat 1 — Runner strikes all 3 rings at once: Outer Bass (Root) + Mid Piano (5th) + Inner Marimba (3rd)!',
      'Beat 2 — Open orchestral resonance rings out across three octaves.',
      'Beat 3 — Switch to "Close Bunch" in the drawer to hear how tight vs. wide compares.',
      'Beat 4 — Preparing for the next orchestral strike on Beat 1.'
    ],
    rings: []
  },
  {
    id: '3.4',
    group: 'Module 3 · Interactive Chord & Voicing Lab',
    eyebrow: 'MODULE 3 · LESSON 3.4',
    title: '3.4 Block Chords vs. Arpeggios',
    hook: 'An arpeggio takes a stacked chord and unrolls its notes clockwise around the circle like ripples on water.',
    tryPrompt: 'Pick any chord below and flip between "Block Chord" (all notes at once) and "Arpeggio Wave" (notes rippling across Beats 1–4)!',
    behindSound: 'From Beethoven’s "Moonlight Sonata" to Coldplay’s "Clocks", arpeggios turn static harmony into flowing rhythmic motion.',
    source: 'Broken-Chord & Arpeggio Patterns',
    labType: 'chordLab',
    chordLabMode: 'arpeggio',
    labRoot: 0,
    labQuality: 'major',
    labVoicing: 'arpeggio',
    beats: 4,
    bpm: 92,
    beatCaptions: [
      'Beat 1 — Root note anchors the bass and starts the arpeggio.',
      'Beat 2 — Chord 3rd enters on the inner ring.',
      'Beat 3 — Chord 5th rises higher around the rainbow.',
      'Beat 4 — Octave root completes the broken-chord wave!'
    ],
    rings: []
  },

  // ---------------- MODULE 4: PROGRESSIONS & CADENCES ----------------
  {
    id: '4.1',
    group: 'Module 4 · Progressions & Cadences',
    eyebrow: 'MODULE 4 · LESSON 4.1',
    title: '4.1 Musical Gravity (I – IV – V7 – I)',
    hook: 'Chords are sentences: Home (I) departs to (IV), builds peak magnetic tension at (V7), and resolves home.',
    tryPrompt: 'Watch the harmonic tension peak at Beat 5–6 (G7) and feel the unmistakable sense of arrival when Beat 1 (C Major) returns!',
    behindSound: 'The V7 → I Authentic Cadence is the strongest gravitational pull in Western music: the leading tone (B) and flat-7th (F) inside G7 both resolve by a single half-step into C Major.',
    source: 'Classical Cadence & Tonal Gravity (I–IV–V7–I)',
    beats: 8,
    bpm: 86,
    beatCaptions: [
      'Beat 1 (Bar 1) — Home (I · C Major): stable, grounded starting point.',
      'Beat 2 — C Major melody echoes.',
      'Beat 3 — Departure (IV · F Major): stepping away from home.',
      'Beat 4 — F Major opens upward.',
      'Beat 5 (Bar 2) — Tension builds (V7 · G Dominant 7th).',
      'Beat 6 — Peak harmonic suspense on G7—your ear expects resolution!',
      'Beat 7 — Final tension pull before home.',
      'Beat 8 / 1 — Resolution back to Home (I · C Major)!'
    ],
    rings: [
      { name: 'Cadence Bass', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 0, oct: 2, acc: 3 }, 2: { pc: 5, oct: 2, acc: 3 }, 4: { pc: 7, oct: 2, acc: 3 }, 6: { pc: 0, oct: 2, acc: 3 } }) },
      { name: 'Cadence Chords', instrument: 'grand_piano', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 0, oct: 3, acc: 3, chord: 'major' }, 2: { pc: 5, oct: 3, acc: 3, chord: 'major' }, 4: { pc: 7, oct: 3, acc: 3, chord: 'dom7' }, 6: { pc: 0, oct: 3, acc: 3, chord: 'major' } }) },
      { name: 'Voice-Led Melody', instrument: 'marimba', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 4, oct: 4, acc: 2 }, 1: { pc: 7, oct: 4, acc: 1 }, 2: { pc: 9, oct: 4, acc: 2 }, 3: { pc: 5, oct: 4, acc: 1 }, 4: { pc: 11, oct: 4, acc: 3 }, 5: { pc: 5, oct: 4, acc: 2 }, 6: { pc: 4, oct: 4, acc: 3 }, 7: { pc: 0, oct: 5, acc: 2 } }) }
    ]
  },
  {
    id: '4.2',
    group: 'Module 4 · Progressions & Cadences',
    eyebrow: 'MODULE 4 · LESSON 4.2',
    title: '4.2 The 4-Chord Loop (I – V – vi – IV)',
    hook: 'Four chords—three bright Major, one emotional Minor—power hundreds of unforgettable modern anthems.',
    tryPrompt: 'Listen for the poignant emotional dip at Beat 5 when the progression lands on A Minor (vi)!',
    behindSound: 'By placing the relative minor (vi) right after V, the progression avoids ending too early and creates an endless, uplifting emotional loop ("Let It Be", "No Woman No Cry", "Someone Like You").',
    source: 'Axis Progression · I – V – vi – IV in C Major',
    beats: 8,
    bpm: 92,
    beatCaptions: [
      'Beat 1 — I (C Major): Warm, confident opening.',
      'Beat 2 — Melody floats over C Major.',
      'Beat 3 — V (G Major): Bright upward lift.',
      'Beat 4 — Leading into the emotional turn.',
      'Beat 5 — vi (A Minor): Heartfelt minor shift!',
      'Beat 6 — A Minor resonance.',
      'Beat 7 — IV (F Major): Hopeful bridge back to Beat 1.',
      'Beat 8 — Smooth turnaround into C Major.'
    ],
    rings: [
      { name: 'Anthem Bass', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 0, oct: 2, acc: 3 }, 2: { pc: 7, oct: 2, acc: 3 }, 4: { pc: 9, oct: 2, acc: 3 }, 6: { pc: 5, oct: 2, acc: 3 } }) },
      { name: 'Anthem Piano', instrument: 'grand_piano', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 0, oct: 3, acc: 3, chord: 'major' }, 2: { pc: 7, oct: 3, acc: 3, chord: 'major' }, 4: { pc: 9, oct: 3, acc: 3, chord: 'minor' }, 6: { pc: 5, oct: 3, acc: 3, chord: 'major' } }) },
      { name: 'Anthem Hook', instrument: 'marimba', muted: false, solo: false, steps: makeSteps(8, { 0: { pc: 4, oct: 4, acc: 2 }, 1: { pc: 7, oct: 4, acc: 2 }, 2: { pc: 2, oct: 4, acc: 2 }, 3: { pc: 7, oct: 4, acc: 2 }, 4: { pc: 0, oct: 5, acc: 3 }, 5: { pc: 4, oct: 5, acc: 2 }, 6: { pc: 9, oct: 4, acc: 2 }, 7: { pc: 7, oct: 4, acc: 2 } }) }
    ]
  },
  {
    id: '4.3',
    group: 'Module 4 · Progressions & Cadences',
    eyebrow: 'MODULE 4 · LESSON 4.3',
    title: '4.3 Smooth Voice Leading',
    hook: 'Good chord changes move each voice as little as possible, like singers stepping to the nearest note.',
    tryPrompt: 'Flip between "Root-Position Jumps" and "Smooth Voice Leading". Same chords, very different motion in the piano.',
    behindSound: 'Played in root position every time, all the voices jump together and make parallel fifths and octaves, which classical teachers avoid. Choosing the nearest inversion keeps shared notes still and moves the rest by step.',
    source: 'Common-practice voice-leading rules',
    labType: 'sceneFlip',
    scenes: [
      {
        label: 'Root-Position Jumps',
        beats: 8,
        bpm: 80,
        hook: 'Every chord in root position: the whole hand jumps each time.',
        beatCaptions: ['Beat 1 — C major (I).', 'Beat 2 — Hold.', 'Beat 3 — F major (IV): watch the middle ring.', 'Beat 4 — Hold.', 'Beat 5 — G7 (V7).', 'Beat 6 — Hold.', 'Beat 7 — Back to C major (I).', 'Beat 8 — Hold.'],
        rings: [
          { name: 'Bass', instrument: 'sub_bass', steps: makeSteps(8, { 0: { pc: 0, oct: 2, acc: 3 }, 2: { pc: 5, oct: 2, acc: 3 }, 4: { pc: 7, oct: 2, acc: 3 }, 6: { pc: 0, oct: 2, acc: 3 } }) },
          { name: 'Chords', instrument: 'grand_piano', voiceLead: false, steps: makeSteps(8, { 0: { pc: 0, oct: 3, acc: 3, chord: 'major' }, 2: { pc: 5, oct: 3, acc: 3, chord: 'major' }, 4: { pc: 7, oct: 3, acc: 3, chord: 'dom7' }, 6: { pc: 0, oct: 3, acc: 3, chord: 'major' } }) }
        ]
      },
      {
        label: 'Smooth Voice Leading',
        beats: 8,
        bpm: 80,
        hook: 'Each chord picks the inversion nearest the last one: shared notes stay put.',
        beatCaptions: ['Beat 1 — C major (I).', 'Beat 2 — Hold.', 'Beat 3 — F major (IV): watch the middle ring.', 'Beat 4 — Hold.', 'Beat 5 — G7 (V7).', 'Beat 6 — Hold.', 'Beat 7 — Back to C major (I).', 'Beat 8 — Hold.'],
        rings: [
          { name: 'Bass', instrument: 'sub_bass', steps: makeSteps(8, { 0: { pc: 0, oct: 2, acc: 3 }, 2: { pc: 5, oct: 2, acc: 3 }, 4: { pc: 7, oct: 2, acc: 3 }, 6: { pc: 0, oct: 2, acc: 3 } }) },
          { name: 'Chords', instrument: 'grand_piano', voiceLead: true, steps: makeSteps(8, { 0: { pc: 0, oct: 3, acc: 3, chord: 'major' }, 2: { pc: 5, oct: 3, acc: 3, chord: 'major' }, 4: { pc: 7, oct: 3, acc: 3, chord: 'dom7' }, 6: { pc: 0, oct: 3, acc: 3, chord: 'major' } }) }
        ]
      }
    ]
  },

  // ---------------- MODULE 5: SONG ARCHITECTURE ----------------
  {
    id: '5.1',
    group: 'Module 5 · Song Architecture',
    eyebrow: 'MODULE 5 · LESSON 5.1',
    title: '5.1 Call & Response (Twinkle, Twinkle)',
    hook: 'Great melodies converse like human speech: Beats 1–4 ask a musical question, and Beats 5–8 answer it home.',
    tryPrompt: 'Use the Layers panel to Mute/Solo the Harmony & Bass rings and hear how chords support the question & answer.',
    behindSound: 'Mozart composed twelve famous variations on this exact 18th-century French melody ("Ah! vous dirai-je, maman") because its balanced 4+4 bar question-and-answer symmetry is perfection.',
    source: 'W.A. Mozart · K. 265 / Traditional (8-Beat Phrase)',
    songRef: 'song-twinkle'
  },
  {
    id: '5.2',
    group: 'Module 5 · Song Architecture',
    eyebrow: 'MODULE 5 · LESSON 5.2',
    title: '5.2 4-Layer Song Stack (Jingle Bells)',
    hook: 'See how a complete arrangement layers Bass, Chords, Fast Melody, and Sleigh-Bell Percussion on one wheel.',
    tryPrompt: 'Solo (S) or Mute (M) individual rings in the Layers panel to isolate how each concentric layer contributes!',
    behindSound: 'James Lord Pierpont published "The One Horse Open Sleigh" in 1857. Notice how the outer bass plays 2 notes per bar while the inner melody plays rapid eighth-note rhythms.',
    source: 'James Lord Pierpont (1857) · 4-Layer Orchestration',
    songRef: 'song-jingle-bells'
  },
  {
    id: '5.3',
    group: 'Module 5 · Song Architecture',
    eyebrow: 'MODULE 5 · LESSON 5.3',
    title: '5.3 Harmonic Rhythm (Brahms’ Lullaby)',
    hook: 'Harmonic rhythm is why chords change slowly once per bar while the melody weaves gentle notes above.',
    tryPrompt: 'Watch the Outer Bass & Middle Piano move only once every 3 beats (1 bar), while the Inner Melody sings 6 steps per bar!',
    behindSound: 'Johannes Brahms composed "Wiegenlied" (Op. 49 No. 4) in 1868 in gentle 3/4 waltz meter. Slow harmonic rhythm creates calm stability—perfect for a lullaby.',
    source: 'Johannes Brahms · Wiegenlied, Op. 49 No. 4 (1868)',
    songRef: 'song-brahms'
  },

  // ---------------- MODULE 6: POLYRHYTHMS & PHASE ----------------
  {
    id: '6.1',
    group: 'Module 6 · Polyrhythms & Phase',
    eyebrow: 'MODULE 6 · LESSON 6.1',
    title: '6.1 3-Against-4 Polyrhythm',
    hook: 'Two conflicting pulses—a 4-corner square and a 3-point triangle—share one circle and reunite at Beat 1.',
    tryPrompt: 'Watch the Outer Ring strike 4 equal steps while the Inner Ring strikes 3 equal steps across the exact same lap!',
    behindSound: 'Polyrhythms ("many rhythms") are foundational in West African drumming and Chopin’s piano works. Say "Pass the gold-en but-ter" evenly to hear 3-against-4.',
    source: 'West African Cross-Rhythm · 3:4 Polyrhythm',
    beats: 4,
    bpm: 84,
    beatCaptions: [
      'Beat 1 — UNISON! Square (4) and Triangle (3) meet at the top of the circle.',
      'Beat 2 — The square hits Beat 2; the triangle’s second strike arrives a third of a beat later.',
      'Beat 3 — The square hits Beat 3 on its own while the triangle waits.',
      'Beat 4 — The triangle’s third strike lands just before Beat 4, then both reunite on Beat 1.'
    ],
    rings: [
      { name: '4-Pulse Square', instrument: 'sub_bass', muted: false, solo: false, steps: makeSteps(4, { 0: { pc: 0, oct: 2, acc: 3 }, 1: { pc: 7, oct: 2, acc: 2 }, 2: { pc: 0, oct: 2, acc: 2 }, 3: { pc: 7, oct: 2, acc: 2 } }) },
      { name: '3-Pulse Triangle', instrument: 'marimba', muted: false, solo: false, steps: makeSteps(3, { 0: { pc: 4, oct: 4, acc: 3 }, 1: { pc: 7, oct: 4, acc: 2 }, 2: { pc: 11, oct: 4, acc: 2 } }) }
    ]
  },
  {
    id: '6.2',
    group: 'Module 6 · Polyrhythms & Phase',
    eyebrow: 'MODULE 6 · LESSON 6.2',
    title: '6.2 Rotation: Son Clave & Tresillo',
    hook: 'The 3-2 son clave is five hits on a 16-step circle. Rotate it half a turn and it becomes 2-3 clave.',
    tryPrompt: 'Use “Rotate clave” in the guide. One step shifts the feel; 8 steps (half the circle) turns 3-2 clave into 2-3 clave.',
    behindSound: 'The son clave (Cuba) places five hits in 16 sixteenth-notes: 3 on one side, 2 on the other. The tresillo (3 + 3 + 2) shares three of them and runs under salsa, habanera, reggaeton and much of pop. Both are “maximally even”: the hits spread as evenly around the circle as their number allows, which is why they feel balanced and propulsive at once.',
    source: 'Afro-Cuban son clave (traditional) · G. Toussaint, The Geometry of Musical Rhythm (2013)',
    labType: 'rotationLab',
    rotateRings: [2],
    beats: 4,
    bpm: 100,
    beatCaptions: [
      'Beat 1 — Kick, tresillo and clave together. The clave’s “3” side begins.',
      'Beat 2 — Clave hits just before Beat 2 and on its “and”: tension against the steady kick.',
      'Beat 3 — The “2” side: one clave hit on the “and” of 3…',
      'Beat 4 — …and one on Beat 4. Tresillo (3 + 3 + 2) shares the 1st, 3rd and 5th clave hits.'
    ],
    rings: [
      { name: 'Pulse (kick)', instrument: 'percussion', role: 'percussion', steps: makeSteps(4, { 0: { pc: 0, oct: 3, acc: 3, drum: 'kick' }, 1: { pc: 0, oct: 3, acc: 2, drum: 'kick' }, 2: { pc: 0, oct: 3, acc: 2, drum: 'kick' }, 3: { pc: 0, oct: 3, acc: 2, drum: 'kick' } }) },
      { name: 'Tresillo bass (3+3+2)', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(8, { 0: { pc: 9, oct: 2, acc: 3, len: 3 }, 3: { pc: 9, oct: 2, acc: 2, len: 3 }, 6: { pc: 4, oct: 2, acc: 2, len: 2 } }) },
      { name: '3-2 Son clave', instrument: 'marimba', role: 'melody', steps: makeSteps(16, { 0: { pc: 9, oct: 5, acc: 3 }, 3: { pc: 9, oct: 5, acc: 3 }, 6: { pc: 9, oct: 5, acc: 3 }, 10: { pc: 9, oct: 5, acc: 3 }, 12: { pc: 9, oct: 5, acc: 3 } }) }
    ]
  },
  // ---------------- FAMOUS SONGS ----------------
  // rights: 'pd'  = public domain, checked against the score.
  //         'edu' = copyrighted composition. Short educational arrangement:
  //                 harmony, bass and rhythm are corrected, melodies are not extended.
  {
    id: 'song-canon',
    group: 'Famous Songs',
    rights: 'pd',
    title: '1. Canon in D — Johann Pachelbel (c. 1680)',
    hook: 'Eight chords that loop forever: the original "four-chord song", 300 years early.',
    tryPrompt: 'Watch the outer bass walk the same 8 notes each lap while the inner rings weave around it.',
    behindSound: 'Pachelbel builds the whole piece over a repeating 8-note bass (a "ground bass"). The chord pattern D–A–Bm–F♯m–G–D–G–A still powers pop songs today.',
    source: 'Johann Pachelbel · Canon in D (c. 1680) · public domain',
    isFamousSong: true,
    beats: 16,
    bpm: 66,
    beatCaptions: [
      'Beat 1 — D major (I): the bass starts its 8-note walk on D.',
      'Beat 2 — The top line sings F♯, the 3rd of D.',
      'Beat 3 — A major (V): the bass steps down to A.',
      'Beat 4 — Top line falls to E.',
      'Beat 5 — B minor (vi): the first minor colour.',
      'Beat 6 — Top line on D.',
      'Beat 7 — F♯ minor (iii).',
      'Beat 8 — Top line on C♯.',
      'Beat 9 — G major (IV): second half of the cycle.',
      'Beat 10 — Top line on B.',
      'Beat 11 — D major (I) again.',
      'Beat 12 — Top line on A.',
      'Beat 13 — G major (IV).',
      'Beat 14 — Top line climbs back to B.',
      'Beat 15 — A major (V): the turnaround.',
      'Beat 16 — C♯ leads straight back to D on Beat 1.'
    ],
    rings: [
      { name: 'Ground Bass', instrument: 'sub_bass', role: 'bass', steps: makeSteps(8, { 0: { pc: 2, oct: 3, acc: 3 }, 1: { pc: 9, oct: 2, acc: 2 }, 2: { pc: 11, oct: 2, acc: 2 }, 3: { pc: 6, oct: 2, acc: 2 }, 4: { pc: 7, oct: 2, acc: 3 }, 5: { pc: 2, oct: 2, acc: 2 }, 6: { pc: 7, oct: 2, acc: 2 }, 7: { pc: 9, oct: 2, acc: 2 } }) },
      { name: 'String Chords', instrument: 'strings', role: 'harmony', steps: makeSteps(8, { 0: { pc: 2, oct: 3, acc: 2, chord: 'major' }, 1: { pc: 9, oct: 3, acc: 2, chord: 'major' }, 2: { pc: 11, oct: 3, acc: 2, chord: 'minor' }, 3: { pc: 6, oct: 3, acc: 2, chord: 'minor' }, 4: { pc: 7, oct: 3, acc: 2, chord: 'major' }, 5: { pc: 2, oct: 3, acc: 2, chord: 'major' }, 6: { pc: 7, oct: 3, acc: 2, chord: 'major' }, 7: { pc: 9, oct: 3, acc: 2, chord: 'major' } }) },
      { name: 'Broken Chords', instrument: 'marimba', role: 'harmony', steps: makeSteps(32, Object.fromEntries(
        [[2,6,9],[9,1,4],[11,2,6],[6,9,1],[7,11,2],[2,6,9],[7,11,2],[9,1,4]].flatMap((tri, c) =>
          [tri[0], tri[1], tri[2], tri[1]].map((pc, j) => [c * 4 + j, { pc, oct: (pc < tri[0] ? 5 : 4), acc: j === 0 ? 2 : 1 }]))
      )) },
      { name: 'Violin Line', instrument: 'grand_piano', role: 'melody', steps: makeSteps(8, { 0: { pc: 6, oct: 5, acc: 3 }, 1: { pc: 4, oct: 5, acc: 2 }, 2: { pc: 2, oct: 5, acc: 2 }, 3: { pc: 1, oct: 5, acc: 2 }, 4: { pc: 11, oct: 4, acc: 3 }, 5: { pc: 9, oct: 4, acc: 2 }, 6: { pc: 11, oct: 4, acc: 2 }, 7: { pc: 1, oct: 5, acc: 2 } }) }
    ]
  },
  {
    id: 'song-jingle-bells',
    group: 'Famous Songs',
    rights: 'pd',
    title: '2. Jingle Bells — J. L. Pierpont (1857)',
    hook: 'The chorus in two halves: four bars on C, then the F–C–D7–G7 turnaround.',
    tryPrompt: 'Open Song Story and flip between Part 1 and Part 2. Mute the bells to hear the dotted "all the way" rhythm.',
    behindSound: 'Published in 1857 as "The One Horse Open Sleigh". Part 1 stays on one chord while the melody repeats E; Part 2 moves through F, C, D7 and G7 to build the pull back home.',
    source: 'James Lord Pierpont (1857) · public domain',
    isFamousSong: true,
    labType: 'sceneFlip',
    scenes: [
      {
        label: 'Part 1 · Jingle bells',
        beats: 16,
        bpm: 118,
        hook: '"Jingle bells, jingle bells, jingle all the way": four bars over C major.',
        beatCaptions: [
          'Beat 1 — "Jin-" E over C major.', 'Beat 2 — "-gle".', 'Beat 3 — "bells" (held for two beats).', 'Beat 4 — Bells ring on the off-beat.',
          'Beat 5 — "Jin-gle" again.', 'Beat 6 — Same rhythm, same E.', 'Beat 7 — "bells" (held).', 'Beat 8 — Bar 2 ends.',
          'Beat 9 — "Jin-gle" E then G.', 'Beat 10 — "all the": C (dotted) then a quick D.', 'Beat 11 — The dotted rhythm gives it bounce.', 'Beat 12 — Short D pickup.',
          'Beat 13 — "way!" lands on E and holds for a whole bar.', 'Beat 14 — Holding.', 'Beat 15 — Holding.', 'Beat 16 — Loop back to "Jingle bells".'
        ],
        rings: [
          { name: 'Root Bass', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(8, { 0: { pc: 0, oct: 2, acc: 3 }, 1: { pc: 7, oct: 2, acc: 2 }, 2: { pc: 0, oct: 2, acc: 3 }, 3: { pc: 7, oct: 2, acc: 2 }, 4: { pc: 0, oct: 2, acc: 3 }, 5: { pc: 7, oct: 2, acc: 2 }, 6: { pc: 0, oct: 2, acc: 3 }, 7: { pc: 7, oct: 2, acc: 2 } }) },
          { name: 'Piano Chords', instrument: 'grand_piano', role: 'harmony', steps: makeSteps(4, { 0: { pc: 0, oct: 3, acc: 2, chord: 'major' }, 1: { pc: 0, oct: 3, acc: 2, chord: 'major' }, 2: { pc: 0, oct: 3, acc: 2, chord: 'major' }, 3: { pc: 0, oct: 3, acc: 2, chord: 'major' } }) },
          { name: 'Lead Melody', instrument: 'marimba', role: 'melody', steps: makeSteps(32, { 0: { pc: 4, oct: 4, acc: 3, len: 2 }, 2: { pc: 4, oct: 4, acc: 2, len: 2 }, 4: { pc: 4, oct: 4, acc: 3, len: 4 }, 8: { pc: 4, oct: 4, acc: 3, len: 2 }, 10: { pc: 4, oct: 4, acc: 2, len: 2 }, 12: { pc: 4, oct: 4, acc: 3, len: 4 }, 16: { pc: 4, oct: 4, acc: 3, len: 2 }, 18: { pc: 7, oct: 4, acc: 2, len: 2 }, 20: { pc: 0, oct: 4, acc: 3, len: 3 }, 23: { pc: 2, oct: 4, acc: 1, len: 1 }, 24: { pc: 4, oct: 4, acc: 3, len: 8 } }) },
          { name: 'Sleigh Bells', instrument: 'sleigh_bells', role: 'percussion', steps: makeSteps(16, Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i, { pc: 0, oct: 5, acc: i % 2 === 1 ? 2 : 1 }]))) }
        ]
      },
      {
        label: 'Part 2 · Oh what fun',
        beats: 16,
        bpm: 118,
        hook: '"Oh what fun it is to ride…": F, C, D7 and G7 pull the tune back home.',
        beatCaptions: [
          'Beat 1 — "Oh what" F over F major (IV).', 'Beat 2 — "fun".', 'Beat 3 — "it" (dotted).', 'Beat 4 — "is" quick pickup.',
          'Beat 5 — "to ride" over C major (I).', 'Beat 6 — "in a".', 'Beat 7 — "one-horse".', 'Beat 8 — Quick E–E.',
          'Beat 9 — "o-pen" over D7 (V of V).', 'Beat 10 — D7 pushes toward G.', 'Beat 11 — "sleigh".', 'Beat 12 — E leans into D.',
          'Beat 13 — "hey!" D over G7 (V7).', 'Beat 14 — Holding the tension.', 'Beat 15 — G rings out.', 'Beat 16 — G7 resolves to C when Part 1 returns.'
        ],
        rings: [
          { name: 'Root Bass', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(8, { 0: { pc: 5, oct: 2, acc: 3 }, 1: { pc: 0, oct: 2, acc: 2 }, 2: { pc: 0, oct: 2, acc: 3 }, 3: { pc: 7, oct: 2, acc: 2 }, 4: { pc: 2, oct: 2, acc: 3 }, 5: { pc: 9, oct: 2, acc: 2 }, 6: { pc: 7, oct: 2, acc: 3 }, 7: { pc: 2, oct: 2, acc: 2 } }) },
          { name: 'Piano Chords', instrument: 'grand_piano', role: 'harmony', steps: makeSteps(4, { 0: { pc: 5, oct: 3, acc: 2, chord: 'major' }, 1: { pc: 0, oct: 3, acc: 2, chord: 'major' }, 2: { pc: 2, oct: 3, acc: 2, chord: 'dom7' }, 3: { pc: 7, oct: 3, acc: 2, chord: 'dom7' } }) },
          { name: 'Lead Melody', instrument: 'marimba', role: 'melody', steps: makeSteps(32, { 0: { pc: 5, oct: 4, acc: 3, len: 2 }, 2: { pc: 5, oct: 4, acc: 2, len: 2 }, 4: { pc: 5, oct: 4, acc: 3, len: 3 }, 7: { pc: 5, oct: 4, acc: 1, len: 1 }, 8: { pc: 5, oct: 4, acc: 3, len: 2 }, 10: { pc: 4, oct: 4, acc: 2, len: 2 }, 12: { pc: 4, oct: 4, acc: 2, len: 2 }, 14: { pc: 4, oct: 4, acc: 1, len: 1 }, 15: { pc: 4, oct: 4, acc: 1, len: 1 }, 16: { pc: 4, oct: 4, acc: 3, len: 2 }, 18: { pc: 2, oct: 4, acc: 2, len: 2 }, 20: { pc: 2, oct: 4, acc: 2, len: 2 }, 22: { pc: 4, oct: 4, acc: 2, len: 2 }, 24: { pc: 2, oct: 4, acc: 3, len: 4 }, 28: { pc: 7, oct: 4, acc: 3, len: 4 } }) },
          { name: 'Sleigh Bells', instrument: 'sleigh_bells', role: 'percussion', steps: makeSteps(16, Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i, { pc: 0, oct: 5, acc: i % 2 === 1 ? 2 : 1 }]))) }
        ]
      }
    ]
  },
  {
    id: 'song-brahms',
    group: 'Famous Songs',
    rights: 'pd',
    title: '3. Brahms’ Lullaby (Wiegenlied, Op. 49 No. 4)',
    hook: 'A gentle 3/4 sway in F major, with chords that change only once a bar.',
    tryPrompt: 'Watch the pickup (A–A) at the end of the loop lead into Bar 1, and the strings hold each chord for a full bar.',
    behindSound: 'Brahms wrote "Wiegenlied" in 1868. The melody starts with a two-note pickup before the barline, and the harmony barely moves: three bars of F, then C7 to lead home.',
    source: 'Johannes Brahms · Op. 49 No. 4 (1868) · public domain · simplified',
    isFamousSong: true,
    beats: 12,
    bpm: 76,
    beatCaptions: [
      'Beat 1 (Bar 1) — "by" lands on C over F major.',
      'Beat 2 — The note holds while the strings sustain F.',
      'Beat 3 — "and good" A–A pick up into Bar 2.',
      'Beat 4 (Bar 2) — "night" on C again, still F major.',
      'Beat 5 — Holding.',
      'Beat 6 — "with ro-" A–C reach upward.',
      'Beat 7 (Bar 3) — "ses" peaks on high F.',
      'Beat 8 — E steps down.',
      'Beat 9 — D continues the gentle fall.',
      'Beat 10 (Bar 4) — C7 arrives under D.',
      'Beat 11 — C, the chord root.',
      'Beat 12 — Pickup "Lul-la-" A–A leads back to Bar 1.'
    ],
    rings: [
      { name: 'Waltz Bass', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(12, { 0: { pc: 5, oct: 2, acc: 3 }, 3: { pc: 5, oct: 2, acc: 3 }, 6: { pc: 5, oct: 2, acc: 3 }, 9: { pc: 0, oct: 2, acc: 3 } }) },
      { name: 'String Harmony', instrument: 'strings', role: 'harmony', steps: makeSteps(4, { 0: { pc: 5, oct: 3, acc: 2, chord: 'major' }, 1: { pc: 5, oct: 3, acc: 2, chord: 'major' }, 2: { pc: 5, oct: 3, acc: 2, chord: 'major' }, 3: { pc: 0, oct: 3, acc: 2, chord: 'dom7' } }) },
      { name: 'Lullaby Melody', instrument: 'grand_piano', role: 'melody', steps: makeSteps(24, { 0: { pc: 0, oct: 5, acc: 3, len: 4 }, 4: { pc: 9, oct: 4, acc: 1 }, 5: { pc: 9, oct: 4, acc: 1 }, 6: { pc: 0, oct: 5, acc: 3, len: 4 }, 10: { pc: 9, oct: 4, acc: 1 }, 11: { pc: 0, oct: 5, acc: 1 }, 12: { pc: 5, oct: 5, acc: 3, len: 2 }, 14: { pc: 4, oct: 5, acc: 2, len: 2 }, 16: { pc: 2, oct: 5, acc: 2, len: 2 }, 18: { pc: 2, oct: 5, acc: 3, len: 2 }, 20: { pc: 0, oct: 5, acc: 2, len: 2 }, 22: { pc: 9, oct: 4, acc: 1 }, 23: { pc: 9, oct: 4, acc: 1 } }) }
    ]
  },
  {
    id: 'song-twinkle',
    group: 'Famous Songs',
    rights: 'pd',
    title: '4. Twinkle, Twinkle — Traditional · Variations by Mozart, K. 265',
    hook: 'An 8-beat question-and-answer melody that leaps a Perfect 5th (C → G) before stepping home.',
    tryPrompt: 'Open Song Story and flip to the Alberti-bass variation to hear the same tune dressed the way Mozart’s era dressed it.',
    behindSound: 'The tune is the French folk song "Ah! vous dirai-je, maman". Mozart wrote twelve variations on it (K. 265) in Vienna around 1781–82. The harmony is a clean I–IV–I–V7–I.',
    source: 'Traditional French melody · W. A. Mozart, K. 265 · public domain',
    isFamousSong: true,
    labType: 'sceneFlip',
    scenes: [
      {
        label: 'Theme',
        beats: 8,
        bpm: 96,
        hook: 'The plain theme: block chords under the melody.',
        beatCaptions: [
          'Beat 1 — "Twin-kle" (C4–C4) over C major.',
          'Beat 2 — "twin-kle" (G4–G4): the Perfect 5th leap.',
          'Beat 3 — "lit-tle" (A4–A4) over F major (IV).',
          'Beat 4 — "star" (G4): a breath on the home chord, so the question hangs open.',
          'Beat 5 — "How I" (F4–F4) over F major.',
          'Beat 6 — "won-der" (E4–E4) back on C.',
          'Beat 7 — "what you" (D4–D4) over G7 (V7): the pull home.',
          'Beat 8 — "are." (C4): complete arrival.'
        ],
        rings: [
          { name: 'Bass Root', instrument: 'sub_bass', role: 'bass', steps: makeSteps(8, { 0: { pc: 0, oct: 2, acc: 3 }, 2: { pc: 5, oct: 2, acc: 2 }, 3: { pc: 0, oct: 2, acc: 2 }, 4: { pc: 5, oct: 2, acc: 2 }, 5: { pc: 0, oct: 2, acc: 2 }, 6: { pc: 7, oct: 2, acc: 2 }, 7: { pc: 0, oct: 2, acc: 3 } }) },
          { name: 'Piano Harmony', instrument: 'grand_piano', role: 'harmony', steps: makeSteps(8, { 0: { pc: 0, oct: 3, acc: 2, chord: 'major' }, 2: { pc: 5, oct: 3, acc: 2, chord: 'major' }, 3: { pc: 0, oct: 3, acc: 2, chord: 'major' }, 4: { pc: 5, oct: 3, acc: 2, chord: 'major' }, 5: { pc: 0, oct: 3, acc: 2, chord: 'major' }, 6: { pc: 7, oct: 3, acc: 2, chord: 'dom7' }, 7: { pc: 0, oct: 3, acc: 2, chord: 'major' } }) },
          { name: 'Star Melody', instrument: 'marimba', role: 'melody', steps: makeSteps(16, { 0: { pc: 0, oct: 4, acc: 3 }, 1: { pc: 0, oct: 4, acc: 2 }, 2: { pc: 7, oct: 4, acc: 3 }, 3: { pc: 7, oct: 4, acc: 2 }, 4: { pc: 9, oct: 4, acc: 3 }, 5: { pc: 9, oct: 4, acc: 2 }, 6: { pc: 7, oct: 4, acc: 3, len: 2 }, 8: { pc: 5, oct: 4, acc: 3 }, 9: { pc: 5, oct: 4, acc: 2 }, 10: { pc: 4, oct: 4, acc: 3 }, 11: { pc: 4, oct: 4, acc: 2 }, 12: { pc: 2, oct: 4, acc: 3 }, 13: { pc: 2, oct: 4, acc: 2 }, 14: { pc: 0, oct: 4, acc: 3, len: 2 } }) }
        ]
      },
      {
        label: 'Alberti-bass variation',
        beats: 8,
        bpm: 96,
        hook: 'A variation in the style of Mozart’s era: each chord is broken into a low–high–middle–high "Alberti" pattern.',
        beatCaptions: [
          'Beat 1 — Alberti pattern C–G–E–G under "Twin-kle".',
          'Beat 2 — Same C-major pattern keeps rippling.',
          'Beat 3 — F–C–A–C for the IV chord.',
          'Beat 4 — Back to C–G–E–G.',
          'Beat 5 — F major pattern again.',
          'Beat 6 — C major pattern.',
          'Beat 7 — G–D–B–D outlines the dominant.',
          'Beat 8 — Home on C.'
        ],
        rings: [
          { name: 'Bass Root', instrument: 'sub_bass', role: 'bass', steps: makeSteps(8, { 0: { pc: 0, oct: 2, acc: 3 }, 2: { pc: 5, oct: 2, acc: 2 }, 3: { pc: 0, oct: 2, acc: 2 }, 4: { pc: 5, oct: 2, acc: 2 }, 5: { pc: 0, oct: 2, acc: 2 }, 6: { pc: 7, oct: 2, acc: 2 }, 7: { pc: 0, oct: 2, acc: 3 } }) },
          { name: 'Alberti Bass', instrument: 'grand_piano', role: 'harmony', steps: makeSteps(32, Object.fromEntries(
            [[0,7,4],[0,7,4],[5,0,9],[0,7,4],[5,0,9],[0,7,4],[7,2,11],[0,7,4]].flatMap((ch, b) =>
              [[ch[0], 3], [ch[1], ch[1] < ch[0] ? 4 : 3], [ch[2], ch[2] < ch[0] ? 4 : 3], [ch[1], ch[1] < ch[0] ? 4 : 3]].map(([pc, oct], j) => [b * 4 + j, { pc, oct, acc: j === 0 ? 2 : 1 }]))
          )) },
          { name: 'Star Melody', instrument: 'marimba', role: 'melody', steps: makeSteps(16, { 0: { pc: 0, oct: 5, acc: 3 }, 1: { pc: 0, oct: 5, acc: 2 }, 2: { pc: 7, oct: 5, acc: 3 }, 3: { pc: 7, oct: 5, acc: 2 }, 4: { pc: 9, oct: 5, acc: 3 }, 5: { pc: 9, oct: 5, acc: 2 }, 6: { pc: 7, oct: 5, acc: 3, len: 2 }, 8: { pc: 5, oct: 5, acc: 3 }, 9: { pc: 5, oct: 5, acc: 2 }, 10: { pc: 4, oct: 5, acc: 3 }, 11: { pc: 4, oct: 5, acc: 2 }, 12: { pc: 2, oct: 5, acc: 3 }, 13: { pc: 2, oct: 5, acc: 2 }, 14: { pc: 0, oct: 5, acc: 3, len: 2 } }) }
        ]
      }
    ]
  },
  {
    id: 'song-time',
    group: 'Famous Songs',
    rights: 'edu',
    title: '5. Time (Inception) — Hans Zimmer',
    hook: 'Four chords (Am – Em – G – D), one per bar, over a slow heartbeat.',
    tryPrompt: 'Mute every ring except the bass, then bring them back one at a time to feel how the piece builds.',
    behindSound: 'Composed by Hans Zimmer for Inception (2010). The power comes from patience: each chord lasts a full bar, and layers are added gradually.',
    source: 'Hans Zimmer · Inception (2010) · A minor / Dorian · chord study only',
    isFamousSong: true,
    beats: 16,
    bpm: 60,
    beatCaptions: [
      'Beat 1 (Bar 1) — A minor (i).', 'Beat 2 — The arpeggio climbs through A–E–C.', 'Beat 3 — Holding A minor.', 'Beat 4 — Last beat before the change.',
      'Beat 5 (Bar 2) — E minor (v).', 'Beat 6 — E–B–G.', 'Beat 7 — Holding.', 'Beat 8 — Preparing the lift.',
      'Beat 9 (Bar 3) — G major (VII): first major colour.', 'Beat 10 — G–D–B.', 'Beat 11 — Holding.', 'Beat 12 — Leaning forward.',
      'Beat 13 (Bar 4) — D major (IV): the F♯ is the Dorian brightness.', 'Beat 14 — D–A–F♯.', 'Beat 15 — Holding.', 'Beat 16 — Back to A minor.'
    ],
    rings: [
      { name: 'Sub Bass', instrument: 'sub_bass', role: 'bass', steps: makeSteps(4, { 0: { pc: 9, oct: 2, acc: 3 }, 1: { pc: 4, oct: 2, acc: 3 }, 2: { pc: 7, oct: 2, acc: 3 }, 3: { pc: 2, oct: 2, acc: 3 } }) },
      { name: 'String Pad', instrument: 'strings', role: 'harmony', steps: makeSteps(4, { 0: { pc: 9, oct: 3, acc: 2, chord: 'minor' }, 1: { pc: 4, oct: 3, acc: 2, chord: 'minor' }, 2: { pc: 7, oct: 3, acc: 2, chord: 'major' }, 3: { pc: 2, oct: 3, acc: 2, chord: 'major' } }) },
      { name: 'Arpeggio Pulse', instrument: 'grand_piano', role: 'melody', steps: makeSteps(16, Object.fromEntries(
        [[9,4,0],[4,11,7],[7,2,11],[2,9,6]].flatMap((ch, b) =>
          [[ch[0], 4], [ch[1], ch[1] < ch[0] ? 5 : 4], [ch[2], ch[2] < ch[0] ? 5 : 4], [ch[1], ch[1] < ch[0] ? 5 : 4]].map(([pc, oct], j) => [b * 4 + j, { pc, oct, acc: j === 0 ? 3 : 2 }]))
      )) }
    ]
  },
  {
    id: 'song-clocks',
    shareable: false, // copyrighted riff: play and edit here, but no recording, preset, video, link or embed
    group: 'Famous Songs',
    rights: 'edu',
    title: '6. Clocks — Coldplay',
    hook: 'A 3 + 3 + 2 piano arpeggio over E♭ → B♭m → Fm (a compressed two-bar study).',
    tryPrompt: 'Watch the accents fall on steps 1, 4 and 7 of every 8: that is the 3 + 3 + 2 grouping.',
    behindSound: 'Released in 2002. The piano ostinato groups eighth notes 3 + 3 + 2, which makes a steady 4/4 feel like it is tumbling forward. This study compresses the chord cycle into 8 beats.',
    source: 'Coldplay · A Rush of Blood to the Head (2002) · rhythm & harmony study',
    isFamousSong: true,
    beats: 8,
    bpm: 130,
    beatCaptions: [
      'Beat 1 — E♭ major arpeggio; bass on E♭.',
      'Beat 2 — Second accent of the 3 + 3 + 2 pattern.',
      'Beat 3 — Still E♭: the bass holds.',
      'Beat 4 — The "2" group finishes the bar.',
      'Beat 5 — B♭ minor: bass and piano change together.',
      'Beat 6 — 3 + 3 + 2 again over B♭m.',
      'Beat 7 — Holding B♭m.',
      'Beat 8 — F minor: bass and piano land together, then loop to E♭.'
    ],
    rings: [
      { name: 'Deep Bass', instrument: 'sub_bass', role: 'bass', steps: makeSteps(8, { 0: { pc: 3, oct: 2, acc: 3 }, 4: { pc: 10, oct: 1, acc: 3 }, 7: { pc: 5, oct: 2, acc: 2 } }) },
      { name: '3+3+2 Piano', instrument: 'grand_piano', role: 'melody', steps: makeSteps(16, {
        0: { pc: 3, oct: 5, acc: 3 }, 1: { pc: 10, oct: 4, acc: 1 }, 2: { pc: 7, oct: 4, acc: 1 }, 3: { pc: 3, oct: 5, acc: 3 }, 4: { pc: 10, oct: 4, acc: 1 }, 5: { pc: 7, oct: 4, acc: 1 }, 6: { pc: 3, oct: 5, acc: 2 }, 7: { pc: 10, oct: 4, acc: 1 },
        8: { pc: 1, oct: 5, acc: 3 }, 9: { pc: 10, oct: 4, acc: 1 }, 10: { pc: 5, oct: 4, acc: 1 }, 11: { pc: 1, oct: 5, acc: 3 }, 12: { pc: 10, oct: 4, acc: 1 }, 13: { pc: 5, oct: 4, acc: 1 }, 14: { pc: 0, oct: 5, acc: 3 }, 15: { pc: 8, oct: 4, acc: 1 }
      }) }
    ]
  },
  {
    id: 'song-take-five',
    group: 'Famous Songs',
    rights: 'edu',
    title: '7. Take Five (5/4) — Paul Desmond · Dave Brubeck Quartet',
    hook: 'Five beats grouped 3 + 2 over an E♭m → B♭m7 vamp.',
    tryPrompt: 'Count "1–2–3, 4–5" with the outer pegs. The vamp pushes on the "&" of 2.',
    behindSound: 'Composed by saxophonist Paul Desmond and recorded by the Dave Brubeck Quartet in 1959. It showed that an odd meter could swing.',
    source: 'Paul Desmond (composer) · Dave Brubeck Quartet (1959) · rhythm & harmony study',
    isFamousSong: true,
    beats: 5,
    bpm: 164,
    beatCaptions: [
      'Beat 1 — E♭ bass and E♭m chord start the 3-beat group.',
      'Beat 2 — The vamp pushes early, on the "&" of 2.',
      'Beat 3 — Completes the 3-beat group.',
      'Beat 4 — B♭m7 starts the 2-beat group.',
      'Beat 5 — B♭m7 again, then back to Beat 1.'
    ],
    rings: [
      { name: 'Upright Bass', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(5, { 0: { pc: 3, oct: 2, acc: 3 }, 3: { pc: 10, oct: 2, acc: 2 } }) },
      { name: '5/4 Piano Vamp', instrument: 'grand_piano', role: 'harmony', steps: makeSteps(10, { 0: { pc: 3, oct: 3, acc: 3, chord: 'minor', len: 3 }, 3: { pc: 3, oct: 3, acc: 2, chord: 'minor', len: 3 }, 6: { pc: 10, oct: 3, acc: 3, chord: 'm7', len: 2 }, 8: { pc: 10, oct: 3, acc: 2, chord: 'm7', len: 2 } }) },
      { name: 'Sax Motif', instrument: 'electric_piano', role: 'melody', steps: makeSteps(10, { 0: { pc: 10, oct: 4, acc: 3 }, 2: { pc: 3, oct: 5, acc: 2 }, 4: { pc: 5, oct: 5, acc: 2 }, 6: { pc: 6, oct: 5, acc: 3 }, 8: { pc: 5, oct: 5, acc: 2 } }) }
    ]
  },
  {
    id: 'song-billie-jean',
    shareable: false, // copyrighted riff: play and edit here, but no recording, preset, video, link or embed
    group: 'Famous Songs',
    rights: 'edu',
    title: '8. Billie Jean — Michael Jackson',
    hook: 'An 8-note bass ostinato in F♯ minor, a steady drum pocket, and chord stabs over an F♯ pedal.',
    tryPrompt: 'Solo the bass ring, then the drum ring: kick on 1 and 3, snare on 2 and 4, hi-hat on every eighth.',
    behindSound: 'Released on Thriller (1982). The bass repeats one bar forever while the keyboard chords move F♯m → G♯m → A → G♯m above it.',
    source: 'Michael Jackson · Thriller (1982) · groove & harmony study',
    isFamousSong: true,
    beats: 4,
    bpm: 117,
    beatCaptions: [
      'Beat 1 — Kick + hat; bass F♯ → C♯. F♯m stab on the "&".',
      'Beat 2 — Snare backbeat; G♯m stab on the "&".',
      'Beat 3 — Kick; bass turns around E → C♯. A-major stab on the "&".',
      'Beat 4 — Snare; G♯m stab leads back to Beat 1.'
    ],
    rings: [
      { name: 'Ostinato Bass', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(8, { 0: { pc: 6, oct: 2, acc: 3 }, 1: { pc: 1, oct: 2, acc: 2 }, 2: { pc: 4, oct: 2, acc: 2 }, 3: { pc: 6, oct: 2, acc: 3 }, 4: { pc: 4, oct: 2, acc: 2 }, 5: { pc: 1, oct: 2, acc: 2 }, 6: { pc: 11, oct: 1, acc: 2 }, 7: { pc: 1, oct: 2, acc: 2 } }) },
      { name: 'Chord Stabs', instrument: 'electric_piano', role: 'harmony', steps: makeSteps(8, { 1: { pc: 6, oct: 3, acc: 2, chord: 'minor', len: 1 }, 3: { pc: 8, oct: 3, acc: 2, chord: 'minor', len: 1 }, 5: { pc: 9, oct: 3, acc: 2, chord: 'major', len: 1 }, 7: { pc: 8, oct: 3, acc: 2, chord: 'minor', len: 1 } }) },
      { name: 'Drum Kit', instrument: 'percussion', role: 'percussion', steps: makeSteps(8, { 0: { pc: 0, oct: 3, acc: 3, drum: 'kick+hat' }, 1: { pc: 9, oct: 4, acc: 1, drum: 'hat' }, 2: { pc: 4, oct: 3, acc: 3, drum: 'snare+hat' }, 3: { pc: 9, oct: 4, acc: 1, drum: 'hat' }, 4: { pc: 0, oct: 3, acc: 3, drum: 'kick+hat' }, 5: { pc: 9, oct: 4, acc: 1, drum: 'hat' }, 6: { pc: 4, oct: 3, acc: 3, drum: 'snare+hat' }, 7: { pc: 9, oct: 4, acc: 1, drum: 'hat' } }) }
    ]
  },
  {
    id: 'song-we-will-rock-you',
    group: 'Famous Songs',
    rights: 'edu',
    title: '9. We Will Rock You — Queen',
    hook: 'Stomp–stomp–clap, twice per bar: rhythm with nothing else at all.',
    tryPrompt: 'Count "1 & 2, 3 & 4": stomps on 1 & and 3 &, claps on 2 and 4.',
    behindSound: 'Written by Brian May in 1977. The band recorded stomps and claps in an empty space and layered them, so the pattern sounds like a whole stadium.',
    source: 'Queen · News of the World (1977) · rhythm study',
    isFamousSong: true,
    beats: 4,
    bpm: 81,
    beatCaptions: [
      'Beat 1 — STOMP, then STOMP on the "&".',
      'Beat 2 — CLAP!',
      'Beat 3 — STOMP, then STOMP on the "&".',
      'Beat 4 — CLAP! The echo carries into the next bar.'
    ],
    rings: [
      { name: 'Stomps & Claps', instrument: 'percussion', role: 'percussion', steps: makeSteps(8, { 0: { pc: 0, oct: 2, acc: 3, drum: 'stomp' }, 1: { pc: 0, oct: 2, acc: 3, drum: 'stomp' }, 2: { pc: 5, oct: 4, acc: 3, drum: 'clap' }, 4: { pc: 0, oct: 2, acc: 3, drum: 'stomp' }, 5: { pc: 0, oct: 2, acc: 3, drum: 'stomp' }, 6: { pc: 5, oct: 4, acc: 3, drum: 'clap' } }) }
    ]
  },
  {
    id: 'song-over-the-rainbow',
    group: 'Famous Songs',
    rights: 'edu',
    title: '10. Over the Rainbow — Harold Arlen (1939) · the opening leap',
    hook: 'The most famous octave leap in film: C4 straight up to C5.',
    tryPrompt: 'Same colour, twice the brightness: the two dots are the same note one octave apart.',
    behindSound: 'Composed by Harold Arlen for The Wizard of Oz (1939). The opening "Some-where" leaps a full octave, which is why it sounds like lifting off the ground.',
    source: 'Harold Arlen (1939) · interval study (opening two notes only)',
    isFamousSong: true,
    beats: 4,
    bpm: 72,
    beatCaptions: [
      'Beat 1 — "Some-" on C4 over C major.',
      'Beat 2 — Holding the low C.',
      'Beat 3 — "-where" leaps a full octave to C5.',
      'Beat 4 — Same note name, same colour, brighter.'
    ],
    rings: [
      { name: 'Ballad Bass', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(4, { 0: { pc: 0, oct: 2, acc: 3 }, 2: { pc: 7, oct: 2, acc: 2 } }) },
      { name: 'Warm Strings', instrument: 'strings', role: 'harmony', steps: makeSteps(4, { 0: { pc: 0, oct: 3, acc: 2, chord: 'major', len: 4 } }) },
      { name: 'Octave Leap', instrument: 'grand_piano', role: 'melody', steps: makeSteps(4, { 0: { pc: 0, oct: 4, acc: 3, len: 2 }, 2: { pc: 0, oct: 5, acc: 3, len: 2 } }) }
    ]
  }
];

// ---------------- CREATE FROM SCRATCH: starter templates (POST-07) ----------------
const drumRing = (n, map, name = 'Drums') => ({ name, instrument: 'percussion', role: 'percussion', steps: makeSteps(n, Object.fromEntries(Object.entries(map).map(([i, d]) => [i, { pc: d.includes('kick') ? 0 : d.includes('snare') || d.includes('clap') ? 4 : 9, oct: 3, acc: d.includes('+') ? 3 : d === 'hat' ? 1 : 2, drum: d }]))) });
export const CREATE_TEMPLATES = [
  {
    id: 'create-pop', short: 'Pop / Rock · 4',
    title: 'Pop / Rock Foundation (4 beats)',
    hook: 'A kick–snare backbeat, a bass on the root and one chord. Add a melody on the inner ring.',
    beats: 4, bpm: 100,
    rings: [
      { name: 'Bass', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(8, { 0: { pc: 0, oct: 2, acc: 3 }, 3: { pc: 0, oct: 2, acc: 2 }, 4: { pc: 0, oct: 2, acc: 3 }, 6: { pc: 7, oct: 1, acc: 2 } }) },
      { name: 'Chords', instrument: 'grand_piano', role: 'harmony', steps: makeSteps(4, { 0: { pc: 0, oct: 3, acc: 2, chord: 'major' } }) },
      { name: 'Melody', instrument: 'marimba', role: 'melody', steps: makeSteps(8) },
      drumRing(8, { 0: 'kick+hat', 1: 'hat', 2: 'snare+hat', 3: 'hat', 4: 'kick+hat', 5: 'kick+hat', 6: 'snare+hat', 7: 'hat' })
    ]
  },
  {
    id: 'create-electronic', short: 'Electronic · 8',
    title: 'Electronic Loop (8 beats)',
    hook: 'Four-on-the-floor kick, off-beat hats, an off-beat bass and a two-chord pad in A minor.',
    beats: 8, bpm: 124,
    rings: [
      { name: 'Off-beat Bass', instrument: 'sub_bass', role: 'bass', steps: makeSteps(16, Object.fromEntries([1, 3, 5, 7].map(i => [i, { pc: 9, oct: 2, acc: 2, len: 1 }]).concat([9, 11, 13, 15].map(i => [i, { pc: 5, oct: 2, acc: 2, len: 1 }])))) },
      { name: 'Pad', instrument: 'strings', role: 'harmony', steps: makeSteps(2, { 0: { pc: 9, oct: 3, acc: 2, chord: 'minor' }, 1: { pc: 5, oct: 3, acc: 2, chord: 'maj7' } }) },
      { name: 'Lead', instrument: 'electric_piano', role: 'melody', steps: makeSteps(16) },
      drumRing(16, Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i, i % 2 === 0 ? (i % 4 === 2 ? 'kick+clap' : 'kick') : 'hat'])))
    ]
  },
  {
    id: 'create-waltz', short: 'Waltz · 6',
    title: 'Waltz & Compound Feel (6 beats)',
    hook: 'Two bars of 3/4 (or one bar of 6/8): bass on 1, chords on 2 and 3.',
    beats: 6, bpm: 132,
    rings: [
      { name: 'Bass', instrument: 'acoustic_bass', role: 'bass', steps: makeSteps(6, { 0: { pc: 5, oct: 2, acc: 3 }, 3: { pc: 0, oct: 2, acc: 3 } }) },
      { name: 'Oom-pah-pah', instrument: 'grand_piano', role: 'harmony', steps: makeSteps(6, { 1: { pc: 5, oct: 3, acc: 1, chord: 'major', len: 1 }, 2: { pc: 5, oct: 3, acc: 1, chord: 'major', len: 1 }, 4: { pc: 0, oct: 3, acc: 1, chord: 'dom7', len: 1 }, 5: { pc: 0, oct: 3, acc: 1, chord: 'dom7', len: 1 } }) },
      { name: 'Melody', instrument: 'marimba', role: 'melody', steps: makeSteps(12) }
    ]
  },
  {
    id: 'create-poly16', short: 'Polyrhythm · 16',
    title: 'Polyrhythm Sandbox (16 beats, Teentaal length)',
    hook: 'A 16-beat cycle (the length of Teentaal) with rings of 16, 12 and 5 steps: three pulses that meet only on beat 1.',
    beats: 16, bpm: 96,
    rings: [
      drumRing(16, Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i, i === 0 ? 'kick+hat' : i % 4 === 0 ? 'kick' : 'hat'])), 'Pulse of 16'),
      { name: 'Ring of 12', instrument: 'marimba', role: 'harmony', steps: makeSteps(12, { 0: { pc: 2, oct: 4, acc: 3 }, 3: { pc: 9, oct: 4, acc: 2 }, 6: { pc: 2, oct: 4, acc: 2 }, 9: { pc: 9, oct: 4, acc: 2 } }) },
      { name: 'Ring of 5', instrument: 'grand_piano', role: 'melody', steps: makeSteps(5, { 0: { pc: 2, oct: 5, acc: 3 }, 1: { pc: 4, oct: 5, acc: 2 }, 2: { pc: 6, oct: 5, acc: 2 }, 3: { pc: 9, oct: 5, acc: 2 }, 4: { pc: 11, oct: 5, acc: 2 } }) }
    ]
  },
  {
    id: 'create-blank', short: 'Blank',
    title: 'Blank Circle',
    hook: 'Three empty rings: bass, chords and melody. Paint with the brush, or press Random Groove.',
    beats: 4, bpm: 90,
    rings: [
      { name: 'Bass', instrument: 'sub_bass', role: 'bass', steps: makeSteps(4) },
      { name: 'Chords', instrument: 'grand_piano', role: 'harmony', steps: makeSteps(4) },
      { name: 'Melody', instrument: 'marimba', role: 'melody', steps: makeSteps(8) }
    ]
  }
];
RAW_ITEMS.push(...CREATE_TEMPLATES.map(t => ({
  ...t, group: 'Create From Scratch', isCreate: true, labType: 'create', eyebrow: 'CREATE · STARTING POINT',
  beatCaptions: Array.from({ length: t.beats }, (_, i) => `Beat ${i + 1} of ${t.beats}`),
  tryPrompt: '', behindSound: '', source: ''
})));

for (const [after, items] of Object.entries(EXTRA_LESSONS.after)) {
  const at = RAW_ITEMS.findIndex(i => i.id === after);
  RAW_ITEMS.splice(at + 1, 0, ...items);
}
{ // public-domain songs go after the existing Famous Songs
  const at = RAW_ITEMS.map(i => i.group).lastIndexOf('Famous Songs');
  RAW_ITEMS.splice(at + 1, 0, ...SONGS);
}

// Resolve song references and scene defaults once, so each piece of data lives in one place.
const byId = Object.fromEntries(RAW_ITEMS.map(i => [i.id, i]));
export const CURRICULUM = RAW_ITEMS.map(item => {
  let it = item;
  if (item.songRef) {
const song = byId[item.songRef];
it = { ...song, ...item, isFamousSong: false, rights: undefined };
  }
  if (it.labType === 'sceneFlip' && it.scenes && it.scenes.length) {
const s0 = it.scenes[0];
it = { ...it, beats: s0.beats, bpm: s0.bpm, beatCaptions: s0.beatCaptions, rings: s0.rings };
  }
  if (it.isFamousSong && !it.eyebrow) {
it.eyebrow = it.rights === 'pd' ? 'PUBLIC DOMAIN · CHECKED ARRANGEMENT' : 'EDUCATIONAL ARRANGEMENT · NON-COMMERCIAL STUDY';
  }
  return it;
});
