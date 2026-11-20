# Changes

## Content pass + pass 3 (v3.0.0)

**Library and catalogue**
- The long dropdown is replaced by a Library sheet: search (accent-insensitive), category chips, Recent, ★ Favourites, finished ticks, progress and badges. Press L to open it.
- 28 public-domain songs in a compact text format (`js/songs.js`): nursery rhymes, holiday, folk & world, classical moments. Captions are generated from the notes, so they always match.
- Anthems of the world (play-only): USA and UK openings. Other anthems wait for a score check.
- Everything loads at once (≈102 KB gz for the whole app, budget 200 KB).

**Lesson fixes**
- 2.2: Zarathustra (public domain) replaces the Star Wars fanfare; the half-step scene is no longer branded.
- 6.2: a real 3-2 son clave (steps 1, 4, 7, 11, 13 of 16) over a tresillo bass, with "half a turn → 2-3 clave".
- 1.4: ghost notes explained with funk/R&B snare playing instead of Billie Jean. 1.3: standard source line. 2.1: colour history (Newton 1704, Scriabin 1910).
- Help: beat, step, bar, taal and matra defined.

**New lessons**
- 1.7 Faster & Louder (accelerando + build-up, on Mountain King). 2.5 Intervals. 2.6 Three minor scales. 4.4 Four cadences. 5.4 Rounds (Frère Jacques in 1, 2 and 4 voices as rotated rings).
- Module 7 Taal & Raga: Teentaal, Jhaptaal, Rupak, Keherwa & Dadra, Raga Bhupali, Raga Yaman. Synth tabla (dha, dhin, na, tin, ge, ke), X / 0 / tali marks on the bezel, bols on the dots, clap-and-wave ring, tanpura drone, Western ↔ Sargam switch.
- Module 8: 12-bar blues, pentatonic & blues scales, swing vs straight.

**Engine**
- Swing (per lesson, per scene or from Remix). Faster-each-loop and Build-up modes. Tabla voices. A "5" (drone) chord type.
- Fixed: a false loop wrap at the very start of playback (it counted a loop too early).

**Learning tools**
- Show the notes: the melody on a treble/bass staff, time signature, chord symbols, note lengths.
- Ear check on every lesson with Compare buttons. % match with the original while you edit.
- Progress, 10 badges, Remix (swing, faster, build, shift, swap instruments, major ↔ minor, octave).
- See the beat (visual rhythm) setting.

**Pass 3: distribution**
- Share links with your version packed into `#w=` (deflate + base64url, no server). Native share sheet where available.
- Embed (`?embed=1`) and embed code. Projector view (`?present=1`). Assignment links (`?a=`).
- 9:16 video export (MP4 where supported, else WebM) and poster PNG. Both respect "no sharing" for Clocks and Billie Jean and show a notice on educational arrangements.
- First-visit opener: Canon in D as a mystery tune. ★ Daily puzzle with three tries, streak and a copyable result.
- SEO: `tools/seo.mjs` writes `learn/*.html`, `sitemap.xml`, `robots.txt`.

**Legal**
- LICENSE (MIT, code), CONTENT-LICENSE.md (CC BY-NC 4.0, lesson text and arrangements), NOTICE.txt, privacy.html, terms.html with a takedown process. Non-affiliation note in Help. Contact email is a placeholder to fill in.

**Checks**
- 66 behaviour checks (was 42) and a download-size budget in the benchmark.

## Pass 1 — engine and correctness

Item IDs refer to the critique board.

**Timing and audio**
- LT-01 / AR-01 Look-ahead scheduler on the audio clock. Notes land exactly on the grid (worst error 49.5 ms → 0 ms at 6× CPU).
- AR-02 Scheduler tick runs in a Web Worker. Look-ahead grows to 1.5 s in hidden tabs, so background playback and REC keep time.
- AR-03 Short voices are rendered once and reused (LRU cache, 8 MB cap / 3 MB in Lite), with a 24-voice cap (12 in Lite). Audio nodes in 10 s of Jingle Bells: 697 → 142.
- LT-06 Notes have length: explicit `len` or until the next note. Sustained instruments hold and release, and held notes are drawn as arcs. The note editor has a Length row.
- LT-08 Noise-based kick, snare, hi-hat, clap and stomp. One step can hold several drum voices (e.g. kick + hat).
- MZ-14 Shared reverb (off in Lite), gentler compressor plus limiter, and a 2nd harmonic on the sub bass so it can be heard on small speakers.
- AR-12 The needle is offset by the device's output latency, which matters for Bluetooth (the calibration slider comes in pass 2).
- AR-13 iOS: audio session set to playback, plus a silent media-element unlock, so the silent switch no longer mutes the app.
- AR-14 Calls, Siri and Bluetooth changes pause cleanly and show "Tap to resume".
- UX-01 Switching lesson or song mid-playback flushes every scheduled note, loads cleanly and restarts from beat 1.

