#!/usr/bin/env python3
"""Turn a reel script into a finished MP4: cloned voiceover -> word timings -> Remotion render.

usage:
  .venv/bin/python make.py jobs/<name>/script.json            full render
  .venv/bin/python make.py jobs/<name>/script.json --still 2,9 PNG check frames only (seconds)
  .venv/bin/python make.py jobs/<name>/script.json --no-voice  fake timings, no TTS (fast layout test)

Voice clips are cached per scene, so re-running after a visual tweak skips the TTS.
"""
import argparse, difflib, hashlib, json, os, re, shutil, subprocess, sys, time, wave

import numpy as np

import sound

ROOT = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.join(ROOT, 'video')
SR = 24000
GAP = 0.45  # pause between scenes, seconds
SENT_GAP = 0.32  # pause between sentences inside a scene
# Installed Chrome is preferred over Remotion's bundled headless shell (which crashes in sandboxed shells)
CHROMES = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'google-chrome', 'google-chrome-stable', 'chromium',
           'chromium-browser', r'C:\Program Files\Google\Chrome\Application\chrome.exe',
           r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
           os.path.join(os.environ.get('LOCALAPPDATA', ''), r'Google\Chrome\Application\chrome.exe')]


def load_config():
    p = os.path.join(ROOT, 'config.json')
    if not os.path.exists(p): shutil.copy(os.path.join(ROOT, 'config.example.json'), p)
    return json.load(open(p, encoding='utf-8'))


def write_brand(cfg):
    """Theme colors for the Remotion bundle."""
    json.dump(cfg.get('theme', {}), open(os.path.join(VIDEO, 'src', 'brand.json'), 'w', encoding='utf-8'))


def read_wav(p):
    with wave.open(p) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768, w.getframerate()


def write_wav(p, a, sr=SR):
    with wave.open(p, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())


def trim(a, sr, thr=0.012, pad=0.06):
    """Cut leading/trailing silence, keep a little padding."""
    idx = np.where(np.abs(a) > thr)[0]
    if not len(idx): return a
    s = max(0, idx[0] - int(pad * sr)); e = min(len(a), idx[-1] + int(pad * 2 * sr))
    return a[s:e]


def pronounce(text, cfg):
    """Respell code words for the voice only (captions keep the real spelling), e.g. const -> konst."""
    for word, say in cfg.get('pronounce', {}).items():
        text = re.sub(rf'(?<![\w.]){re.escape(word)}(?![\w])', say, text)
    return text


_tts = None
def tts(text, out, cfg):
    global _tts
    import torch, torchaudio
    if _tts is None:
        from chatterbox.tts import ChatterboxTTS
        dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
        print(f'  loading voice model on {dev}...', flush=True)
        try:
            _tts = ChatterboxTTS.from_pretrained(device=dev)
        except Exception as e:
            print(f'  {dev} failed ({e}); using cpu', flush=True)
            _tts = ChatterboxTTS.from_pretrained(device='cpu')
    ref = cfg.get('voice')
    ref = os.path.join(ROOT, ref) if ref and not os.path.isabs(ref) else ref
    kw = dict(exaggeration=cfg.get('exaggeration', 0.5), cfg_weight=cfg.get('cfg', 0.5), temperature=cfg.get('temperature', 0.8))
    if ref and os.path.exists(ref): kw['audio_prompt_path'] = ref
    wav = _tts.generate(pronounce(text, cfg), **kw)
    if _tts.sr != SR: wav = torchaudio.functional.resample(wav, _tts.sr, SR)
    a = trim(wav.squeeze(0).cpu().numpy(), SR)
    write_wav(out, a)
    speed = cfg.get('speed', 1.0)  # <1 slows the voice down without changing pitch
    if abs(speed - 1) > 0.01:
        tmp = out + '.tmp.wav'
        subprocess.run([sound.ffmpeg(), '-v', 'error', '-y', '-i', out, '-af', f'atempo={speed}', '-ar', str(SR), '-ac', '1', tmp], check=True)
        os.replace(tmp, out)


_whisper = None
def word_times(path):
    """Whisper word timestamps for one clip: [(word, start, end)]."""
    global _whisper
    from faster_whisper import WhisperModel
    if _whisper is None: _whisper = WhisperModel(load_config().get('whisper', 'small.en'), device='cpu', compute_type='int8')
    # pass raw 16 kHz samples: faster-whisper's own file decoder (PyAV) breaks on newer av versions
    a, sr = read_wav(path)
    a16 = np.interp(np.arange(0, len(a), sr / 16000), np.arange(len(a)), a).astype(np.float32)
    segs, _ = _whisper.transcribe(a16, word_timestamps=True, language='en', beam_size=1)
    return [(w.word.strip(), w.start, w.end) for s in segs for w in (s.words or [])]


