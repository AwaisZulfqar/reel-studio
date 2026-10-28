# Reel Studio — interview-prep reels from one line

Type a topic in Claude Code, get a finished Instagram reel in **your own voice**:

```
/reel Day 2 of JavaScript interview prep: hoisting
```

Claude writes the script, your cloned voice reads it, and code, diagrams, captions, music and sound effects are animated in sync. Out comes a 1080×1920 MP4, ready to post. Everything runs on your computer and costs nothing.

Built for tech interview content (JavaScript, React, system design, DSA, backend, behavioral), and easy to bend to any explainer.

## What you get

- 🎙️ **Your voice**: record 20 seconds once and every reel is spoken in it ([Chatterbox](https://github.com/resemble-ai/chatterbox) voice cloning, local)
- ⌨️ **Code that types itself**, with syntax colors, highlighted lines, and console output (errors in red)
- 🧩 **System-design diagrams** whose boxes and arrows appear exactly when you say them
- 🆚 **Comparisons, step lists, big takeaways**, and a Follow button that flips to Following
- 💬 **Word-by-word captions** matched to the real voice
- 🎵 **Music + sound effects**: a fresh lo-fi beat per reel that dips under your voice, plus whooshes, key clicks, pops, ding/buzz
- ✅ **Self-checking voice**: every sentence is transcribed back, and any take that skips words is re-recorded automatically
- 🎨 **Settings page**: voice, handle, colors, music, effects and pronunciations, no config files needed

## Setup (once, ~10 minutes)

You need [Claude Code](https://claude.com/claude-code), **ffmpeg**, **Node.js 18+** and **Google Chrome**. On a Mac with [Homebrew](https://brew.sh), setup installs ffmpeg and Node for you.

```bash
git clone https://github.com/AwaisZulfqar/reel-studio ~/.claude/skills/reel
bash ~/.claude/skills/reel/setup.sh
```

`setup.sh` builds the Python environment, installs the video engine and downloads the voice and caption models (~3.5 GB, first time only). It prints **READY** when done.

Then open the settings page and record your voice:

```bash
~/.claude/skills/reel/.venv/bin/python ~/.claude/skills/reel/ui.py
```

<img src="docs/settings.png" width="420" alt="Settings page">

Restart Claude Code. Done. Type `/reel <topic>` in any folder.

> Not sure how? Paste this into Claude Code: **"Install the skill from github.com/AwaisZulfqar/reel-studio into ~/.claude/skills/reel and run its setup.sh"**

## Use it

```
/reel what is a closure in JavaScript
/reel design a URL shortener
/reel SQL vs NoSQL, make it a quick comparison
/reel Day 5: debounce vs throttle, start with a search box example
```

Each reel takes about 5 minutes on an M1 Mac (voice ~3 min, video ~2 min) and lands in `jobs/<topic>/<topic>.mp4`. The settings page shows all your reels.

Not happy with something? Just say it: *"slower voice"*, *"change the hook"*, *"bigger code"*, *"music quieter"*. Voice clips are cached, so visual tweaks re-render in ~2 minutes.

## Settings

Everything lives in `config.json` (created from `config.example.json`). The settings page edits it for you.

| Setting | What it does |
|---|---|
| `handle` | Shown at the top of every reel |
| `speed`, `exaggeration`, `cfg` | Voice speed, energy and pacing |
| `music` | `"auto"` (generated lo-fi), `"music/"` (your tracks, random pick) or `null` |
| `musicVolume`, `sfx`, `sfxVolume` | Mix levels; turn effects on/off |
| `theme` | Background, text, accent and highlight colors |
| `pronounce` | How the voice should say tech words (`const` → `konst`); captions keep the real spelling |

## How it works

```
topic → Claude writes script.json → Chatterbox speaks each sentence in your voice
      → Whisper checks every word was said + times each word
      → sound.py mixes voice + ducked music + effects (synced to animations)
      → Remotion renders the scenes in Chrome → MP4
```

| File | Role |
|---|---|
| `SKILL.md` | Instructions Claude follows for `/reel` (script rules, scene types) |
| `make.py` | Pipeline: voice → timings → mix → render |
| `sound.py` | Music synth, sound effects, mixing |
| `video/src/` | Remotion scenes: hook, code, diagram, compare, list, big, cta |
| `ui.py`, `ui.html` | Settings page (Python standard library only) |
| `jobs/example/script.json` | A full example script |

You can also run it without Claude: write a `script.json` like the example and run `.venv/bin/python make.py jobs/<name>/script.json`.

## Platform notes

- **macOS (Apple Silicon)**: tested on M1, uses the GPU for the voice.
- **Linux / NVIDIA**: should work (CUDA is used if available); run `setup.sh` with ffmpeg, node and Chrome/Chromium installed.
- **Windows**: use WSL.

## Licenses and fair use

- This project: MIT (see `LICENSE`).
- [Remotion](https://remotion.dev/license) is free for individuals and companies of up to 3 people; larger companies need a Remotion company license.
- [Chatterbox](https://github.com/resemble-ai/chatterbox) (MIT) adds an inaudible watermark to generated speech.
- Fonts (Inter, JetBrains Mono, Instrument Serif) are under the SIL Open Font License.
- **Only clone your own voice, or a voice you have explicit permission to use.**
- Add only music you have the rights to. The built-in beat is generated locally and is yours to use.