**Rendering and loading**
- AR-04 / LT-09 No drawing while nothing moves (241 idle redraws in 4 s → 0).
- AR-05 / AR-10 Still parts are drawn once on their own canvas. Canvases cover only the wheel's square, the colour table is precomputed, flash times are stored in a typed array, and DPR is capped at 2 (1 in Lite).
- AR-06 No backdrop blur over the moving canvas. Blur is kept only on brief popovers, and only in full quality.
- AR-07 Automatic Lite tier (low memory/cores, or slow frames detected while playing) plus `?quality=` override.
- AR-08 / LT-11 Tailwind runtime and web font removed: CSS is pre-compiled (≈5 KB gzipped) and the system font is used. No external requests at all.
- LT-10 The drawer collapses its width and the wheel recentres. Canvas sizing follows its container.

**Code quality and safety**
- LT-02 Preset import is validated and clamped, and ring names render as text.
- LT-03 Click toggles a dot. Long-press, right-click or Alt/Ctrl-click opens the note editor.
- LT-04 The original stays frozen: every edit goes to your version. Mute/solo is separate listening state.
- LT-05 / LT-12 Split into modules, data in one file. Lessons 5.1–5.3 reuse the song data, and scene lessons no longer duplicate scene 1.
- LT-07 / MZ-13 Chord types: major, minor, 7, m7, maj7, sus4, dim, add9, each with its own halo shape. Chord labs voice every tone (including the 3rd inversion and a 4th ring for 7ths).
- LT-13 Marketing comments and review tags removed.
- LT-14 Pointer Events, with long-press on touch and larger touch reach.
- LT-15 "Beats" renamed "Loop beats", with an explanation on hover.
- LT-17 Data lint (debug mode) catches melody/chord-root semitone clashes, and would have caught the old Brahms bug. Behaviour tests and a benchmark are in `tools/`.
- DR-02 Honest instrument names (Soft Keys, Pluck Bass, Warm Pad…).
- DR-07 / LT-16 (roles) Each ring stores its role, so adding rings no longer relabels the others.
- UX-02 Dock cards scroll instead of overlapping the + Ring / − Ring buttons.
- UX-03 The "Now playing" caption has a fixed height, so the controls below never move.

**Music**
- New: Canon in D (Pachelbel, public domain).
- MZ-01 Twinkle retitled "Traditional · Variations by Mozart, K. 265". The half-cadence caption is fixed, and an Alberti-bass variation scene is added.
- MZ-02 Brahms: melody and harmony both in F, with the pickup before the bar and strings holding each bar (12 beats).
- MZ-03 Jingle Bells: 16-beat Part 1 (dotted rhythm, held E, all C) and Part 2 (F–C–D7–G7). The bells play on the beat with off-beat accents.
- MZ-04 Time: one chord per bar, 16 beats at 60 BPM. (The "Build" mode arrives with Remix in pass 3.)
- MZ-05 Clocks: bass now changes with the piano. Per the copyright policy, the riff is not extended.
- MZ-06 Take Five: m7 chord, the vamp's push on the "&" of 2, and Paul Desmond credited. The melody is not extended.
- MZ-07 Billie Jean: kick/snare/8th-note hats, full F♯m–G♯m–A–G♯m stab cycle, captions match.
- MZ-08 We Will Rock You: stomp-stomp-clap twice per bar, noise clap, no pitched bass.
- MZ-09 Over the Rainbow: reduced to the opening octave leap (copyright policy).
- MZ-10 / RS-08 Songs labelled "Public domain · checked arrangement" or "Educational arrangement · non-commercial study".
- MZ-11 Smooth voice leading for chords, plus new lesson 4.3 comparing it with root-position jumps.
- MZ-12 Dorian lesson leans on the 6th and adds an Aeolian comparison.
- MZ-15 Mnemonic is now "Pass the gold-en but-ter". MZ-16 Quote attributions marked as unverified, and the Varney claim reworded.

## Pass 2 — design, accessibility, reliability