def norm(w): return re.sub(r'[^a-z0-9]', '', w.lower())


DIGITS = 'zero one two three four five six seven eight nine'.split()
def spoken(words):
    """Normalize for comparing script vs transcript: '012' -> zero one two, 'eye' -> i."""
    out = []
    for w in words:
        w = norm(w)
        if w.isdigit(): out += [DIGITS[int(c)] for c in w]
        elif w: out.append({'eye': 'i'}.get(w, w))
    return out


def coverage(text, clip):
    """Share of script words actually heard in the clip (catches skipped or garbled sentences)."""
    want, heard = spoken(text.split()), spoken(w[0] for w in word_times(clip))
    if not want: return 1.0
    sm = difflib.SequenceMatcher(a=want, b=heard, autojunk=False)
    return sum(m.size for m in sm.get_matching_blocks()) / len(want)


def align(script_words, heard, dur):
    """Give every script word a time, using whisper's matches and interpolating the gaps.
    Captions always show the script's spelling (Whisper mangles tech terms)."""
    n = len(script_words)
    if not n: return []
    S = [None] * n; E = [None] * n
    if heard:
        sm = difflib.SequenceMatcher(a=[norm(w) for w in script_words], b=[norm(h[0]) for h in heard], autojunk=False)
        for a, b, size in sm.get_matching_blocks():
            for k in range(size): S[a + k], E[a + k] = heard[b + k][1], heard[b + k][2]
    # interpolate unmatched runs by character length
    anchors = [(-1, 0.0, 0.0)] + [(i, S[i], E[i]) for i in range(n) if S[i] is not None] + [(n, dur, dur)]
    for (i0, _, e0), (i1, s1, _) in zip(anchors, anchors[1:]):
        if i1 - i0 <= 1: continue
        run = list(range(i0 + 1, i1)); L = [len(script_words[i]) + 1 for i in run]; tot = sum(L); t = e0
        for i, l in zip(run, L):
            d = (s1 - e0) * l / tot; S[i], E[i] = t, t + d; t += d
    return [{'w': w, 's': round(float(s), 3), 'e': round(float(e), 3)} for w, s, e in zip(script_words, S, E)]


