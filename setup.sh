#!/usr/bin/env bash
# One-time setup. Safe to run again: prints READY when everything is in place.
#   bash setup.sh
set -e
cd "$(dirname "$0")"
say() { printf '\n\033[1m%s\033[0m\n' "$1"; }

say "1/5 Checking tools"
missing=""
command -v ffmpeg >/dev/null || missing="$missing ffmpeg"
command -v node >/dev/null || missing="$missing node"
if [ -n "$missing" ]; then
  echo "Missing:$missing"
  if command -v brew >/dev/null; then
    echo "Installing with Homebrew..."; brew install $missing
  else
    echo "Install them first (Mac: brew install$missing | Ubuntu: sudo apt install ffmpeg nodejs npm), then run this again."
    exit 1
  fi
fi
if ! command -v uv >/dev/null; then
  echo "Installing uv (Python manager)..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi

say "2/5 Python environment (Python 3.12)"
[ -x .venv/bin/python ] || uv venv -q -p 3.12 .venv
uv pip install -q -p .venv/bin/python -r requirements.txt

say "3/5 Video engine (Remotion)"
(cd video && npm install --silent --no-audit --no-fund)

say "4/5 Settings"
[ -f config.json ] || cp config.example.json config.json
.venv/bin/python -c "import make; make.write_brand(make.load_config())"

say "5/5 Downloading voice + caption models (~3.5 GB, first time only)"
HF_HUB_DISABLE_XET=1 PYTHONWARNINGS=ignore .venv/bin/python - <<'EOF'
from huggingface_hub import snapshot_download
snapshot_download('ResembleAI/chatterbox', allow_patterns=['ve.safetensors', 't3_cfg.safetensors', 's3gen.safetensors', 'tokenizer.json', 'conds.pt'])
from faster_whisper import WhisperModel
import json; WhisperModel(json.load(open('config.json')).get('whisper', 'small.en'), device='cpu', compute_type='int8')
EOF

.venv/bin/python -W ignore -c "import chatterbox, faster_whisper, scipy, perth"
say "READY"
if [ ! -f voice/me.wav ]; then
  echo "Next: record your voice on the settings page:"
  echo "  \"$PWD/.venv/bin/python\" \"$PWD/ui.py\""
fi
echo "Then restart Claude Code and type:  /reel <your topic>"
