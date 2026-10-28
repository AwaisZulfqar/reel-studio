#!/usr/bin/env python3
"""Settings page: voice, handle, colors, music, sound effects, pronunciations, and your finished reels.

usage: .venv/bin/python ui.py        (opens http://localhost:4747)
"""
import io, json, os, subprocess, sys, tempfile, threading, urllib.parse, wave, webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
os.chdir(ROOT)
import make  # noqa: E402

PORT = int(os.environ.get('PORT', 4747))
AUDIO = ('.mp3', '.wav', '.m4a', '.aac', '.ogg')
tts_lock = threading.Lock()


def cfg():
    return make.load_config()


def save_cfg(c):
    json.dump(c, open(os.path.join(ROOT, 'config.json'), 'w', encoding='utf-8'), indent=2)
    make.write_brand(c)


def duration(path):
    try:
        with wave.open(path) as w: return round(w.getnframes() / w.getframerate(), 1)
    except Exception: return None


def state():
    c = cfg()
    voice = os.path.join(ROOT, c.get('voice', 'voice/me.wav'))
    music = sorted(f for f in os.listdir(os.path.join(ROOT, 'music')) if f.lower().endswith(AUDIO))
    reels = []
    jobs = os.path.join(ROOT, 'jobs')
    for slug in sorted(os.listdir(jobs), key=lambda s: -os.path.getmtime(os.path.join(jobs, s))) if os.path.isdir(jobs) else []:
        mp4 = os.path.join(jobs, slug, f'{slug}.mp4')
        if os.path.exists(mp4): reels.append({'slug': slug, 'url': f'/jobs/{slug}/{slug}.mp4'})
    return {'config': c, 'voice': duration(voice) if os.path.exists(voice) else None, 'music': music, 'reels': reels}


def to_voice_wav(src, dst):
    """Any recording -> clean mono 24 kHz wav, leading silence trimmed, loudness evened out."""
    import sound
    subprocess.run([sound.ffmpeg(), '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '24000',
                    '-af', 'silenceremove=1:0:-45dB,loudnorm', '-t', '30', dst], check=True)


def wav_bytes(samples, sr):
    import numpy as np
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes())
    return buf.getvalue()


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def send(self, code, body=b'', ctype='application/json'):
        if isinstance(body, (dict, list)): body = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def body(self):
        return self.rfile.read(int(self.headers.get('Content-Length', 0)))

    def file(self, path, ctype):
        if not os.path.isfile(path): return self.send(404, {'error': 'not found'})
        self.send(200, open(path, 'rb').read(), ctype)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if u.path == '/': return self.file(os.path.join(ROOT, 'ui.html'), 'text/html; charset=utf-8')
        if u.path == '/api/state': return self.send(200, state())
        if u.path == '/voice.wav': return self.file(os.path.join(ROOT, cfg().get('voice', 'voice/me.wav')), 'audio/wav')
        if u.path == '/api/beat':  # 12 s sample of the auto lo-fi bed
            import sound
            return self.send(200, wav_bytes(sound.lofi(12, q.get('seed', ['preview'])[0]) * 0.8, sound.SR), 'audio/wav')
        if u.path.startswith('/music/'):
            name = os.path.basename(urllib.parse.unquote(u.path[7:]))
            return self.file(os.path.join(ROOT, 'music', name), 'audio/mpeg')
        if u.path.startswith('/jobs/'):
            parts = [os.path.basename(p) for p in urllib.parse.unquote(u.path[6:]).split('/')]
            if len(parts) == 2 and parts[1].endswith('.mp4'):
                return self.file(os.path.join(ROOT, 'jobs', parts[0], parts[1]), 'video/mp4')
        self.send(404, {'error': 'not found'})

    def do_POST(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        try:
            if u.path == '/api/config':
                c = cfg(); c.update(json.loads(self.body())); save_cfg(c)
                return self.send(200, state())
            if u.path == '/api/voice':
                with tempfile.NamedTemporaryFile(suffix=q.get('ext', ['.webm'])[0], delete=False) as f:
                    f.write(self.body())
                os.makedirs(os.path.join(ROOT, 'voice'), exist_ok=True)
                to_voice_wav(f.name, os.path.join(ROOT, 'voice', 'me.wav')); os.unlink(f.name)
                c = cfg(); c['voice'] = 'voice/me.wav'; save_cfg(c)
                return self.send(200, state())
            if u.path == '/api/music':
                name = os.path.basename(q['name'][0])
                if not name.lower().endswith(AUDIO): return self.send(400, {'error': 'audio files only'})
                open(os.path.join(ROOT, 'music', name), 'wb').write(self.body())
                return self.send(200, state())
            if u.path == '/api/music/delete':
                p = os.path.join(ROOT, 'music', os.path.basename(q['name'][0]))
                if os.path.exists(p): os.remove(p)
                return self.send(200, state())
            if u.path == '/api/preview':  # speak a sentence with the current voice settings
                text = json.loads(self.body()).get('text', '').strip()[:300] or 'Hey, this is how I sound.'
                out = os.path.join(tempfile.gettempdir(), 'reel_preview.wav')
                with tts_lock:
                    make.tts(text, out, cfg())
                return self.file(out, 'audio/wav')
        except Exception as e:
            return self.send(500, {'error': str(e)})
        self.send(404, {'error': 'not found'})


if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'music'), exist_ok=True)
    for port in range(PORT, PORT + 20):  # next free port if one is taken
        try: srv = ThreadingHTTPServer(('127.0.0.1', port), H); break
        except OSError: continue
    else: sys.exit(f'No free port between {PORT} and {PORT + 19}')
    url = f'http://localhost:{port}'
    print(f'Settings page: {url}  (Ctrl+C to stop)')
    if '--no-open' not in sys.argv: threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try: srv.serve_forever()
    except KeyboardInterrupt: pass