def main():
    sys.stdout.reconfigure(errors='replace')  # Windows consoles can't print every character
    ap = argparse.ArgumentParser()
    ap.add_argument('script')
    ap.add_argument('--still', help='comma separated seconds: render PNG frames instead of video')
    ap.add_argument('--no-voice', action='store_true', help='estimate timings without TTS')
    ap.add_argument('--music', help='mp3 to play quietly under the voice')
    ap.add_argument('--out')
    a = ap.parse_args()
    t0 = time.time()
    cfg = load_config()
    script_path = os.path.abspath(a.script)
    job = os.path.dirname(script_path); name = os.path.basename(job)
    sc = json.load(open(script_path, encoding='utf-8'))
    vdir = os.path.join(job, 'voice'); os.makedirs(vdir, exist_ok=True)
    voice_id = cfg.get('voice', '') + str(os.path.getmtime(os.path.join(ROOT, cfg['voice'])) if cfg.get('voice') and os.path.exists(os.path.join(ROOT, cfg['voice'])) else '')

    scenes, audio, t = [], [], 0.0
    for i, s in enumerate(sc['scenes']):
        say = s.get('say', '').strip()
        words = say.split()
        if a.no_voice:
            dur = max(1.5, len(words) / 2.7)
            ws = align(words, [], dur)
        else:
            # one TTS call per sentence: steadier pacing, fewer skipped words, natural pauses
            knobs = json.dumps([cfg.get('exaggeration'), cfg.get('cfg'), cfg.get('temperature'), cfg.get('speed', 1.0)])
            parts = []
            for j, sent in enumerate(s for s in re.split(r'(?<=[.!?])\s+', say) if s.strip()):
                h = hashlib.md5((pronounce(sent, cfg) + voice_id + knobs).encode()).hexdigest()[:10]
                sclip = os.path.join(vdir, f'{i:02d}_{j:02d}_{h}.wav')
                if not os.path.exists(sclip):
                    print(f'voice {i + 1}/{len(sc["scenes"])}: {sent[:60]}', flush=True)
                    best = -1
                    for attempt in range(3):
                        tmp = sclip + '.try.wav'
                        tts(sent, tmp, cfg)
                        cov = coverage(sent, tmp)
                        if cov > best: best = cov; os.replace(tmp, sclip)
                        if cov >= 0.85: break
                        if attempt < 2: print(f'  only {cov:.0%} of words heard, re-voicing ({attempt + 2}/3)', flush=True)
                        else: print(f'  kept best take ({best:.0%} of words heard)', flush=True)
                if parts: parts.append(np.zeros(int(SENT_GAP * SR), np.float32))
                parts.append(read_wav(sclip)[0])
            pcm = np.concatenate(parts)
            clip = os.path.join(vdir, f'scene_{i:02d}.wav'); write_wav(clip, pcm)
            dur = len(pcm) / SR
            ws = align(words, word_times(clip), dur)
            audio.append(pcm); audio.append(np.zeros(int(GAP * SR), np.float32))
        hold = s.get('hold', 0)  # extra seconds of silence to let visuals breathe
        if hold and not a.no_voice: audio.append(np.zeros(int(hold * SR), np.float32))
        total = dur + GAP + hold
        scene = {k: v for k, v in s.items() if k != 'say'}
        scene.update(start=round(t, 3), duration=round(total, 3), words=[{**w, 's': w['s'] + t, 'e': w['e'] + t} for w in ws])
        scenes.append(scene); t += total

    pub = os.path.join(VIDEO, 'public', 'jobs', name); os.makedirs(pub, exist_ok=True)
    props = {'handle': cfg.get('handle', '@yourhandle'), 'duration': round(t + 1.0, 3), 'keywords': sc.get('keywords', []), 'scenes': scenes}
    if audio:
        # voice + ducked music bed + synced sound effects, mixed into one track
        mcfg = dict(cfg)
        if a.music or 'music' in sc: mcfg['music'] = a.music or sc.get('music')
        for f in os.listdir(pub): os.remove(os.path.join(pub, f))
        sound.mix(np.concatenate(audio), SR, props, mcfg, seed=name, out_path=os.path.join(pub, 'mix.wav'))
        props['audio'] = f'jobs/{name}/mix.wav'
    pp = os.path.join(job, 'props.json'); json.dump(props, open(pp, 'w', encoding='utf-8'), indent=1)
    write_brand(cfg)
    print(f'timeline: {t:.1f}s, {len(scenes)} scenes ({time.time() - t0:.0f}s so far)', flush=True)

    npx = [shutil.which('npx') or 'npx', 'remotion']  # which() finds npx.cmd on Windows
    # Remotion's bundled headless Chrome crashes in sandboxed shells; the installed Chrome works everywhere
    chrome = cfg.get('chrome') or next((c for c in CHROMES if os.path.exists(c) or shutil.which(c)), None)
    if chrome and not os.path.exists(chrome): chrome = shutil.which(chrome)
    browser = [f'--browser-executable={chrome}', '--gl=swangle'] if chrome else []
    if a.still:
        build = os.path.join(VIDEO, 'build')
        subprocess.run(npx + ['bundle', 'src/index.ts', f'--out-dir={build}', '--log=error'], cwd=VIDEO, check=True, stdout=subprocess.DEVNULL)
        for sec in a.still.split(','):
            out = os.path.join(job, f'still_{float(sec):05.1f}.png')
            subprocess.run(npx + ['still', build, 'Reel', out, f'--props={pp}', f'--frame={int(float(sec) * 30)}', '--log=error'] + browser,
                           cwd=VIDEO, check=True, stdout=subprocess.DEVNULL)
            print('saved', out)
        return
    out = os.path.abspath(a.out) if a.out else os.path.join(job, f'{name}.mp4')
    cmd = npx + ['render', 'src/index.ts', 'Reel', out, f'--props={pp}', '--codec=h264', '--crf=18', '--log=error', f'--concurrency={max(1, min(6, (os.cpu_count() or 2) // 2 + 1))}']
    # GPU (angle) is much faster than software GL; fall back if this machine's Chrome refuses it
    gpu = [x.replace('swangle', 'angle') for x in browser]
    if subprocess.run(cmd + gpu, cwd=VIDEO).returncode != 0:
        print('GPU render failed, retrying with software rendering...', flush=True)
        subprocess.run(cmd + browser, cwd=VIDEO, check=True)
    # tidy up: check frames, logs and the stills bundle are only needed while drafting
    for f in os.listdir(job):
        if (f.startswith('still_') and f.endswith('.png')) or f.endswith('.log'): os.remove(os.path.join(job, f))
    shutil.rmtree(os.path.join(VIDEO, 'build'), ignore_errors=True)
    print(f'Done in {time.time() - t0:.0f}s: {out}')


if __name__ == '__main__':
    main()
