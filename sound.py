"""Music bed + sound effects for a reel, mixed under the voice.

Everything is synthesized here (no samples, no licensing). Event times mirror the
animation timing in video/src (cueTime etc.), so a pop lands when a card pops.
"""
import glob, hashlib, os, random, re, shutil, subprocess

import numpy as np
from scipy.signal import butter, lfilter

SR = 44100


def ffmpeg():
    """System ffmpeg if on PATH, else the copy bundled with imageio-ffmpeg (always present after setup)."""
    found = shutil.which('ffmpeg')
    if found: return found
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


# ---------- helpers ----------

def _t(d): return np.arange(int(d * SR)) / SR


def _filt(x, kind, f):
    b, a = butter(2, np.array(f) / (SR / 2), btype=kind)
    return lfilter(b, a, x)


def _env(n, attack=0.005, decay=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def _add(buf, x, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    if i < 0: x, i = x[-i:], 0
    x = x[: len(buf) - i]
    buf[i:i + len(x)] += x * gain


def _midi(m): return 440 * 2 ** ((m - 69) / 12)


# ---------- sound effects ----------

def whoosh(d=0.38):
    n = np.random.randn(int(d * SR))
    t = np.linspace(0, 1, len(n))
    x = _filt(n, 'bandpass', [500, 5000]) * np.sin(np.pi * t) ** 2 * (0.3 + t)
    return x / (np.abs(x).max() + 1e-9) * 0.6


def click():
    n = np.random.randn(int(0.012 * SR))
    x = _filt(n, 'highpass', 2500) * _env(len(n), 0.0005, 0.004)
    tone = np.sin(2 * np.pi * random.uniform(1800, 2600) * _t(0.012)) * _env(len(n), 0.0005, 0.003)
    return (x * 0.7 + tone * 0.3) * random.uniform(0.5, 1.0)


def pop():
    t = _t(0.12)
    f = 700 * np.exp(-t * 18) + 280
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(len(t), 0.002, 0.04) * 0.8


def ding():
    t = _t(0.9)
    x = np.sin(2 * np.pi * 1318.5 * t) + 0.45 * np.sin(2 * np.pi * 1975.5 * t) + 0.2 * np.sin(2 * np.pi * 2637 * t)
    return x * _env(len(t), 0.002, 0.25) * 0.35


def buzz():
    t = _t(0.42)
    x = np.sign(np.sin(2 * np.pi * 110 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 116.5 * t)) * 0.5
    gate = ((t % 0.21) < 0.16).astype(float)
    return _filt(x, 'lowpass', 1800) * gate * _env(len(t), 0.003, 0.5) * 0.35


def impact():
    t = _t(0.7)
    f = 90 * np.exp(-t * 6) + 38
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(len(t), 0.002, 0.28)
    n = _filt(np.random.randn(len(t)), 'lowpass', 1500) * _env(len(t), 0.001, 0.05)
    return (sub + n * 0.5) * 0.8


def tap():
    return np.concatenate([click() * 1.5, np.zeros(int(0.01 * SR))])[: int(0.03 * SR)]


# ---------- lo-fi music bed ----------

PROGRESSIONS = [
    [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]],  # Am7 Fmaj7 Cmaj7 G7
    [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [57, 60, 64, 67]],  # Dm7 G7 Cmaj7 Am7
    [[52, 55, 59, 62], [57, 60, 64, 67], [50, 53, 57, 60], [55, 59, 62, 66]],  # Em7 Am7 Dm7 Gmaj7
    [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],  # Fmaj7 Em7 Dm7 Cmaj7
]


def _keys(freq, d):
    t = _t(d)
    x = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * 2 * freq * t) + 0.08 * np.sin(2 * np.pi * 3 * freq * t)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.5 * t)
    return x * trem * _env(len(t), 0.02, 1.6)


def _kick():
    t = _t(0.3)
    f = 110 * np.exp(-t * 25) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(len(t), 0.001, 0.12)


