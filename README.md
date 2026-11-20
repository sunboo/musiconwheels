# Concentric — see music on a circle

An interactive music-theory studio: rhythm, harmony and melody drawn as concentric rings you can hear, edit and compare. Plain HTML, CSS and JavaScript modules. No build step to run it, and no external CDNs.

## Run it locally

ES modules don't load from `file://`, so serve the folder:

```bash
python3 -m http.server 8765
# open http://localhost:8765
```

## Publish on GitHub Pages

1. Create a repository (e.g. `concentric`) and upload everything in this folder to it: drag the files into "Add file → Upload files" on github.com, or `git push`.
2. In the repository go to **Settings → Pages**. Under "Build and deployment" choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
3. After a minute the site is live at `https://sunboo.github.io/musiconwheels/`.

The `.nojekyll` file tells GitHub to serve the files as-is. A free account requires a public repository, so the code and song data are visible to anyone.

## Using it

- **Play / Pause:** Space. **Tap tempo:** T, or tap TAP in the centre. **Undo / Redo:** Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z.
- **Edit** makes your own version of any lesson or song. It is saved automatically in this browser. **Hold for original** compares it with the original; **Reset** throws your edits away.
- **On the wheel:** click a dot to add or remove it. Long-press, right-click or Alt-click a dot to change its note, chord, length or accent. With the keyboard: Tab to the wheel, arrow keys to move, Enter to add or remove, E to open the note editor.
- **Create** (header switch, or "Create From Scratch" in the dropdown) starts from one of five templates. Paint with the Note & Chord Brush, press ✦ Random Groove for an instant idea, and Undo or Clear All as you go.
- **Library** (the button with the current title, or press **L**): search every lesson and song, filter by category, star favourites, see recent items, ticks for finished lessons and your badges.
- **★ Daily**: a name-that-tune puzzle, the same tune for everyone each day, three tries, with a streak and a result you can copy.
- **⋯ → Learn**: *Show the notes* (the melody on a staff with chord symbols), *Ear check* (on lessons with Compare buttons) and *Remix* (swing, faster each loop, build up, shift the melody, swap instruments, major ↔ minor, melody up an octave).
- **⋯ → Share**: a link that carries your edited version inside it (nothing is uploaded), embed code, a projector link and an assignment link with your task on top; a 9:16 video for Reels/Shorts (MP4 where the browser supports it, otherwise WebM); a poster PNG.
- **Anthems** are play-only: no editing, remixing or Random Groove.
- **Layers** opens mute and solo for each ring. **⋯** holds recording, preset files, Settings and "How to read the circle".
- **Settings:** quality (Auto / Lite / Full), colours (rainbow or circle of fifths), note letters on dots, vibration, *See the beat* (flashes the wheel edge on every beat, for Deaf and hard-of-hearing users), and headphone sync for Bluetooth delay. Module 7 lessons add a Western / Sargam switch in the guide.
- **Offline:** after the first visit the app works without a connection and can be installed ("Add to Home Screen" / "Install app"). When you publish changes, bump `VERSION` in `sw.js` so returning visitors get them.

## Usage counts (optional)

