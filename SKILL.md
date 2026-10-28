---
name: reel
description: Make a finished Instagram reel (1080x1920 MP4) about a tech interview topic — system design, JavaScript, DSA, backend, behavioral — from just the topic. Writes the script, voices it with the user's cloned voice (Chatterbox), animates code, diagrams and captions (Remotion). Use when the user types /reel, or asks to make a reel/video/post about an interview question or tech concept.
---

# /reel — interview-prep reel from a topic

The engine is this skill's own folder (the folder this SKILL.md is in); call its absolute path R and use it in every command. Keep replies short; do the work, never ask the user to run commands except the one-time setup.

## 0. First run (once)
- If `R/.venv/bin/python` is missing, run `bash R/setup.sh` in the background (installs Python env, Remotion, ~3.5 GB of models; 5–15 min). It prints `READY`. If it says ffmpeg/node are missing and there's no Homebrew, tell the user what to install.
- If `R/voice/me.wav` is missing, tell the user to open the settings page once to record their voice: `! R/.venv/bin/python R/ui.py` (use the real path). Without it, the default voice is used.
- Everything personal lives in `R/config.json` (handle, voice, music, effects, colors, pronunciations). The settings page edits it; you can too.

## Steps
1. **Slug**: kebab-case from the topic, e.g. `url-shortener`. Make `R/jobs/<slug>/`.
2. **Write `R/jobs/<slug>/script.json`** (schema below). Rules for the voiceover (`say`):
   - Sound like a real person talking to a friend: contractions, short sentences, "here's the thing", "most people get this wrong". No textbook phrasing, no "In this video".
   - Hook first (scene 1, under 3s spoken): a question, a common mistake, or "asked at <company>". Only claim a company asked it if it's a widely known question there; otherwise use "asked in almost every frontend interview" style.
   - 90–130 words total → 30–45 s. 5–8 scenes. One idea per scene, 1–3 sentences each.
   - Say numbers and symbols the way a person would ("one, four, three, two", "O of n", "two hundred milliseconds"). Write `say` for the ear; on-screen fields can use symbols.
   - Technically correct. Double-check code output and complexity claims.
   - End with a CTA scene (follow / save / comment a keyword).
3. **Check frames**: `cd R && .venv/bin/python make.py jobs/<slug>/script.json --no-voice --still 1.5,<mid of each scene>` then Read the PNGs (or hstack them with ffmpeg into one sheet). Fix overflow, overlaps, tiny text. `--no-voice` timing ≈ 2.7 words/s.
4. **Render**: `cd R && .venv/bin/python make.py jobs/<slug>/script.json` (run in background; first scene load ~30 s, voice ~1–3 min on M1, render ~1 min). Voice clips are cached per scene, so re-renders after visual fixes are fast; editing a scene's `say` re-voices only that scene.
5. Tell the user the path `R/jobs/<slug>/<slug>.mp4` and remind them to watch before posting. If a line sounds off, change its wording (or set `"exaggeration"` in `R/config.json`) and re-run.

Settings page (voice, handle, colors, music, effects, pronunciation, reel gallery): `R/.venv/bin/python R/ui.py` → http://localhost:4747. CLI alternative for the voice: `bash R/record_voice.sh [recording.m4a]`.

## script.json
```json
{
  "keywords": ["event loop", "promise"],        // caption words highlighted in the accent color
  "music": "music/lofi.mp3",                    // optional, plays quietly
  "scenes": [ { "type": "...", "say": "...", ...fields } ]
}
```
Every scene: `say` (voiceover), optional `hold` (extra silent seconds). `label` = small `// MONO` overline. `hl` = substring of the title to color.
Many fields take a `cue`: a word (or words) from that scene's `say`; the element appears exactly when it is spoken. Use cues generously — sync is what makes it feel produced.

| type | fields |
|---|---|
| `hook` | `title` (≤7 words), `hl` (space-separated words to color yellow), `label` (pill, default "Interview question"), `tag` (shown top-right as #tag for the whole reel), `sub` |
| `code` | `code` (≤14 lines, ≤34 chars/line), `file`, `title`, `highlight` [line numbers], `highlightCue`, `output` (lines joined `\n`), `outputCue`, `instant` (true = no typing; use for answer/recap code the voice discusses right away) |
| `diagram` | `title`, `nodes` [{`id`,`label`,`icon` (emoji),`sub`,`pos`:[col,row],`cue`,`color`}], `edges` [{`from`,`to`,`label` (≤8 chars),`cue`,`dashed`}], `cols`, `rows` (grid; ≤3 cols, ≤4 rows; fractional pos ok, e.g. 0.5 to center) |
| `compare` | `title`, `left`/`right` {`title`,`icon`,`points` [string or {text,cue}] (≤4, ≤28 chars)} |
| `list` | `title`, `items` [string or {text,sub,cue}] (≤5, ≤30 chars), `check` (green ticks) |
| `big` | `emoji`, `text` (≤45 chars), `hl`, `sub`, `label` — punchline / key number |
| `cta` | `text`, `hl`, `sub`, `button`, `tapCue` (word that triggers Follow → Following) |

Full worked example: `R/jobs/example/script.json`. Good shapes: JS output quiz = hook → code → diagram (why) → code with output → big (rule) → cta. System design = hook → list (requirements) → diagram (build up across 1–2 scenes, cue each box) → compare (trade-off) → big → cta.

## Music and sound effects (automatic)
`sound.py` mixes one track: voice + lo-fi music bed + synced SFX, loudness-normalized for Instagram.
- **Music**: `"music": "auto"` synthesizes a fresh lo-fi beat per reel (tempo/chords vary by slug). Set it to a file or folder (e.g. `"music/"`, random pick) to use the user's own royalty-free tracks; `null` = no music. Per reel override: `"music"` in script.json. Music ducks under the voice automatically.
- **SFX** land on visuals: whoosh on every scene change, impact on hook and `big`, key clicks while code types, ding on output (buzz if the output contains "error"), pop on each diagram node / compare point / list item, tap + ding on the Follow button. So cues matter for sound too.
- Rules when writing: keep `instant` code short (no clicks); put an `output` on code scenes when there is a result (ding/buzz is the payoff); vary scene types so the SFX rhythm isn't repetitive; avoid sentences of 2–4 words (the voice garbles them) — merge them.
- If the user says music too loud/quiet → `musicVolume` (default 0.45); effects → `sfxVolume` (0.35) or `"sfx": false`.
- Code words are respelled for the voice via `pronounce` in config.json (const → konst). Add an entry when a new term comes out wrong.

## Settings (`R/config.json`)
`handle` (top-left watermark), `voice`, `exaggeration` (0.3 calm – 0.8 hype), `cfg` (lower = slower, more deliberate), `music`, `musicVolume`. Colors: `R/video/src/theme.ts`.
