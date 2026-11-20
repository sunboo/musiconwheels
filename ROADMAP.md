# Roadmap

Live site: https://sunboo.github.io/musiconwheels/
Last updated: 20 November 2026 · Current version: **3.0.4**

Released versions are described in detail in [CHANGES.md](CHANGES.md). The version number shown here matches `VERSION` in `sw.js`, so returning visitors always get the latest release.

Planned dates are targets, not promises, and may move.

---

## Released

| Version | Date | What it brought |
|---|---|---|
| 1.0 | 20 Nov 2026 | **Engine and correctness.** Precise timing on the audio clock, note lengths, real drums, voice leading, no idle redraws, Lite mode for slower phones, offline support. |
| 2.0 | 20 Nov 2026 | **Design, accessibility, reliability.** Edit mode with Undo/Redo and "Hold for original", ring dock, keyboard and screen-reader support, settings (colours, note letters, headphone sync), mobile bottom sheet. |
| 2.1 | 20 Nov 2026 | **Create mode.** Five starter templates, note-and-chord brush, Random Groove. Sharing switched off for the two songs whose riffs are copyrighted. |
| 3.0 | 20 Nov 2026 | **Content and growth.** Library with search, 28 public-domain songs, new lessons (intervals, minor scales, cadences, rounds, tempo ramps), Module 7 Taal & Raga, Module 8 Blues & Swing, Remix, ear checks, badges, daily puzzle, share links, embeds, projector view, 9:16 video and poster export, search pages, privacy and terms. |
| 3.0.1–3.0.4 | 20 Nov 2026 | Phone header: icon-only Play and Edit, a new Create button (ring, note and ＋), evenly sized icons, 40 × 40 touch targets. Site address, contact page and usage counts set up. |

---

## Next

### 3.1: More public-domain music (target: December 2026)

Each melody is checked against a published score before it is added. Nothing is written from memory.

- **Folk and children's:** Greensleeves, Scarborough Fair, Itsy Bitsy Spider, Pop Goes the Weasel, Danny Boy, Kalinka, Hava Nagila, Arirang, Mo Li Hua.
- **Classical:** Boléro (opening), William Tell (finale), The Blue Danube, Swan Lake (theme), Hallelujah chorus, Wedding March, Can-Can, Ride of the Valkyries, Vivaldi's Spring, Air on the G String, Clair de lune, Gymnopédie No. 1, The Entertainer.
- **Indian:** Raghupati Raghava Raja Ram, Vaishnav Jan To, Ekla Chalo Re.
- **Rhythm check:** restore the exact rhythms of Habanera and Morning Mood, which are simplified today.

### 3.2: Anthems of the world (target: January 2027)

Openings only, play-only like the USA and UK today, and only where local law allows a short arrangement.

- France, Canada, Australia, New Zealand, Ireland, South Africa (opening of Nkosi Sikelel' iAfrika), Israel (Hatikvah).
- Vande Mataram, from a public-domain notated setting.
- **Not planned:** anthems whose laws forbid abridged versions or arrangements (for example India's Jana Gana Mana, China, Brazil, Indonesia), and tunes still under copyright.

### 3.3: Learning depth (target: February 2027)

- Ear checks for lessons without Compare buttons (for example "spot the changed note").
- Proper note values in "Show the notes" (crotchets, quavers, ties) instead of proportional spacing.
- A short "what to try next" suggestion at the end of each lesson.

---

## Ideas (no date yet)

- **Pitch helix:** a 3-D view where octaves stack as a spiral.
- **Theme and variations:** Mozart's "Twinkle" variations (K. 265) as a lesson in variation form.
- **More taals and ragas:** for example Ektaal, Bhairav and Kafi.
- **Better video export:** MP4 on every browser (some save WebM today).
- **More interface languages:** starting with Hindi.

---

## Principles that shape the roadmap

- **Fast on low-end phones.** The whole app stays under 200 KB compressed and is checked automatically on every change.
- **No accounts and no tracking.** Progress stays in the visitor's browser; usage counts are anonymous and cookie-free.
- **Respect for rights and symbols.** Only public-domain or short educational arrangements, and anthems stay play-only.

Suggestions are welcome: open an issue on GitHub, or use the contact on the [terms page](terms.html).