def _snare():
    t = _t(0.22)
    n = _filt(np.random.randn(len(t)), 'bandpass', [1200, 6000]) * _env(len(t), 0.001, 0.06)
    return n * 0.6 + np.sin(2 * np.pi * 190 * t) * _env(len(t), 0.001, 0.04) * 0.4


def _hat():
    n = _filt(np.random.randn(int(0.04 * SR)), 'highpass', 7000)
    return n * _env(len(n), 0.0005, 0.012)


def lofi(duration, seed):
    rnd = random.Random(seed)
    np.random.seed(int(hashlib.md5(seed.encode()).hexdigest()[:8], 16))
    bpm = rnd.choice([78, 82, 86, 90])
    prog = rnd.choice(PROGRESSIONS)
    beat = 60 / bpm
    bar = beat * 4
    out = np.zeros(int((duration + 2) * SR))
    swing = beat * 0.56
    for b in range(int(duration / bar) + 2):
        t0 = b * bar
        chord = prog[b % len(prog)]
        for k, m in enumerate(chord):  # soft strum
            _add(out, _keys(_midi(m), bar * 1.1), t0 + k * 0.018, 0.09)
        root = _midi(chord[0] - 12)
        for at in (0, beat * 2.5):
            _add(out, np.sin(2 * np.pi * root * _t(beat * 1.2)) * _env(int(beat * 1.2 * SR), 0.01, 0.5), t0 + at, 0.22)
        for q in range(4):
            if q in (0, 2) or (q == 3 and b % 2): _add(out, _kick(), t0 + q * beat + (beat * 0.5 if q == 3 else 0), 0.55)
            if q in (1, 3): _add(out, _snare(), t0 + q * beat, 0.22)
            _add(out, _hat(), t0 + q * beat, 0.10)
            _add(out, _hat(), t0 + q * beat + swing, 0.06)
    # vinyl hiss + crackle, warm lowpass
    out += _filt(np.random.randn(len(out)), 'lowpass', 3000) * 0.006
    cr = np.zeros(len(out)); cr[np.random.randint(0, len(out), int(duration * 12))] = np.random.uniform(-0.15, 0.15, int(duration * 12))
    out += _filt(cr, 'highpass', 1000)
    out = _filt(out, 'lowpass', 4200)[: int(duration * SR)]
    fade = np.ones(len(out)); fi, fo = int(0.8 * SR), int(1.5 * SR)
    fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
    out *= fade
    return out / (np.abs(out).max() + 1e-9)