- JI-02 The dock is hidden at rest. **Layers** shows mute/solo only; **Edit** shows the full ring controls. The wheel keeps its size when the dock opens (a reserved band at the bottom holds the dock or the caption).
- JI-03 The wheel owns the stage. When the guide is closed, a one-line beat caption sits under the wheel.
- JI-04 Struck notes send out a ripple lasting as long as the note sounds, chords flash a small constellation (one satellite per extra chord tone), and optional vibration on edits.
- JI-05 Colour names now match the colours drawn (D amber, E lime, G sky blue…). New optional circle-of-fifths palette, and note letters on dots.
- JI-06 Type scale of 13 / 15 / 20 px, body text 14–15 px, larger buttons (32–36 px).
- JI-07 Plain words: "Now playing", "Try it", "Why it works", "How to read the circle", "Original", "Loop".
- JI-08 One **Edit** toggle plus a press-and-hold **Hold for original** button. This replaces Try It Yourself, the Your Wheel / Reference switch and Hold to Peek.
- DR-01 REC, preset save/open, Settings and help moved into one **⋯** menu; the duplicate legend is gone.
- DR-03 Edit mode is unmistakable: cyan wheel rim, an "Editing — your version" badge, and the Edit button lights up.
- DR-04 Popovers stay on screen, ring names wrap onto two lines, and taps pick the nearest dot.
- DR-05 Installable offline app (manifest, icons, service worker). No external requests.
- DR-06 Keyboard control of the wheel (arrows, Enter, E), screen-reader announcements, note letters option, visible focus rings, reduced-motion support.
- LT-16 Undo/redo (buttons and Ctrl/Cmd+Z), automatic saving of your version per lesson/song, and Reset.
- AR-09 The dock is built once per structural change. Mute/solo and values update in place, with one delegated listener.
- AR-12 Headphone sync slider in Settings (adds to the measured output latency).
- AR-15 All modules are preloaded in parallel, so there is no request waterfall on slow connections.
- RS-01 Benefit-first promise: "See music. Understand it in 5 minutes a day." (title, description, share image).
- AR-16 GitHub Actions run 31 behaviour tests and the performance budget on every push.
- RS-09 Opt-in, cookie-free usage counts (GoatCounter) for play, lesson complete, edit, record, export and D1/D7/D30 returns. Off until you add a code in `js/config.js`.
- Phones: the guide is a bottom sheet that stays clear of the wheel when collapsed.
- Fixed: Escape now closes Settings and menus even while a slider or input has focus.

## Create mode (from the post-85 list)

- POST-06 **Create** mode: a "Learn & Songs | Create" switch in the header (on phones, the "Create From Scratch" group in the dropdown). Create opens straight into Edit with the ring controls. Your sketch is saved automatically per template, and the app reopens wherever you left off.
- POST-07 Five starting points: Pop / Rock Foundation (4 beats), Electronic Loop (8), Waltz & Compound Feel (6), Polyrhythm Sandbox (16 beats, Teentaal length, with rings of 16 / 12 / 5), Blank Circle.
- POST-08 **Note & Chord Brush:** 12 notes, octave (Auto / 2–5), Note / Major / Minor / 7 / m7 / maj7 / sus4 / add9, accent (High / Mid / Soft), and the drum voice for drum rings. Click an empty step to paint, click a note to erase, long-press to fine-tune.
- POST-08 **✦ Random Groove:** picks a key and a common progression, then writes each ring by its role (bass on roots, chords on changes, melody from chord tones on the beat, drums to suit the meter). It never puts a melody note a semitone against the chord root (checked on 500 random runs). Undo and Clear All sit next to it.
- Phones: the brush lives in the bottom sheet; "Ring controls" opens the dock and "Brush" switches back. The dock wraps onto rows on narrow screens.
- Already in place: POST-01 (Western note names everywhere) and POST-02 (plain coloured dots by default, note letters as a Settings toggle).
- Rule for pass 3: POST-03. Sargam (Sa Re Ga) will appear only inside the Indian taal module.
- Not applicable to this repo: POST-04/05 (overlap fixes; already handled differently) and POST-09 (single-file Google Sites build).

## Sharing limits for two songs

- Clocks and Billie Jean are marked `shareable: false` in `js/content.js`, because their signature riffs are copyrighted. You can still play them and edit your own version, but recording, saving a preset file and (from pass 3) video export, share links and embeds are turned off, with a short explanation. All other songs are unchanged.

## Next

- **Pass 3 (growth):** JI-01/MB-01 opener and mystery mode, MB-02 daily puzzle, MB-03 video export, MB-04 scoring and progress, MB-06 Remix (+ Time "Build"), RS-02 share links, RS-03 embeds, RS-04 taals and sargam, RS-07 search pages, RS-06 projector view and assignment links.