Cookie-free page and event counts with [GoatCounter](https://www.goatcounter.com) (free for small sites). Create a site there, then put its code in `js/config.js`:

```js
export const CONFIG = { goatcounter: 'your-code' };
```

The app then counts these events (they appear in GoatCounter as paths starting with `event/`):

| Area | Events |
|---|---|
| Visits | `first-visit`, `return-d1`, `return-d7`, `return-d30` |
| Listening and learning | `play`, `lesson-complete` (two full loops), `notes`, `ear-right`, `ear-wrong` |
| Create | `create-open`, `create-first-edit`, `random-groove`, `edit` |
| Video, poster, audio | `video` (saved), `poster` (saved), `audio-record-start`, `audio-record-saved`, `export` (preset file) |
| Sharing | `share-open` (share box opened), `share-link-copied`, `share-link-sent` (phone share sheet), `share-embed-copied`, `share-projector-copied`, `share-assignment-copied`, `share-open-link` (someone opened a shared version) |
| Daily puzzle | `daily-open`, `daily-solved`, `daily-failed`, `daily-result-copied` |


## Automatic checks

`.github/workflows/checks.yml` runs the behaviour tests and the performance budget on every push and pull request. Results show under the repository's **Actions** tab. The budget is: timing error ≤ 2 ms at 6× CPU slowdown, ≤ 2 redraws while paused, ≤ 250 audio nodes in 10 s of playback, main thread ≤ 75% busy at 6× slowdown, and no page errors.

## Useful URL options

| URL | What it does |
|---|---|
| `?quality=lite` | Lite mode: 30 fps visuals, no blur or reverb, fewer voices, lower sample rate. Chosen automatically on low-memory or slow devices. |
| `?quality=full` | Force full quality. |
| `?item=song-canon` | Open a specific lesson, song or template (ids are in `js/content.js`). |
| `?item=7.4&scene=1` | Open a lesson on a given Compare scene (0-based). |
| `?embed=1` | Compact player for iframes (used by the embed code). |
| `?present=1` | Projector view: guide closed, large captions. |
| `?a=<task>` | Shows a teacher's task on top (assignment links). |
| `?daily=1` | Opens today's daily puzzle. |
| `?opener=1` | Shows the first-visit "name this tune" opener again. |
| `#w=…` | A shared version, packed into the link. |
| `?debug=1` | Runs the song/lesson data checks (see the console) and freezes the original rings so accidental edits throw. |

## Project layout

```
index.html            markup
css/app.css           compiled stylesheet (≈7 KB gzipped)
js/main.js            UI wiring and app state
js/config.js          site settings (analytics code)
js/analytics.js       opt-in, cookie-free usage counts
sw.js                 offline cache
manifest.webmanifest  install as an app
js/audio.js           audio engine: cached voices, gated sustain, drums, reverb, limiter
js/scheduler.js       look-ahead scheduler on the audio clock
js/clock-worker.js    background-safe tick for the scheduler
js/render.js          canvas renderer (still layer + moving layer)
js/theory.js          notes, colours, chords, voice leading, note lengths
js/content.js         lessons 1.1–6.2, original Famous Songs, Create templates; merges the files below
js/content-helpers.js makeSteps (shared by the data files)
js/lessons-extra.js   lessons added in the content pass: 1.7, 2.5, 2.6, 4.4, 5.4, Module 7 (taal & raga), Module 8 (blues)
js/songs.js           public-domain songs and anthems in a compact text format ("E4:2 D4:2 C4:4" + "C:4 G7:2")
js/library.js         Library sheet (search, chips, favourites, recents, ticks)
js/progress.js        progress, badges, daily-puzzle state (this browser only)
js/share.js           share links (#w=, deflate + base64url)
js/export.js          poster PNG and 9:16 video export
js/notation.js        "Show the notes" staff view
js/groove.js          Random Groove generator
js/lint.js            data checks (debug only)
tools/test.mjs        behaviour tests        (Playwright)
tools/bench.mjs       performance benchmark  (Playwright), incl. a 200 KB gz download budget
tools/seo.mjs         static page per lesson/song + sitemap.xml + robots.txt
learn/                generated SEO pages (re-run tools/seo.mjs with your real URL)
LICENSE, CONTENT-LICENSE.md, NOTICE.txt, privacy.html, terms.html
ROADMAP.md            released versions and what's next
tools/css-build/      Tailwind config + source CSS (only needed if you change classes)
```

## Editing styles

The stylesheet is pre-compiled. If you add or change Tailwind classes in `index.html` or `js/`, rebuild it:

```bash
cd tools/css-build && npm install && npx tailwindcss -c tailwind.config.js -i src.css -o ../../css/app.css --minify
```

## Tests and benchmark

```bash
npm i -D playwright && npx playwright install chromium
python3 -m http.server 8765 &
node tools/test.mjs     # behaviour checks
node tools/bench.mjs    # timing error, idle redraws, audio nodes, main-thread load at 1× and 6× CPU
```

## Search pages (SEO)

`learn/` holds one static page per lesson and public-domain song, with the interactive player embedded. They are generated, so re-run this with your real address before publishing (and whenever lessons change):

```bash
node tools/seo.mjs https://sunboo.github.io/musiconwheels
```

Then submit `sitemap.xml` in Google Search Console. Copyrighted songs, anthems and Create templates get no page.

## Adding a public-domain song

Add an entry to `SONGS` in `js/songs.js`. Notes are `name+octave:length` (length in steps, `r` = rest); chords are `symbol:beats` (`C`, `Am`, `G7`, `Cmaj7`, `Csus4`, `Bdim`, `N` for none). The melody's length decides the beats; the chords must cover exactly the same number of beats or the app refuses to load the song. Run `node tools/test.mjs` afterwards: the data lint flags melody notes that clash with the chord.

## Before publishing

- Re-run `tools/seo.mjs` if lessons change.
- Bump `VERSION` in `sw.js`.

## Song rights

Songs marked **public domain** (Canon in D, Jingle Bells, Brahms' Lullaby, Twinkle Twinkle, and the 28 songs in `js/songs.js`) are our own simplified arrangements. Lyrics are never included: only melodies, which is what is public domain. National anthems are play-only openings; India's anthem is deliberately absent (2016 Supreme Court order on abridged versions), as are anthems whose laws forbid arrangements. Songs marked **educational arrangement** are copyrighted compositions. They are included as short rhythm and harmony studies only, and their melodies are deliberately not extended. Clocks and Billie Jean go one step further: their signature riffs are included, so recording, preset export and sharing are switched off for them (`shareable: false` in `js/content.js`). Get licensing advice before using any of them commercially; this note is not legal advice.