def load_track(path, duration):
    """Decode a user music file (or pick one from a folder) and loop it to length."""
    if os.path.isdir(path):
        files = sorted(glob.glob(os.path.join(path, '*.mp3')) + glob.glob(os.path.join(path, '*.wav')) + glob.glob(os.path.join(path, '*.m4a')))
        if not files: return None
        path = random.choice(files)
    raw = subprocess.run([ffmpeg(), '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    n = int(duration * SR)
    x = np.tile(x, n // len(x) + 1)[:n]
    fo = int(1.5 * SR); x[-fo:] *= np.linspace(1, 0, fo)
    return x / (np.abs(x).max() + 1e-9)


# ---------- event timing (mirrors video/src/util.ts cueTime) ----------

def _norm(s): return re.sub(r'[^a-z0-9]', '', s.lower())


def cue_time(sc, cue, i, n, frm=0.35, to=0.8):
    if cue:
        parts = [p for p in map(_norm, cue.split()) if p]
        ws = sc['words']
        for k in range(len(ws)):
            if all(k + j < len(ws) and _norm(ws[k + j]['w']).startswith(p) for j, p in enumerate(parts)):
                return max(0, ws[k]['s'] - sc['start'] - 0.15)
    d = sc['duration']
    return d * frm * 0.4 + (0 if n <= 1 else d * (to - frm) * i / (n - 1))


def _text(it): return it if isinstance(it, str) else it.get('text', it.get('label', ''))


def events(props):
    """[(time, sound_fn, gain)] for every animated moment in the reel."""
    ev = []
    for idx, sc in enumerate(props['scenes']):
        s, d, ty = sc['start'], sc['duration'], sc['type']
        if idx: ev.append((s - 0.15, whoosh, 0.35))
        if ty == 'hook':
            ev.append((s + 0.02, impact, 0.7))
        elif ty == 'code':
            code = sc.get('code', '')
            te = 0.45 if sc.get('instant') else min(d * 0.5, 0.6 + len(code) * 0.022)
            if not sc.get('instant'):
                t = 0.4
                while t < te:
                    ev.append((s + t, click, 0.35)); t += random.uniform(0.05, 0.09)
            if sc.get('output'):
                at = cue_time(sc, sc['outputCue'], 0, 1) if sc.get('outputCue') else max(te, d * 0.6)
                ev.append((s + at, buzz if re.search('error', sc['output'], re.I) else ding, 0.8))
        elif ty == 'diagram':
            nodes, edges = sc.get('nodes', []), sc.get('edges', [])
            tot = len(nodes) + len(edges)
            for i, nd in enumerate(nodes):
                ev.append((s + cue_time(sc, nd.get('cue') or nd['label'].split()[0], i, tot), pop, 0.5))
        elif ty == 'compare':
            sides = [x for x in (sc.get('left'), sc.get('right')) if x]
            n = max(len(x['points']) for x in sides)
            for si, side in enumerate(sides):
                ev.append((s + cue_time(sc, side['title'].split()[0], si, 2, 0.05, 0.25), pop, 0.55))
                for i, pt in enumerate(side['points']):
                    ev.append((s + cue_time(sc, None if isinstance(pt, str) else pt.get('cue'), i * 2 + si, n * 2, 0.3, 0.85), pop, 0.3))
        elif ty == 'list':
            items = sc.get('items', [])
            for i, it in enumerate(items):
                ev.append((s + cue_time(sc, None if isinstance(it, str) else it.get('cue'), i, len(items)), pop, 0.45))
        elif ty == 'big':
            ev.append((s + 0.05, impact, 0.45))
        elif ty == 'cta':
            ev.append((s + 0.3, pop, 0.5))
            at = max(0.8, cue_time(sc, sc.get('tapCue', 'follow'), 0, 1, 0.45, 0.45))
            ev.append((s + at, tap, 0.9)); ev.append((s + at + 0.05, ding, 0.5))
    return ev


# ---------- mix ----------

def mix(voice, voice_sr, props, cfg, seed, out_path):
    """voice (float mono @voice_sr) + ducked music + sfx -> loudness-normalized wav at out_path."""
    random.seed(seed)
    dur = props['duration']
    n = int(dur * SR)
    v = np.zeros(n)
    vs = np.interp(np.arange(0, len(voice), voice_sr / SR), np.arange(len(voice)), voice)[:n]
    v[: len(vs)] = vs

    bed = np.zeros(n)
    music = cfg.get('music', 'auto')
    if music:
        track = None
        if music != 'auto':
            p = music if os.path.isabs(music) else os.path.join(os.path.dirname(os.path.abspath(__file__)), music)
            if os.path.exists(p): track = load_track(p, dur)
        if track is None: track = lofi(dur, seed)
        # duck under the voice: smoothed voice envelope pushes the music down
        env = np.abs(v)
        k = int(0.25 * SR); env = np.convolve(env, np.ones(k) / k, mode='same')
        env = np.clip(env / (env.max() + 1e-9) * 3, 0, 1)
        bed = track[:n] * cfg.get('musicVolume', 0.45) * (1 - 0.45 * env)

    fx = np.zeros(n)
    if cfg.get('sfx', True):
        for at, fn, g in events(props):
            _add(fx, fn(), at, g)
        fx *= cfg.get('sfxVolume', 0.35)

    out = v / (np.abs(v).max() + 1e-9) * 0.9 + bed + fx
    out = out / max(1.0, np.abs(out).max() / 0.98)
    raw = out.astype(np.float32).tobytes()
    # Instagram-friendly loudness
    subprocess.run([ffmpeg(), '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), '-ac', '2', out_path], input=raw, check=True)
